import { Module } from '@nestjs/common';
import { UnitConversionsModule } from '../unit-conversions/unit-conversions.module';
import { BangladeshController } from './bangladesh.controller';
import { BangladeshService } from './bangladesh.service';

@Module({
  imports: [UnitConversionsModule],
  controllers: [BangladeshController],
  providers: [BangladeshService],
  exports: [BangladeshService],
})
export class BangladeshModule {}

