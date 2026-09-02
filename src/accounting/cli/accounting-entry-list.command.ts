import { CommandRunner, SubCommand } from 'nest-commander';
import { AccountingService } from '../accounting.service.js';

@SubCommand({ name: 'list', description: 'Muhasebe kayıtlarını listeler' })
export class AccountingEntryListCommand extends CommandRunner {
  constructor(private readonly accountingService: AccountingService) {
    super();
  }

  async run(): Promise<void> {
    const entries = await this.accountingService.findAll();
    if (entries.length === 0) {
      console.log('Kayıtlı muhasebe kaydı yok.');
      return;
    }
    console.table(
      entries.map((entry) => ({
        type: entry.type,
        amount: entry.amount.toString(),
        category: entry.category ?? '-',
        entryDate: entry.entryDate.toISOString(),
      })),
    );
    console.log(`${entries.length} muhasebe kaydı`);
  }
}
