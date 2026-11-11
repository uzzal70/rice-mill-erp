import { Module } from '@nestjs/common';
import { AccountingController } from './accounting.controller';
import { AccountingService } from './accounting.service';
import { AutoAccountingService } from './auto-accounting.service';

@Module({
  controllers: [AccountingController],
  providers: [AccountingService, AutoAccountingService],
  exports: [AccountingService, AutoAccountingService],
})
export class AccountingModule {}

