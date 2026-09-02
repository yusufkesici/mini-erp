import { Command, CommandRunner } from 'nest-commander';
import { ProductionOrderCreateCommand } from './production-order-create.command.js';
import { ProductionOrderListCommand } from './production-order-list.command.js';

@Command({
  name: 'production-order',
  description: 'Üretim emri işlemleri (create, list)',
  subCommands: [ProductionOrderCreateCommand, ProductionOrderListCommand],
})
export class ProductionOrderCommand extends CommandRunner {
  async run(): Promise<void> {
    console.log('Kullanım: production-order <create|list> [options]');
  }
}
