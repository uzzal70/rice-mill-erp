import { Body, Controller, Get, Param, Post, Put, Query, Req } from '@nestjs/common';
import { PermissionAction } from '@prisma/client';
import { AuthenticatedRequest, RequireAllPermissions, RequirePermission } from '../../common/authz';
import { ListMoisturePoliciesDto, SaveMoisturePolicyDto } from './moisture-policy.dto';
import { MoisturePolicyService } from './moisture-policy.service';

@Controller('moisture-policies')
export class MoisturePolicyController {
  constructor(private readonly policies: MoisturePolicyService) {}

  @Get()
  @RequireAllPermissions(
    { resource: 'moisture-policies', action: PermissionAction.READ },
    { resource: 'moisture-policies', action: PermissionAction.VIEW_FINANCIAL },
  )
  list(@Query() query: ListMoisturePoliciesDto) { return this.policies.list(query); }

  @Post()
  @RequireAllPermissions(
    { resource: 'moisture-policies', action: PermissionAction.CREATE },
    { resource: 'moisture-policies', action: PermissionAction.VIEW_FINANCIAL },
  )
  create(@Body() dto: SaveMoisturePolicyDto, @Req() req: AuthenticatedRequest) {
    return this.policies.create(dto, req.user!.id);
  }

  @Put(':id')
  @RequireAllPermissions(
    { resource: 'moisture-policies', action: PermissionAction.UPDATE },
    { resource: 'moisture-policies', action: PermissionAction.VIEW_FINANCIAL },
  )
  update(@Param('id') id: string, @Body() dto: SaveMoisturePolicyDto, @Req() req: AuthenticatedRequest) {
    return this.policies.update(id, dto, req.user!.id);
  }
}
