import { Command, CommandRunner } from 'nest-commander';
import { AccountingEntryCreateCommand } from './accounting-entry-create.command.js';
import { AccountingEntryListCommand } from './accounting-entry-list.command.js';
import { AccountingSummaryCommand } from './accounting-summary.command.js';

@Command({
  name: 'accounting',
  description: 'Muhasebe (gelir/gider) işlemleri (create, list, summary)',
  subCommands: [AccountingEntryCreateCommand, AccountingEntryListCommand, AccountingSummaryCommand],
})
export class AccountingCommand extends CommandRunner {
  async run(): Promise<void> {
    console.log('Kullanım: accounting <create|list|summary> [options]');
  }
}
