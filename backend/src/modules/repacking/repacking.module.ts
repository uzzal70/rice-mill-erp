import { Module } from '@nestjs/common';
import { RepackingController } from './repacking.controller';
import { RepackingService } from './repacking.service';

@Module({ controllers: [RepackingController], providers: [RepackingService] })
export class RepackingModule {}
