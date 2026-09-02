import { CommandRunner, SubCommand } from 'nest-commander';
import { AccountingService } from '../accounting.service.js';

@SubCommand({ name: 'summary', description: 'Toplam gelir, gider ve bakiyeyi gösterir' })
export class AccountingSummaryCommand extends CommandRunner {
  constructor(private readonly accountingService: AccountingService) {
    super();
  }

  async run(): Promise<void> {
    const { totalIncome, totalExpense, balance } = await this.accountingService.summary();
    console.log(`Toplam gelir : ${totalIncome.toString()}`);
    console.log(`Toplam gider : ${totalExpense.toString()}`);
    console.log(`Bakiye       : ${balance.toString()}`);
  }
}
