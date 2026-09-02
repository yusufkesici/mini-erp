import { CommandRunner, Option, SubCommand } from 'nest-commander';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CustomersService } from '../customers.service.js';
import { CreateCustomerDto } from '../dto/create-customer.dto.js';

interface CustomerCreateOptions {
  code: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}

@SubCommand({ name: 'create', description: 'Yeni müşteri oluşturur' })
export class CustomerCreateCommand extends CommandRunner {
  constructor(private readonly customersService: CustomersService) {
    super();
  }

  async run(_passedParams: string[], options: CustomerCreateOptions): Promise<void> {
    const dto = plainToInstance(CreateCustomerDto, options);
    const errors = await validate(dto);
    if (errors.length > 0) {
      console.error('Doğrulama hatası:');
      for (const error of errors) {
        console.error(` - ${error.property}: ${Object.values(error.constraints ?? {}).join(', ')}`);
      }
      process.exitCode = 1;
      return;
    }

    const customer = await this.customersService.create(dto);
    console.log(`Müşteri oluşturuldu: ${customer.code} (${customer.id})`);
  }

  @Option({ flags: '-c, --code <code>', description: 'Müşteri kodu' })
  parseCode(val: string): string {
    return val;
  }

  @Option({ flags: '-n, --name <name>', description: 'Müşteri adı' })
  parseName(val: string): string {
    return val;
  }

  @Option({ flags: '-e, --email [email]', description: 'E-posta' })
  parseEmail(val: string): string {
    return val;
  }

  @Option({ flags: '-p, --phone [phone]', description: 'Telefon' })
  parsePhone(val: string): string {
    return val;
  }

  @Option({ flags: '-a, --address [address]', description: 'Adres' })
  parseAddress(val: string): string {
    return val;
  }
}
