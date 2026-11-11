import { Controller, Get, Query } from '@nestjs/common';
import { PermissionAction } from '@prisma/client';
import { RequirePermission } from '../../common/authz';
import { GlobalSearchQueryDto, GlobalSearchResponse } from './search.dto';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('global')
  @RequirePermission('dashboard', PermissionAction.READ)
  globalSearch(@Query() query: GlobalSearchQueryDto): Promise<GlobalSearchResponse> {
    return this.searchService.globalSearch(query);
  }
}

