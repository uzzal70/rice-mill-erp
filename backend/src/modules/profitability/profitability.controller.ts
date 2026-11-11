import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PermissionAction } from '@prisma/client';
import { AuthenticatedRequest, RequirePermission } from '../../common/authz';
import { AccessGuard } from '../../common/access.guard';
import {
  CalculateBatchProfitabilityDto,
  ProfitabilityQueryDto,
} from './profitability.dto';
import { ProfitabilityService } from './profitability.service';

@Controller('profitability')
@UseGuards(AccessGuard)
export class ProfitabilityController {
  constructor(private readonly profitabilityService: ProfitabilityService) {}

  @Post('batches/calculate')
  @RequirePermission('production', PermissionAction.VIEW_FINANCIAL)
  calculateBatchProfitability(
    @Body() dto: CalculateBatchProfitabilityDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.profitabilityService.calculateAndSaveBatchProfitability(
      dto,
      req.user!.id,
    );
  }

  @Get('batches/:batchId')
  @RequirePermission('production', PermissionAction.VIEW_FINANCIAL)
  getBatchProfitability(
    @Param('batchId') batchId: string,
    @Query('companyId') companyId: string,
  ) {
    return this.profitabilityService.getBatchProfitability(companyId, batchId);
  }

  @Get('batches')
  @RequirePermission('production', PermissionAction.VIEW_FINANCIAL)
  listBatchProfitability(@Query() q: ProfitabilityQueryDto) {
    return this.profitabilityService.listBatchProfitability(q);
  }

  @Get('summary')
  @RequirePermission('production', PermissionAction.VIEW_FINANCIAL)
  getMultiDimensionalSummary(@Query() q: ProfitabilityQueryDto) {
    return this.profitabilityService.getMultiDimensionalSummary(q);
  }
}
