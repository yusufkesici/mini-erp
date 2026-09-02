import { Module } from '@nestjs/common';
import { AccountingService } from './accounting.service.js';
import { AccountingController } from './accounting.controller.js';
import { AccountingCommand } from './cli/accounting-entry.command.js';
import { AccountingEntryCreateCommand } from './cli/accounting-entry-create.command.js';
import { AccountingEntryListCommand } from './cli/accounting-entry-list.command.js';
import { AccountingSummaryCommand } from './cli/accounting-summary.command.js';

@Module({
  controllers: [AccountingController],
  providers: [
    AccountingService,
    AccountingCommand,
    AccountingEntryCreateCommand,
    AccountingEntryListCommand,
    AccountingSummaryCommand,
  ],
  exports: [AccountingService],
})
export class AccountingModule {}
