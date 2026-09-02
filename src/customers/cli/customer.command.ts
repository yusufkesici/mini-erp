import { Command, CommandRunner } from 'nest-commander';
import { CustomerCreateCommand } from './customer-create.command.js';
import { CustomerListCommand } from './customer-list.command.js';

@Command({
  name: 'customer',
  description: 'Müşteri işlemleri (create, list)',
  subCommands: [CustomerCreateCommand, CustomerListCommand],
})
export class CustomerCommand extends CommandRunner {
  async run(): Promise<void> {
    console.log('Kullanım: customer <create|list> [options]');
  }
}
