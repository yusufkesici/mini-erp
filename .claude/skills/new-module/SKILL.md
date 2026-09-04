---
name: new-module
description: mini-erp'de yeni bir feature modülü (Prisma model + DTO + Service + Controller + CLI + unit test) iskeletini, mevcut modüllerle (products/customers/warehouses) birebir aynı şablonla üretir. "yeni modül oluştur", "X modülü ekle", "supplier/tedarikçi modülü scaffold et" gibi isteklerde kullan.
argument-hint: <TekilModülAdı> <alan:tip[:optional]> [alan:tip[:optional] ...]
---

# new-module — mini-erp feature modülü scaffold'u

Bu skill, mini-erp'nin **her mevcut modülünün** (`products`, `warehouses`, `customers`, ...)
kullandığı standart şablonu tekrar üretir: `dto/` + `*.service.ts` + `*.controller.ts` +
`cli/` + `*.module.ts` + `*.service.spec.ts`. Elle kopyala-yapıştır yapmak yerine bu akışı
izle.

**Önemli mimari not — "repository" yok:** Kullanıcı "model+servis+repository+test" isterse
bunu şu şekilde eşle: bu projede ayrı bir repository katmanı **yok** — `PrismaService`
(generated Prisma Client) doğrudan `*.service.ts` içine inject edilir ve o katman hem domain
mantığını hem veri erişimini taşır (bkz. `ARCHITECTURE.md` §3). "Model" karşılığı ise
`prisma/schema.prisma`'ya eklenen yeni `model` bloğudur. Bu skill bu iki katmanı ayrı dosyalar
olarak DEĞİL, projenin gerçek konvansiyonuna uygun şekilde üretir — kullanıcıya bunu kısaca
açıkla, sessizce farklı bir mimari uydurma.

## 1. Argümanları ayrıştır

Çağrı biçimi: `/new-module <TekilModülAdı> <alan:tip[:optional]> ...`

Örnek: `/new-module Supplier code:string name:string email:email:optional phone:string:optional`

- **Modül adı**: PascalCase **tekil** iş terimi (`Supplier`, `PurchaseOrder`). Çoğul/kebab
  türevlerini kendin çıkar — mevcut kod tabanında birebir örnekleri var, onlara sadık kal:
  - `PascalSingular` → `Supplier` (Prisma model adı, DTO/CLI sınıf öneki)
  - `camelSingular` → `supplier` (Prisma client accessor: `this.prisma.supplier`)
  - `kebabSingular` → `supplier` (DTO/CLI dosya öneki: `create-supplier.dto.ts`, `supplier.command.ts`)
  - `PascalPlural` → `Suppliers` (Service/Controller/Module sınıf öneki: `SuppliersService`)
  - `kebabPlural` → `suppliers` (dizin adı, controller route'u, HTTP path)
  - Çok kelimeli örnek (bkz. `production-orders`): `ProductionOrder` → dizin `production-orders`,
    servis `ProductionOrdersService`, CLI dosyaları `production-order.command.ts` vb.
  - Düzensiz çoğullar için (`Category`→`Categories` gibi) standart İngilizce kurallarını uygula;
    emin değilsen kullanıcıya tek soru sor.

- **Alanlar**: `ad:tip[:optional]` listesi. Tip → DTO validator eşlemesi:

  | tip | class-validator | Prisma alan tipi | Not |
  |---|---|---|---|
  | `string` | `@IsString()` | `String` | |
  | `email` | `@IsEmail()` | `String` | |
  | `number` | `@IsNumber()` | `Int` | tam sayı |
  | `decimal` | `@IsNumber() @Min(0)` | `Decimal @db.Decimal(18, 4)` | miktar alanı, mevcut modüllerdeki kalıp |
  | `money` | `@IsNumber() @Min(0)` | `Decimal @db.Decimal(12, 2)` | para alanı, mevcut modüllerdeki kalıp |
  | `boolean` | `@IsBoolean()` | `Boolean @default(false)` | |
  | `date` | `@IsDateString()` | `DateTime` | |
  | `enum:EnumName` | `@IsEnum(EnumName)` (import `../../generated/prisma/enums.js`) | `EnumName` | enum'un `schema.prisma`'da zaten var olduğunu varsayar; yoksa önce onu oluşturman gerektiğini kullanıcıya söyle |
  | `relation:ModelName` | `@IsString()` (alan adı `xId` olmalı) | `String` + `@relation(fields: [xId], references: [id], onDelete: Restrict)` | FK — `onDelete` stratejisini `db-schema-reviewer`'ın kontrol edeceği paternle (çoğunlukla `Restrict`) seç |

  `:optional` eklenmemiş alanlar zorunludur (`!` ile, `@IsOptional()` olmadan).

  Eğer alan listesinde `code:string` yoksa, mevcut modüllerin çoğunun (`Product`, `Warehouse`,
  `Customer`) benzersiz bir `code` iş anahtarı taşıdığını kullanıcıya hatırlat ve eklemek isteyip
  istemediğini sor — zorla ekleme.

## 2. Bir tasarım kararını sor (yalnızca belirtilmemişse)

Bu kod tabanında soft-delete **kasıtlı olarak tutarsız** (bkz. CLAUDE.md): `Product`/`Customer`
`deletedAt` + `isActive` kullanır, `Warehouse`/`Stock` yalnızca `isActive`. Kullanıcı hangisini
istediğini belirtmediyse `AskUserQuestion` ile sor:
- **Yalnızca `isActive` toggle** (Warehouse şablonu, varsayılan/basit) — `remove()` sadece
  `isActive: false` yapar.
- **Soft-delete (`deletedAt` + `isActive`)** (Product/Customer şablonu) — `findAll`/`findOne`/
  `findByCode` `deletedAt: null` filtreler, `remove()` her ikisini set eder.

## 3. Üretilecek dosyalar

Aşağıdaki gerçek dosyaları **birebir şablon** olarak kullan (isim/alan yerine `{{...}}` koy):
`src/customers/dto/create-customer.dto.ts`, `update-customer.dto.ts`, `customers.service.ts`,
`customers.controller.ts`, `customers.module.ts`, `cli/customer.command.ts`,
`cli/customer-create.command.ts`, `cli/customer-list.command.ts`. Soft-delete istenmiyorsa
`src/warehouses/warehouses.service.ts`'i temel al (findByCode dahil, deletedAt yok).

Üretilecek dosya listesi (hepsi `src/{{kebabPlural}}/` altında):

```
dto/create-{{kebabSingular}}.dto.ts
dto/update-{{kebabSingular}}.dto.ts
{{kebabPlural}}.service.ts
{{kebabPlural}}.service.spec.ts
{{kebabPlural}}.controller.ts
{{kebabPlural}}.module.ts
cli/{{kebabSingular}}.command.ts
cli/{{kebabSingular}}-create.command.ts
cli/{{kebabSingular}}-list.command.ts
```

### DTO (`dto/create-{{kebabSingular}}.dto.ts`)

```ts
import { IsString, IsOptional /* + kullanılan diğer validator'lar */ } from 'class-validator';

export class Create{{PascalSingular}}Dto {
  // her alan için, zorunlu:
  @IsString()
  {{alan}}!: string;

  // opsiyonel:
  @IsOptional()
  @IsString()
  {{alan}}?: string;
}
```

`dto/update-{{kebabSingular}}.dto.ts`:

```ts
import { PartialType } from '@nestjs/mapped-types';
import { Create{{PascalSingular}}Dto } from './create-{{kebabSingular}}.dto.js';

export class Update{{PascalSingular}}Dto extends PartialType(Create{{PascalSingular}}Dto) {}
```

### Service (`{{kebabPlural}}.service.ts`) — soft-delete YOK varyantı (Warehouse şablonu)

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { Create{{PascalSingular}}Dto } from './dto/create-{{kebabSingular}}.dto.js';
import { Update{{PascalSingular}}Dto } from './dto/update-{{kebabSingular}}.dto.js';

@Injectable()
export class {{PascalPlural}}Service {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: Create{{PascalSingular}}Dto) {
    return this.prisma.{{camelSingular}}.create({ data: dto });
  }

  findAll() {
    return this.prisma.{{camelSingular}}.findMany();
  }

  async findOne(id: string) {
    const {{camelSingular}} = await this.prisma.{{camelSingular}}.findUnique({ where: { id } });
    if (!{{camelSingular}}) {
      throw new NotFoundException(`{{PascalSingular}} ${id} bulunamadı`);
    }
    return {{camelSingular}};
  }

  // yalnızca alan listesinde `code` varsa üret:
  async findByCode(code: string) {
    const {{camelSingular}} = await this.prisma.{{camelSingular}}.findUnique({ where: { code } });
    if (!{{camelSingular}}) {
      throw new NotFoundException(`{{PascalSingular}} kodu ${code} bulunamadı`);
    }
    return {{camelSingular}};
  }

  async update(id: string, dto: Update{{PascalSingular}}Dto) {
    await this.findOne(id);
    return this.prisma.{{camelSingular}}.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.{{camelSingular}}.update({ where: { id }, data: { isActive: false } });
  }
}
```

Soft-delete varyantı isteniyorsa `findAll`/`findOne`/`findByCode`'a `deletedAt: null` filtresi
ekle (`findUnique` yerine `findFirst` kullan — bkz. `src/customers/customers.service.ts`),
`remove()`'da `{ deletedAt: new Date(), isActive: false }` set et.

`relation:ModelName` tipi alan varsa `create()`'de `{ [alan]: { connect: { id: dto.xId } } }`
biçimini kullan (bkz. `src/stock/stock.service.ts`), düz `data: dto` yeterli değildir.

### Controller (`{{kebabPlural}}.controller.ts`)

```ts
import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { {{PascalPlural}}Service } from './{{kebabPlural}}.service.js';
import { Create{{PascalSingular}}Dto } from './dto/create-{{kebabSingular}}.dto.js';
import { Update{{PascalSingular}}Dto } from './dto/update-{{kebabSingular}}.dto.js';

@Controller('{{kebabPlural}}')
export class {{PascalPlural}}Controller {
  constructor(private readonly {{camelPlural}}Service: {{PascalPlural}}Service) {}

  @Post()
  create(@Body() dto: Create{{PascalSingular}}Dto) {
    return this.{{camelPlural}}Service.create(dto);
  }

  @Get()
  findAll() {
    return this.{{camelPlural}}Service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.{{camelPlural}}Service.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Update{{PascalSingular}}Dto) {
    return this.{{camelPlural}}Service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.{{camelPlural}}Service.remove(id);
  }
}
```

### CLI — parent (`cli/{{kebabSingular}}.command.ts`)

```ts
import { Command, CommandRunner } from 'nest-commander';
import { {{PascalSingular}}CreateCommand } from './{{kebabSingular}}-create.command.js';
import { {{PascalSingular}}ListCommand } from './{{kebabSingular}}-list.command.js';

@Command({
  name: '{{kebabSingular}}',
  description: '{{PascalSingular}} işlemleri (create, list)',
  subCommands: [{{PascalSingular}}CreateCommand, {{PascalSingular}}ListCommand],
})
export class {{PascalSingular}}Command extends CommandRunner {
  async run(): Promise<void> {
    console.log('Kullanım: {{kebabSingular}} <create|list> [options]');
  }
}
```

### CLI — create (`cli/{{kebabSingular}}-create.command.ts`)

`src/customers/cli/customer-create.command.ts`'i şablon al: her zorunlu alan için bir
`@Option()`, `plainToInstance` + `validate()` ile manuel DTO doğrulama, hata varsa
`console.error` + `process.exitCode = 1`. Alan listesinde `relation:ModelName` varsa
`src/stock/cli/stock-create.command.ts`'teki gibi önce ilişkili servisin `findByCode`'uyla
ID'yi çöz (`try/catch` ile yalnızca `NotFoundException`/`BadRequestException` yakala — bkz.
CLAUDE.md, aşırı geniş `catch (error) { instanceof Error }` kalıbı **kullanma**, `code-reviewer`
bunu zaten bir kez bulup düzeltti).

### CLI — list (`cli/{{kebabSingular}}-list.command.ts`)

`src/customers/cli/customer-list.command.ts`'i birebir şablon al: `findAll()` çağır, boşsa
"Kayıtlı ... yok." yazdır, doluysa `console.table(...)` ile önemli alanları (id hariç, code/name
gibi) bas.

### Module (`{{kebabPlural}}.module.ts`)

```ts
import { Module } from '@nestjs/common';
import { {{PascalPlural}}Service } from './{{kebabPlural}}.service.js';
import { {{PascalPlural}}Controller } from './{{kebabPlural}}.controller.js';
import { {{PascalSingular}}Command } from './cli/{{kebabSingular}}.command.js';
import { {{PascalSingular}}CreateCommand } from './cli/{{kebabSingular}}-create.command.js';
import { {{PascalSingular}}ListCommand } from './cli/{{kebabSingular}}-list.command.js';

@Module({
  // yalnızca alan listesinde relation:ModelName varsa, o modelin modülünü buraya ekle
  // (bkz. src/stock/stock.module.ts: imports: [ProductsModule, WarehousesModule])
  controllers: [{{PascalPlural}}Controller],
  providers: [{{PascalPlural}}Service, {{PascalSingular}}Command, {{PascalSingular}}CreateCommand, {{PascalSingular}}ListCommand],
  exports: [{{PascalPlural}}Service],
})
export class {{PascalPlural}}Module {}
```

### Unit test (`{{kebabPlural}}.service.spec.ts`)

Bu projede henüz servis-seviyesi bir unit test şablonu yok (yalnızca `app.controller.spec.ts`
var) — aşağıdaki kalıbı kullan: `PrismaService`'i `vi.fn()` ile mock'la, `Test.createTestingModule`
üzerinden gerçek `{{PascalPlural}}Service`'i al.

```ts
import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { {{PascalPlural}}Service } from './{{kebabPlural}}.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('{{PascalPlural}}Service', () => {
  let service: {{PascalPlural}}Service;
  const prisma = {
    {{camelSingular}}: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [{{PascalPlural}}Service, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get({{PascalPlural}}Service);
  });

  it('findOne bulunamayan id için NotFoundException fırlatır', async () => {
    prisma.{{camelSingular}}.findUnique.mockResolvedValue(null);
    await expect(service.findOne('missing-id')).rejects.toThrow(NotFoundException);
  });

  it('create dto verisiyle prisma.create çağırır', async () => {
    const dto = { /* örnek alanlar */ } as never;
    prisma.{{camelSingular}}.create.mockResolvedValue({ id: '1', ...dto });
    await service.create(dto);
    expect(prisma.{{camelSingular}}.create).toHaveBeenCalledWith({ data: dto });
  });
});
```

## 4. Prisma şema bloğu — otomatik ekleme, otomatik migration YOK

`prisma/schema.prisma`'nın sonuna (en son `model` bloğundan sonra) şu şablonla bir blok
öner ve **kullanıcı onaylamadan ekleme**:

```prisma
model {{PascalSingular}} {
  id String @id @default(cuid())

  // her alan buraya, tipine göre (bkz. §1 tablo)
  {{alan}} {{PrismaTipi}}

  // code alanı varsa:
  code String @unique

  // isActive/deletedAt (bkz. §2'deki karar)
  isActive Boolean @default(true)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("{{kebabPlural_snake}}")
}
```

Onay sonrası **yalnızca dosyayı düzenle**; `npx prisma migrate dev` veya `npx prisma generate`
gibi DB'ye dokunan/kod üreten komutları kullanıcı adına **çalıştırma** — bunun yerine ürettiğin
özet mesajda kullanıcıya tam olarak hangi komutu çalıştırması gerektiğini söyle:
`npx prisma migrate dev --name add_{{kebabPlural_snake}}`.

## 5. Modül kaydı

`src/app.module.ts` ve `src/cli.module.ts`'in ikisine de `{{PascalPlural}}Module` import'unu
ve `imports` dizisine ekle — CLAUDE.md/ARCHITECTURE.md'ye göre her iki composition root da
her feature modülünü bilmeli (CLI, `AppController`/`AppService` hariç aynı modülleri import
eder, bkz. `src/cli.module.ts`).

## 6. Doğrulama

Dosyaları ürettikten ve modülleri kaydettikten sonra:

```
npx tsc -p tsconfig.build.json --noEmit
npm run lint
npm run test
```

Hepsi temiz geçmeden "tamamlandı" deme. `npx prisma generate`'i schema bloğu onaylanıp
eklendiyse SEN değil, **kullanıcı** çalıştırmalı (bkz. §4) — çünkü bu adım olmadan
`tsc` zaten yeni Prisma model'ini tanımayacağı için hata verecektir; bu beklenen bir durumdur,
kullanıcıya "şema onaylandıktan sonra `npx prisma generate && npx prisma migrate dev --name ...`
çalıştır, sonra tekrar derle" şeklinde açıkça söyle.

## 7. Kapsam dışı

Bu skill CRUD iskeletini üretir; iş kuralına özgü ek metodlar (durum makinesi, transaction'lı
stok güncellemesi, cross-module `findActiveForProduct` gibi) **üretmez** — onlar için üretilen
servisi elle genişlet. Üretim bittikten sonra kod sağlığı için `code-reviewer`, şema için
`db-schema-reviewer`, yeni HTTP endpoint'leri için `api-security-reviewer` agent'larını
çalıştırmayı öner.
