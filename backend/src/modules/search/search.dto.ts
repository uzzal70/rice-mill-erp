import { IsOptional, IsString } from 'class-validator';

export class GlobalSearchQueryDto {
  @IsString()
  companyId!: string;

  @IsString()
  query!: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  limit?: number;
}

export type SearchEntityCategory =
  | 'SUPPLIER'
  | 'FARMER'
  | 'CUSTOMER'
  | 'VEHICLE'
  | 'INVOICE'
  | 'PURCHASE'
  | 'SALES'
  | 'BATCH'
  | 'STOCK'
  | 'GATE_PASS'
  | 'WEIGHBRIDGE_TICKET'
  | 'PAYMENT';

export interface SearchResultItem {
  id: string;
  category: SearchEntityCategory;
  categoryLabel: string;
  categoryLabelBn: string;
  title: string;
  subtitle: string;
  badge?: string;
  navigationKey: string;
  referenceId: string;
  metadata?: Record<string, any>;
}

export interface GlobalSearchResponse {
  query: string;
  totalMatches: number;
  categoryCounts: Record<string, number>;
  results: SearchResultItem[];
}

