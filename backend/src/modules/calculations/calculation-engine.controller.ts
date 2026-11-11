import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CalculationEngineService } from './calculation-engine.service';
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

@ApiTags('Calculation Engine')
@Controller('calculations')
export class CalculationEngineController {
  constructor(private readonly calcService: CalculationEngineService) {}

  @Post('net-weight')
  @ApiOperation({ summary: 'Calculate weighbridge net weight from gross, tare, bags, and deductions' })
  calculateNetWeight(@Body() dto: NetWeightDto) {
    return this.calcService.calculateNetWeight(dto);
  }

  @Post('moisture-deduction')
  @ApiOperation({ summary: 'Calculate moisture excess percentage and weight deduction' })
  calculateMoistureDeduction(@Body() dto: MoistureDeductionDto) {
    return this.calcService.calculateMoistureDeduction(dto);
  }

  @Post('adjusted-quantity')
  @ApiOperation({ summary: 'Calculate payable grain quantity after deductions' })
  calculateAdjustedQuantity(@Body() dto: AdjustedQuantityDto) {
    return this.calcService.calculateAdjustedQuantity(dto);
  }

  @Post('purchase-cost')
  @ApiOperation({ summary: 'Calculate gross and net purchase cost including bags and labor' })
  calculatePurchaseCost(@Body() dto: PurchaseCostDto) {
    return this.calcService.calculatePurchaseCost(dto);
  }

  @Post('landed-cost')
  @ApiOperation({ summary: 'Calculate landed procurement cost with direct overheads' })
  calculateLandedCost(@Body() dto: LandedCostDto) {
    return this.calcService.calculateLandedCost(dto);
  }

  @Post('production-recovery')
  @ApiOperation({ summary: 'Calculate milling yields, process loss, head rice and by-product recovery' })
  calculateProductionRecovery(@Body() dto: ProductionRecoveryDto) {
    return this.calcService.calculateProductionRecovery(dto);
  }

  @Post('by-product-value')
  @ApiOperation({ summary: 'Calculate aggregate market value of by-products produced' })
  calculateByProductValue(@Body() dto: ByProductValueDto) {
    return this.calcService.calculateByProductValue(dto);
  }

  @Post('production-cost')
  @ApiOperation({ summary: 'Calculate total production cost net of by-product offsets' })
  calculateProductionCost(@Body() dto: ProductionCostDto) {
    return this.calcService.calculateProductionCost(dto);
  }

  @Post('rice-cost')
  @ApiOperation({ summary: 'Allocate production costs between head rice and broken rice' })
  calculateRiceCost(@Body() dto: RiceCostDto) {
    return this.calcService.calculateRiceCost(dto);
  }

  @Post('sales-profit')
  @ApiOperation({ summary: 'Calculate gross profit, net operating profit, and profit margins' })
  calculateSalesProfit(@Body() dto: SalesProfitDto) {
    return this.calcService.calculateSalesProfit(dto);
  }

  @Post('supplier-due')
  @ApiOperation({ summary: 'Calculate net supplier outstanding payable balance' })
  calculateSupplierDue(@Body() dto: CounterpartyDueDto) {
    return this.calcService.calculateSupplierDue(dto);
  }

  @Post('customer-due')
  @ApiOperation({ summary: 'Calculate net customer outstanding receivable balance' })
  calculateCustomerDue(@Body() dto: CounterpartyDueDto) {
    return this.calcService.calculateCustomerDue(dto);
  }

  @Post('toll-charge')
  @ApiOperation({ summary: 'Calculate customer toll milling charges net of retained by-products' })
  calculateTollCharge(@Body() dto: TollChargeDto) {
    return this.calcService.calculateTollCharge(dto);
  }

  @Post('packaging-cost')
  @ApiOperation({ summary: 'Calculate packaging bag, twine, and printing costs' })
  calculatePackagingCost(@Body() dto: PackagingCostDto) {
    return this.calcService.calculatePackagingCost(dto);
  }
}

