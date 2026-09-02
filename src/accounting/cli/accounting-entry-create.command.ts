import { CommandRunner, Option, SubCommand } from 'nest-commander';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AccountingService } from '../accounting.service.js';
import { CreateAccountingEntryDto } from '../dto/create-accounting-entry.dto.js';

interface AccountingEntryCreateOptions {
  type: string;
  amount: number;
  category?: string;
  description?: string;
  entryDate?: string;
}

@SubCommand({ name: 'create', description: 'Yeni gelir/gider kaydı ekler' })
export class AccountingEntryCreateCommand extends CommandRunner {
  constructor(private readonly accountingService: AccountingService) {
    super();
  }

  async run(_passedParams: string[], options: AccountingEntryCreateOptions): Promise<void> {
    const dto = plainToInstance(CreateAccountingEntryDto, {
      type: options.type,
      amount: options.amount,
      category: options.category,
      description: options.description,
      entryDate: options.entryDate,
    });
    const errors = await validate(dto);
    if (errors.length > 0) {
      console.error('Doğrulama hatası:');
      for (const error of errors) {
        console.error(` - ${error.property}: ${Object.values(error.constraints ?? {}).join(', ')}`);
      }
      process.exitCode = 1;
      return;
    }

    const entry = await this.accountingService.create(dto);
    console.log(`Muhasebe kaydı oluşturuldu: ${entry.type} ${entry.amount} (${entry.id})`);
  }

  @Option({ flags: '-t, --type <type>', description: 'INCOME | EXPENSE' })
  parseType(val: string): string {
    return val;
  }

  @Option({ flags: '-a, --amount <amount>', description: 'Tutar (her zaman pozitif)' })
  parseAmount(val: string): number {
    return Number(val);
  }

  @Option({ flags: '-c, --category [category]', description: 'Kategori (örn. Satış, Kira, Maaş)' })
  parseCategory(val: string): string {
    return val;
  }

  @Option({ flags: '-d, --description [description]', description: 'Açıklama' })
  parseDescription(val: string): string {
    return val;
  }

  @Option({ flags: '--entry-date [entryDate]', description: 'Kayıt tarihi (ISO 8601, varsayılan: şimdi)' })
  parseEntryDate(val: string): string {
    return val;
  }
}
