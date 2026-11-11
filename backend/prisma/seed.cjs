const bcrypt = require('bcrypt');
const { PrismaClient, PermissionAction, ProductionType } = require('@prisma/client');

const prisma = new PrismaClient();
const actions = Object.values(PermissionAction);
const resources = [
  'companies', 'factories', 'users', 'roles', 'settings', 'partners', 'items', 'godowns', 'stacks',
  'gate', 'weighbridge', 'quality', 'procurement', 'inventory', 'drying', 'parboiling', 'production',
  'repacking', 'sales', 'dispatch', 'sales-returns', 'toll-milling', 'payments', 'expenses', 'accounting', 'hr', 'payroll', 'maintenance',
  'documents', 'notifications', 'reports', 'analytics', 'audit', 'unit-conversions', 'production-lines', 'moisture-policies',
];

async function upsertRole(companyId, name, code, systemRole, permissions) {
  let role = await prisma.role.findFirst({ where: { companyId, code } });
  if (!role) role = await prisma.role.create({ data: { companyId, name, code, systemRole } });
  else role = await prisma.role.update({ where: { id: role.id }, data: { name, systemRole } });
  await prisma.rolePermission.deleteMany({
    where: { roleId: role.id, ...(permissions.length ? { permissionId: { notIn: permissions } } : {}) },
  });
  await prisma.rolePermission.createMany({
    data: permissions.map(permissionId => ({ roleId: role.id, permissionId })),
    skipDuplicates: true,
  });
  return role;
}

async function upsertPartner(companyId, data) {
  return prisma.partner.upsert({
    where: { companyId_code: { companyId, code: data.code } },
    create: { companyId, ...data },
    update: {},
  });
}

async function upsertItem(companyId, data) {
  return prisma.item.upsert({
    where: { companyId_code: { companyId, code: data.code } },
    create: { companyId, ...data },
    update: {},
  });
}

async function upsertVehicle(companyId, data) {
  return prisma.vehicle.upsert({
    where: { companyId_vehicleNumber: { companyId, vehicleNumber: data.vehicleNumber } },
    create: { companyId, ...data },
    update: {},
  });
}

async function main() {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  if (!email || !password || password.length < 12) {
    throw new Error('Set BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD (at least 12 characters) before seeding.');
  }

  const permissionRecords = [];
  for (const resource of resources) {
    for (const action of actions) {
      const permission = await prisma.permission.upsert({
        where: { resource_action: { resource, action } },
        create: { resource, action },
        update: {},
      });
      permissionRecords.push(permission);
    }
  }

  const permissionIds = permissionRecords.map(permission => permission.id);
  const superAdminRole = await upsertRole(null, 'Super Admin', 'SUPER_ADMIN', true, permissionIds);
  const ownerPermissionIds = permissionRecords
    .filter(permission => permission.resource !== 'companies' || permission.action !== 'CREATE')
    .map(permission => permission.id);

  const company = await prisma.company.upsert({
    where: { code: 'ABC-RICE' },
    create: { name: 'ABC Rice Industries Ltd.', code: 'ABC-RICE', district: 'Bogura', division: 'Rajshahi' },
    update: {},
  });
  const ownerRole = await upsertRole(company.id, 'Owner', 'OWNER', false, ownerPermissionIds);
  const read = ['READ', 'EXPORT'];
  const write = ['READ', 'CREATE', 'UPDATE'];
  const approve = [...write, 'APPROVE', 'REJECT', 'POST'];
  const p = (resourceActions) => permissionRecords
    .filter(permission => (resourceActions[permission.resource] ?? []).includes(permission.action))
    .map(permission => permission.id);
  const operational = ['factories', 'production-lines', 'godowns', 'stacks', 'partners', 'items', 'gate', 'weighbridge', 'quality', 'procurement', 'inventory', 'drying', 'parboiling', 'production', 'repacking', 'sales-returns', 'toll-milling', 'reports'];
  const finance = ['accounting', 'payments', 'expenses', 'reports', 'partners', 'moisture-policies', 'procurement', 'sales-returns', 'toll-milling'];
  const purchaseManagerActions = {
    ...Object.fromEntries(['partners', 'items', 'gate', 'weighbridge', 'quality', 'procurement', 'inventory', 'reports'].map(r => [r, approve])),
    procurement: [...approve, 'VIEW_FINANCIAL'],
  };
  const templates = [
    ['DIRECTOR', 'Director', ownerPermissionIds],
    ['GENERAL_MANAGER', 'General Manager', p(Object.fromEntries([...operational, 'sales', 'dispatch', 'sales-returns', 'toll-milling', 'expenses', 'accounting', 'users', 'maintenance'].map(r => [r, approve])))],
    ['FACTORY_MANAGER', 'Factory Manager', p(Object.fromEntries([...operational, 'expenses', 'maintenance'].map(r => [r, approve])))],
    ['ACCOUNTS_MANAGER', 'Accounts Manager', p(Object.fromEntries(finance.map(r => [r, [...approve, 'VIEW_FINANCIAL']])))],
    ['ACCOUNTANT', 'Accountant', p(Object.fromEntries(finance.map(r => [r, [...write, 'VIEW_FINANCIAL']])))],
    ['PURCHASE_MANAGER', 'Purchase Manager', p(purchaseManagerActions)],
    ['PURCHASE_OFFICER', 'Purchase Officer', p(Object.fromEntries(['partners', 'items', 'gate', 'weighbridge', 'quality', 'procurement'].map(r => [r, write])))],
    ['GATE_OPERATOR', 'Gate Operator', p({ gate: write, weighbridge: read, partners: read, items: read })],
    ['WEIGHBRIDGE_OPERATOR', 'Weighbridge Operator', p({ weighbridge: write, gate: read, partners: read, items: read })],
    ['LAB_TECHNICIAN', 'Lab Technician', p({ quality: write, gate: read, items: read })],
    ['STORE_MANAGER', 'Store Manager', p({ inventory: approve, godowns: write, stacks: write, items: write, reports: read })],
    ['PRODUCTION_MANAGER', 'Production Manager', p({ production: approve, 'production-lines': read, drying: approve, parboiling: approve, inventory: write, items: read, reports: read })],
    ['PRODUCTION_OPERATOR', 'Production Operator', p({ production: write, 'production-lines': read, drying: write, parboiling: write, inventory: read, items: read })],
    ['SALES_MANAGER', 'Sales Manager', p({ sales: approve, dispatch: approve, payments: write, partners: write, inventory: read, reports: [...read, 'VIEW_FINANCIAL'] })],
    ['SALES_OFFICER', 'Sales Officer', p({ sales: write, dispatch: read, partners: read, inventory: read })],
    ['DISPATCH_OFFICER', 'Dispatch Officer', p({ dispatch: write, sales: read, inventory: read, gate: write })],
    ['HR_MANAGER', 'HR Manager', p({ hr: approve, payroll: approve, users: read, reports: read })],
    ['HR_OFFICER', 'HR Officer', p({ hr: write, payroll: read, users: read })],
    ['DRIVER', 'Driver', p({ gate: read, dispatch: read })],
    ['AUDITOR', 'Auditor', p(Object.fromEntries(resources.map(r => [r, [...read, 'VIEW_FINANCIAL']])))],
    ['VIEWER', 'Viewer', p(Object.fromEntries(resources.map(r => [r, read])))],
  ];
  for (const [code, name, grants] of templates) await upsertRole(company.id, name, code, false, grants);
  const bogura = await prisma.factory.upsert({
    where: { companyId_code: { companyId: company.id, code: 'BOGURA' } },
    create: { companyId: company.id, name: 'Bogura Factory', code: 'BOGURA', productionType: ProductionType.AUTO },
    update: {},
  });
  const naogaon = await prisma.factory.upsert({
    where: { companyId_code: { companyId: company.id, code: 'NAOGAON' } },
    create: { companyId: company.id, name: 'Naogaon Factory', code: 'NAOGAON', productionType: ProductionType.PARBOILED },
    update: {},
  });
  const boguraGodown = await prisma.godown.upsert({
    where: { factoryId_code: { factoryId: bogura.id, code: 'GODOWN-A' } },
    create: { companyId: company.id, factoryId: bogura.id, name: 'Godown A', code: 'GODOWN-A' },
    update: {},
  });
  const naogaonGodown = await prisma.godown.upsert({
    where: { factoryId_code: { factoryId: naogaon.id, code: 'GODOWN-B' } },
    create: { companyId: company.id, factoryId: naogaon.id, name: 'Godown B', code: 'GODOWN-B' },
    update: {},
  });
  await prisma.stack.upsert({
    where: { godownId_code: { godownId: boguraGodown.id, code: 'PAD-01' } },
    create: { companyId: company.id, factoryId: bogura.id, godownId: boguraGodown.id, code: 'PAD-01', capacityKg: 100000 },
    update: { capacityKg: 100000 },
  });
  await prisma.stack.upsert({
    where: { godownId_code: { godownId: naogaonGodown.id, code: 'PAD-01' } },
    create: { companyId: company.id, factoryId: naogaon.id, godownId: naogaonGodown.id, code: 'PAD-01', capacityKg: 100000 },
    update: { capacityKg: 100000 },
  });
  await upsertVehicle(company.id, {
    vehicleNumber: 'BOGURA-METRO-T-11-0101',
    registrationNumber: 'BOGURA-METRO-T-11-0101',
    vehicleType: 'TRUCK',
    ownerName: 'North Bengal Grain Transport',
    driverName: 'Demo Driver One',
  });
  await upsertVehicle(company.id, {
    vehicleNumber: 'NAOGAON-METRO-T-11-0202',
    registrationNumber: 'NAOGAON-METRO-T-11-0202',
    vehicleType: 'TRUCK',
    ownerName: 'North Bengal Grain Transport',
    driverName: 'Demo Driver Two',
  });

  const supplier = await upsertPartner(company.id, { type: 'SUPPLIER', name: 'Bogura Agro Traders', code: 'SUP-001', paymentTermsDays: 7 });
  await upsertPartner(company.id, { type: 'SUPPLIER', name: 'Haji Shafiul Grain Traders', code: 'SUP-002', paymentTermsDays: 15 });
  await upsertPartner(company.id, { type: 'FARMER', name: 'Rahima Begum', code: 'FAR-001' });
  await upsertPartner(company.id, { type: 'FARMER', name: 'Mokbul Hossain', code: 'FAR-002' });
  await upsertPartner(company.id, { type: 'BROKER', name: 'North Bengal Grain Brokers', code: 'BRK-001', commissionType: 'PER_MON', commissionRate: 12 });
  await upsertPartner(company.id, { type: 'BROKER', name: 'Al-Madina Grain Brokerage', code: 'BRK-002', commissionType: 'PER_MON', commissionRate: 10 });
  await upsertPartner(company.id, { type: 'CUSTOMER', name: 'Bogura Wholesale Rice', code: 'CUS-001', creditLimit: 500000, paymentTermsDays: 14 });
  await upsertPartner(company.id, { type: 'CUSTOMER', name: 'North Bengal Distributors', code: 'CUS-002' });
  await upsertPartner(company.id, { type: 'CUSTOMER', name: 'Karwan Bazar Rice Wholesale', code: 'CUS-003', creditLimit: 1000000, paymentTermsDays: 21 });

  const paddyItems = [
    ['BR-28', 'BRRI Dhan 28', 14, 68], ['BR-29', 'BRRI Dhan 29', 14, 70], ['BR-49', 'BRRI Dhan 49', 14, 68],
    ['MINIKIT-PADDY', 'Miniket Paddy', 14, 67], ['NAJIRSHAIL-PADDY', 'Najirshail Paddy', 14, 65],
  ];
  for (const [code, name, standardMoisture, standardRecovery] of paddyItems) {
    await upsertItem(company.id, { kind: 'PADDY', name, code, variety: name, standardMoisture, standardRecovery });
  }
  for (const [code, name, riceType, headRicePercentage, brokenPercentage] of [
    ['MINIKIT-RICE', 'Miniket Rice', 'MINIKET', 75, 20], ['NAJIR-RICE', 'Najirshail Rice', 'NAJIRSHAIL', 70, 25],
    ['PARBOILED-RICE', 'Parboiled Rice', 'PARBOILED', 65, 25], ['BROKEN-RICE', 'Broken Rice', 'BROKEN', 0, 100],
  ]) {
    await upsertItem(company.id, { kind: 'RICE', name, code, riceType, headRicePercentage, brokenPercentage });
  }
  for (const [code, name, byProductType, purchasePrice, salesPrice] of [
    ['BRAN', 'Rice Bran', 'BRAN', 22, 28],
    ['HUSK', 'Husk', 'HUSK', 6, 10],
    ['POLISH', 'Rice Polish', 'RICE_POLISH', 18, 24],
    ['BROKEN-BYPRODUCT', 'Broken Rice', 'BROKEN_RICE', 18, 24],
    ['DUST', 'Rice Dust', 'DUST', 2, 4],
    ['WASTE', 'Rice Waste', 'WASTE', 1, 2],
  ]) {
    const item = await upsertItem(company.id, { kind: 'BY_PRODUCT', name, code, byProductType, purchasePrice, salesPrice });
    if (item.byProductType !== byProductType) {
      await prisma.item.update({ where: { id: item.id }, data: { byProductType } });
    }
  }
  for (const [code, name, sizeKg] of [
    ['BAG-5KG', '5 KG Woven Sack', 5],
    ['BAG-10KG', '10 KG Woven Sack', 10],
    ['BAG-20KG', '20 KG Woven Sack', 20],
    ['BAG-25KG', '25 KG Woven Sack', 25],
    ['BAG-50KG', '50 KG Woven Sack', 50],
  ]) {
    const item = await upsertItem(company.id, { kind: 'PACKAGING', name, code, baseUnit: 'PIECE' });
    await prisma.packagingSpec.upsert({
      where: { itemId: item.id },
      create: { companyId: company.id, itemId: item.id, supplierPartnerId: supplier.id, bagType: 'WOVEN_SACK', sizeKg, material: 'POLYPROPYLENE', unitCost: 7 },
      update: { unitCost: 7, sizeKg, material: 'POLYPROPYLENE' },
    });
  }
  const effectiveFrom = new Date('2026-01-01T00:00:00.000Z');
  for (const [fromUnit, toUnit, factor] of [['MON', 'KG', 40], ['KG', 'MON', 0.025], ['TON', 'KG', 1000], ['KG', 'TON', 0.001]]) {
    await prisma.unitConversion.upsert({
      where: { companyId_fromUnit_toUnit_effectiveFrom: { companyId: company.id, fromUnit, toUnit, effectiveFrom } },
      create: { companyId: company.id, fromUnit, toUnit, factor, effectiveFrom },
      update: { factor },
    });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.upsert({
    where: { email },
    create: { email, fullName: process.env.BOOTSTRAP_ADMIN_NAME ?? 'System Administrator', passwordHash, status: 'ACTIVE', emailVerifiedAt: new Date() },
    update: {},
  });
  if (user.status !== 'ACTIVE' || !user.passwordHash) {
    throw new Error(`Bootstrap email ${email} already exists but is not an active password account. Resolve it manually before seeding.`);
  }
  let membership = await prisma.membership.findFirst({ where: { userId: user.id, companyId: company.id, factoryId: null } });
  if (!membership) membership = await prisma.membership.create({ data: { userId: user.id, companyId: company.id } });
  await prisma.userRole.upsert({
    where: { membershipId_roleId: { membershipId: membership.id, roleId: superAdminRole.id } },
    create: { membershipId: membership.id, roleId: superAdminRole.id },
    update: {},
  });
  await prisma.userRole.upsert({
    where: { membershipId_roleId: { membershipId: membership.id, roleId: ownerRole.id } },
    create: { membershipId: membership.id, roleId: ownerRole.id },
    update: {},
  });

  // Seed standard demo user accounts for various roles
  const demoUsers = [
    { email: 'manager@ricemill.com', name: 'General Manager Rahim', pass: 'Manager123456!', roles: ['GENERAL_MANAGER', 'FACTORY_MANAGER'] },
    { email: 'accountant@ricemill.com', name: 'Chief Accountant Karim', pass: 'Accountant123456!', roles: ['ACCOUNTS_MANAGER', 'ACCOUNTANT'] },
    { email: 'store@ricemill.com', name: 'Storekeeper Alam', pass: 'Store123456!', roles: ['STORE_MANAGER'] },
    { email: 'gate@ricemill.com', name: 'Gate Operator Jamal', pass: 'Gate123456!', roles: ['GATE_OPERATOR', 'WEIGHBRIDGE_OPERATOR'] },
    { email: 'sales@ricemill.com', name: 'Sales Manager Tareq', pass: 'Sales123456!', roles: ['SALES_MANAGER', 'SALES_OFFICER'] },
  ];

  for (const du of demoUsers) {
    const pHash = await bcrypt.hash(du.pass, 12);
    const u = await prisma.user.upsert({
      where: { email: du.email },
      create: { email: du.email, fullName: du.name, passwordHash: pHash, status: 'ACTIVE', emailVerifiedAt: new Date() },
      update: { passwordHash: pHash, status: 'ACTIVE' },
    });
    let m = await prisma.membership.findFirst({ where: { userId: u.id, companyId: company.id } });
    if (!m) m = await prisma.membership.create({ data: { userId: u.id, companyId: company.id } });
    for (const rCode of du.roles) {
      const r = await prisma.role.findFirst({ where: { companyId: company.id, code: rCode } });
      if (r) {
        await prisma.userRole.upsert({
          where: { membershipId_roleId: { membershipId: m.id, roleId: r.id } },
          create: { membershipId: m.id, roleId: r.id },
          update: {},
        });
      }
    }
  }

  // Promptdoc #73: Seed Realistic Demo Transactions (Batches, Sales, Expenses, Payments)
  const br28Paddy = await prisma.item.findFirst({ where: { companyId: company.id, code: 'BR-28' } });
  const boguraStack = await prisma.stack.findFirst({ where: { godownId: boguraGodown.id, code: 'PAD-01' } });
  if (br28Paddy && boguraStack) {
    await prisma.productionBatch.upsert({
      where: { companyId_batchNumber: { companyId: company.id, batchNumber: 'BAT-2026-001' } },
      create: {
        companyId: company.id,
        factoryId: bogura.id,
        batchNumber: 'BAT-2026-001',
        inputItemId: br28Paddy.id,
        inputStackId: boguraStack.id,
        inputQuantityKg: 4000,
        totalOutputKg: 3900,
        processLossKg: 100,
        headRiceRecoveryPct: 65.0,
        totalRiceRecoveryPct: 72.5,
        byProductRecoveryPct: 22.5,
        standardRecoveryPct: 68.0,
        status: 'POSTED',
        startedAt: new Date('2026-02-01T08:00:00Z'),
        completedAt: new Date('2026-02-01T16:00:00Z'),
        remarks: 'Standard 4000 KG mass-balance milling demo batch',
        createdById: user.id,
        approvedById: user.id,
        approvedAt: new Date('2026-02-01T16:30:00Z'),
        postedById: user.id,
        postedAt: new Date('2026-02-01T17:00:00Z'),
      },
      update: {},
    });
  }

  const customerCus1 = await prisma.partner.findFirst({ where: { companyId: company.id, code: 'CUS-001' } });
  if (customerCus1) {
    await prisma.salesOrder.upsert({
      where: { companyId_orderNumber: { companyId: company.id, orderNumber: 'SO-2026-001' } },
      create: {
        companyId: company.id,
        factoryId: bogura.id,
        customerId: customerCus1.id,
        orderNumber: 'SO-2026-001',
        channel: 'WHOLESALE',
        status: 'APPROVED',
        currency: 'BDT',
        totalAmount: 176800,
        remarks: 'Direct wholesale delivery order for 2600 KG Miniket Rice',
        createdById: user.id,
        approvedById: user.id,
        approvedAt: new Date('2026-02-02T10:00:00Z'),
      },
      update: {},
    });
  }

  const existingElectricityExp = await prisma.expense.findFirst({
    where: { companyId: company.id, voucherNumber: 'EXP-2026-001' },
  });
  if (!existingElectricityExp) {
    await prisma.expense.create({
      data: {
        companyId: company.id,
        factoryId: bogura.id,
        voucherNumber: 'EXP-2026-001',
        title: 'Monthly Mill Electricity Bill (NESCO)',
        category: 'ELECTRICITY',
        type: 'FACTORY_EXPENSE',
        paymentMode: 'BANK',
        status: 'POSTED',
        subtotalAmount: 85000,
        taxAmount: 0,
        totalAmount: 85000,
        createdById: user.id,
        approvedById: user.id,
        postedById: user.id,
      },
    });
  }

  const existingDieselExp = await prisma.expense.findFirst({
    where: { companyId: company.id, voucherNumber: 'EXP-2026-002' },
  });
  if (!existingDieselExp) {
    await prisma.expense.create({
      data: {
        companyId: company.id,
        factoryId: bogura.id,
        voucherNumber: 'EXP-2026-002',
        title: 'Boiler Diesel Fuel 400L (Padma Oil)',
        category: 'DIESEL',
        type: 'FACTORY_EXPENSE',
        paymentMode: 'CASH',
        status: 'POSTED',
        subtotalAmount: 42000,
        taxAmount: 0,
        totalAmount: 42000,
        createdById: user.id,
        approvedById: user.id,
        postedById: user.id,
      },
    });
  }

  const existingLaborExp = await prisma.expense.findFirst({
    where: { companyId: company.id, voucherNumber: 'EXP-2026-003' },
  });
  if (!existingLaborExp) {
    await prisma.expense.create({
      data: {
        companyId: company.id,
        factoryId: bogura.id,
        voucherNumber: 'EXP-2026-003',
        title: 'Loading & Unloading Labor Wages (Daily Worker Union)',
        category: 'LABOUR',
        type: 'FACTORY_EXPENSE',
        paymentMode: 'CASH',
        status: 'POSTED',
        subtotalAmount: 18500,
        taxAmount: 0,
        totalAmount: 18500,
        createdById: user.id,
        approvedById: user.id,
        postedById: user.id,
      },
    });
  }

  await prisma.journal.upsert({
    where: { companyId_number: { companyId: company.id, number: 'PMT-2026-001' } },
    create: {
      companyId: company.id,
      factoryId: bogura.id,
      number: 'PMT-2026-001',
      voucherType: 'PAYMENT',
      sourceType: 'SUPPLIER_PAYMENT',
      sourceId: supplier.id,
      partnerId: supplier.id,
      status: 'POSTED',
      totalAmount: 150000,
      narration: 'Advance payment against paddy purchase contract',
      createdById: user.id,
      postedAt: new Date('2026-02-03T11:00:00Z'),
    },
    update: {},
  });

  console.log(`Seeded ${company.name}, ${bogura.name}, permission catalog, demo transactions, and administrator ${email}.`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => prisma.$disconnect());
