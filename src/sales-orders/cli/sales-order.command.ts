import { Command, CommandRunner } from 'nest-commander';
import { SalesOrderCreateCommand } from './sales-order-create.command.js';
import { SalesOrderListCommand } from './sales-order-list.command.js';
import { SalesOrderHistoryCommand } from './sales-order-history.command.js';
import { SalesOrderShowCommand } from './sales-order-show.command.js';
import { SalesOrderUpdateItemCommand } from './sales-order-update-item.command.js';
import { SalesOrderRemoveItemCommand } from './sales-order-remove-item.command.js';

@Command({
  name: 'sales-order',
  description: 'Satış siparişi işlemleri (create, list, history, show, update-item, remove-item)',
  subCommands: [
    SalesOrderCreateCommand,
    SalesOrderListCommand,
    SalesOrderHistoryCommand,
    SalesOrderShowCommand,
    SalesOrderUpdateItemCommand,
    SalesOrderRemoveItemCommand,
  ],
})
export class SalesOrderCommand extends CommandRunner {
  async run(): Promise<void> {
    console.log('Kullanım: sales-order <create|list|history|show|update-item|remove-item> [options]');
  }
}
