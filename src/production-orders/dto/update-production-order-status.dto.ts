import { IsEnum } from 'class-validator';
import { ProductionOrderStatus } from '../../generated/prisma/enums.js';

// Saf durum geçişi — üretim miktarına dokunmaz (bkz. CreateProductionReportDto / reportProduction).
export class UpdateProductionOrderStatusDto {
  @IsEnum(ProductionOrderStatus)
  status!: ProductionOrderStatus;
}
