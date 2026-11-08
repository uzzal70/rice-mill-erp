import { Controller, Get, Query } from '@nestjs/common';
import { PermissionAction } from '@prisma/client';
import { RequirePermission } from '../../common/authz';
import { FactoryComparisonQueryDto } from './dashboard.dto';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('factory-comparison')
  @RequirePermission('reports', PermissionAction.READ)
  compareFactories(@Query() query: FactoryComparisonQueryDto) {
    return this.dashboard.compareFactories(query);
  }
}
