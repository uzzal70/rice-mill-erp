import { Controller, Get, Param, Query } from '@nestjs/common';
import { PermissionAction } from '@prisma/client';
import { RequirePermission } from '../../common/authz';
import { DocumentTemplateMeta, GetPrintDocumentDto, PrintDocumentData, PrintDocumentType } from './print.dto';
import { PrintService } from './print.service';

@Controller('print')
export class PrintController {
  constructor(private readonly printService: PrintService) {}

  @Get('templates')
  @RequirePermission('reports', PermissionAction.READ)
  getTemplates(): DocumentTemplateMeta[] {
    return this.printService.getTemplates();
  }

  @Get(':documentType/:documentId')
  @RequirePermission('reports', PermissionAction.READ)
  async getDocumentData(
    @Param('documentType') documentType: PrintDocumentType,
    @Param('documentId') documentId: string,
    @Query() query: GetPrintDocumentDto,
  ): Promise<PrintDocumentData> {
    return this.printService.getDocumentData(query.companyId, documentType, documentId, query);
  }
}
