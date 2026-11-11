import { IsString, IsOptional, MaxLength } from 'class-validator';

export class TraceQueryDto {
  @IsString()
  @MaxLength(100)
  query: string;

  @IsOptional()
  @IsString()
  companyId?: string;

  @IsOptional()
  @IsString()
  factoryId?: string;
}

export type TraceStageType =
  | 'SUPPLIER'
  | 'GATE_ENTRY'
  | 'WEIGHBRIDGE'
  | 'QUALITY'
  | 'PURCHASE'
  | 'GRN'
  | 'INVENTORY'
  | 'PRODUCTION'
  | 'FINISHED_GOODS'
  | 'SALES'
  | 'PAYMENT'
  | 'ACCOUNTING';

export interface TraceNode {
  id: string;
  stage: TraceStageType;
  title: string;
  code: string;
  status: string;
  timestamp: string;
  details: Record<string, unknown>;
  verified: boolean;
}

export interface TraceLink {
  from: string;
  to: string;
  label: string;
}

export interface TraceGraph {
  query: string;
  found: boolean;
  rootStage: string;
  nodes: TraceNode[];
  links: TraceLink[];
  summary: {
    totalPhysicalKg?: number;
    totalAmountBdt?: number;
    recoveryPct?: number;
    overallIntegrity: 'VERIFIED' | 'DISCREPANCY';
  };
}

