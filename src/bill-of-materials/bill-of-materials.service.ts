import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma } from '../generated/prisma/client.js';
import { CreateBomDto } from './dto/create-bom.dto.js';
import { UpdateBomDto } from './dto/update-bom.dto.js';

export interface BomTreeNode {
  productId: string;
  productCode: string;
  productName: string;
  // kök ürün için null; bileşenler için üst düğümün 1 birimi başına gereken miktar
  quantity: number | null;
  // bu ürünün kendi aktif BOM'unun id'si, yoksa null (yaprak bileşen)
  bomId: string | null;
  children: BomTreeNode[];
}

@Injectable()
export class BillOfMaterialsService {
  constructor(private readonly prisma: PrismaService) {}

  // isActive true ile oluşturulan (varsayılan da true) bir BOM, aynı ürünün diğer
  // aktif BOM'larını pasife çeker — üründe aynı anda tek aktif BOM garantisi burada sağlanır.
  // Döngü kontrolü yalnızca sonuçta aktif olacak BOM'lar için gerekli (inaktif bir BOM aktif
  // graf'ta hiçbir zincire katılmaz) — bu yüzden assertNoCycle `isActive` iken çalışır, ama
  // aynı transaction (Serializable izolasyon) içinde: kontrol ile yazma arasında başka bir
  // isteğin araya girip görünmeyen bir döngü commit etmesini engeller (bkz. StockMovementsService).
  async create(dto: CreateBomDto) {
    const isActive = dto.isActive ?? true;
    const componentProductIds = dto.items.map((item) => item.componentProductId);
    this.assertNoSelfReference(dto.productId, componentProductIds);

    return this.prisma.$transaction(
      async (tx) => {
        if (isActive) {
          await this.assertNoCycle(tx, dto.productId, componentProductIds);
          await tx.billOfMaterial.updateMany({
            where: { productId: dto.productId, isActive: true },
            data: { isActive: false },
          });
        }
        return tx.billOfMaterial.create({
          data: {
            productId: dto.productId,
            name: dto.name,
            outputQuantity: dto.outputQuantity,
            isActive,
            items: { create: dto.items.map((item) => ({ componentProductId: item.componentProductId, quantity: item.quantity })) },
          },
          include: { items: true },
        });
      },
      { isolationLevel: 'Serializable' },
    );
  }

  findAll() {
    return this.prisma.billOfMaterial.findMany({ include: { product: true, items: true } });
  }

  async findOne(id: string) {
    const bom = await this.prisma.billOfMaterial.findUnique({
      where: { id },
      include: { product: true, items: { include: { component: true } } },
    });
    if (!bom) {
      throw new NotFoundException(`Ürün ağacı ${id} bulunamadı`);
    }
    return bom;
  }

  // Bir ürünün o an geçerli tarifi — üretim emri açarken bomId verilmezse buradan çözülür.
  // Normalde üründe tek aktif BOM olur (create/update bunu garanti eder); en son
  // güncellenen kaydı seçmek yalnızca eski/tutarsız veriye karşı deterministik bir güvence.
  async findActiveForProduct(productId: string) {
    const bom = await this.prisma.billOfMaterial.findFirst({
      where: { productId, isActive: true },
      orderBy: { updatedAt: 'desc' },
      include: { items: true },
    });
    if (!bom) {
      throw new NotFoundException(`Ürün ${productId} için aktif bir ürün ağacı (BOM) bulunamadı`);
    }
    return bom;
  }

  async update(id: string, dto: UpdateBomDto) {
    const existing = await this.findOne(id);
    // Sonuçta aktif olacak BOM'un item listesi: dto.items geldiyse o, gelmediyse (örn. yalnızca
    // { isActive: true } ile inaktif bir BOM'u aktive etmek) mevcut item'lar — döngü kontrolü
    // "items değişti mi"ye değil "sonuç aktif mi"ye bağlı olmalı, aksi halde önceden döngü
    // içerecek şekilde inaktif oluşturulmuş bir BOM, items göndermeden aktive edilip
    // kontrolsüz bir döngüyü canlıya alabilir.
    const willBeActive = dto.isActive ?? existing.isActive;
    const componentProductIds = dto.items
      ? dto.items.map((item) => item.componentProductId)
      : existing.items.map((item) => item.componentProductId);
    this.assertNoSelfReference(existing.productId, componentProductIds);

    return this.prisma.$transaction(
      async (tx) => {
        if (willBeActive) {
          await this.assertNoCycle(tx, existing.productId, componentProductIds);
        }
        if (dto.isActive) {
          await tx.billOfMaterial.updateMany({
            where: { productId: existing.productId, isActive: true, id: { not: id } },
            data: { isActive: false },
          });
        }
        return tx.billOfMaterial.update({
          where: { id },
          data: {
            name: dto.name,
            outputQuantity: dto.outputQuantity,
            isActive: dto.isActive,
            // items gönderildiyse mevcut satırları tamamen değiştir
            ...(dto.items
              ? {
                  items: {
                    deleteMany: {},
                    create: dto.items.map((item) => ({ componentProductId: item.componentProductId, quantity: item.quantity })),
                  },
                }
              : {}),
          },
          include: { items: true },
        });
      },
      { isolationLevel: 'Serializable' },
    );
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.billOfMaterial.delete({ where: { id } });
  }

  // Bir ürünün tam BOM ağacını (kök ürün + iç içe aktif BOM'lar üzerinden tüm bileşenler)
  // kurar. Görüntüleme amaçlıdır; create/update'teki assertNoCycle döngüleri zaten
  // engellediği için burada bir döngüyle karşılaşmak beklenmez — yine de tutarsız/eski
  // veriye karşı bir güvenlik ağı olarak, kökten köke kadarki soy zincirini (ancestors)
  // takip edip aynı üründe ikinci kez karşılaşırsa orada yaprak olarak durur.
  async getTree(productId: string): Promise<BomTreeNode> {
    const rootProduct = await this.prisma.product.findFirst({ where: { id: productId, deletedAt: null } });
    if (!rootProduct) {
      throw new NotFoundException(`Ürün ${productId} bulunamadı`);
    }

    const { bomId, children } = await this.buildTreeChildren(productId, new Set([productId]));
    return {
      productId: rootProduct.id,
      productCode: rootProduct.code,
      productName: rootProduct.name,
      quantity: null,
      bomId,
      children,
    };
  }

  private async buildTreeChildren(
    productId: string,
    ancestors: Set<string>,
  ): Promise<{ bomId: string | null; children: BomTreeNode[] }> {
    const bom = await this.prisma.billOfMaterial.findFirst({
      where: { productId, isActive: true },
      orderBy: { updatedAt: 'desc' },
      include: { items: { include: { component: true } } },
    });
    if (!bom) {
      return { bomId: null, children: [] };
    }

    const children: BomTreeNode[] = [];
    for (const item of bom.items) {
      const baseNode = {
        productId: item.componentProductId,
        productCode: item.component.code,
        productName: item.component.name,
        quantity: Number(item.quantity),
      };
      if (ancestors.has(item.componentProductId)) {
        children.push({ ...baseNode, bomId: null, children: [] });
        continue;
      }
      const { bomId: childBomId, children: grandchildren } = await this.buildTreeChildren(
        item.componentProductId,
        new Set(ancestors).add(item.componentProductId),
      );
      children.push({ ...baseNode, bomId: childBomId, children: grandchildren });
    }

    return { bomId: bom.id, children };
  }

  // Bir ürün, aktif olsun olmasın kendi bileşeni olamaz — bu her zaman geçersiz bir veridir,
  // aktivasyon durumundan bağımsız kontrol edilir (DB'ye gitmez, ucuz).
  private assertNoSelfReference(productId: string, componentProductIds: string[]) {
    if (componentProductIds.includes(productId)) {
      throw new BadRequestException('Bir ürün kendi bileşeni olamaz');
    }
  }

  // Bileşenlerden birinin (kendi aktif BOM'u üzerinden, dolaylı olarak) üst ürüne geri
  // dönüp dönmediğini kontrol eder. İç içe BOM'lar (bir bileşenin kendi aktif BOM'u olması)
  // yapısal olarak zaten desteklenir — burada yalnızca döngü engellenir. `tx` parametresiyle
  // çağıranın transaction'ı içinde (Serializable izolasyonla) çalışır: kontrol ile o BOM'u
  // aktif yapan yazma arasına başka bir isteğin girip görünmeyen bir döngü commit etmesi,
  // Postgres'in serileştirme çakışması hatasıyla engellenir.
  private async assertNoCycle(tx: Prisma.TransactionClient, productId: string, componentProductIds: string[]) {
    const visited = new Set<string>();
    const queue = [...componentProductIds];
    while (queue.length > 0) {
      const componentId = queue.shift()!;
      if (visited.has(componentId)) continue;
      visited.add(componentId);

      const activeBom = await tx.billOfMaterial.findFirst({
        where: { productId: componentId, isActive: true },
        orderBy: { updatedAt: 'desc' },
        include: { items: true },
      });
      if (!activeBom) continue;

      for (const item of activeBom.items) {
        if (item.componentProductId === productId) {
          throw new BadRequestException(
            `Dairesel referans: "${componentId}" ürünü (dolaylı olarak) üst ürünü zaten bileşen olarak içeriyor`,
          );
        }
        queue.push(item.componentProductId);
      }
    }
  }
}
