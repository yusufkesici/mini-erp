import { Command, CommandRunner } from 'nest-commander';
import { BomCreateCommand } from './bom-create.command.js';
import { BomListCommand } from './bom-list.command.js';
import { BomTreeCommand } from './bom-tree.command.js';
import { BomExplodeCommand } from './bom-explode.command.js';

@Command({
  name: 'bom',
  description: 'Ürün ağacı (BOM) işlemleri (create, list, tree, explode)',
  subCommands: [
    BomCreateCommand,
    BomListCommand,
    BomTreeCommand,
    BomExplodeCommand,
  ],
})
export class BomCommand extends CommandRunner {
  async run(): Promise<void> {
    console.log('Kullanım: bom <create|list|tree|explode> [options]');
  }
}
