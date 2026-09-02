import { CommandRunner, SubCommand } from 'nest-commander';
import { CustomersService } from '../customers.service.js';

@SubCommand({ name: 'list', description: 'Müşterileri listeler' })
export class CustomerListCommand extends CommandRunner {
  constructor(private readonly customersService: CustomersService) {
    super();
  }

  async run(): Promise<void> {
    const customers = await this.customersService.findAll();
    if (customers.length === 0) {
      console.log('Kayıtlı müşteri yok.');
      return;
    }
    console.table(
      customers.map((customer) => ({
        code: customer.code,
        name: customer.name,
        email: customer.email ?? '-',
        phone: customer.phone ?? '-',
        isActive: customer.isActive,
      })),
    );
    console.log(`${customers.length} müşteri`);
  }
}
