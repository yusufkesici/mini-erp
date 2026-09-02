import { IsDateString, IsEnum, IsNumber, IsOptional, Min } from 'class-validator';
import { ProductionOrderStatus } from '../../generated/prisma/enums.js';

// productId/bomId/warehouseId/plannedQuantity oluşturmadan sonra değiştirilmez;
// update yalnızca durum ve gerçekleşen ilerleme alanlarını hedefler
export class UpdateProductionOrderDto {
  @IsOptional()
  @IsEnum(ProductionOrderStatus)
  status?: ProductionOrderStatus;

  @IsOptional()
  @IsNumber()
  @Min(0)
  producedQuantity?: number;

  @IsOptional()
  @IsDateString()
  plannedStartDate?: string;

  @IsOptional()
  @IsDateString()
  plannedEndDate?: string;

  @IsOptional()
  @IsDateString()
  actualStartDate?: string;

  @IsOptional()
  @IsDateString()
  actualEndDate?: string;
}
