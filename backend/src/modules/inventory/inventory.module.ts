import { Module } from '@nestjs/common';
import { GodownsController, InventoryController, StacksController } from './inventory.controller';
import { InventoryService } from './inventory.service';

@Module({ controllers: [GodownsController, StacksController, InventoryController], providers: [InventoryService] })
export class InventoryModule {}
