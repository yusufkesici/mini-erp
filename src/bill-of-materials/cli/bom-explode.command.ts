import { CommandRunner, Option, SubCommand } from 'nest-commander';
import { NotFoundException } from '@nestjs/common';
import { BillOfMaterialsService } from '../bill-of-materials.service.js';
import type { BomTreeNode } from '../bill-of-materials.service.js';
import { ProductsService } from '../../products/products.service.js';

interface BomExplodeOptions {
  productCode: string;
  quantity: string;
  json?: boolean;
}

@SubCommand({
  name: 'explode',
  description:
    'Bir üründen belirli miktarda üretmek için gereken bileşenleri patlatır',
})
export class BomExplodeCommand extends CommandRunner {
  constructor(
    private readonly bomService: BillOfMaterialsService,
    private readonly productsService: ProductsService,
  ) {
    super();
  }

  async run(
    _passedParams: string[],
    options: BomExplodeOptions,
  ): Promise<void> {
    const quantity = Number(options.quantity);
    if (!options.quantity || Number.isNaN(quantity)) {
      console.error('--quantity sayısal ve zorunludur');
      process.exitCode = 1;
      return;
    }

    let product;
    try {
      product = await this.productsService.findByCode(options.productCode);
    } catch (error) {
      if (error instanceof NotFoundException) {
        console.error(error.message);
        process.exitCode = 1;
        return;
      }
      throw error;
    }

    try {
      const result = await this.bomService.explode(product.id, quantity);
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }
      console.log(renderTree(result.tree));
      console.log();
      console.log('Toplam ihtiyaç listesi:');
      for (const line of result.lines) {
        const kind = line.isLeaf ? 'ham madde' : 'ara mamul';
        console.log(
          `  - ${line.productCode} (${line.productName}): ${line.quantity} [${kind}]`,
        );
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error(error.message);
        process.exitCode = 1;
        return;
      }
      throw error;
    }
  }

  @Option({
    flags: '-p, --product-code <productCode>',
    description: 'Ürün kodu',
  })
  parseProductCode(val: string): string {
    return val;
  }

  @Option({
    flags: '-q, --quantity <quantity>',
    description: 'Üretilecek miktar',
  })
  parseQuantity(val: string): string {
    return val;
  }

  @Option({
    flags: '-j, --json',
    description: 'JSON formatında yazdır (varsayılan: girintili metin)',
  })
  parseJson(): boolean {
    return true;
  }
}

// bom-tree.command.ts'deki renderTree ile aynı girintili ağaç deseni, kümülatif miktar gösterir.
function renderTree(
  node: BomTreeNode,
  prefix = '',
  isLast = true,
  isRoot = true,
): string {
  const quantitySuffix =
    node.cumulativeQuantity === null ? '' : ` (x${node.cumulativeQuantity})`;
  const label = `${node.productCode} — ${node.productName}${quantitySuffix}`;
  const line = isRoot ? label : `${prefix}${isLast ? '└─ ' : '├─ '}${label}`;
  const childPrefix = isRoot ? '' : prefix + (isLast ? '   ' : '│  ');

  const lines = [line];
  node.children.forEach((child, index) => {
    lines.push(
      renderTree(child, childPrefix, index === node.children.length - 1, false),
    );
  });
  return lines.join('\n');
}
