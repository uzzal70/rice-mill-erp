import { Test, TestingModule } from '@nestjs/testing';
import { BackupController } from './backup.controller';
import { BackupService } from './backup.service';
import { AuthenticatedRequest } from '../../common/authz';

describe('BackupController (#69)', () => {
  let controller: BackupController;
  let service: BackupService;

  const mockReq = {
    user: {
      id: 'admin-1',
      sessionId: 'sess-1',
      companyIds: ['comp-1'],
      memberships: [{ companyId: 'comp-1', factoryId: 'fact-1' }],
    },
  } as unknown as AuthenticatedRequest;

  beforeEach(async () => {
    const mockBackupService = {
      getBackupOverview: jest.fn().mockReturnValue({
        lastBackup: { filename: 'test.sql.gz', size: '25 MB' },
        totalBackupSizeFormatted: '75 MB',
        backupStatus: 'HEALTHY',
      }),
      createBackup: jest.fn().mockReturnValue({
        id: 'bak-test',
        filename: 'rice_mill_db.sql.gz',
        status: 'COMPLETED',
      }),
      updateRetentionPolicy: jest.fn().mockReturnValue({
        dailyRetentionDays: 45,
      }),
      pruneExpiredBackups: jest.fn().mockReturnValue({
        prunedCount: 1,
      }),
      getRestoreDocumentation: jest.fn().mockReturnValue({
        title: 'Restore Guide',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BackupController],
      providers: [
        { provide: BackupService, useValue: mockBackupService },
      ],
    }).compile();

    controller = module.get<BackupController>(BackupController);
    service = module.get<BackupService>(BackupService);
  });

  it('should return admin backup overview', () => {
    const res = controller.getOverview('comp-1', mockReq);
    expect(res.backupStatus).toBe('HEALTHY');
    expect(service.getBackupOverview).toHaveBeenCalledWith('comp-1');
  });

  it('should create backup', () => {
    const dto = { companyId: 'comp-1', type: 'DATABASE' as const };
    const res = controller.createBackup(dto, mockReq);
    expect(res.status).toBe('COMPLETED');
    expect(service.createBackup).toHaveBeenCalledWith(dto, 'admin-1');
  });

  it('should get restore documentation guide', () => {
    const guide = controller.getRestoreGuide();
    expect(guide.title).toBe('Restore Guide');
  });
});

