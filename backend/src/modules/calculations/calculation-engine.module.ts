import { Module } from '@nestjs/common';
import { CalculationEngineService } from './calculation-engine.service';
import { CalculationEngineController } from './calculation-engine.controller';

@Module({
  providers: [CalculationEngineService],
  controllers: [CalculationEngineController],
  exports: [CalculationEngineService],
})
export class CalculationEngineModule {}

