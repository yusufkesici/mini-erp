import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateStockDto {
  @IsString()
  productId!: string;

  @IsString()
  warehouseId!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minStockLevel?: number;
}
