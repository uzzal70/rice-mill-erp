import { Controller, Get, Query } from '@nestjs/common';
import { PermissionAction } from '@prisma/client';
import { RequirePermission } from '../../common/authz';
import { FactoryComparisonQueryDto, ManagementAnalyticsQueryDto, OwnerDashboardQueryDto } from './dashboard.dto';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('factory-comparison')
  @RequirePermission('reports', PermissionAction.READ)
  compareFactories(@Query() query: FactoryComparisonQueryDto) {
    return this.dashboard.compareFactories(query);
  }

  @Get('owner')
  @RequirePermission('reports', PermissionAction.READ)
  getOwnerDashboard(@Query() query: OwnerDashboardQueryDto) {
    return this.dashboard.getOwnerDashboard(query);
  }

  @Get('analytics')
  @RequirePermission('reports', PermissionAction.READ)
  getManagementAnalytics(@Query() query: ManagementAnalyticsQueryDto) {
    return this.dashboard.getManagementAnalytics(query);
  }
}

