import { Module } from '@nestjs/common';
import { ParboilingController } from './parboiling.controller';
import { ParboilingService } from './parboiling.service';

@Module({ controllers: [ParboilingController], providers: [ParboilingService] })
export class ParboilingModule {}
