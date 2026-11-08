import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, Req, Res, StreamableFile, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PermissionAction } from '@prisma/client';
import { memoryStorage } from 'multer';
import { Response } from 'express';
import { AuthenticatedRequest, RequirePermission } from '../../common/authz';
import {
  ApproveQualitySampleDto,
  CompleteGateEntryDto,
  CreateGateEntryDto,
  CreateQualitySampleDto,
  CreateVehicleDto,
  CreateWeighbridgeTicketDto,
  GateAttachmentScopeDto,
  GetGateEntryDto,
  ListGateEntriesDto,
  ListQualitySamplesDto,
  ListVehicleMovementsDto,
  ListVehiclesDto,
  SubmitQualityResultsDto,
  UpdateVehicleDto,
} from './gate.dto';
import { GateService } from './gate.service';

@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly gate: GateService) {}

  @Get() @RequirePermission('gate', PermissionAction.READ)
  list(@Query() query: ListVehiclesDto) { return this.gate.listVehicles(query); }

  @Get(':id/movements') @RequirePermission('gate', PermissionAction.READ)
  movements(@Param('id') id: string, @Query() query: ListVehicleMovementsDto) {
    return this.gate.listVehicleMovements(id, query);
  }

  @Post() @RequirePermission('gate', PermissionAction.CREATE)
  create(@Body() dto: CreateVehicleDto, @Req() req: AuthenticatedRequest) { return this.gate.createVehicle(dto, req.user!.id); }

  @Patch(':id') @RequirePermission('gate', PermissionAction.UPDATE)
  update(@Param('id') id: string, @Body() dto: UpdateVehicleDto, @Req() req: AuthenticatedRequest) {
    return this.gate.updateVehicle(id, dto, req.user!.id);
  }
}

@Controller('gate/entries')
export class GateEntriesController {
  constructor(private readonly gate: GateService) {}

  @Get() @RequirePermission('gate', PermissionAction.READ)
  list(@Query() query: ListGateEntriesDto) { return this.gate.listGateEntries(query); }

  @Get(':id') @RequirePermission('gate', PermissionAction.READ)
  get(@Param('id') id: string, @Query() query: GetGateEntryDto) {
    return this.gate.getGateEntry(id, query.companyId, query.factoryId);
  }

  @Post() @RequirePermission('gate', PermissionAction.CREATE)
  create(@Body() dto: CreateGateEntryDto, @Req() req: AuthenticatedRequest) { return this.gate.createGateEntry(dto, req.user!.id); }

  @Post(':id/attachments')
  @RequirePermission('gate', PermissionAction.CREATE)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 1 } }))
  uploadAttachment(
    @Param('id') id: string,
    @Query() scope: GateAttachmentScopeDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!file) throw new BadRequestException('Select a file to attach.');
    return this.gate.addGateAttachment(id, scope, file, req.user!.id);
  }

  @Get(':id/attachments/:attachmentId')
  @RequirePermission('gate', PermissionAction.READ)
  async downloadAttachment(
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
    @Query() scope: GateAttachmentScopeDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { attachment, content } = await this.gate.getGateAttachment(id, attachmentId, scope);
    response.set({
      'Content-Type': attachment.mimeType,
      'Content-Length': String(attachment.sizeBytes),
      'Content-Disposition': `attachment; filename="attachment"; filename*=UTF-8''${encodeURIComponent(attachment.fileName)}`,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-store',
    });
    return new StreamableFile(content);
  }

  @Post(':id/weighbridge') @RequirePermission('weighbridge', PermissionAction.CREATE)
  weigh(@Param('id') id: string, @Body() dto: CreateWeighbridgeTicketDto, @Req() req: AuthenticatedRequest) {
    return this.gate.createWeighbridgeTicket(id, dto, req.user!.id);
  }

  @Post(':id/quality-samples') @RequirePermission('quality', PermissionAction.CREATE)
  createSample(@Param('id') id: string, @Body() dto: CreateQualitySampleDto, @Req() req: AuthenticatedRequest) {
    return this.gate.createQualitySample(id, dto, req.user!.id);
  }

  @Post(':id/complete') @RequirePermission('gate', PermissionAction.UPDATE)
  complete(@Param('id') id: string, @Body() dto: CompleteGateEntryDto, @Req() req: AuthenticatedRequest) {
    return this.gate.completeGateEntry(id, dto.companyId, dto.factoryId, req.user!.id);
  }
}

@Controller('quality/samples')
export class QualityController {
  constructor(private readonly gate: GateService) {}

  @Get() @RequirePermission('quality', PermissionAction.READ)
  list(@Query() query: ListQualitySamplesDto) { return this.gate.listQualitySamples(query); }

  @Post(':id/results') @RequirePermission('quality', PermissionAction.UPDATE)
  submitResults(@Param('id') id: string, @Body() dto: SubmitQualityResultsDto, @Req() req: AuthenticatedRequest) {
    return this.gate.submitQualityResults(id, dto, req.user!.id);
  }

  @Post(':id/approve') @RequirePermission('quality', PermissionAction.APPROVE)
  approve(@Param('id') id: string, @Body() dto: ApproveQualitySampleDto, @Req() req: AuthenticatedRequest) {
    return this.gate.approveQualitySample(id, dto, req.user!.id);
  }
}
