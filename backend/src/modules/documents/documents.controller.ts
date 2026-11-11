import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PermissionAction } from '@prisma/client';
import { AccessGuard } from '../../common/access.guard';
import { AuthenticatedRequest, RequirePermission } from '../../common/authz';
import { CreateCompanyDocumentDto, UpdateCompanyDocumentDto } from './documents.dto';
import { DocumentsService } from './documents.service';

@Controller('documents')
@UseGuards(AccessGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  @RequirePermission('settings', PermissionAction.CREATE)
  createDocument(
    @Query('companyId') companyId: string,
    @Body() dto: CreateCompanyDocumentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.documentsService.createDocument(companyId, dto, req.user?.id);
  }

  @Get()
  @RequirePermission('settings', PermissionAction.READ)
  listDocuments(
    @Query('companyId') companyId: string,
    @Query('category') category?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.documentsService.listDocuments(companyId, category, status, search);
  }

  @Get('notifications')
  @RequirePermission('settings', PermissionAction.READ)
  getExpiryNotifications(@Query('companyId') companyId: string) {
    return this.documentsService.getExpiryNotifications(companyId);
  }

  @Get(':id')
  @RequirePermission('settings', PermissionAction.READ)
  getDocument(
    @Query('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.documentsService.getDocument(companyId, id);
  }

  @Put(':id')
  @RequirePermission('settings', PermissionAction.UPDATE)
  updateDocument(
    @Query('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCompanyDocumentDto,
  ) {
    return this.documentsService.updateDocument(companyId, id, dto);
  }

  @Delete(':id')
  @RequirePermission('settings', PermissionAction.DELETE)
  deleteDocument(
    @Query('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.documentsService.deleteDocument(companyId, id);
  }
}

