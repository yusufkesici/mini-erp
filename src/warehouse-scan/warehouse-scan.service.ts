import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LocationsService } from '../locations/locations.service.js';
import { ProductsService } from '../products/products.service.js';
import { StockMovementsService } from '../stock-movements/stock-movements.service.js';
import { WarehouseScanMovementDto } from './dto/warehouse-scan-movement.dto.js';

type Location = Awaited<ReturnType<LocationsService['findByCode']>>;
type Product = Awaited<ReturnType<ProductsService['findByBarcode']>>;

@Injectable()
export class WarehouseScanService {
  constructor(
    private readonly locationsService: LocationsService,
    private readonly productsService: ProductsService,
    private readonly stockMovementsService: StockMovementsService,
  ) {}

  // Depo tarama ekranı bir kod okuttuğunda hangi tipte olduğunu (raf mı ürün mü) bilmez —
  // state machine'in o an beklediği tipte önce arar; orada bulamazsa DİĞER tabloda dener ve
  // bulursa "yanlış tip barkod okutuldu" diye özel/anlaşılır bir hata döner (genel "bulunamadı"
  // yerine) — kullanıcı "raf bekliyordum, ürün barkodu geldi" gibi durumları hemen anlar.
  async resolve(code: string, expect: 'LOCATION' | 'PRODUCT') {
    if (expect === 'LOCATION') {
      const location = await this.tryFind(() =>
        this.locationsService.findByCode(code),
      );
      if (location) return { kind: 'LOCATION' as const, data: location };

      const product = await this.tryFind(() =>
        this.productsService.findByBarcode(code),
      );
      if (product) {
        throw new BadRequestException(
          `Raf barkodu bekleniyordu ama bir ürün barkodu okutuldu: ${product.code} (${product.name})`,
        );
      }
      throw new NotFoundException(
        `"${code}" barkoduyla eşleşen bir raf bulunamadı`,
      );
    }

    const product = await this.tryFind(() =>
      this.productsService.findByBarcode(code),
    );
    if (product) return { kind: 'PRODUCT' as const, data: product };

    const location = await this.tryFind(() =>
      this.locationsService.findByCode(code),
    );
    if (location) {
      throw new BadRequestException(
        `Ürün barkodu bekleniyordu ama bir raf barkodu okutuldu: ${location.code} (${location.name})`,
      );
    }
    throw new NotFoundException(
      `"${code}" barkoduyla eşleşen bir ürün bulunamadı`,
    );
  }

  async scanIn(dto: WarehouseScanMovementDto) {
    await this.assertBarcodeManual(dto.productId);
    return this.stockMovementsService.create({
      productId: dto.productId,
      locationId: dto.locationId,
      type: 'BARCODE_IN',
      quantity: dto.quantity,
      note: 'Depo tarama ekranından giriş',
    });
  }

  async scanOut(dto: WarehouseScanMovementDto) {
    await this.assertBarcodeManual(dto.productId);
    return this.stockMovementsService.create({
      productId: dto.productId,
      locationId: dto.locationId,
      type: 'BARCODE_OUT',
      quantity: dto.quantity,
      note: 'Depo tarama ekranından çıkış',
    });
  }

  // BOM_AUTO ürünler yalnızca üretim emirleriyle otomatik girer/çıkar — barkod ekranından
  // taranmaya çalışılırsa reddedilir (TrackingType kısıtının ters yönü, bkz.
  // BillOfMaterialsService/ProductionOrdersService'teki karşılıklı kontroller).
  private async assertBarcodeManual(productId: string) {
    const product = await this.productsService.findOne(productId);
    if (product.trackingType !== 'BARCODE_MANUAL') {
      throw new BadRequestException(
        `"${product.code}" ürünü BOM_AUTO olarak işaretli — yalnızca üretim emirleriyle otomatik girer/çıkar, barkod ekranından taranamaz`,
      );
    }
  }

  private async tryFind<T extends Location | Product>(
    fn: () => Promise<T>,
  ): Promise<T | null> {
    try {
      return await fn();
    } catch (err) {
      if (err instanceof NotFoundException) return null;
      throw err;
    }
  }
}
