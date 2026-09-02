import { Command, CommandRunner } from 'nest-commander';
import { SalesOrderCreateCommand } from './sales-order-create.command.js';
import { SalesOrderListCommand } from './sales-order-list.command.js';
import { SalesOrderHistoryCommand } from './sales-order-history.command.js';

@Command({
  name: 'sales-order',
  description: 'Satış siparişi işlemleri (create, list, history)',
  subCommands: [SalesOrderCreateCommand, SalesOrderListCommand, SalesOrderHistoryCommand],
})
export class SalesOrderCommand extends CommandRunner {
  async run(): Promise<void> {
    console.log('Kullanım: sales-order <create|list|history> [options]');
  }
}
