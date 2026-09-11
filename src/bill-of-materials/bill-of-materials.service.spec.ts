import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BillOfMaterialsService } from './bill-of-materials.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

interface MockBom {
  id: string;
  productId: string;
  isActive: boolean;
  outputQuantity: number;
  items: { componentProductId: string; quantity: number }[];
}
interface MockProduct {
  id: string;
  code: string;
  name: string;
  trackingType?: 'BOM_AUTO' | 'BARCODE_MANUAL';
}

function withComponent(
  items: { componentProductId: string; quantity: number }[],
  products: Map<string, MockProduct>,
  wantsComponent: boolean,
) {
  return wantsComponent
    ? items.map((item) => ({
        ...item,
        component: products.get(item.componentProductId),
      }))
    : items;
}

// PrismaService'i mock'layan küçük bir bellek-içi BOM/Product deposu — bu testler yalnızca
// prisma.billOfMaterial.{findFirst,findUnique,create,update,updateMany} ve
// prisma.product.findFirst okuduğu/yazdığı için gerçek DB gerekmiyor. Bu proje testlerinde
// üründe her zaman tek BOM satırı olduğundan (id === productId), aktivasyon durumu değişikliği
// var olan satırın isActive alanını değiştirerek (create ile yeni satır açmadan) simüle edilir.
function createHarness() {
  const boms = new Map<string, MockBom>();
  const products = new Map<string, MockProduct>();
  const prisma = {
    product: {
      findFirst: vi.fn(({ where }: { where: { id: string } }) =>
        Promise.resolve(products.get(where.id) ?? null),
      ),
      findMany: vi.fn(({ where }: { where: { id: { in: string[] } } }) =>
        Promise.resolve(
          where.id.in
            .map((id) => products.get(id))
            .filter((p): p is MockProduct => p !== undefined)
            .map((p) => ({
              code: p.code,
              trackingType: p.trackingType ?? 'BOM_AUTO',
            })),
        ),
      ),
    },
    billOfMaterial: {
      // Gerçek Prisma gibi `component`'i yalnızca istendiğinde (items.include.component) ekler —
      // böylece findActiveForProduct (component istemez) ve getTree (ister) aynı mock'u
      // kendi gerçek `include` şekilleriyle tutarlı biçimde kullanabilir.
      findFirst: vi.fn(
        ({
          where,
          include,
        }: {
          where: { productId: string; isActive: boolean };
          include?: { items?: boolean | { include?: { component?: boolean } } };
        }) => {
          const bom = [...boms.values()].find(
            (b) =>
              b.productId === where.productId && b.isActive === where.isActive,
          );
          if (!bom) return Promise.resolve(null);
          const wantsComponent =
            typeof include?.items === 'object' &&
            Boolean(include.items.include?.component);
          return Promise.resolve({
            ...bom,
            items: withComponent(bom.items, products, wantsComponent),
          });
        },
      ),
      findUnique: vi.fn(({ where }: { where: { id: string } }) => {
        const bom = boms.get(where.id);
        if (!bom) return Promise.resolve(null);
        return Promise.resolve({
          ...bom,
          product: products.get(bom.productId),
          items: withComponent(bom.items, products, true),
        });
      }),
      update: vi.fn(
        ({
          where,
          data,
        }: {
          where: { id: string };
          data: {
            isActive?: boolean;
            items?: {
              create: { componentProductId: string; quantity: number }[];
            };
          };
        }) => {
          const bom = boms.get(where.id);
          if (!bom) throw new Error(`mock: bom ${where.id} not found`);
          if (data.isActive !== undefined) bom.isActive = data.isActive;
          if (data.items) bom.items = data.items.create;
          return Promise.resolve({ ...bom, items: bom.items });
        },
      ),
      updateMany: vi.fn(
        ({
          where,
          data,
        }: {
          where: { productId: string; isActive: boolean; id?: { not: string } };
          data: { isActive: boolean };
        }) => {
          let count = 0;
          for (const bom of boms.values()) {
            if (
              bom.productId !== where.productId ||
              bom.isActive !== where.isActive
            )
              continue;
            if (where.id?.not && bom.id === where.id.not) continue;
            bom.isActive = data.isActive;
            count++;
          }
          return Promise.resolve({ count });
        },
      ),
      create: vi.fn(),
    },
    $transaction: vi.fn((fn: (tx: unknown) => unknown) => fn(prisma)),
  };
  prisma.billOfMaterial.create.mockImplementation(
    ({
      data,
    }: {
      data: {
        productId: string;
        isActive: boolean;
        outputQuantity?: number;
        items: { create: { componentProductId: string; quantity: number }[] };
      };
    }) => {
      const bom: MockBom = {
        id: data.productId,
        productId: data.productId,
        isActive: data.isActive,
        outputQuantity: data.outputQuantity ?? 1,
        items: data.items.create,
      };
      boms.set(bom.id, bom);
      return Promise.resolve({ ...bom, items: bom.items });
    },
  );
  return { boms, products, prisma };
}

describe('BillOfMaterialsService — döngü/self-reference koruması', () => {
  let service: BillOfMaterialsService;
  const { boms, products, prisma } = createHarness();

  beforeEach(async () => {
    boms.clear();
    products.clear();
    vi.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        BillOfMaterialsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(BillOfMaterialsService);
  });

  it('bir ürün kendi bileşeni olarak eklenemez', async () => {
    await expect(
      service.create({
        productId: 'A',
        items: [{ componentProductId: 'A', quantity: 1 }],
      } as never),
    ).rejects.toThrow(BadRequestException);
  });

  it("BARCODE_MANUAL bir ürün bileşen olarak BOM'a eklenemez", async () => {
    products.set('B', {
      id: 'B',
      code: 'B',
      name: 'B',
      trackingType: 'BARCODE_MANUAL',
    });
    await expect(
      service.create({
        productId: 'A',
        items: [{ componentProductId: 'B', quantity: 1 }],
      } as never),
    ).rejects.toThrow(BadRequestException);
  });

  it('BARCODE_MANUAL bir ürünün kendisi BOM çıktısı (header) olamaz', async () => {
    products.set('A', {
      id: 'A',
      code: 'A',
      name: 'A',
      trackingType: 'BARCODE_MANUAL',
    });
    await expect(
      service.create({
        productId: 'A',
        items: [{ componentProductId: 'B', quantity: 1 }],
      } as never),
    ).rejects.toThrow(BadRequestException);
  });

  it('doğrudan dairesel referansı reddeder (A -> B -> A)', async () => {
    // B'nin aktif BOM'u zaten A'yı bileşen olarak içeriyor
    boms.set('B', {
      id: 'B',
      productId: 'B',
      isActive: true,
      items: [{ componentProductId: 'A', quantity: 1 }],
    });

    await expect(
      service.create({
        productId: 'A',
        items: [{ componentProductId: 'B', quantity: 1 }],
      } as never),
    ).rejects.toThrow(BadRequestException);
  });

  it('dolaylı (çok seviyeli) dairesel referansı reddeder (A -> B -> C -> A)', async () => {
    boms.set('B', {
      id: 'B',
      productId: 'B',
      isActive: true,
      items: [{ componentProductId: 'C', quantity: 1 }],
    });
    boms.set('C', {
      id: 'C',
      productId: 'C',
      isActive: true,
      items: [{ componentProductId: 'A', quantity: 1 }],
    });

    await expect(
      service.create({
        productId: 'A',
        items: [{ componentProductId: 'B', quantity: 1 }],
      } as never),
    ).rejects.toThrow(BadRequestException);
  });

  it("döngü oluşturmayan iç içe BOM'a (bileşenin kendi aktif BOM'u olması) izin verir", async () => {
    // B'nin kendi aktif BOM'u var (C'yi bileşen olarak kullanıyor) ama zincir A'ya dönmüyor
    boms.set('B', {
      id: 'B',
      productId: 'B',
      isActive: true,
      items: [{ componentProductId: 'C', quantity: 1 }],
    });

    await expect(
      service.create({
        productId: 'A',
        items: [{ componentProductId: 'B', quantity: 1 }],
      } as never),
    ).resolves.toBeDefined();
  });
});

// Gerçek dünya örneği — 3 seviyeli bir ürün ağacı:
//   Bisiklet (FINISHED_GOOD)
//     └─ Tekerlek Seti x2 (SEMI_FINISHED)
//          ├─ Jant x2 (RAW_MATERIAL)
//          ├─ Lastik x2 (RAW_MATERIAL)
//          └─ İç Lastik x2 (RAW_MATERIAL)
// "Tekerlek Seti" bir setin 2 tekerlekten oluştuğunu varsayarak her bileşenden 2 adet içerir.
describe('BillOfMaterialsService — 3 seviyeli örnek ağaç: Bisiklet → Tekerlek Seti → [Jant, Lastik, İç Lastik]', () => {
  let service: BillOfMaterialsService;
  const { boms, products, prisma } = createHarness();

  const BISIKLET = 'BISIKLET';
  const TEKERLEK_SETI = 'TEKERLEK_SETI';
  const JANT = 'JANT';
  const LASTIK = 'LASTIK';
  const IC_LASTIK = 'IC_LASTIK';

  beforeEach(async () => {
    boms.clear();
    products.clear();
    vi.clearAllMocks();
    products.set(BISIKLET, { id: BISIKLET, code: 'BIS-001', name: 'Bisiklet' });
    products.set(TEKERLEK_SETI, {
      id: TEKERLEK_SETI,
      code: 'TKR-SET-001',
      name: 'Tekerlek Seti',
    });
    products.set(JANT, { id: JANT, code: 'JANT-001', name: 'Jant' });
    products.set(LASTIK, { id: LASTIK, code: 'LAS-001', name: 'Lastik' });
    products.set(IC_LASTIK, {
      id: IC_LASTIK,
      code: 'ICLAS-001',
      name: 'İç Lastik',
    });

    const module = await Test.createTestingModule({
      providers: [
        BillOfMaterialsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(BillOfMaterialsService);
  });

  async function kurAgaci() {
    // Önce en alttaki seviye kurulur: Tekerlek Seti'nin kendi BOM'u (leaf bileşenler)
    await service.create({
      productId: TEKERLEK_SETI,
      items: [
        { componentProductId: JANT, quantity: 2 },
        { componentProductId: LASTIK, quantity: 2 },
        { componentProductId: IC_LASTIK, quantity: 2 },
      ],
    } as never);

    // Sonra üst seviye: Bisiklet'in BOM'u, bileşen olarak (kendi BOM'u olan) Tekerlek Seti'ni kullanır
    return service.create({
      productId: BISIKLET,
      items: [{ componentProductId: TEKERLEK_SETI, quantity: 2 }],
    } as never);
  }

  it('3 seviyeli ağaç hatasız kurulabilir', async () => {
    await expect(kurAgaci()).resolves.toBeDefined();
  });

  it('her seviyedeki miktarlar doğru saklanır', async () => {
    await kurAgaci();

    const bisikletBom = await service.findActiveForProduct(BISIKLET);
    expect(bisikletBom.items).toEqual([
      { componentProductId: TEKERLEK_SETI, quantity: 2 },
    ]);

    const tekerlekSetiBom = await service.findActiveForProduct(TEKERLEK_SETI);
    expect(tekerlekSetiBom.items).toEqual([
      { componentProductId: JANT, quantity: 2 },
      { componentProductId: LASTIK, quantity: 2 },
      { componentProductId: IC_LASTIK, quantity: 2 },
    ]);
  });

  it('yaprak seviyedeki bir ürün (Jant), 3 seviye yukarıdaki köke (Bisiklet) bileşen olarak eklenip zinciri döngüye sokamaz', async () => {
    await kurAgaci();

    // Jant -> Bisiklet zinciri: Bisiklet -> Tekerlek Seti -> Jant olduğu için bu, 3 hop'luk bir döngü kurar
    await expect(
      service.create({
        productId: JANT,
        items: [{ componentProductId: BISIKLET, quantity: 1 }],
      } as never),
    ).rejects.toThrow(BadRequestException);
  });

  it('orta seviyedeki ürün (Tekerlek Seti) köke (Bisiklet) bileşen olarak eklenemez', async () => {
    await kurAgaci();

    // Tekerlek Seti -> Bisiklet -> Tekerlek Seti: 2 hop'luk döngü
    await expect(
      service.create({
        productId: TEKERLEK_SETI,
        items: [{ componentProductId: BISIKLET, quantity: 1 }],
      } as never),
    ).rejects.toThrow(BadRequestException);
  });

  it('getTree, tüm 3 seviyeyi kod/ad/miktar ile doğru iç içe geçmiş ağaç olarak döner', async () => {
    await kurAgaci();

    const tree = await service.getTree(BISIKLET);

    expect(tree).toEqual({
      productId: BISIKLET,
      productCode: 'BIS-001',
      productName: 'Bisiklet',
      quantity: null,
      cumulativeQuantity: null,
      bomId: BISIKLET,
      children: [
        {
          productId: TEKERLEK_SETI,
          productCode: 'TKR-SET-001',
          productName: 'Tekerlek Seti',
          quantity: 2,
          cumulativeQuantity: 2, // kök = 1 birim Bisiklet * 2 (Tekerlek Seti / outputQuantity 1)
          bomId: TEKERLEK_SETI,
          children: [
            {
              productId: JANT,
              productCode: 'JANT-001',
              productName: 'Jant',
              quantity: 2,
              cumulativeQuantity: 4, // 2 (üst kümülatif) * 2 (Jant / outputQuantity 1)
              bomId: null,
              children: [],
            },
            {
              productId: LASTIK,
              productCode: 'LAS-001',
              productName: 'Lastik',
              quantity: 2,
              cumulativeQuantity: 4,
              bomId: null,
              children: [],
            },
            {
              productId: IC_LASTIK,
              productCode: 'ICLAS-001',
              productName: 'İç Lastik',
              quantity: 2,
              cumulativeQuantity: 4,
              bomId: null,
              children: [],
            },
          ],
        },
      ],
    });
  });

  it("getTree, kendi BOM'u olmayan bir yaprak ürün için boş children ve bomId: null döner", async () => {
    await kurAgaci();

    const tree = await service.getTree(JANT);

    expect(tree).toEqual({
      productId: JANT,
      productCode: 'JANT-001',
      productName: 'Jant',
      quantity: null,
      cumulativeQuantity: null,
      bomId: null,
      children: [],
    });
  });

  it('getTree, var olmayan bir ürün için NotFoundException fırlatır', async () => {
    await expect(service.getTree('YOK')).rejects.toThrow(NotFoundException);
  });

  it('explode, 10 Bisiklet için her seviyeyi kümülatif çarparak doğru tree ve lines döner', async () => {
    await kurAgaci();

    const { tree, lines } = await service.explode(BISIKLET, 10);

    expect(tree.cumulativeQuantity).toBe(10);
    expect(tree.children[0]).toMatchObject({
      productId: TEKERLEK_SETI,
      cumulativeQuantity: 20,
    });
    expect(tree.children[0].children).toEqual([
      expect.objectContaining({ productId: JANT, cumulativeQuantity: 40 }),
      expect.objectContaining({ productId: LASTIK, cumulativeQuantity: 40 }),
      expect.objectContaining({ productId: IC_LASTIK, cumulativeQuantity: 40 }),
    ]);

    expect(lines).toEqual([
      {
        productId: IC_LASTIK,
        productCode: 'ICLAS-001',
        productName: 'İç Lastik',
        quantity: 40,
        isLeaf: true,
      },
      {
        productId: JANT,
        productCode: 'JANT-001',
        productName: 'Jant',
        quantity: 40,
        isLeaf: true,
      },
      {
        productId: LASTIK,
        productCode: 'LAS-001',
        productName: 'Lastik',
        quantity: 40,
        isLeaf: true,
      },
      {
        productId: TEKERLEK_SETI,
        productCode: 'TKR-SET-001',
        productName: 'Tekerlek Seti',
        quantity: 20,
        isLeaf: false,
      },
    ]);
  });

  it('explode, aynı bileşen birden fazla dalda geçtiğinde miktarları TOPLAR (aggregation)', async () => {
    // Jant'ı Bisiklet'in doğrudan bileşeni olarak da ekliyoruz (örn. yedek jant) — artık
    // Jant hem Tekerlek Seti üzerinden hem doğrudan Bisiklet üzerinden geliyor.
    await kurAgaci();
    await service.update(BISIKLET, {
      items: [
        { componentProductId: TEKERLEK_SETI, quantity: 2 },
        { componentProductId: JANT, quantity: 1 },
      ],
    } as never);

    const { lines } = await service.explode(BISIKLET, 10);
    const jantLine = lines.find((l) => l.productId === JANT);

    // Tekerlek Seti dalından 40 (10*2*2) + doğrudan dal 10 (10*1) = 50
    expect(jantLine).toEqual({
      productId: JANT,
      productCode: 'JANT-001',
      productName: 'Jant',
      quantity: 50,
      isLeaf: true,
    });
  });

  it("explode, outputQuantity ≠ 1 olan bir reçetede miktarı doğru böler (regresyon: önceki sürüm outputQuantity'yi yok sayıyordu)", async () => {
    // Tekerlek Seti reçetesi artık 1 değil 2 SET üretiyor — yani item.quantity, 2 setlik
    // üretim başınadır. 10 set Bisiklet (=10 set Tekerlek Seti) istemek, Jant için
    // 10 * (2/2) = 10 değil, çıktıya göre orantılı 10 olmalı; outputQuantity=4 ile test
    // ederek bölmenin gerçekten uygulandığını kanıtlıyoruz.
    await service.create({
      productId: TEKERLEK_SETI,
      outputQuantity: 4,
      items: [{ componentProductId: JANT, quantity: 2 }],
    } as never);
    await service.create({
      productId: BISIKLET,
      items: [{ componentProductId: TEKERLEK_SETI, quantity: 1 }],
    } as never);

    const { lines } = await service.explode(BISIKLET, 4);
    const jantLine = lines.find((l) => l.productId === JANT);

    // 4 Bisiklet -> 4*1=4 Tekerlek Seti isteniyor -> 4 * (2/4) = 2 Jant
    expect(jantLine?.quantity).toBe(2);
  });

  it("explode, kendi aktif BOM'u olmayan bir ürün için BadRequestException fırlatır", async () => {
    await kurAgaci();
    await expect(service.explode(JANT, 5)).rejects.toThrow(BadRequestException);
  });

  it('explode, var olmayan bir ürün için NotFoundException fırlatır', async () => {
    await expect(service.explode('YOK', 5)).rejects.toThrow(NotFoundException);
  });

  it('explode, sıfır veya negatif miktar için BadRequestException fırlatır', async () => {
    await kurAgaci();
    await expect(service.explode(BISIKLET, 0)).rejects.toThrow(
      BadRequestException,
    );
    await expect(service.explode(BISIKLET, -5)).rejects.toThrow(
      BadRequestException,
    );
  });

  it("explodeForBom, ürünün aktif BOM'u SONRADAN değiştirilse bile orijinal (artık aktif olmayan) bomId'yi doğru patlatır", async () => {
    // Bu regresyon, ProductionOrder.bomId gibi oluşturma anında sabitlenmiş bir reçetenin,
    // ürünün BOM'u sonradan değiştirilip aktive edilse bile hep AYNI şekilde patlatılması
    // gerektiğini kanıtlar — explode(productId,...) bunu garanti edemez çünkü o her zaman
    // "o an aktif" olanı kullanır.
    const v1BomId = 'TEKERLEK_SETI_BOM_V1';
    boms.set(v1BomId, {
      id: v1BomId,
      productId: TEKERLEK_SETI,
      isActive: false,
      outputQuantity: 1,
      items: [{ componentProductId: JANT, quantity: 2 }],
    });
    // Ürünün YENİ aktif BOM'u — farklı bileşen/miktar (Lastik:5)
    boms.set(TEKERLEK_SETI, {
      id: TEKERLEK_SETI,
      productId: TEKERLEK_SETI,
      isActive: true,
      outputQuantity: 1,
      items: [{ componentProductId: LASTIK, quantity: 5 }],
    });

    const { tree, lines } = await service.explodeForBom(v1BomId, 10);

    expect(tree.bomId).toBe(v1BomId);
    expect(lines).toEqual([
      {
        productId: JANT,
        productCode: 'JANT-001',
        productName: 'Jant',
        quantity: 20,
        isLeaf: true,
      },
    ]);
  });

  it('explodeForBom, var olmayan bir bomId için NotFoundException fırlatır', async () => {
    await expect(service.explodeForBom('YOK', 10)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('explodeForBom, sıfır veya negatif miktar için BadRequestException fırlatır', async () => {
    await kurAgaci();
    const bisikletBom = await service.findActiveForProduct(BISIKLET);
    await expect(service.explodeForBom(bisikletBom.id, 0)).rejects.toThrow(
      BadRequestException,
    );
    await expect(service.explodeForBom(bisikletBom.id, -5)).rejects.toThrow(
      BadRequestException,
    );
  });
});

// db-schema-reviewer'ın bulduğu iki gerçek boşluğa karşı regresyon testleri:
// 1) update()'e yalnızca { isActive: true } gönderilip items gönderilmezse döngü kontrolü
//    atlanıyordu — önceden inaktif oluşturulmuş bir döngü, aktivasyon anında hiç kontrol
//    edilmeden canlıya alınabiliyordu.
// 2) assertNoCycle, yazma transaction'ının dışında ve Serializable izolasyon olmadan
//    çalışıyordu — bu, gerçek bir eşzamanlılık testiyle (tek thread'li mock'ta) kanıtlanamaz,
//    bu yüzden burada yalnızca düzeltmenin mekanizmasının (kontrolün artık `tx` üzerinden,
//    Serializable izolasyonlu transaction içinde çalıştığı) hâlâ yerinde olduğunu doğruluyoruz.
describe('BillOfMaterialsService — aktivasyon anında döngü kontrolü ve transaction izolasyonu', () => {
  let service: BillOfMaterialsService;
  const { boms, prisma } = createHarness();

  beforeEach(async () => {
    boms.clear();
    vi.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        BillOfMaterialsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(BillOfMaterialsService);
  });

  it('items göndermeden yalnızca isActive:true ile aktive etmek, önceden inaktif kaydedilmiş bir döngüyü ortaya çıkarır', async () => {
    // B'nin BOM'u INAKTİF: A'yı bileşen olarak içeriyor — bu anda A henüz aktif değil, zarasız
    const bBom = await service.create({
      productId: 'B',
      items: [{ componentProductId: 'A', quantity: 1 }],
      isActive: false,
    } as never);

    // A'nın BOM'u AKTİF: B'yi bileşen olarak içeriyor — B henüz inaktif olduğu için bu geçer
    await service.create({
      productId: 'A',
      items: [{ componentProductId: 'B', quantity: 1 }],
    } as never);

    // B'nin BOM'unu items göndermeden aktive etmeye çalışmak: mevcut item'ları (A) kullanarak
    // döngü kontrolü yapılmalı ve reddedilmeli — düzeltmeden önce bu satır sessizce geçerdi.
    await expect(
      service.update(bBom.id, { isActive: true } as never),
    ).rejects.toThrow(BadRequestException);
  });

  it('items göndermeden yalnızca isActive:true ile aktive etmek, döngü yoksa serbestçe geçer', async () => {
    const bBom = await service.create({
      productId: 'B',
      items: [{ componentProductId: 'C', quantity: 1 }],
      isActive: false,
    } as never);

    await expect(
      service.update(bBom.id, { isActive: true } as never),
    ).resolves.toBeDefined();
  });

  it('create ve update, döngü kontrolünü ve yazmayı Serializable izolasyonlu tek bir transaction içinde yapar', async () => {
    await service.create({
      productId: 'A',
      items: [{ componentProductId: 'X', quantity: 1 }],
    } as never);
    const bBom = await service.create({
      productId: 'B',
      items: [{ componentProductId: 'Y', quantity: 1 }],
    } as never);
    await service.update(bBom.id, {
      items: [{ componentProductId: 'Z', quantity: 1 }],
    } as never);

    const transactionMock = prisma.$transaction as unknown as {
      mock: { calls: unknown[][] };
    };
    for (const call of transactionMock.mock.calls) {
      expect(call[1]).toEqual({ isolationLevel: 'Serializable' });
    }
  });
});
