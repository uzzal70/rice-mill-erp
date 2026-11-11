import { Module } from '@nestjs/common';
import { PerformanceService } from './performance.service';
import { PerformanceController } from './performance.controller';
import { PerformanceInterceptor } from './performance.interceptor';

@Module({
  providers: [PerformanceService, PerformanceInterceptor],
  controllers: [PerformanceController],
  exports: [PerformanceService, PerformanceInterceptor],
})
export class PerformanceModule {}

