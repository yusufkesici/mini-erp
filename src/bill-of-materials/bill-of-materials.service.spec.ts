import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BillOfMaterialsService } from './bill-of-materials.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

interface MockBom {
  id: string;
  productId: string;
  isActive: boolean;
  items: { componentProductId: string; quantity: number }[];
}
interface MockProduct {
  id: string;
  code: string;
  name: string;
}

function withComponent(
  items: { componentProductId: string; quantity: number }[],
  products: Map<string, MockProduct>,
  wantsComponent: boolean,
) {
  return wantsComponent ? items.map((item) => ({ ...item, component: products.get(item.componentProductId) })) : items;
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
      findFirst: vi.fn(({ where }: { where: { id: string } }) => Promise.resolve(products.get(where.id) ?? null)),
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
          const bom = [...boms.values()].find((b) => b.productId === where.productId && b.isActive === where.isActive);
          if (!bom) return Promise.resolve(null);
          const wantsComponent = typeof include?.items === 'object' && Boolean(include.items.include?.component);
          return Promise.resolve({ ...bom, items: withComponent(bom.items, products, wantsComponent) });
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
          data: { isActive?: boolean; items?: { create: { componentProductId: string; quantity: number }[] } };
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
            if (bom.productId !== where.productId || bom.isActive !== where.isActive) continue;
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
        items: { create: { componentProductId: string; quantity: number }[] };
      };
    }) => {
      const bom: MockBom = { id: data.productId, productId: data.productId, isActive: data.isActive, items: data.items.create };
      boms.set(bom.id, bom);
      return Promise.resolve({ ...bom, items: bom.items });
    },
  );
  return { boms, products, prisma };
}

describe('BillOfMaterialsService — döngü/self-reference koruması', () => {
  let service: BillOfMaterialsService;
  const { boms, prisma } = createHarness();

  beforeEach(async () => {
    boms.clear();
    vi.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [BillOfMaterialsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(BillOfMaterialsService);
  });

  it('bir ürün kendi bileşeni olarak eklenemez', async () => {
    await expect(
      service.create({ productId: 'A', items: [{ componentProductId: 'A', quantity: 1 }] } as never),
    ).rejects.toThrow(BadRequestException);
  });

  it('doğrudan dairesel referansı reddeder (A -> B -> A)', async () => {
    // B'nin aktif BOM'u zaten A'yı bileşen olarak içeriyor
    boms.set('B', { id: 'B', productId: 'B', isActive: true, items: [{ componentProductId: 'A', quantity: 1 }] });

    await expect(
      service.create({ productId: 'A', items: [{ componentProductId: 'B', quantity: 1 }] } as never),
    ).rejects.toThrow(BadRequestException);
  });

  it('dolaylı (çok seviyeli) dairesel referansı reddeder (A -> B -> C -> A)', async () => {
    boms.set('B', { id: 'B', productId: 'B', isActive: true, items: [{ componentProductId: 'C', quantity: 1 }] });
    boms.set('C', { id: 'C', productId: 'C', isActive: true, items: [{ componentProductId: 'A', quantity: 1 }] });

    await expect(
      service.create({ productId: 'A', items: [{ componentProductId: 'B', quantity: 1 }] } as never),
    ).rejects.toThrow(BadRequestException);
  });

  it("döngü oluşturmayan iç içe BOM'a (bileşenin kendi aktif BOM'u olması) izin verir", async () => {
    // B'nin kendi aktif BOM'u var (C'yi bileşen olarak kullanıyor) ama zincir A'ya dönmüyor
    boms.set('B', { id: 'B', productId: 'B', isActive: true, items: [{ componentProductId: 'C', quantity: 1 }] });

    await expect(
      service.create({ productId: 'A', items: [{ componentProductId: 'B', quantity: 1 }] } as never),
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
    products.set(TEKERLEK_SETI, { id: TEKERLEK_SETI, code: 'TKR-SET-001', name: 'Tekerlek Seti' });
    products.set(JANT, { id: JANT, code: 'JANT-001', name: 'Jant' });
    products.set(LASTIK, { id: LASTIK, code: 'LAS-001', name: 'Lastik' });
    products.set(IC_LASTIK, { id: IC_LASTIK, code: 'ICLAS-001', name: 'İç Lastik' });

    const module = await Test.createTestingModule({
      providers: [BillOfMaterialsService, { provide: PrismaService, useValue: prisma }],
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
    expect(bisikletBom.items).toEqual([{ componentProductId: TEKERLEK_SETI, quantity: 2 }]);

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
      service.create({ productId: JANT, items: [{ componentProductId: BISIKLET, quantity: 1 }] } as never),
    ).rejects.toThrow(BadRequestException);
  });

  it('orta seviyedeki ürün (Tekerlek Seti) köke (Bisiklet) bileşen olarak eklenemez', async () => {
    await kurAgaci();

    // Tekerlek Seti -> Bisiklet -> Tekerlek Seti: 2 hop'luk döngü
    await expect(
      service.create({ productId: TEKERLEK_SETI, items: [{ componentProductId: BISIKLET, quantity: 1 }] } as never),
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
      bomId: BISIKLET,
      children: [
        {
          productId: TEKERLEK_SETI,
          productCode: 'TKR-SET-001',
          productName: 'Tekerlek Seti',
          quantity: 2,
          bomId: TEKERLEK_SETI,
          children: [
            { productId: JANT, productCode: 'JANT-001', productName: 'Jant', quantity: 2, bomId: null, children: [] },
            { productId: LASTIK, productCode: 'LAS-001', productName: 'Lastik', quantity: 2, bomId: null, children: [] },
            {
              productId: IC_LASTIK,
              productCode: 'ICLAS-001',
              productName: 'İç Lastik',
              quantity: 2,
              bomId: null,
              children: [],
            },
          ],
        },
      ],
    });
  });

  it('getTree, kendi BOM\'u olmayan bir yaprak ürün için boş children ve bomId: null döner', async () => {
    await kurAgaci();

    const tree = await service.getTree(JANT);

    expect(tree).toEqual({ productId: JANT, productCode: 'JANT-001', productName: 'Jant', quantity: null, bomId: null, children: [] });
  });

  it('getTree, var olmayan bir ürün için NotFoundException fırlatır', async () => {
    await expect(service.getTree('YOK')).rejects.toThrow(NotFoundException);
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
      providers: [BillOfMaterialsService, { provide: PrismaService, useValue: prisma }],
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
    await service.create({ productId: 'A', items: [{ componentProductId: 'B', quantity: 1 }] } as never);

    // B'nin BOM'unu items göndermeden aktive etmeye çalışmak: mevcut item'ları (A) kullanarak
    // döngü kontrolü yapılmalı ve reddedilmeli — düzeltmeden önce bu satır sessizce geçerdi.
    await expect(service.update(bBom.id, { isActive: true } as never)).rejects.toThrow(BadRequestException);
  });

  it("items göndermeden yalnızca isActive:true ile aktive etmek, döngü yoksa serbestçe geçer", async () => {
    const bBom = await service.create({
      productId: 'B',
      items: [{ componentProductId: 'C', quantity: 1 }],
      isActive: false,
    } as never);

    await expect(service.update(bBom.id, { isActive: true } as never)).resolves.toBeDefined();
  });

  it('create ve update, döngü kontrolünü ve yazmayı Serializable izolasyonlu tek bir transaction içinde yapar', async () => {
    await service.create({ productId: 'A', items: [{ componentProductId: 'X', quantity: 1 }] } as never);
    const bBom = await service.create({ productId: 'B', items: [{ componentProductId: 'Y', quantity: 1 }] } as never);
    await service.update(bBom.id, { items: [{ componentProductId: 'Z', quantity: 1 }] } as never);

    const transactionMock = prisma.$transaction as unknown as { mock: { calls: unknown[][] } };
    for (const call of transactionMock.mock.calls) {
      expect(call[1]).toEqual({ isolationLevel: 'Serializable' });
    }
  });
});
