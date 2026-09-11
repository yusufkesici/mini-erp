# mini-erp

Envanter (ürün/depo/stok/BOM/üretim emri), muhasebe ve CRM (müşteri/satış siparişi) modüllerini kapsayan, **REST HTTP API + terminal CLI** çift transport'lu bir NestJS + Prisma 7 + PostgreSQL uygulaması. HTTP Controller ve CLI Command'lar aynı Service katmanını çağıran ince adaptörlerdir — iş mantığı tek yerde yaşar.

Mimari kararlar ve modüller arası ilişki diyagramları için **[ARCHITECTURE.md](./ARCHITECTURE.md)**'ye bakın.

## Kurulum

```bash
npm install
cp .env.example .env   # DATABASE_URL ve API_KEY'i doldurun
docker compose up -d   # local Postgres (5432)
npx prisma generate
npx prisma migrate dev
```

## Çalıştırma

```bash
# HTTP API — http://localhost:3000
npm run start:dev            # watch mode
npm run build && npm run start:prod

# CLI — önce her zaman build gerekir (bkz. ARCHITECTURE.md §7)
npm run build
npm run cli -- product list
npm run cli -- <komut> --help
```

## Test

```bash
npm run test        # unit testler (**/*.spec.ts)
npm run test:e2e     # e2e testler — gerçek Postgres bağlantısı gerektirir (docker compose up -d)
npm run lint
```

## Modüller

Her modül `dto/` (validasyon), `controller` (HTTP), `service` (domain + Prisma erişimi) ve `cli/` (terminal komutları) alt klasörlerinden oluşur; HTTP ve CLI aynı Service'i çağırır.

### Products (`src/products`)
Ürün kartı CRUD'u — kod (SKU), barkod, tip (`RAW_MATERIAL` / `SEMI_FINISHED` / `FINISHED_GOOD`), birim, maliyet/satış fiyatı. Silme soft-delete'tir (`deletedAt` + `isActive`); listeleme/detay uçları silinmiş ürünleri filtreler.
```bash
npm run cli -- product create --code SKU-001 --name "Widget" --type RAW_MATERIAL --unit KG
```

### Warehouses (`src/warehouses`)
Depo kartı CRUD'u. Silme hard-delete değildir, yalnızca `isActive: false` yapar (Products'tan farklı olarak `deletedAt` alanı yok — bkz. ARCHITECTURE.md'deki kasıtlı soft-delete tutarsızlığı notu).
```bash
npm run cli -- warehouse create --code DPO-1 --name "Ana Depo"
```

### Stock (`src/stock`)
Ürün+depo başına anlık stok önbelleği (`@@unique([productId, warehouseId])`). Doğrudan CRUD uçları vardır, ama gerçek stok değişimleri normalde **Stock Movements** üzerinden yürütülmelidir — bu modül daha çok ilk stok tanımlama / düzeltme amaçlıdır.
```bash
npm run cli -- stock create --product-code SKU-001 --warehouse-code DPO-1 --quantity 50
```

### Stock Movements (`src/stock-movements`)
Değiştirilemez (append-only) stok hareket defteri — `PURCHASE_IN`, `SALES_OUT`, `PRODUCTION_IN`, `PRODUCTION_CONSUME_OUT`, `ADJUSTMENT_IN`, `ADJUSTMENT_OUT`. Her kayıt, ilgili `Stock` satırını aynı `Serializable` transaction içinde günceller; çıkış hareketlerinde stok negatife düşecekse istek reddedilir. Update/delete uç noktası yoktur.
```bash
npm run cli -- stock-movement create --product-code SKU-001 --warehouse-code DPO-1 --type PURCHASE_IN --quantity 100
```

### Bill of Materials / BOM (`src/bill-of-materials`)
Ürün ağacı: `BillOfMaterial` (reçete başlığı) + `BillOfMaterialItem` (bileşen satırları). Bir ürünün kendi bileşeni olması (self-reference) ve dolaylı döngüler (circular reference) engellenir; bir üründe aynı anda tek aktif reçete garanti edilir. `GET /bill-of-materials/tree/:productId` iç içe BOM'ları (yarı mamul içinde yarı mamul) tek bir ağaç olarak döner.
```bash
npm run cli -- bom create --product-code SKU-002 --name "Reçete" --component SKU-001:2.5
npm run cli -- bom tree --product-code SKU-002
```

### Production Orders (`src/production-orders`)
Bir BOM'a göre belirli miktarda ürün üretme talimatı. `bomId` verilmezse ürünün o an geçerli aktif reçetesi otomatik çözülür. Bu modül yalnızca **plan/durum** tutar (`PLANNED → IN_PROGRESS → COMPLETED`/`CANCELLED`) — bileşen tüketimi ve çıktı girişi, `productionOrderId` ile ilişkilendirilmiş ayrı **Stock Movements** kayıtlarıyla yapılır; üretim emri kendiliğinden stok hareketi üretmez.
```bash
npm run cli -- production-order create --product-code SKU-002 --warehouse-code DPO-1 --planned-quantity 10
```

### Accounting (`src/accounting`)
Bağımsız, değiştirilemez gelir/gider defteri (`INCOME`/`EXPENSE`). Hiçbir başka modüle FK'sı yoktur — satış siparişi tamamlanınca otomatik gelir kaydı **oluşturulmaz**, kayıtlar elle açılır. `GET /accounting/summary` toplam gelir/gider/bakiyeyi döner.

### Customers (`src/customers`)
Müşteri kartı CRUD'u — Products ile aynı şablon (kod, soft-delete).

### Sales Orders (`src/sales-orders`)
Müşteri bazlı satış siparişi: başlık (`SalesOrder`) + ürün kalemleri (`SalesOrderItem`). Durum makinesi: `PENDING → CONFIRMED → COMPLETED`, ikisinden de `CANCELLED`'a geçilebilir; `COMPLETED`/`CANCELLED` nihai durumlardır ve kalemler bu durumlarda artık değiştirilemez.

### Auth (`src/auth`)
Ayrı bir modülü yok — `ApiKeyGuard`, `app.module.ts`'te `APP_GUARD` olarak global kayıtlıdır ve tüm HTTP isteklerinde `x-api-key` header'ını `API_KEY` ortam değişkeniyle karşılaştırır. **Yalnızca HTTP katmanını korur; CLI bu korumayı by-pass eder** (yerel/güvenilir çalıştırma ortamı varsayılır).

## Lisans

Nest çekirdeği [MIT lisanslıdır](https://github.com/nestjs/nest/blob/master/LICENSE).
