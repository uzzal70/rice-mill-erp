import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { PermissionAction } from '@prisma/client';
import { AuthenticatedRequest, RequirePermission } from '../../common/authz';
import { CreateProductionLineDto, ListProductionLinesDto } from './production-lines.dto';
import { ProductionLinesService } from './production-lines.service';

@Controller('production-lines')
export class ProductionLinesController {
  constructor(private readonly lines: ProductionLinesService) {}

  @Get()
  @RequirePermission('production-lines', PermissionAction.READ)
  list(@Query() query: ListProductionLinesDto) {
    return this.lines.list(query);
  }

  @Post()
  @RequirePermission('production-lines', PermissionAction.CREATE)
  create(@Body() dto: CreateProductionLineDto, @Req() req: AuthenticatedRequest) {
    return this.lines.create(dto, req.user!.id);
  }
}
