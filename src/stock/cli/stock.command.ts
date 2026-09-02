import { Command, CommandRunner } from 'nest-commander';
import { StockCreateCommand } from './stock-create.command.js';
import { StockListCommand } from './stock-list.command.js';

@Command({
  name: 'stock',
  description: 'Stok işlemleri (create, list)',
  subCommands: [StockCreateCommand, StockListCommand],
})
export class StockCommand extends CommandRunner {
  async run(): Promise<void> {
    console.log('Kullanım: stock <create|list> [options]');
  }
}
