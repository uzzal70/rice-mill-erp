import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { AiDomain, PermissionAction } from '@prisma/client';
import { CurrentUser, RequirePermission } from '../../common/authz';
import { ExtractDatasetDto, PredictDto, RecordFeedbackDto, RegisterModelDto } from './ai-ready.dto';
import { AiReadyService } from './ai-ready.service';

@Controller('ai-ready')
export class AiReadyController {
  constructor(private readonly aiService: AiReadyService) {}

  @Get('overview')
  @RequirePermission('reports', PermissionAction.READ)
  getDomainOverview(@Query('companyId') companyId: string) {
    return this.aiService.getDomainOverview(companyId);
  }

  @Post('extract')
  @RequirePermission('reports', PermissionAction.UPDATE)
  extractFeatureDataset(@Body() dto: ExtractDatasetDto, @CurrentUser() user: any) {
    return this.aiService.extractFeatureDataset(dto, user?.id);
  }

  @Post('models')
  @RequirePermission('reports', PermissionAction.UPDATE)
  registerModel(@Body() dto: RegisterModelDto) {
    return this.aiService.registerModel(dto);
  }

  @Get('models')
  @RequirePermission('reports', PermissionAction.READ)
  listModels(
    @Query('companyId') companyId: string,
    @Query('domain') domain?: AiDomain,
  ) {
    return this.aiService.listModels(companyId, domain);
  }

  @Post('predict')
  @RequirePermission('reports', PermissionAction.READ)
  predict(@Body() dto: PredictDto) {
    return this.aiService.predict(dto);
  }

  @Post('feedback')
  @RequirePermission('reports', PermissionAction.UPDATE)
  recordFeedback(@Body() dto: RecordFeedbackDto) {
    return this.aiService.recordFeedback(dto);
  }
}

