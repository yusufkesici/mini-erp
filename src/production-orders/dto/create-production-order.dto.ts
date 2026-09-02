import { IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateProductionOrderDto {
  @IsString()
  productId!: string;

  // Verilmezse Service katmanı ürünün aktif ürün ağacını (BOM) otomatik çözer
  @IsOptional()
  @IsString()
  bomId?: string;

  @IsString()
  warehouseId!: string;

  @IsNumber()
  @Min(0.0001)
  plannedQuantity!: number;

  @IsOptional()
  @IsDateString()
  plannedStartDate?: string;

  @IsOptional()
  @IsDateString()
  plannedEndDate?: string;
}
