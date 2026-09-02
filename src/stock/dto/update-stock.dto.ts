import { IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateStockDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minStockLevel?: number;
}
