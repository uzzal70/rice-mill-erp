import { Controller, Get, Query, Res } from '@nestjs/common';
import { PermissionAction } from '@prisma/client';
import { Response } from 'express';
import { RequirePermission } from '../../common/authz';
import { ExportFormat, GenerateReportDto } from './reports.dto';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('filters')
  @RequirePermission('reports', PermissionAction.READ)
  getFilterOptions(@Query('companyId') companyId: string) {
    return this.reportsService.getFilterOptions(companyId);
  }

  @Get('generate')
  @RequirePermission('reports', PermissionAction.READ)
  generateReport(@Query() query: GenerateReportDto) {
    return this.reportsService.generateReport(query);
  }

  @Get('export')
  @RequirePermission('reports', PermissionAction.READ)
  async exportReport(
    @Query() query: GenerateReportDto,
    @Res() res: Response,
  ) {
    const format = query.format || ExportFormat.CSV;
    const result = await this.reportsService.generateReport({ ...query, format });

    if ('content' in result) {
      res.setHeader('Content-Type', result.mimeType || 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
      return res.send(result.content);
    }

    return res.json(result);
  }
}
