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
import { AccessGuard } from '../../common/access.guard';
import { AuthenticatedRequest, RequirePermission } from '../../common/authz';
import { CreateApprovalRequestDto, TransitionApprovalDto } from './approvals.dto';
import { ApprovalsService } from './approvals.service';

@Controller('approvals')
@UseGuards(AccessGuard)
export class ApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

  @Post()
  @RequirePermission('procurement', PermissionAction.CREATE)
  createOrGetRequest(
    @Query('companyId') companyId: string,
    @Body() dto: CreateApprovalRequestDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.approvalsService.createOrGetRequest(companyId, dto, req.user?.id);
  }

  @Get()
  @RequirePermission('procurement', PermissionAction.READ)
  listRequests(
    @Query('companyId') companyId: string,
    @Query('status') status?: string,
    @Query('entityType') entityType?: string,
    @Query('search') search?: string,
  ) {
    return this.approvalsService.listRequests(companyId, status, entityType, search);
  }

  @Get('inbox')
  @RequirePermission('procurement', PermissionAction.READ)
  getApprovalInbox(@Query('companyId') companyId: string) {
    return this.approvalsService.getApprovalInbox(companyId);
  }

  @Get(':id')
  @RequirePermission('procurement', PermissionAction.READ)
  getRequest(
    @Query('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.approvalsService.getRequest(companyId, id);
  }

  @Post(':id/transition')
  @RequirePermission('procurement', PermissionAction.UPDATE)
  transition(
    @Query('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: TransitionApprovalDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const actorId = req.user?.id || 'system-user';
    return this.approvalsService.transition(companyId, id, dto, actorId);
  }
}

