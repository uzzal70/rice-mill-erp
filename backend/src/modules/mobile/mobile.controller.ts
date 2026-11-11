import { Controller, Get, Post, Body, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthenticatedRequest, RequirePermission } from '../../common/authz';
import { PermissionAction } from '@prisma/client';
import { MobileService, MobileOwnerSummary } from './mobile.service';
import { MobileSummaryQueryDto, MobileQuickApproveDto } from './mobile.dto';

@ApiTags('Mobile Owner & Approvals (#67)')
@ApiBearerAuth()
@Controller('mobile')
export class MobileController {
  constructor(private readonly mobileService: MobileService) {}

  @Get('owner-summary')
  @RequirePermission('dashboard', PermissionAction.READ)
  @ApiOperation({ summary: 'Get mobile-optimized executive dashboard summary (7 Core Metrics)' })
  @ApiResponse({ status: 200, description: 'Mobile owner KPIs and pending approval queue' })
  async getMobileOwnerSummary(
    @Query() query: MobileSummaryQueryDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<MobileOwnerSummary> {
    const companyId = query.companyId || req.user?.companyIds?.[0] || '';
    return this.mobileService.getMobileOwnerSummary({ ...query, companyId });
  }

  @Post('quick-approve')
  @RequirePermission('approvals', PermissionAction.APPROVE)
  @ApiOperation({ summary: '1-Tap quick approval/rejection from mobile smartphone' })
  @ApiResponse({ status: 200, description: 'Approval decision result' })
  async quickApprove(
    @Body() dto: MobileQuickApproveDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user?.id || 'admin-user';
    return this.mobileService.quickApprove(dto, userId);
  }
}

