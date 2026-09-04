import { CommandRunner, Option, SubCommand } from 'nest-commander';
import { NotFoundException } from '@nestjs/common';
import { BillOfMaterialsService } from '../bill-of-materials.service.js';
import type { BomTreeNode } from '../bill-of-materials.service.js';
import { ProductsService } from '../../products/products.service.js';

interface BomTreeOptions {
  productCode: string;
  json?: boolean;
}

@SubCommand({ name: 'tree', description: 'Bir ürünün BOM ağacını gösterir' })
export class BomTreeCommand extends CommandRunner {
  constructor(
    private readonly bomService: BillOfMaterialsService,
    private readonly productsService: ProductsService,
  ) {
    super();
  }

  async run(_passedParams: string[], options: BomTreeOptions): Promise<void> {
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

    const tree = await this.bomService.getTree(product.id);
    if (options.json) {
      console.log(JSON.stringify(tree, null, 2));
      return;
    }
    console.log(renderTree(tree));
  }

  @Option({ flags: '-p, --product-code <productCode>', description: 'Ürün kodu' })
  parseProductCode(val: string): string {
    return val;
  }

  @Option({ flags: '-j, --json', description: 'JSON formatında yazdır (varsayılan: girintili metin)' })
  parseJson(): boolean {
    return true;
  }
}

// Girintili metin ağacı: kök satırın öneki yok, sonraki her seviye ├─/└─ ile dallanır.
function renderTree(node: BomTreeNode, prefix = '', isLast = true, isRoot = true): string {
  const quantitySuffix = node.quantity === null ? '' : ` (x${node.quantity})`;
  const label = `${node.productCode} — ${node.productName}${quantitySuffix}`;
  const line = isRoot ? label : `${prefix}${isLast ? '└─ ' : '├─ '}${label}`;
  const childPrefix = isRoot ? '' : prefix + (isLast ? '   ' : '│  ');

  const lines = [line];
  node.children.forEach((child, index) => {
    lines.push(renderTree(child, childPrefix, index === node.children.length - 1, false));
  });
  return lines.join('\n');
}
