import { Command, CommandRunner } from 'nest-commander';
import { WarehouseCreateCommand } from './warehouse-create.command.js';
import { WarehouseListCommand } from './warehouse-list.command.js';

@Command({
  name: 'warehouse',
  description: 'Depo işlemleri (create, list)',
  subCommands: [WarehouseCreateCommand, WarehouseListCommand],
})
export class WarehouseCommand extends CommandRunner {
  async run(): Promise<void> {
    console.log('Kullanım: warehouse <create|list> [options]');
  }
}
