# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

See `ARCHITECTURE.md` for a detailed breakdown of the layering, folder structure, and Prisma/ESM configuration.

## Commands

```bash
# Install
npm install

# Run (HTTP API)
npm run start:dev          # watch mode, http://localhost:3000
npm run build && npm run start:prod

# Run (CLI) — must build first; there is no fast/unbuilt dev path (see "CLI runtime" below)
npm run build
npm run cli -- product create --code SKU-001 --name "Widget" --type RAW_MATERIAL --unit KG
npm run cli -- product list
npm run cli -- warehouse create --code DPO-1 --name "Main Warehouse"
npm run cli -- stock create --product-code SKU-001 --warehouse-code DPO-1 --quantity 50
npm run cli -- bom create --product-code SKU-002 --name "Recipe" --component SKU-001:2.5
npm run cli -- production-order create --product-code SKU-002 --warehouse-code DPO-1 --planned-quantity 10
npm run cli -- stock-movement create --product-code SKU-001 --warehouse-code DPO-1 --type PURCHASE_IN --quantity 100
npm run cli -- <command> --help   # per-command flags

# Lint / format
npm run lint
npm run format

# Tests (Vitest)
npm run test                # all unit tests (**/*.spec.ts)
npm run test:e2e            # e2e tests (vitest.config.e2e.ts)
npm run test:watch
npx vitest run src/products/products.service.spec.ts   # single file

# Prisma
npx prisma generate                       # regenerate client into src/generated/prisma
npx prisma migrate dev --name <name>      # create + apply a migration
npx prisma studio

# Local Postgres (required for the app/CLI to run)
docker compose up -d
```

`.env` must define `DATABASE_URL` (see `.env.example`); `docker-compose.yml` provisions a local Postgres on `5432` with matching credentials.

## Architecture

Feature-based module layout: `src/{products,warehouses,stock,bill-of-materials,production-orders,stock-movements}/` each contain their own `controller` (HTTP), `service` (domain logic + Prisma access), `dto/` (class-validator DTOs), and `cli/` (nest-commander commands). Both the HTTP controller and the CLI commands are thin adapters over the same `*Service` — never duplicate business logic in a controller or command.

- **Two entry points, two composition roots**: `src/main.ts` + `src/app.module.ts` (HTTP) vs `src/cli.ts` + `src/cli.module.ts` (CLI, via `nest-commander`'s `CommandFactory.run()`). Both entry files start with `import 'dotenv/config'` — required because `PrismaService`'s constructor reads `process.env.DATABASE_URL` directly, and nothing else populates it when running compiled `dist/*.js`.
- **`PrismaModule`** (`src/prisma/`) is `@Global()`; `PrismaService` extends the generated `PrismaClient` using `@prisma/adapter-pg`'s `PrismaPg` driver adapter (Prisma 7 requires a driver adapter — there is no `datasource.url` in `schema.prisma` anymore; the connection URL lives in `prisma.config.ts`).
- **Generated Prisma client** lives at `src/generated/prisma/` (gitignored, regenerate with `npx prisma generate`), not in `node_modules`. Import enums from `generated/prisma/enums.js`, not from `@prisma/client`. Services return Prisma's generated model types directly — DTOs are the only hand-written classes, validated with `class-validator`.
- **Stock is per-warehouse**: `Stock` has `@@unique([productId, warehouseId])`; `StockModule` imports `ProductsModule`/`WarehousesModule` to inject their services (used by both `StockCreateCommand`'s code→ID lookup and any future cross-entity logic).
- **CLI command shape**: each entity has a parent `@Command()` class with `subCommands: [...]`, and each subcommand is a **`@SubCommand()`** class (not `@Command()` — using `@Command()` on a subcommand silently registers it as a duplicate top-level command instead of nesting it). All command classes (parent + subcommands) must be listed in the module's `providers` array for DI to work. `create` commands re-run the DTO through `plainToInstance` + `class-validator`'s `validate()` manually — the CLI equivalent of the HTTP-side global `ValidationPipe`.
- **CLI runtime note**: the `cli` script runs the `tsc`-compiled `dist/cli.js`, not a `ts-node`/`tsx` dev loader. `tsx` (esbuild) was tried and removed — it does not reliably emit the `design:paramtypes` decorator metadata NestJS's DI needs, so constructor-injected services came back `undefined` at runtime under `tsx` even though it compiled without errors. Always `npm run build` before `npm run cli`.
- **Soft-delete is inconsistent by design**: `ProductsService.remove()` soft-deletes (`deletedAt` + `isActive: false`, and `findAll`/`findOne` filter `deletedAt: null`). `WarehousesService.remove()` and `StockService.remove()` do not — warehouses just flip `isActive`, stock rows are hard-deleted.
- **BOM = header + lines**: `BillOfMaterial` (recipe header, `isActive` flag) + `BillOfMaterialItem` (component lines, cascade-deleted with the header). `BillOfMaterialsService.create`/`update` write the whole item list in one call (`items: { create: [...] }` / `deleteMany` + `create` on update) — there is no separate item CRUD endpoint.
- **`ProductionOrder.bomId` is auto-resolved when omitted**: `ProductionOrdersService.create` calls `BillOfMaterialsService.findActiveForProduct()` if the DTO doesn't specify a `bomId` — a product with no active BOM cannot get a production order (throws `NotFoundException`). This is shared logic, not duplicated per-transport.
- **`StockMovement` is append-only and drives `Stock`**: no update/delete endpoints exist for it (no `updatedAt` field either). `StockMovementsService.create` writes the movement and upserts the matching `Stock` row's `quantity` (`increment`/create) inside one `prisma.$transaction([...])` — `*_IN` types add, `*_OUT` types subtract. Negative stock is not currently guarded against.
- **ESM throughout**: `package.json` has `"type": "module"`, `tsconfig.json` uses `"module"/"moduleResolution": "nodenext"`. Every relative import must use an explicit `.js` extension even though the source is `.ts` (e.g. `from './products.service.js'`) — this is required by `nodenext`, not optional.
