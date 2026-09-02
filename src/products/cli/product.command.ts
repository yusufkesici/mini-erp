import { Command, CommandRunner } from 'nest-commander';
import { ProductCreateCommand } from './product-create.command.js';
import { ProductListCommand } from './product-list.command.js';

@Command({
  name: 'product',
  description: 'Ürün işlemleri (create, list)',
  subCommands: [ProductCreateCommand, ProductListCommand],
})
export class ProductCommand extends CommandRunner {
  async run(): Promise<void> {
    console.log('Kullanım: product <create|list> [options]');
  }
}
