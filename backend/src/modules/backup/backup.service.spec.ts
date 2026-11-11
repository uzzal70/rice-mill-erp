import { Test, TestingModule } from '@nestjs/testing';
import { BackupService } from './backup.service';

describe('BackupService (#69 Backup & Disaster Recovery)', () => {
  let service: BackupService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BackupService],
    }).compile();

    service = module.get<BackupService>(BackupService);
  });

  it('should provide admin overview with Last Backup, Backup Size, and Backup Status', () => {
    const overview = service.getBackupOverview('default');

    // Admin dashboard: Last Backup
    expect(overview.lastBackup).toBeDefined();
    expect(overview.lastBackup?.filename).toContain('.sql.gz');

    // Admin dashboard: Backup Size
    expect(overview.totalBackupSizeBytes).toBeGreaterThan(0);
    expect(overview.totalBackupSizeFormatted).toMatch(/^[0-9.]+\s(MB|GB)$/);

    // Admin dashboard: Backup Status
    expect(overview.backupStatus).toBe('HEALTHY');

    // Retention policy
    expect(overview.retentionPolicy.dailyRetentionDays).toBe(30);
    expect(overview.recentBackups.length).toBeGreaterThan(0);
  });

  it('should create new manual database backup snapshot with checksum', () => {
    const backup = service.createBackup({
      companyId: 'default',
      type: 'DATABASE',
      notes: 'Pre-upgrade snapshot',
    });

    expect(backup.id).toBeDefined();
    expect(backup.type).toBe('DATABASE');
    expect(backup.filename).toMatch(/^rice_mill_database_[0-9]+\.sql\.gz$/);
    expect(backup.status).toBe('COMPLETED');
    expect(backup.checksumSha256).toBeDefined();
  });

  it('should update retention policy configuration', () => {
    const updated = service.updateRetentionPolicy({
      companyId: 'default',
      dailyRetentionDays: 60,
      weeklyRetentionWeeks: 24,
      monthlyRetentionMonths: 24,
    });

    expect(updated.dailyRetentionDays).toBe(60);
    expect(updated.weeklyRetentionWeeks).toBe(24);
  });

  it('should format bytes to human-readable strings (B, KB, MB, GB)', () => {
    expect(service.formatBytes(1024)).toBe('1 KB');
    expect(service.formatBytes(1048576 * 25)).toBe('25 MB');
    expect(service.formatBytes(1073741824 * 2.5)).toBe('2.5 GB');
  });

  it('should return step-by-step restore documentation with commands', () => {
    const guide = service.getRestoreDocumentation();
    expect(guide.title).toBeDefined();
    expect(guide.prerequisites.length).toBeGreaterThan(0);
    expect(guide.steps.length).toBe(5);
    expect(guide.steps[0].command).toContain('sha256sum');
    expect(guide.steps[2].command).toContain('psql');
  });
});

