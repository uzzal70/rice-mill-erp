import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { DatabaseModule } from './common/database.module';
import { AccessGuard } from './common/access.guard';
import { AuthModule } from './modules/auth/auth.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { FactoriesModule } from './modules/factories/factories.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { SettingsModule } from './modules/settings/settings.module';
import { PartnersModule } from './modules/partners/partners.module';
import { ItemsModule } from './modules/items/items.module';
import { UnitConversionsModule } from './modules/unit-conversions/unit-conversions.module';
import { GateModule } from './modules/gate/gate.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { ProcurementModule } from './modules/procurement/procurement.module';
import { ProductionModule } from './modules/production/production.module';
import { DryingModule } from './modules/drying/drying.module';
import { ParboilingModule } from './modules/parboiling/parboiling.module';
import { RepackingModule } from './modules/repacking/repacking.module';
import { SalesModule } from './modules/sales/sales.module';
import { DispatchModule } from './modules/dispatch/dispatch.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
@Module({ imports: [DatabaseModule, AuthModule, CompaniesModule, FactoriesModule, UsersModule, RolesModule, SettingsModule, PartnersModule, ItemsModule, UnitConversionsModule, GateModule, InventoryModule, ProcurementModule, ProductionModule, DryingModule, ParboilingModule, RepackingModule, SalesModule, DispatchModule, DashboardModule], providers: [{ provide: APP_GUARD, useClass: AccessGuard }] })
export class AppModule {}
