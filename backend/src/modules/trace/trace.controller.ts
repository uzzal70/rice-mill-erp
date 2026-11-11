import { Controller, Get, Query, Req } from '@nestjs/common';
import { PermissionAction } from '@prisma/client';
import { AuthenticatedRequest, RequirePermission, assertCompanyAccess } from '../../common/authz';
import { TraceService } from './trace.service';
import { TraceQueryDto, TraceGraph } from './trace.dto';

@Controller('trace')
export class TraceController {
  constructor(private readonly traceService: TraceService) {}

  @Get()
  @RequirePermission('audit', PermissionAction.READ)
  async getTransactionTrace(
    @Query() query: TraceQueryDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<TraceGraph> {
    const companyId = query.companyId || req.user?.companyIds[0];
    if (companyId) {
      assertCompanyAccess(req.user!, companyId);
    }
    return this.traceService.traceTransaction(companyId || '', query);
  }
}

