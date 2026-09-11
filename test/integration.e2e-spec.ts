import 'dotenv/config';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/prisma/prisma.service.js';

// Ürün, Depo, Stok, BOM, Üretim Emri, Muhasebe ve CRM (Müşteri/Satış Siparişi)
// modüllerinin gerçek bir HTTP sunucusu ve gerçek bir Postgres üzerinden, foreign
// key'ler ve modüller-arası ilişkiler doğru kurulacak şekilde uçtan uca birlikte
// çalıştığını doğrular. Her test kendi RUN_ID önekiyle benzersiz veri üretir ve
// afterAll'da FK sırasına uygun şekilde temizlenir.
describe('Modüller arası entegrasyon (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const apiKey = process.env.API_KEY as string;
  const RUN_ID = `E2E${Date.now()}`;

  const authed = () => request(app.getHttpServer());
  const get = (url: string) => authed().get(url).set('x-api-key', apiKey);
  const post = (url: string, body: object) =>
    authed().post(url).set('x-api-key', apiKey).send(body);
  const patch = (url: string, body: object) =>
    authed().patch(url).set('x-api-key', apiKey).send(body);

  // Zincir boyunca oluşturulan varlıkların id'leri — temizlik ve sonraki adımlarda kullanılır
  const ids: {
    warehouseId?: string;
    rawProductId?: string;
    finishedProductId?: string;
    bomId?: string;
    productionOrderId?: string;
    movementIds: string[];
    customerId?: string;
    salesOrderId?: string;
    accountingEntryIds: string[];
  } = { movementIds: [], accountingEntryIds: [] };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    // main.ts'deki gerçek prod pipeline ile aynı: whitelist + transform
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    // FK bağımlılık sırasına göre (çocuktan ebeveyne) temizlik — testler başarısız olsa bile
    // artık veri bırakmamaya çalışır.
    await prisma.stockMovement.deleteMany({
      where: { id: { in: ids.movementIds } },
    });
    if (ids.salesOrderId)
      await prisma.salesOrder
        .delete({ where: { id: ids.salesOrderId } })
        .catch(() => undefined);
    if (ids.customerId)
      await prisma.customer
        .delete({ where: { id: ids.customerId } })
        .catch(() => undefined);
    await prisma.accountingEntry.deleteMany({
      where: { id: { in: ids.accountingEntryIds } },
    });
    if (ids.productionOrderId)
      await prisma.productionOrder
        .delete({ where: { id: ids.productionOrderId } })
        .catch(() => undefined);
    if (ids.bomId)
      await prisma.billOfMaterial
        .delete({ where: { id: ids.bomId } })
        .catch(() => undefined);
    await prisma.stock.deleteMany({
      where: {
        productId: {
          in: [ids.rawProductId, ids.finishedProductId].filter(
            Boolean,
          ) as string[],
        },
      },
    });
    if (ids.finishedProductId)
      await prisma.product
        .delete({ where: { id: ids.finishedProductId } })
        .catch(() => undefined);
    if (ids.rawProductId)
      await prisma.product
        .delete({ where: { id: ids.rawProductId } })
        .catch(() => undefined);
    if (ids.warehouseId)
      await prisma.warehouse
        .delete({ where: { id: ids.warehouseId } })
        .catch(() => undefined);

    await app.close();
  });

  describe('Ürün → Depo → Stok → BOM → Üretim Emri zinciri', () => {
    it('depo ve ürünler oluşturulur', async () => {
      const warehouseRes = await post('/warehouses', {
        code: `${RUN_ID}-DPO`,
        name: 'E2E Depo',
      }).expect(201);
      ids.warehouseId = warehouseRes.body.id;

      const rawRes = await post('/products', {
        code: `${RUN_ID}-RAW`,
        name: 'E2E Hammadde',
        type: 'RAW_MATERIAL',
        unit: 'KG',
      }).expect(201);
      ids.rawProductId = rawRes.body.id;

      const finishedRes = await post('/products', {
        code: `${RUN_ID}-FG`,
        name: 'E2E Mamul',
        type: 'FINISHED_GOOD',
        unit: 'PIECE',
      }).expect(201);
      ids.finishedProductId = finishedRes.body.id;
    });

    it('satın alma girişi ile hammadde stoğu oluşur (StockMovement → Stock upsert)', async () => {
      const res = await post('/stock-movements', {
        productId: ids.rawProductId,
        warehouseId: ids.warehouseId,
        type: 'PURCHASE_IN',
        quantity: 100,
        note: 'E2E satın alma',
      }).expect(201);
      ids.movementIds.push(res.body.id);

      const stockList = await get('/stock').expect(200);
      const rawStock = stockList.body.find(
        (s: { productId: string; warehouseId: string }) =>
          s.productId === ids.rawProductId && s.warehouseId === ids.warehouseId,
      );
      expect(rawStock).toBeDefined();
      expect(Number(rawStock.quantity)).toBe(100);
    });

    it('mamul için hammaddeyi bileşen olarak kullanan aktif bir BOM oluşturulur', async () => {
      const res = await post('/bill-of-materials', {
        productId: ids.finishedProductId,
        name: 'E2E Reçetesi',
        outputQuantity: 1,
        items: [{ componentProductId: ids.rawProductId, quantity: 2 }],
      }).expect(201);
      ids.bomId = res.body.id;
      expect(res.body.productId).toBe(ids.finishedProductId);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].componentProductId).toBe(ids.rawProductId);
    });

    it('BOM ağacı (GET /bill-of-materials/tree/:productId) doğru ilişkiyi yansıtır', async () => {
      const res = await get(
        `/bill-of-materials/tree/${ids.finishedProductId}`,
      ).expect(200);
      expect(res.body.productId).toBe(ids.finishedProductId);
      expect(res.body.bomId).toBe(ids.bomId);
      expect(res.body.children).toHaveLength(1);
      expect(res.body.children[0].productId).toBe(ids.rawProductId);
      expect(res.body.children[0].quantity).toBe(2);
    });

    it('üretim emri oluşturulur ve bomId belirtilmeden aktif BOM otomatik çözülür', async () => {
      const res = await post('/production-orders', {
        productId: ids.finishedProductId,
        warehouseId: ids.warehouseId,
        plannedQuantity: 10,
      }).expect(201);
      ids.productionOrderId = res.body.id;
      expect(res.body.bomId).toBe(ids.bomId);
      expect(res.body.status).toBe('PLANNED');
    });

    it('ilk aşamalı üretim bildirimi (6/10): BOM sadece bu ARTIŞ için patlatılır, hammadde stoktan düşülür, mamul stoğa eklenir, durum otomatik IN_PROGRESS olur', async () => {
      // BOM: 1 mamul = 2 hammadde → 6 mamul = 12 hammadde tüketimi.
      const res = await post(
        `/production-orders/${ids.productionOrderId}/report-production`,
        { quantity: 6 },
      ).expect(201);
      expect(res.body.status).toBe('IN_PROGRESS');
      expect(Number(res.body.producedQuantity)).toBe(6);

      const stockList = await get('/stock').expect(200);
      const rawStock = stockList.body.find(
        (s: { productId: string }) => s.productId === ids.rawProductId,
      );
      const finishedStock = stockList.body.find(
        (s: { productId: string }) => s.productId === ids.finishedProductId,
      );
      expect(Number(rawStock.quantity)).toBe(88); // 100 - 12
      expect(Number(finishedStock.quantity)).toBe(6); // 0 + 6
    });

    it('ikinci aşamalı bildirim (kalan 4/10): producedQuantity ÜZERİNE YAZMAZ, ARTIRIR; stok yine yalnızca bu artış kadar değişir', async () => {
      const res = await post(
        `/production-orders/${ids.productionOrderId}/report-production`,
        { quantity: 4 },
      ).expect(201);
      expect(res.body.status).toBe('IN_PROGRESS'); // zaten IN_PROGRESS'ti, tekrar atanmadı
      expect(Number(res.body.producedQuantity)).toBe(10); // 6 + 4

      const stockList = await get('/stock').expect(200);
      const rawStock = stockList.body.find(
        (s: { productId: string }) => s.productId === ids.rawProductId,
      );
      const finishedStock = stockList.body.find(
        (s: { productId: string }) => s.productId === ids.finishedProductId,
      );
      expect(Number(rawStock.quantity)).toBe(80); // 88 - 8 (4*2)
      expect(Number(finishedStock.quantity)).toBe(10); // 6 + 4

      const orderRes = await get(
        `/production-orders/${ids.productionOrderId}`,
      ).expect(200);
      // her iki bildirimin ürettiği hareketleri temizlik için kaydet (afterAll movementIds'e göre siliyor)
      ids.movementIds.push(
        ...orderRes.body.movements.map((m: { id: string }) => m.id),
      );
      expect(orderRes.body.movements).toHaveLength(4); // 2 bildirim x (1 consume + 1 produce)
    });

    it('COMPLETED\'e geçiş artık saf bir durum bayrağıdır — stokta/hareket sayısında HİÇBİR değişiklik yapmaz', async () => {
      const res = await patch(
        `/production-orders/${ids.productionOrderId}/status`,
        { status: 'COMPLETED' },
      ).expect(200);
      expect(res.body.status).toBe('COMPLETED');
      expect(Number(res.body.producedQuantity)).toBe(10); // aşamalı bildirimlerden geldi, değişmedi

      const stockList = await get('/stock').expect(200);
      const rawStock = stockList.body.find(
        (s: { productId: string }) => s.productId === ids.rawProductId,
      );
      const finishedStock = stockList.body.find(
        (s: { productId: string }) => s.productId === ids.finishedProductId,
      );
      expect(Number(rawStock.quantity)).toBe(80); // değişmedi
      expect(Number(finishedStock.quantity)).toBe(10); // değişmedi

      const orderRes = await get(
        `/production-orders/${ids.productionOrderId}`,
      ).expect(200);
      expect(orderRes.body.bom.items).toHaveLength(1);
      expect(orderRes.body.movements).toHaveLength(4); // yeni hareket eklenmedi
      expect(orderRes.body.product.id).toBe(ids.finishedProductId);
      expect(orderRes.body.warehouse.id).toBe(ids.warehouseId);
    });

    it('zaten COMPLETED olan bir üretim emri tekrar COMPLETED yapılamaz ve artık üretim bildirimi kabul etmez', async () => {
      await patch(`/production-orders/${ids.productionOrderId}/status`, {
        status: 'COMPLETED',
      }).expect(400);
      await post(
        `/production-orders/${ids.productionOrderId}/report-production`,
        { quantity: 1 },
      ).expect(400);
    });

    it('yetersiz stok olan bir çıkış hareketi reddedilir (stok negatife düşürülemez)', async () => {
      await post('/stock-movements', {
        productId: ids.rawProductId,
        warehouseId: ids.warehouseId,
        type: 'ADJUSTMENT_OUT',
        quantity: 999999,
      }).expect(400);
    });

    it('bir ürünün kendi bileşeni olduğu bir BOM reddedilir (self-reference koruması)', async () => {
      await post('/bill-of-materials', {
        productId: ids.finishedProductId,
        items: [{ componentProductId: ids.finishedProductId, quantity: 1 }],
      }).expect(400);
    });

    it('var olmayan ürün/depo referansıyla stok hareketi FK bütünlüğü nedeniyle reddedilir', async () => {
      const res = await post('/stock-movements', {
        productId: 'nonexistent-product-id',
        warehouseId: ids.warehouseId,
        type: 'PURCHASE_IN',
        quantity: 1,
      });
      expect(res.status).toBeGreaterThanOrEqual(400);

      const movements = await get('/stock-movements').expect(200);
      expect(
        movements.body.some(
          (m: { productId: string }) =>
            m.productId === 'nonexistent-product-id',
        ),
      ).toBe(false);
    });
  });

  describe('CRM: Müşteri → Satış Siparişi → Ürün ilişkisi', () => {
    it('müşteri ve mamul ürünü referans alan bir satış siparişi oluşturulur', async () => {
      const customerRes = await post('/customers', {
        code: `${RUN_ID}-CUST`,
        name: 'E2E Müşteri',
      }).expect(201);
      ids.customerId = customerRes.body.id;

      const orderRes = await post('/sales-orders', {
        customerId: ids.customerId,
        items: [
          { productId: ids.finishedProductId, quantity: 3, unitPrice: 150 },
        ],
      }).expect(201);
      ids.salesOrderId = orderRes.body.id;
      expect(orderRes.body.customer.id).toBe(ids.customerId);
      expect(orderRes.body.items[0].product.id).toBe(ids.finishedProductId);
      expect(orderRes.body.status).toBe('PENDING');
    });

    it('sipariş, müşterinin sipariş geçmişinde (GET /sales-orders/customer/:id) görünür', async () => {
      const res = await get(`/sales-orders/customer/${ids.customerId}`).expect(
        200,
      );
      expect(
        res.body.some((o: { id: string }) => o.id === ids.salesOrderId),
      ).toBe(true);
    });

    it('durum makinesi geçersiz geçişi reddeder, geçerli geçişleri sırayla kabul eder', async () => {
      // PENDING -> COMPLETED doğrudan izin verilmiyor (önce CONFIRMED gerekli)
      await patch(`/sales-orders/${ids.salesOrderId}/status`, {
        status: 'COMPLETED',
      }).expect(400);

      await patch(`/sales-orders/${ids.salesOrderId}/status`, {
        status: 'CONFIRMED',
      }).expect(200);
      await patch(`/sales-orders/${ids.salesOrderId}/status`, {
        status: 'COMPLETED',
      }).expect(200);
    });

    it('tamamlanmış siparişin kalemleri artık değiştirilemez', async () => {
      const order = await get(`/sales-orders/${ids.salesOrderId}`).expect(200);
      const itemId = order.body.items[0].id;
      await patch(`/sales-orders/${ids.salesOrderId}/items/${itemId}`, {
        quantity: 5,
      }).expect(400);
    });
  });

  describe('Muhasebe: bağımsız gelir/gider defteri', () => {
    it('gelir ve gider kayıtları özet (summary) toplamlarına doğru yansır', async () => {
      const before = await get('/accounting/summary').expect(200);
      const incomeBefore = Number(before.body.totalIncome);
      const expenseBefore = Number(before.body.totalExpense);

      const incomeRes = await post('/accounting/entries', {
        type: 'INCOME',
        amount: 450,
        category: 'E2E Satış',
      }).expect(201);
      ids.accountingEntryIds.push(incomeRes.body.id);

      const expenseRes = await post('/accounting/entries', {
        type: 'EXPENSE',
        amount: 80,
        category: 'E2E Hammadde',
      }).expect(201);
      ids.accountingEntryIds.push(expenseRes.body.id);

      const after = await get('/accounting/summary').expect(200);
      expect(Number(after.body.totalIncome)).toBeCloseTo(incomeBefore + 450, 4);
      expect(Number(after.body.totalExpense)).toBeCloseTo(
        expenseBefore + 80,
        4,
      );
      expect(Number(after.body.balance)).toBeCloseTo(
        Number(after.body.totalIncome) - Number(after.body.totalExpense),
        4,
      );
    });
  });
});
