import { Module } from '@nestjs/common';
import { MobileService } from './mobile.service';
import { MobileController } from './mobile.controller';
import { CommonModule } from '../../common/common.module';

@Module({
  imports: [CommonModule],
  providers: [MobileService],
  controllers: [MobileController],
  exports: [MobileService],
})
export class MobileModule {}

