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
import { AuditQueryDto, RecordAuditEventDto } from './audit.dto';
import { AuditService } from './audit.service';

@Controller('audit')
@UseGuards(AccessGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @RequirePermission('roles', PermissionAction.READ)
  listEvents(
    @Query('companyId') companyId: string,
    @Query() query: AuditQueryDto,
  ) {
    return this.auditService.listEvents(companyId, query);
  }

  @Get('summary')
  @RequirePermission('roles', PermissionAction.READ)
  getAuditSummary(@Query('companyId') companyId: string) {
    return this.auditService.getAuditSummary(companyId);
  }

  @Get(':id')
  @RequirePermission('roles', PermissionAction.READ)
  getEvent(
    @Query('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.auditService.getEvent(companyId, id);
  }

  @Post()
  @RequirePermission('roles', PermissionAction.CREATE)
  recordEvent(
    @Query('companyId') companyId: string,
    @Body() dto: RecordAuditEventDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const ip = (req.headers['x-forwarded-for'] as string) || req.ip;
    const userAgent = req.headers['user-agent'] as string;
    return this.auditService.recordEvent(companyId, dto, req.user, ip, userAgent);
  }
}

