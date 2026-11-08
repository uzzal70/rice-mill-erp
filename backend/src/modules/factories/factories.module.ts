import { Module } from '@nestjs/common';
import { FactoriesController } from './factories.controller';
import { ProductionLinesController } from './production-lines.controller';
import { ProductionLinesService } from './production-lines.service';
@Module({ controllers: [FactoriesController, ProductionLinesController], providers: [ProductionLinesService] })
export class FactoriesModule {}
