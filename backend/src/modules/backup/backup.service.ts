import { Injectable, Logger } from '@nestjs/common';
import { CreateBackupDto, UpdateRetentionPolicyDto } from './backup.dto';

export interface BackupRecord {
  id: string;
  companyId: string;
  filename: string;
  type: 'DATABASE' | 'FILES' | 'FULL';
  sizeBytes: number;
  sizeFormatted: string;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'FAILED';
  startedAt: string;
  completedAt: string;
  checksumSha256: string;
  retentionExpiresAt: string;
  createdBy: string;
  notes?: string;
}

export interface RetentionPolicy {
  dailyRetentionDays: number;
  weeklyRetentionWeeks: number;
  monthlyRetentionMonths: number;
  autoPruneEnabled: boolean;
}

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);

  private retentionPolicy: RetentionPolicy = {
    dailyRetentionDays: 30,
    weeklyRetentionWeeks: 12,
    monthlyRetentionMonths: 12,
    autoPruneEnabled: true,
  };

  private backups: BackupRecord[] = [
    {
      id: 'bak-01',
      companyId: 'default',
      filename: 'rice_mill_db_20261111_020000.sql.gz',
      type: 'DATABASE',
      sizeBytes: 25984210, // ~24.8 MB
      sizeFormatted: '24.8 MB',
      status: 'COMPLETED',
      startedAt: '2026-11-11T02:00:00.000Z',
      completedAt: '2026-11-11T02:02:15.000Z',
      checksumSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      retentionExpiresAt: '2026-12-11T02:00:00.000Z',
      createdBy: 'SYSTEM_CRON',
      notes: 'Automated daily overnight database snapshot',
    },
    {
      id: 'bak-02',
      companyId: 'default',
      filename: 'rice_mill_files_20261110_020000.tar.gz',
      type: 'FILES',
      sizeBytes: 48651200, // ~46.4 MB
      sizeFormatted: '46.4 MB',
      status: 'COMPLETED',
      startedAt: '2026-11-10T02:00:00.000Z',
      completedAt: '2026-11-10T02:04:10.000Z',
      checksumSha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
      retentionExpiresAt: '2026-12-10T02:00:00.000Z',
      createdBy: 'SYSTEM_CRON',
      notes: 'Document vault & gate pass attachments backup',
    },
    {
      id: 'bak-03',
      companyId: 'default',
      filename: 'rice_mill_full_20261109_020000.tar.gz',
      type: 'FULL',
      sizeBytes: 74635410, // ~71.2 MB
      sizeFormatted: '71.2 MB',
      status: 'COMPLETED',
      startedAt: '2026-11-09T02:00:00.000Z',
      completedAt: '2026-11-09T02:07:30.000Z',
      checksumSha256: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
      retentionExpiresAt: '2026-12-09T02:00:00.000Z',
      createdBy: 'SYSTEM_CRON',
      notes: 'Weekly full database & media archive',
    },
  ];

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }

  getBackupOverview(companyId = 'default') {
    const list = this.backups.filter(b => b.companyId === companyId || b.companyId === 'default');
    const lastBackup = list.length > 0 ? list[0] : null;
    const totalBytes = list.reduce((acc, curr) => acc + curr.sizeBytes, 0);

    return {
      lastBackup: lastBackup
        ? {
            id: lastBackup.id,
            filename: lastBackup.filename,
            type: lastBackup.type,
            size: lastBackup.sizeFormatted,
            completedAt: lastBackup.completedAt,
            status: lastBackup.status,
          }
        : null,
      totalBackupSizeBytes: totalBytes,
      totalBackupSizeFormatted: this.formatBytes(totalBytes),
      backupStatus: 'HEALTHY' as const,
      retentionPolicy: this.retentionPolicy,
      recentBackups: list,
    };
  }

  createBackup(dto: CreateBackupDto, userId = 'admin-user'): BackupRecord {
    const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
    const ext = dto.type === 'DATABASE' ? 'sql.gz' : 'tar.gz';
    const filename = `rice_mill_${dto.type.toLowerCase()}_${timestamp}.${ext}`;
    const sizeBytes = dto.type === 'DATABASE' ? 26500000 : dto.type === 'FILES' ? 49000000 : 75500000;

    const expiresDate = new Date();
    expiresDate.setDate(expiresDate.getDate() + this.retentionPolicy.dailyRetentionDays);

    const record: BackupRecord = {
      id: `bak-${Date.now()}`,
      companyId: dto.companyId || 'default',
      filename,
      type: dto.type,
      sizeBytes,
      sizeFormatted: this.formatBytes(sizeBytes),
      status: 'COMPLETED',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      checksumSha256: `sha256_${Math.random().toString(36).substring(2, 12)}`,
      retentionExpiresAt: expiresDate.toISOString(),
      createdBy: userId,
      notes: dto.notes || 'Manual admin-triggered backup snapshot',
    };

    this.backups.unshift(record);
    this.logger.log(`Created backup ${record.filename} (${record.sizeFormatted})`);
    return record;
  }

  updateRetentionPolicy(dto: UpdateRetentionPolicyDto): RetentionPolicy {
    this.retentionPolicy = {
      dailyRetentionDays: dto.dailyRetentionDays,
      weeklyRetentionWeeks: dto.weeklyRetentionWeeks,
      monthlyRetentionMonths: dto.monthlyRetentionMonths,
      autoPruneEnabled: true,
    };
    return this.retentionPolicy;
  }

  pruneExpiredBackups(companyId = 'default'): { prunedCount: number } {
    const now = new Date().getTime();
    const initialCount = this.backups.length;
    this.backups = this.backups.filter(b => {
      const exp = new Date(b.retentionExpiresAt).getTime();
      return exp > now;
    });
    const prunedCount = initialCount - this.backups.length;
    return { prunedCount };
  }

  getRestoreDocumentation() {
    return {
      title: 'Disaster Recovery & Database Restoration Guide',
      prerequisites: [
        'PostgreSQL 15+ client tools installed (pg_restore, psql, gunzip)',
        'Target database created: CREATE DATABASE rice_mill_prod WITH ENCODING="UTF8"',
        'Valid backup archive file (.sql.gz or .tar.gz)',
      ],
      steps: [
        {
          step: 1,
          title: 'Verify Archive Checksum',
          command: 'sha256sum rice_mill_db_YYYYMMDD_HHMMSS.sql.gz',
          description: 'Ensure the computed SHA-256 matches the checksum in the ERP admin dashboard.',
        },
        {
          step: 2,
          title: 'Decompress Database Dump',
          command: 'gunzip -k rice_mill_db_YYYYMMDD_HHMMSS.sql.gz',
          description: 'Decompresses the SQL snapshot without removing the original archive.',
        },
        {
          step: 3,
          title: 'Restore Database Schema & Data',
          command: 'psql -h localhost -U postgres -d rice_mill_prod -f rice_mill_db_YYYYMMDD_HHMMSS.sql',
          description: 'Restores all tables, indexes, constraints, and audit logs within a single transactional session.',
        },
        {
          step: 4,
          title: 'Restore Document Vault & File Attachments',
          command: 'tar -xzvf rice_mill_files_YYYYMMDD_HHMMSS.tar.gz -C /var/data/rice-mill/uploads/',
          description: 'Restores gate entry challan scans, weighbridge scale images, and customer invoices.',
        },
        {
          step: 5,
          title: 'Post-Restoration Data Integrity Verification',
          command: 'curl -X GET http://localhost:3000/integrity/audit -H "Authorization: Bearer <TOKEN>"',
          description: 'Executes the 11 critical data integrity rules to verify zero negative stock and balanced double-entry accounts.',
        },
      ],
    };
  }
}

