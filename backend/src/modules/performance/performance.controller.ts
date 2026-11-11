import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PerformanceService } from './performance.service';
import { CacheInvalidateDto } from './performance.dto';

@ApiTags('Performance & Caching (#68)')
@Controller('performance')
export class PerformanceController {
  constructor(private readonly perfService: PerformanceService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get cache hit/miss statistics and memory usage' })
  getStats() {
    return this.perfService.getCacheStats();
  }

  @Post('cache/invalidate')
  @ApiOperation({ summary: 'Invalidate cache entries by prefix' })
  invalidateCache(@Body() dto: CacheInvalidateDto) {
    const count = this.perfService.invalidateCache(dto.prefix);
    return { success: true, invalidatedKeysCount: count };
  }

  @Get('jobs/:id')
  @ApiOperation({ summary: 'Check status of asynchronous background queue job' })
  getJob(@Param('id') id: string) {
    return this.perfService.getJob(id);
  }
}

