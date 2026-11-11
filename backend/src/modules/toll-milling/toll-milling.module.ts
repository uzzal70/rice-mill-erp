import { Module } from '@nestjs/common';
import { TollMillingController } from './toll-milling.controller';
import { TollMillingService } from './toll-milling.service';

@Module({
  controllers: [TollMillingController],
  providers: [TollMillingService],
  exports: [TollMillingService],
})
export class TollMillingModule {}

