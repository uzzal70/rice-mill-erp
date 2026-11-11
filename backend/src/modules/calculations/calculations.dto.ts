import { IsNumber, IsOptional, IsArray, ValidateNested, Min, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class NetWeightDto {
  @IsNumber()
  @Min(0)
  grossWeightKg: number;

  @IsNumber()
  @Min(0)
  tareWeightKg: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  bagCount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  bagTareWeightKg?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  deductionsKg?: number;
}

export class MoistureDeductionDto {
  @IsNumber()
  @Min(0)
  weightKg: number;

  @IsNumber()
  @Min(0)
  moisturePercent: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  baseMoisturePercent?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  deductionPerPercent?: number;
}

export class AdjustedQuantityDto {
  @IsNumber()
  @Min(0)
  actualWeightKg: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  moistureDeductionKg?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  foreignMatterDeductionKg?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  otherDeductionsKg?: number;
}

export class PurchaseCostDto {
  @IsNumber()
  @Min(0)
  payableWeightKg: number;

  @IsNumber()
  @Min(0)
  ratePerKg: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  bagCount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  bagRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  laborCost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  deductions?: number;
}

export class LandedCostDto {
  @IsNumber()
  @Min(0)
  purchaseCost: number;

  @IsNumber()
  @Min(0.01)
  payableWeightKg: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  transportCost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  loadingCost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unloadingCost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  brokerageCost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  insuranceCost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  otherDirectCosts?: number;
}

export class ProductionRecoveryDto {
  @IsNumber()
  @Min(0.01)
  paddyInputKg: number;

  @IsNumber()
  @Min(0)
  headRiceKg: number;

  @IsNumber()
  @Min(0)
  brokenRiceKg: number;

  @IsNumber()
  @Min(0)
  branKg: number;

  @IsNumber()
  @Min(0)
  huskKg: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  wasteKg?: number;
}

export class ByProductItemDto {
  @IsString()
  type: string;

  @IsNumber()
  @Min(0)
  quantityKg: number;

  @IsNumber()
  @Min(0)
  ratePerKg: number;
}

export class ByProductValueDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ByProductItemDto)
  byProducts: ByProductItemDto[];
}

export class ProductionCostDto {
  @IsNumber()
  @Min(0)
  paddyCost: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  electricityCost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  laborCost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  boilerFuelCost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  machineDepreciation?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  packingCost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  byProductRevenueOffset?: number;
}

export class RiceCostDto {
  @IsNumber()
  @Min(0)
  netProductionCost: number;

  @IsNumber()
  @Min(0.01)
  headRiceKg: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  brokenRiceKg?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  brokenRiceRelativeValueRatio?: number;
}

export class SalesProfitDto {
  @IsNumber()
  @Min(0)
  salesRevenue: number;

  @IsNumber()
  @Min(0)
  costOfGoodsSold: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  deliveryTransportCost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  commission?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discounts?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tax?: number;
}

export class CounterpartyDueDto {
  @IsNumber()
  @Min(0)
  totalInvoiced: number;

  @IsNumber()
  @Min(0)
  totalSettled: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  adjustmentsOrNotes?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  advances?: number;
}

export class TollChargeDto {
  @IsNumber()
  @Min(0.01)
  paddyMilledKg: number;

  @IsNumber()
  @Min(0)
  millingRatePerKg: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  byProductRetentionValue?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  packagingCharge?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  handlingFee?: number;
}

export class PackagingCostDto {
  @IsNumber()
  @Min(1)
  bagCount: number;

  @IsNumber()
  @Min(0)
  bagUnitPrice: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  twineCostPerBag?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  printingCostPerBag?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  linerCostPerBag?: number;
}

