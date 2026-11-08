import { Module } from '@nestjs/common';
import { GoodsReceiptsController, PurchasesController } from './procurement.controller';
import { ProcurementService } from './procurement.service';
import { MoisturePolicyController } from './moisture-policy.controller';
import { MoisturePolicyService } from './moisture-policy.service';
import { PurchaseInvoiceController } from './purchase-invoice.controller';
import { PurchaseInvoiceService } from './purchase-invoice.service';
import { LandedCostController } from './landed-cost.controller';
import { LandedCostService } from './landed-cost.service';

@Module({
  controllers: [PurchasesController, GoodsReceiptsController, MoisturePolicyController, PurchaseInvoiceController, LandedCostController],
  providers: [ProcurementService, MoisturePolicyService, PurchaseInvoiceService, LandedCostService],
})
export class ProcurementModule {}
