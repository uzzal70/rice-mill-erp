import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { AiReadyController } from './ai-ready.controller';
import { AiReadyService } from './ai-ready.service';

@Module({
  imports: [CommonModule],
  controllers: [AiReadyController],
  providers: [AiReadyService],
  exports: [AiReadyService],
})
export class AiReadyModule {}

