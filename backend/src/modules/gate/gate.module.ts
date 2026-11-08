import { Module } from '@nestjs/common';
import { GateEntriesController, QualityController, VehiclesController } from './gate.controller';
import { GateService } from './gate.service';

@Module({ controllers: [VehiclesController, GateEntriesController, QualityController], providers: [GateService] })
export class GateModule {}
