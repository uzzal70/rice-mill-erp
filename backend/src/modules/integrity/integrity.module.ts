import { Module } from '@nestjs/common';
import { IntegrityService } from './integrity.service';
import { IntegrityController } from './integrity.controller';
import { CommonModule } from '../../common/common.module';

@Module({
  imports: [CommonModule],
  providers: [IntegrityService],
  controllers: [IntegrityController],
  exports: [IntegrityService],
})
export class IntegrityModule {}

