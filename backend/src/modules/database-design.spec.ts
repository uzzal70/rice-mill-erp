import * as fs from 'fs';
import * as path from 'path';

describe('Database Design & Schema Verification (#61)', () => {
  const schemaPath = path.resolve(__dirname, '../../../database/prisma/schema.prisma');
  let schemaContent: string;

  beforeAll(() => {
    expect(fs.existsSync(schemaPath)).toBe(true);
    schemaContent = fs.readFileSync(schemaPath, 'utf8');
  });

  it('should include core PostgreSQL schema definition and valid datasource', () => {
    expect(schemaContent).toContain('datasource db');
    expect(schemaContent).toContain('provider = "postgresql"');
    expect(schemaContent).toContain('client-js');
  });

  it('should define all primary operational entities required by promtdoc #61', () => {
    const requiredModels = [
      'Company',
      'Factory',
      'User',
      'Role',
      'Permission',
      'RolePermission',
      'Godown',
      'Stack',
      'Partner',
      'Vehicle',
      'Item',
      'PackagingSpec',
      'GateEntry',
      'WeighbridgeTicket',
      'QualitySample',
      'PurchaseOrder',
      'GoodsReceipt',
      'PurchaseInvoice',
      'StockMovement',
      'StockTransfer',
      'StockAdjustment',
      'StockCount',
      'ProductionBatch',
      'ProductionOutput',
      'DryingBatch',
      'ParboilingBatch',
      'RepackingBatch',
      'SalesOrder',
      'Dispatch',
      'SalesReturn',
      'Account',
      'Journal',
      'JournalLine',
      'Employee',
      'Attendance',
      'Leave',
      'Payroll',
      'Machine',
      'MachineMaintenance',
      'CompanyDocument',
      'AppNotification',
      'AuditEvent',
    ];

    for (const model of requiredModels) {
      const modelRegex = new RegExp(`model\\s+${model}\\s+{`);
      expect(schemaContent).toMatch(modelRegex);
    }
  });

  it('should enforce multi-tenant companyId on all tenant-scoped operational models', () => {
    const tenantScopedModels = [
      'Factory',
      'Godown',
      'Partner',
      'Item',
      'PurchaseOrder',
      'GoodsReceipt',
      'PurchaseInvoice',
      'StockMovement',
      'ProductionBatch',
      'SalesOrder',
      'Dispatch',
      'SalesReturn',
      'Account',
      'Journal',
      'Employee',
      'Machine',
      'CompanyDocument',
      'AppNotification',
    ];

    for (const model of tenantScopedModels) {
      const modelBlockMatch = schemaContent.match(new RegExp(`model\\s+${model}\\s+{([^}]+)}`, 's'));
      expect(modelBlockMatch).not.toBeNull();
      const modelBody = modelBlockMatch![1];
      expect(modelBody).toContain('companyId');
    }
  });

  it('should define unique constraints on natural business keys to prevent duplicates', () => {
    expect(schemaContent).toContain('code               String');
    expect(schemaContent).toContain('@@unique([companyId, code])');
    expect(schemaContent).toContain('orderNumber');
    expect(schemaContent).toContain('ticketNumber');
    expect(schemaContent).toContain('gateNumber');
  });

  it('should define high-performance composite indexes for transaction querying', () => {
    expect(schemaContent).toContain('@@index([companyId, factoryId');
    expect(schemaContent).toContain('@@index([companyId, status');
  });

  it('should enforce referential integrity with foreign key relations and onDelete rules', () => {
    expect(schemaContent).toContain('@relation(fields: [companyId], references: [id]');
    expect(schemaContent).toContain('onDelete: Cascade');
  });
});

