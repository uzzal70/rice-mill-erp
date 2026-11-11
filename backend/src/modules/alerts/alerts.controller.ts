import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { PermissionAction } from '@prisma/client';
import { CurrentUser, RequirePermission } from '../../common/authz';
import { AlertsQueryDto, DismissAlertDto, RunScanDto, UpdateAlertRuleDto } from './alerts.dto';
import { AlertsService } from './alerts.service';

@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get()
  @RequirePermission('reports', PermissionAction.READ)
  listAlerts(@Query() query: AlertsQueryDto) {
    return this.alertsService.listAlerts(query);
  }

  @Post(':id/dismiss')
  @RequirePermission('reports', PermissionAction.UPDATE)
  dismissAlert(
    @Param('id') id: string,
    @Body() dto: DismissAlertDto,
    @CurrentUser() user: any,
  ) {
    return this.alertsService.dismissAlert(id, dto, user?.id);
  }

  @Post(':id/acknowledge')
  @RequirePermission('reports', PermissionAction.UPDATE)
  acknowledgeAlert(
    @Param('id') id: string,
    @Body('companyId') companyId: string,
    @CurrentUser() user: any,
  ) {
    return this.alertsService.acknowledgeAlert(id, companyId, user?.id);
  }

  @Get('rules')
  @RequirePermission('reports', PermissionAction.READ)
  listRules(@Query('companyId') companyId: string) {
    return this.alertsService.listRules(companyId);
  }

  @Put('rules')
  @RequirePermission('reports', PermissionAction.UPDATE)
  updateRule(@Body() dto: UpdateAlertRuleDto) {
    return this.alertsService.updateRule(dto);
  }

  @Post('scan')
  @RequirePermission('reports', PermissionAction.UPDATE)
  runDiagnosticScan(@Body() dto: RunScanDto) {
    return this.alertsService.runDiagnosticScan(dto);
  }
}

