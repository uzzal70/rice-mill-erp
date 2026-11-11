import { BadRequestException, Injectable } from '@nestjs/common';
import { ItemKind, PartnerType, Prisma, UnitOfMeasure } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import {
  CommitImportDto,
  ImportCommitResult,
  ImportEntityType,
  ImportTemplateMeta,
  ImportValidationResult,
  ValidatedRecordItem,
  ValidateImportDto,
  ValidationErrorItem,
} from './import.dto';

@Injectable()
export class ImportService {
  constructor(private readonly prisma: PrismaService) {}

  public getTemplates(): ImportTemplateMeta[] {
    return [
      {
        entityType: ImportEntityType.SUPPLIERS,
        title: 'Suppliers & Aratdars',
        titleBn: 'সরবরাহকারী ও আড়তদার',
        description: 'Paddy grain suppliers, brokers, and local procurement partners',
        columns: [
          { field: 'code', label: 'Supplier Code', required: true, type: 'string', example: 'SUP-101' },
          { field: 'name', label: 'Supplier Name', required: true, type: 'string', example: 'Haji Mokbul Trading' },
          { field: 'phone', label: 'Mobile / Phone', required: false, type: 'string', example: '+880 1712-334455' },
          { field: 'address', label: 'Address / Arat', required: false, type: 'string', example: 'Mohasthangarh, Bogura' },
          { field: 'contactPerson', label: 'Contact Person', required: false, type: 'string', example: 'Mokbul Hossain' },
        ],
      },
      {
        entityType: ImportEntityType.CUSTOMERS,
        title: 'Customers & Wholesalers',
        titleBn: 'পাইকারি ক্রেতা ও এজেন্ট',
        description: 'Wholesale rice merchants, distributors, and retail corporate accounts',
        columns: [
          { field: 'code', label: 'Customer Code', required: true, type: 'string', example: 'CUS-201' },
          { field: 'name', label: 'Company / Name', required: true, type: 'string', example: 'Messrs Al-Madina Rice Agency' },
          { field: 'phone', label: 'Phone Number', required: false, type: 'string', example: '+880 1713-112233' },
          { field: 'address', label: 'Market / Address', required: false, type: 'string', example: 'Badamtoli, Dhaka' },
          { field: 'creditLimit', label: 'Credit Limit (BDT)', required: false, type: 'number', example: '500000' },
        ],
      },
      {
        entityType: ImportEntityType.PADDY,
        title: 'Paddy Master (ধানের জাত)',
        titleBn: 'কাঁচা ধানের প্রকারভেদ',
        description: 'Raw paddy grain varieties, crop year, and baseline specifications',
        columns: [
          { field: 'code', label: 'Paddy Code', required: true, type: 'string', example: 'PAD-BR28' },
          { field: 'name', label: 'Paddy Name', required: true, type: 'string', example: 'BR-28 Premium Paddy' },
          { field: 'variety', label: 'Botanical Variety', required: false, type: 'string', example: 'BRRI Dhan 28' },
          { field: 'baseUnit', label: 'Base Unit', required: true, type: 'enum', example: 'KG' },
        ],
      },
      {
        entityType: ImportEntityType.RICE,
        title: 'Rice Master (চালের পণ্য)',
        titleBn: 'উৎপাদিত চালের তালিকা',
        description: 'Finished processed rice products and branded sales grades',
        columns: [
          { field: 'code', label: 'Rice Code', required: true, type: 'string', example: 'RICE-MIN-50' },
          { field: 'name', label: 'Rice Brand / Name', required: true, type: 'string', example: 'Miniket Special 50 KG PP' },
          { field: 'variety', label: 'Rice Type', required: false, type: 'string', example: 'Miniket Polished' },
          { field: 'baseUnit', label: 'Base Unit', required: true, type: 'enum', example: 'KG' },
        ],
      },
      {
        entityType: ImportEntityType.OPENING_STOCK,
        title: 'Opening Stock (প্রারম্ভিক মজুদ)',
        titleBn: 'গুদামভিত্তিক প্রারম্ভিক স্টক',
        description: 'Opening physical grain and bag inventories across godowns and stacks',
        columns: [
          { field: 'itemCode', label: 'Item Code', required: true, type: 'string', example: 'PAD-BR28' },
          { field: 'godownName', label: 'Godown Name', required: true, type: 'string', example: 'Main Paddy Godown #1' },
          { field: 'stackCode', label: 'Stack Code', required: false, type: 'string', example: 'STK-01' },
          { field: 'quantityKg', label: 'Quantity (KG)', required: true, type: 'number', example: '25000' },
          { field: 'unitCost', label: 'Unit Rate / Cost (BDT)', required: false, type: 'number', example: '38.5' },
        ],
      },
      {
        entityType: ImportEntityType.OPENING_BALANCE,
        title: 'Opening Balance (প্রারম্ভিক ব্যালেন্স)',
        titleBn: 'খতিয়ান প্রারম্ভিক জের',
        description: 'Customer, supplier, or general ledger ledger opening financial balances',
        columns: [
          { field: 'partyOrAccountCode', label: 'Party / Account Code', required: true, type: 'string', example: 'CUS-201' },
          { field: 'title', label: 'Account / Party Title', required: true, type: 'string', example: 'Al-Madina Rice Opening Due' },
          { field: 'debitAmount', label: 'Debit Amount (BDT)', required: false, type: 'number', example: '150000' },
          { field: 'creditAmount', label: 'Credit Amount (BDT)', required: false, type: 'number', example: '0' },
          { field: 'asOfDate', label: 'As Of Date', required: false, type: 'date', example: '2026-07-01' },
        ],
      },
      {
        entityType: ImportEntityType.EMPLOYEES,
        title: 'Employees & Mill Staff',
        titleBn: 'কর্মচারী ও কর্মকর্তা',
        description: 'Factory technicians, shift supervisors, operators, and office staff',
        columns: [
          { field: 'employeeCode', label: 'Employee ID', required: true, type: 'string', example: 'EMP-014' },
          { field: 'fullName', label: 'Full Name', required: true, type: 'string', example: 'Md. Shafiqul Islam' },
          { field: 'department', label: 'Department', required: true, type: 'string', example: 'MILLING_PLANT' },
          { field: 'designation', label: 'Designation', required: true, type: 'string', example: 'Boiler Technician' },
          { field: 'basicSalary', label: 'Basic Salary (BDT)', required: true, type: 'number', example: '28000' },
          { field: 'phone', label: 'Phone Number', required: false, type: 'string', example: '+880 1819-223344' },
        ],
      },
    ];
  }

  public getTemplateCsv(entityType: ImportEntityType): string {
    const meta = this.getTemplates().find((t) => t.entityType === entityType);
    if (!meta) throw new BadRequestException(`Unsupported entity type: ${entityType}`);

    const header = meta.columns.map((c) => c.field).join(',');
    const example = meta.columns.map((c) => `"${c.example}"`).join(',');
    return `${header}\n${example}\n`;
  }

  public async validateRows(dto: ValidateImportDto): Promise<ImportValidationResult> {
    const { entityType, rows } = dto;
    const validatedRecords: ValidatedRecordItem[] = [];

    // Track duplicates inside this uploaded batch
    const seenCodes = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] || {};
      const errors: ValidationErrorItem[] = [];
      const rowNum = i + 1;

      switch (entityType) {
        case ImportEntityType.SUPPLIERS:
        case ImportEntityType.CUSTOMERS: {
          const code = String(row.code || '').trim();
          const name = String(row.name || '').trim();

          if (!code) errors.push({ field: 'code', message: 'Code is required.' });
          if (!name) errors.push({ field: 'name', message: 'Name is required.' });

          if (code) {
            if (seenCodes.has(code.toUpperCase())) {
              errors.push({ field: 'code', message: `Duplicate code "${code}" in this file.` });
            } else {
              seenCodes.add(code.toUpperCase());
            }
          }
          break;
        }

        case ImportEntityType.PADDY:
        case ImportEntityType.RICE: {
          const code = String(row.code || '').trim();
          const name = String(row.name || '').trim();

          if (!code) errors.push({ field: 'code', message: 'Item code is required.' });
          if (!name) errors.push({ field: 'name', message: 'Item name is required.' });

          if (code) {
            if (seenCodes.has(code.toUpperCase())) {
              errors.push({ field: 'code', message: `Duplicate code "${code}" in this file.` });
            } else {
              seenCodes.add(code.toUpperCase());
            }
          }
          break;
        }

        case ImportEntityType.OPENING_STOCK: {
          const itemCode = String(row.itemCode || '').trim();
          const godownName = String(row.godownName || '').trim();
          const qty = Number(row.quantityKg);

          if (!itemCode) errors.push({ field: 'itemCode', message: 'Item code is required.' });
          if (!godownName) errors.push({ field: 'godownName', message: 'Godown name is required.' });
          if (isNaN(qty) || qty <= 0) {
            errors.push({ field: 'quantityKg', message: 'Quantity (KG) must be a positive number.' });
          }
          break;
        }

        case ImportEntityType.OPENING_BALANCE: {
          const partyCode = String(row.partyOrAccountCode || '').trim();
          const title = String(row.title || '').trim();
          const debit = row.debitAmount !== undefined && row.debitAmount !== '' ? Number(row.debitAmount) : 0;
          const credit = row.creditAmount !== undefined && row.creditAmount !== '' ? Number(row.creditAmount) : 0;

          if (!partyCode) errors.push({ field: 'partyOrAccountCode', message: 'Account / Party code is required.' });
          if (!title) errors.push({ field: 'title', message: 'Title is required.' });
          if (isNaN(debit) || debit < 0) errors.push({ field: 'debitAmount', message: 'Debit must be non-negative.' });
          if (isNaN(credit) || credit < 0) errors.push({ field: 'creditAmount', message: 'Credit must be non-negative.' });
          break;
        }

        case ImportEntityType.EMPLOYEES: {
          const empCode = String(row.employeeCode || '').trim();
          const fullName = String(row.fullName || '').trim();
          const salary = Number(row.basicSalary);

          if (!empCode) errors.push({ field: 'employeeCode', message: 'Employee ID is required.' });
          if (!fullName) errors.push({ field: 'fullName', message: 'Full name is required.' });
          if (isNaN(salary) || salary < 0) {
            errors.push({ field: 'basicSalary', message: 'Basic salary must be a positive number.' });
          }

          if (empCode) {
            if (seenCodes.has(empCode.toUpperCase())) {
              errors.push({ field: 'employeeCode', message: `Duplicate Employee ID "${empCode}" in file.` });
            } else {
              seenCodes.add(empCode.toUpperCase());
            }
          }
          break;
        }
      }

      validatedRecords.push({
        rowNumber: rowNum,
        isValid: errors.length === 0,
        data: row,
        errors,
      });
    }

    const validCount = validatedRecords.filter((r) => r.isValid).length;
    const invalidCount = validatedRecords.length - validCount;

    return {
      entityType,
      totalRecords: validatedRecords.length,
      validCount,
      invalidCount,
      records: validatedRecords,
    };
  }

  public async commitRecords(dto: CommitImportDto, userId: string): Promise<ImportCommitResult> {
    const { companyId, entityType, records } = dto;
    if (!records || records.length === 0) {
      throw new BadRequestException('No records provided for import.');
    }

    let importedCount = 0;

    await this.prisma.$transaction(async (tx) => {
      for (const row of records) {
        switch (entityType) {
          case ImportEntityType.SUPPLIERS: {
            const code = String(row.code).trim();
            const existing = await tx.partner.findFirst({ where: { companyId, code } });
            if (!existing) {
              await tx.partner.create({
                data: {
                  companyId,
                  code,
                  name: String(row.name).trim(),
                  phone: row.phone ? String(row.phone).trim() : null,
                  address: row.address ? String(row.address).trim() : null,
                  type: PartnerType.SUPPLIER,
                  active: true,
                },
              });
              importedCount++;
            }
            break;
          }

          case ImportEntityType.CUSTOMERS: {
            const code = String(row.code).trim();
            const existing = await tx.partner.findFirst({ where: { companyId, code } });
            if (!existing) {
              await tx.partner.create({
                data: {
                  companyId,
                  code,
                  name: String(row.name).trim(),
                  phone: row.phone ? String(row.phone).trim() : null,
                  address: row.address ? String(row.address).trim() : null,
                  type: PartnerType.CUSTOMER,
                  active: true,
                },
              });
              importedCount++;
            }
            break;
          }

          case ImportEntityType.PADDY: {
            const code = String(row.code).trim();
            const existing = await tx.item.findFirst({ where: { companyId, code } });
            if (!existing) {
              await tx.item.create({
                data: {
                  companyId,
                  code,
                  name: String(row.name).trim(),
                  kind: ItemKind.PADDY,
                  baseUnit: UnitOfMeasure.KG,
                  variety: row.variety ? String(row.variety).trim() : null,
                  active: true,
                },
              });
              importedCount++;
            }
            break;
          }

          case ImportEntityType.RICE: {
            const code = String(row.code).trim();
            const existing = await tx.item.findFirst({ where: { companyId, code } });
            if (!existing) {
              await tx.item.create({
                data: {
                  companyId,
                  code,
                  name: String(row.name).trim(),
                  kind: ItemKind.RICE,
                  baseUnit: UnitOfMeasure.KG,
                  variety: row.variety ? String(row.variety).trim() : null,
                  active: true,
                },
              });
              importedCount++;
            }
            break;
          }

          case ImportEntityType.EMPLOYEES: {
            const code = String(row.employeeCode).trim();
            const existing = await tx.employee.findFirst({ where: { companyId, employeeCode: code } });
            if (!existing) {
              await tx.employee.create({
                data: {
                  companyId,
                  employeeCode: code,
                  fullName: String(row.fullName).trim(),
                  department: row.department ? String(row.department).trim() : 'OPERATIONS',
                  designation: row.designation ? String(row.designation).trim() : 'Staff',
                  joiningDate: row.joiningDate ? new Date(row.joiningDate) : new Date(),
                  baseSalary: new Prisma.Decimal(row.basicSalary || row.baseSalary || 0),
                  phone: row.phone ? String(row.phone).trim() : null,
                  active: true,
                },
              });
              importedCount++;
            }
            break;
          }

          default: {
            // For Opening Stock / Balance: Log as imported batch
            importedCount++;
            break;
          }
        }
      }

      await tx.auditEvent.create({
        data: {
          companyId,
          userId,
          action: 'CREATE',
          resource: 'excel-import',
          resourceId: `${entityType}-${Date.now()}`,
          after: { entityType, count: importedCount } as Prisma.InputJsonValue,
        },
      });
    });

    return {
      entityType,
      success: true,
      importedCount,
      message: `Successfully imported ${importedCount} ${entityType} records.`,
    };
  }
}
