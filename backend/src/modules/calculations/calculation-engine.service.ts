import { Injectable, BadRequestException } from '@nestjs/common';
import {
  NetWeightDto,
  MoistureDeductionDto,
  AdjustedQuantityDto,
  PurchaseCostDto,
  LandedCostDto,
  ProductionRecoveryDto,
  ByProductValueDto,
  ProductionCostDto,
  RiceCostDto,
  SalesProfitDto,
  CounterpartyDueDto,
  TollChargeDto,
  PackagingCostDto,
} from './calculations.dto';

export interface RecoveryCalculationResult {
  paddyInputKg: number;
  totalOutputKg: number;
  processLossKg: number;
  processLossPercent: number;
  headRiceRecoveryPercent: number;
  totalRiceRecoveryPercent: number;
  byProductRecoveryPercent: number;
  wastePercent: number;
}

@Injectable()
export class CalculationEngineService {
  // 1. calculateNetWeight()
  calculateNetWeight(dto: NetWeightDto): {
    grossWeightKg: number;
    totalTareKg: number;
    netWeightKg: number;
  } {
    const { grossWeightKg, tareWeightKg } = dto;
    const bagCount = dto.bagCount || 0;
    const bagTareWeightKg = dto.bagTareWeightKg || 0;
    const deductionsKg = dto.deductionsKg || 0;

    const bagTareTotal = bagCount * bagTareWeightKg;
    const totalTareKg = tareWeightKg + bagTareTotal + deductionsKg;

    if (grossWeightKg < totalTareKg) {
      throw new BadRequestException(
        `Gross weight (${grossWeightKg} KG) must be strictly greater than total tare (${totalTareKg} KG).`,
      );
    }

    const netWeightKg = Number((grossWeightKg - totalTareKg).toFixed(2));
    return { grossWeightKg, totalTareKg, netWeightKg };
  }

  // 2. calculateMoistureDeduction()
  calculateMoistureDeduction(dto: MoistureDeductionDto): {
    weightKg: number;
    moisturePercent: number;
    baseMoisturePercent: number;
    excessMoisturePercent: number;
    deductionKg: number;
  } {
    const { weightKg, moisturePercent } = dto;
    const baseMoisturePercent = dto.baseMoisturePercent ?? 14.0;
    const deductionPerPercent = dto.deductionPerPercent ?? 1.0;

    const excessMoisturePercent = Math.max(0, moisturePercent - baseMoisturePercent);
    const deductionKg = Number(
      ((weightKg * excessMoisturePercent * deductionPerPercent) / 100).toFixed(2),
    );

    return {
      weightKg,
      moisturePercent,
      baseMoisturePercent,
      excessMoisturePercent: Number(excessMoisturePercent.toFixed(2)),
      deductionKg,
    };
  }

  // 3. calculateAdjustedQuantity()
  calculateAdjustedQuantity(dto: AdjustedQuantityDto): {
    actualWeightKg: number;
    totalDeductionsKg: number;
    payableWeightKg: number;
  } {
    const { actualWeightKg } = dto;
    const moistureDeductionKg = dto.moistureDeductionKg || 0;
    const foreignMatterDeductionKg = dto.foreignMatterDeductionKg || 0;
    const otherDeductionsKg = dto.otherDeductionsKg || 0;

    const totalDeductionsKg = Number(
      (moistureDeductionKg + foreignMatterDeductionKg + otherDeductionsKg).toFixed(2),
    );
    const payableWeightKg = Number(Math.max(0, actualWeightKg - totalDeductionsKg).toFixed(2));

    return {
      actualWeightKg,
      totalDeductionsKg,
      payableWeightKg,
    };
  }

  // 4. calculatePurchaseCost()
  calculatePurchaseCost(dto: PurchaseCostDto): {
    payableWeightKg: number;
    ratePerKg: number;
    grainCost: number;
    bagCost: number;
    laborCost: number;
    deductions: number;
    totalPurchaseCost: number;
  } {
    const { payableWeightKg, ratePerKg } = dto;
    const bagCount = dto.bagCount || 0;
    const bagRate = dto.bagRate || 0;
    const laborCost = dto.laborCost || 0;
    const deductions = dto.deductions || 0;

    const grainCost = Number((payableWeightKg * ratePerKg).toFixed(2));
    const bagCost = Number((bagCount * bagRate).toFixed(2));
    const totalPurchaseCost = Number(
      Math.max(0, grainCost + bagCost + laborCost - deductions).toFixed(2),
    );

    return {
      payableWeightKg,
      ratePerKg,
      grainCost,
      bagCost,
      laborCost,
      deductions,
      totalPurchaseCost,
    };
  }

  // 5. calculateLandedCost()
  calculateLandedCost(dto: LandedCostDto): {
    purchaseCost: number;
    payableWeightKg: number;
    directOverheadsTotal: number;
    totalLandedCost: number;
    landedCostPerKg: number;
    landedCostPerMon: number;
  } {
    const { purchaseCost, payableWeightKg } = dto;
    const transportCost = dto.transportCost || 0;
    const loadingCost = dto.loadingCost || 0;
    const unloadingCost = dto.unloadingCost || 0;
    const brokerageCost = dto.brokerageCost || 0;
    const insuranceCost = dto.insuranceCost || 0;
    const otherDirectCosts = dto.otherDirectCosts || 0;

    const directOverheadsTotal = Number(
      (
        transportCost +
        loadingCost +
        unloadingCost +
        brokerageCost +
        insuranceCost +
        otherDirectCosts
      ).toFixed(2),
    );

    const totalLandedCost = Number((purchaseCost + directOverheadsTotal).toFixed(2));
    const landedCostPerKg = Number((totalLandedCost / payableWeightKg).toFixed(4));
    const landedCostPerMon = Number((landedCostPerKg * 40.0).toFixed(2));

    return {
      purchaseCost,
      payableWeightKg,
      directOverheadsTotal,
      totalLandedCost,
      landedCostPerKg,
      landedCostPerMon,
    };
  }

  // 6. calculateProductionRecovery() - Tested against #64 Unit Test Example
  calculateProductionRecovery(dto: ProductionRecoveryDto): RecoveryCalculationResult {
    const { paddyInputKg, headRiceKg, brokenRiceKg, branKg, huskKg } = dto;
    const wasteKg = dto.wasteKg || 0;

    if (paddyInputKg <= 0) {
      throw new BadRequestException('Paddy input weight must be strictly positive.');
    }

    const totalRiceOutputKg = headRiceKg + brokenRiceKg;
    const totalByProductKg = branKg + huskKg;
    const totalOutputKg = Number(
      (totalRiceOutputKg + totalByProductKg + wasteKg).toFixed(2),
    );

    const processLossKg = Number(Math.max(0, paddyInputKg - totalOutputKg).toFixed(2));
    const processLossPercent = Number(((processLossKg / paddyInputKg) * 100).toFixed(2));

    const headRiceRecoveryPercent = Number(
      ((headRiceKg / paddyInputKg) * 100).toFixed(2),
    );
    const totalRiceRecoveryPercent = Number(
      ((totalRiceOutputKg / paddyInputKg) * 100).toFixed(2),
    );
    const byProductRecoveryPercent = Number(
      ((totalByProductKg / paddyInputKg) * 100).toFixed(2),
    );
    const wastePercent = Number(((wasteKg / paddyInputKg) * 100).toFixed(2));

    return {
      paddyInputKg,
      totalOutputKg,
      processLossKg,
      processLossPercent,
      headRiceRecoveryPercent,
      totalRiceRecoveryPercent,
      byProductRecoveryPercent,
      wastePercent,
    };
  }

  // 7. calculateByProductValue()
  calculateByProductValue(dto: ByProductValueDto): {
    items: Array<{ type: string; quantityKg: number; ratePerKg: number; totalValue: number }>;
    totalQuantityKg: number;
    totalValue: number;
  } {
    let totalQuantityKg = 0;
    let totalValue = 0;

    const items = dto.byProducts.map(p => {
      const lineVal = Number((p.quantityKg * p.ratePerKg).toFixed(2));
      totalQuantityKg += p.quantityKg;
      totalValue += lineVal;
      return {
        type: p.type,
        quantityKg: p.quantityKg,
        ratePerKg: p.ratePerKg,
        totalValue: lineVal,
      };
    });

    return {
      items,
      totalQuantityKg: Number(totalQuantityKg.toFixed(2)),
      totalValue: Number(totalValue.toFixed(2)),
    };
  }

  // 8. calculateProductionCost()
  calculateProductionCost(dto: ProductionCostDto): {
    paddyCost: number;
    millingOperatingOverheads: number;
    grossMillingCost: number;
    byProductRevenueOffset: number;
    netMillingCost: number;
  } {
    const { paddyCost } = dto;
    const electricityCost = dto.electricityCost || 0;
    const laborCost = dto.laborCost || 0;
    const boilerFuelCost = dto.boilerFuelCost || 0;
    const machineDepreciation = dto.machineDepreciation || 0;
    const packingCost = dto.packingCost || 0;
    const byProductRevenueOffset = dto.byProductRevenueOffset || 0;

    const millingOperatingOverheads = Number(
      (
        electricityCost +
        laborCost +
        boilerFuelCost +
        machineDepreciation +
        packingCost
      ).toFixed(2),
    );

    const grossMillingCost = Number((paddyCost + millingOperatingOverheads).toFixed(2));
    const netMillingCost = Number(
      Math.max(0, grossMillingCost - byProductRevenueOffset).toFixed(2),
    );

    return {
      paddyCost,
      millingOperatingOverheads,
      grossMillingCost,
      byProductRevenueOffset,
      netMillingCost,
    };
  }

  // 9. calculateRiceCost()
  calculateRiceCost(dto: RiceCostDto): {
    netProductionCost: number;
    headRiceKg: number;
    brokenRiceKg: number;
    headRiceCostPerKg: number;
    brokenRiceCostPerKg: number;
  } {
    const { netProductionCost, headRiceKg } = dto;
    const brokenRiceKg = dto.brokenRiceKg || 0;
    const brokenRatio = dto.brokenRiceRelativeValueRatio ?? 0.5;

    // Weight allocation: headRice + (brokenRice * ratio)
    const effectiveWeightKg = headRiceKg + brokenRiceKg * brokenRatio;
    if (effectiveWeightKg <= 0) {
      throw new BadRequestException('Effective rice weight must be strictly positive.');
    }

    const headRiceCostPerKg = Number((netProductionCost / effectiveWeightKg).toFixed(4));
    const brokenRiceCostPerKg = Number((headRiceCostPerKg * brokenRatio).toFixed(4));

    return {
      netProductionCost,
      headRiceKg,
      brokenRiceKg,
      headRiceCostPerKg,
      brokenRiceCostPerKg,
    };
  }

  // 10. calculateSalesProfit()
  calculateSalesProfit(dto: SalesProfitDto): {
    salesRevenue: number;
    costOfGoodsSold: number;
    netRevenue: number;
    grossProfit: number;
    grossMarginPercent: number;
    netProfit: number;
    netMarginPercent: number;
  } {
    const { salesRevenue, costOfGoodsSold } = dto;
    const deliveryTransportCost = dto.deliveryTransportCost || 0;
    const commission = dto.commission || 0;
    const discounts = dto.discounts || 0;
    const tax = dto.tax || 0;

    const netRevenue = Number(Math.max(0, salesRevenue - discounts - commission).toFixed(2));
    const grossProfit = Number((netRevenue - costOfGoodsSold).toFixed(2));
    const grossMarginPercent =
      netRevenue > 0 ? Number(((grossProfit / netRevenue) * 100).toFixed(2)) : 0;

    const netProfit = Number((grossProfit - deliveryTransportCost - tax).toFixed(2));
    const netMarginPercent =
      netRevenue > 0 ? Number(((netProfit / netRevenue) * 100).toFixed(2)) : 0;

    return {
      salesRevenue,
      costOfGoodsSold,
      netRevenue,
      grossProfit,
      grossMarginPercent,
      netProfit,
      netMarginPercent,
    };
  }

  // 11. calculateSupplierDue()
  calculateSupplierDue(dto: CounterpartyDueDto): {
    totalInvoiced: number;
    totalSettled: number;
    adjustmentsOrNotes: number;
    advances: number;
    netPayableDue: number;
  } {
    const { totalInvoiced, totalSettled } = dto;
    const debitNotes = dto.adjustmentsOrNotes || 0;
    const advances = dto.advances || 0;

    const netPayableDue = Number(
      (totalInvoiced - debitNotes - totalSettled - advances).toFixed(2),
    );

    return {
      totalInvoiced,
      totalSettled,
      adjustmentsOrNotes: debitNotes,
      advances,
      netPayableDue,
    };
  }

  // 12. calculateCustomerDue()
  calculateCustomerDue(dto: CounterpartyDueDto): {
    totalInvoiced: number;
    totalSettled: number;
    adjustmentsOrNotes: number;
    advances: number;
    netReceivableDue: number;
  } {
    const { totalInvoiced, totalSettled } = dto;
    const creditNotes = dto.adjustmentsOrNotes || 0;
    const advances = dto.advances || 0;

    const netReceivableDue = Number(
      (totalInvoiced - creditNotes - totalSettled - advances).toFixed(2),
    );

    return {
      totalInvoiced,
      totalSettled,
      adjustmentsOrNotes: creditNotes,
      advances,
      netReceivableDue,
    };
  }

  // 13. calculateTollCharge()
  calculateTollCharge(dto: TollChargeDto): {
    paddyMilledKg: number;
    millingRatePerKg: number;
    grossMillingCharge: number;
    byProductRetentionOffset: number;
    packagingAndHandling: number;
    netTollPayable: number;
  } {
    const { paddyMilledKg, millingRatePerKg } = dto;
    const byProductRetentionValue = dto.byProductRetentionValue || 0;
    const packagingCharge = dto.packagingCharge || 0;
    const handlingFee = dto.handlingFee || 0;

    const grossMillingCharge = Number((paddyMilledKg * millingRatePerKg).toFixed(2));
    const packagingAndHandling = Number((packagingCharge + handlingFee).toFixed(2));
    const netTollPayable = Number(
      Math.max(
        0,
        grossMillingCharge + packagingAndHandling - byProductRetentionValue,
      ).toFixed(2),
    );

    return {
      paddyMilledKg,
      millingRatePerKg,
      grossMillingCharge,
      byProductRetentionOffset: byProductRetentionValue,
      packagingAndHandling,
      netTollPayable,
    };
  }

  // 14. calculatePackagingCost()
  calculatePackagingCost(dto: PackagingCostDto): {
    bagCount: number;
    costPerBag: number;
    totalPackagingCost: number;
  } {
    const { bagCount, bagUnitPrice } = dto;
    const twineCost = dto.twineCostPerBag ?? 0.5;
    const printingCost = dto.printingCostPerBag ?? 1.0;
    const linerCost = dto.linerCostPerBag ?? 0;

    const costPerBag = Number(
      (bagUnitPrice + twineCost + printingCost + linerCost).toFixed(2),
    );
    const totalPackagingCost = Number((bagCount * costPerBag).toFixed(2));

    return {
      bagCount,
      costPerBag,
      totalPackagingCost,
    };
  }
}

