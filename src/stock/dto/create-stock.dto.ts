import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateStockDto {
  @IsString()
  productId!: string;

  @IsString()
  locationId!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minStockLevel?: number;
}
