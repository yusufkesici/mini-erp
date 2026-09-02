import { Command, CommandRunner } from 'nest-commander';
import { StockMovementCreateCommand } from './stock-movement-create.command.js';
import { StockMovementListCommand } from './stock-movement-list.command.js';

@Command({
  name: 'stock-movement',
  description: 'Stok hareketi işlemleri (create, list)',
  subCommands: [StockMovementCreateCommand, StockMovementListCommand],
})
export class StockMovementCommand extends CommandRunner {
  async run(): Promise<void> {
    console.log('Kullanım: stock-movement <create|list> [options]');
  }
}
