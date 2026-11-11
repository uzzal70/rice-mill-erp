import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthenticatedRequest, RequirePermission } from '../../common/authz';
import { PermissionAction } from '@prisma/client';
import { IntegrityService, IntegrityAuditResult } from './integrity.service';
import { VerifyTransactionDto } from './integrity.dto';

@ApiTags('Critical Data Integrity')
@ApiBearerAuth()
@Controller('integrity')
export class IntegrityController {
  constructor(private readonly integrityService: IntegrityService) {}

  @Get('rules')
  @RequirePermission('audit_logs', PermissionAction.READ)
  @ApiOperation({ summary: 'List all 11 critical data integrity invariant rules' })
  @ApiResponse({ status: 200, description: 'All 11 active data integrity rules' })
  getRules() {
    return {
      totalRules: 11,
      enforcementMode: 'ACTIVE_TRANSACTION_GATED',
      rules: [
        { id: 1, name: 'Negative Stock Prevention', description: 'Prevents warehouse stock levels from dropping below zero.' },
        { id: 2, name: 'Duplicate Invoice Prevention', description: 'Prevents reuse of identical supplier or customer invoice numbers.' },
        { id: 3, name: 'Duplicate Weighbridge Ticket Prevention', description: 'Prevents duplicate weighbridge gross/tare measurement slips.' },
        { id: 4, name: 'Duplicate Gate Entry Prevention', description: 'Prevents multiple active inside-mill passes for the same vehicle.' },
        { id: 5, name: 'Unbalanced Journal Prevention', description: 'Enforces fundamental accounting equation: Debit sum must equal Credit sum.' },
        { id: 6, name: 'Unauthorized Price Change Prevention', description: 'Restricts sales and purchase price changes to OWNER/MD/ADMIN.' },
        { id: 7, name: 'Unauthorized Financial Edit Prevention', description: 'Enforces immutability of posted financial transactions.' },
        { id: 8, name: 'Invalid Quantity Prevention', description: 'Blocks zero, negative, or NaN physical inventory quantities.' },
        { id: 9, name: 'Invalid Weight Prevention', description: 'Enforces Gross > Tare, realistic tare, and max single-truck limits (100 Tons).' },
        { id: 10, name: 'Invalid Moisture Prevention', description: 'Restricts grain moisture percentage to physically viable 8.0% - 35.0% range.' },
        { id: 11, name: 'Unauthorized Delete Prevention', description: 'Prohibits hard-deletions on posted records and unprivileged entities.' },
      ],
    };
  }

  @Get('audit')
  @RequirePermission('audit_logs', PermissionAction.READ)
  @ApiOperation({ summary: 'Execute diagnostic system-wide data integrity audit' })
  @ApiResponse({ status: 200, description: 'Integrity audit result with violation details' })
  async runAudit(
    @Req() req: AuthenticatedRequest,
    @Query('companyId') queryCompanyId?: string,
  ): Promise<IntegrityAuditResult> {
    const companyId = queryCompanyId || req.user?.companyIds?.[0] || '';
    return this.integrityService.runIntegrityAudit(companyId);
  }

  @Post('verify-transaction')
  @RequirePermission('audit_logs', PermissionAction.READ)
  @ApiOperation({ summary: 'Verify arbitrary transaction payload against all 11 integrity rules' })
  @ApiResponse({ status: 200, description: 'Verification verdict' })
  async verifyTransaction(
    @Req() req: AuthenticatedRequest,
    @Body() dto: VerifyTransactionDto,
  ) {
    const companyId = dto.companyId || req.user?.companyIds?.[0] || '';
    const userRoles = dto.userRoles || ['ADMIN'];
    return this.integrityService.verifyTransaction(companyId, dto, userRoles);
  }
}
