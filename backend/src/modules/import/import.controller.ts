import { Body, Controller, Get, Param, Post, Req, Res } from '@nestjs/common';
import { PermissionAction } from '@prisma/client';
import { Response } from 'express';
import { AuthenticatedRequest, RequirePermission } from '../../common/authz';
import {
  CommitImportDto,
  ImportCommitResult,
  ImportEntityType,
  ImportTemplateMeta,
  ImportValidationResult,
  ValidateImportDto,
} from './import.dto';
import { ImportService } from './import.service';

@Controller('import')
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  @Get('templates')
  @RequirePermission('settings', PermissionAction.READ)
  getTemplates(): ImportTemplateMeta[] {
    return this.importService.getTemplates();
  }

  @Get('template/:entityType')
  @RequirePermission('settings', PermissionAction.READ)
  getTemplateCsv(
    @Param('entityType') entityType: ImportEntityType,
    @Res() res: Response,
  ) {
    const csv = this.importService.getTemplateCsv(entityType);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${entityType.toLowerCase()}-template.csv"`);
    res.send(csv);
  }

  @Post('validate')
  @RequirePermission('settings', PermissionAction.READ)
  validateRows(@Body() dto: ValidateImportDto): Promise<ImportValidationResult> {
    return this.importService.validateRows(dto);
  }

  @Post('commit')
  @RequirePermission('settings', PermissionAction.UPDATE)
  commitRecords(
    @Body() dto: CommitImportDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<ImportCommitResult> {
    return this.importService.commitRecords(dto, req.user?.id || 'import-admin');
  }
}

