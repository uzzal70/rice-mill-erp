import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum PrintDocumentType {
  PURCHASE_INVOICE = 'PURCHASE_INVOICE',
  PURCHASE_RECEIPT = 'PURCHASE_RECEIPT',
  GATE_PASS = 'GATE_PASS',
  WEIGHBRIDGE_TICKET = 'WEIGHBRIDGE_TICKET',
  QUALITY_REPORT = 'QUALITY_REPORT',
  GRN = 'GRN',
  STOCK_TRANSFER = 'STOCK_TRANSFER',
  PRODUCTION_REPORT = 'PRODUCTION_REPORT',
  SALES_INVOICE = 'SALES_INVOICE',
  DELIVERY_CHALLAN = 'DELIVERY_CHALLAN',
  PAYMENT_RECEIPT = 'PAYMENT_RECEIPT',
  MONEY_RECEIPT = 'MONEY_RECEIPT',
  SUPPLIER_STATEMENT = 'SUPPLIER_STATEMENT',
  CUSTOMER_STATEMENT = 'CUSTOMER_STATEMENT',
}

export class GetPrintDocumentDto {
  @IsString()
  companyId!: string;

  @IsOptional()
  @IsString()
  factoryId?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export interface PrintItemLine {
  serialNo: number;
  itemCode?: string;
  itemName: string;
  description?: string;
  quantity: number;
  unit: string;
  unitPrice?: number;
  totalAmount?: number;
  deductions?: number;
  netAmount?: number;
  remarks?: string;
}

export interface PrintSignatory {
  role: string;
  label: string;
  name?: string;
  date?: string;
}

export interface PrintDocumentData {
  documentType: PrintDocumentType;
  documentTitle: string;
  documentTitleBangla: string;
  documentNumber: string;
  documentDate: string;
  company: {
    id: string;
    name: string;
    legalName?: string;
    logoUrl?: string;
    address: string;
    phone: string;
    email: string;
    binOrVatRegistrationNo?: string;
  };
  factory?: {
    id: string;
    name: string;
    code: string;
    address?: string;
  };
  party?: {
    id: string;
    name: string;
    code?: string;
    phone?: string;
    address?: string;
    type?: string;
    contactPerson?: string;
  };
  referenceNumber?: string;
  status: string;
  metadata: Record<string, any>;
  items: PrintItemLine[];
  totals: {
    totalQuantity: number;
    subtotalAmount?: number;
    deductionAmount?: number;
    taxAmount?: number;
    discountAmount?: number;
    grandTotalAmount?: number;
    inWords?: string;
  };
  terms: string[];
  signatures: PrintSignatory[];
}

export interface DocumentTemplateMeta {
  type: PrintDocumentType;
  title: string;
  titleBangla: string;
  category: 'Commercial' | 'Gate & Weigh' | 'Production' | 'Warehouse' | 'Accounts';
  description: string;
  requiredFields: string[];
}

