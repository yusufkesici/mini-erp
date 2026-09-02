import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { StockMovementType } from '../../generated/prisma/enums.js';

export class CreateStockMovementDto {
  @IsString()
  productId!: string;

  @IsString()
  warehouseId!: string;

  @IsOptional()
  @IsString()
  productionOrderId?: string;

  @IsEnum(StockMovementType)
  type!: StockMovementType;

  @IsNumber()
  @Min(0.0001)
  quantity!: number;

  @IsOptional()
  @IsString()
  note?: string;
}
