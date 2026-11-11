import { Controller, Get, Post, Body, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthenticatedRequest, RequirePermission } from '../../common/authz';
import { PermissionAction } from '@prisma/client';
import { BackupService } from './backup.service';
import { CreateBackupDto, UpdateRetentionPolicyDto } from './backup.dto';

@ApiTags('Backup & Disaster Recovery (#69)')
@ApiBearerAuth()
@Controller('backup')
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Get('overview')
  @RequirePermission('settings', PermissionAction.READ)
  @ApiOperation({ summary: 'Get backup admin dashboard overview (Last Backup, Size, Status, Retention)' })
  getOverview(@Query('companyId') queryCompanyId?: string, @Req() req?: AuthenticatedRequest) {
    const companyId = queryCompanyId || req?.user?.companyIds?.[0] || 'default';
    return this.backupService.getBackupOverview(companyId);
  }

  @Post('create')
  @RequirePermission('settings', PermissionAction.CREATE)
  @ApiOperation({ summary: 'Trigger manual on-demand database or file backup snapshot' })
  createBackup(@Body() dto: CreateBackupDto, @Req() req: AuthenticatedRequest) {
    const userId = req?.user?.id || 'admin-user';
    return this.backupService.createBackup(dto, userId);
  }

  @Post('retention')
  @RequirePermission('settings', PermissionAction.UPDATE)
  @ApiOperation({ summary: 'Update backup retention policy settings' })
  updateRetention(@Body() dto: UpdateRetentionPolicyDto) {
    return this.backupService.updateRetentionPolicy(dto);
  }

  @Post('prune')
  @RequirePermission('settings', PermissionAction.DELETE)
  @ApiOperation({ summary: 'Prune backup snapshots older than retention threshold' })
  pruneBackups(@Query('companyId') companyId?: string) {
    return this.backupService.pruneExpiredBackups(companyId || 'default');
  }

  @Get('restore-guide')
  @RequirePermission('settings', PermissionAction.READ)
  @ApiOperation({ summary: 'Get step-by-step database restore and disaster recovery guide' })
  getRestoreGuide() {
    return this.backupService.getRestoreDocumentation();
  }
}

