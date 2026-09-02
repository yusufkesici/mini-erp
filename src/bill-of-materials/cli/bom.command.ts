import { Command, CommandRunner } from 'nest-commander';
import { BomCreateCommand } from './bom-create.command.js';
import { BomListCommand } from './bom-list.command.js';

@Command({
  name: 'bom',
  description: 'Ürün ağacı (BOM) işlemleri (create, list)',
  subCommands: [BomCreateCommand, BomListCommand],
})
export class BomCommand extends CommandRunner {
  async run(): Promise<void> {
    console.log('Kullanım: bom <create|list> [options]');
  }
}
