import { IsNumber, IsString, Min } from 'class-validator';

export class WarehouseScanMovementDto {
  @IsString()
  locationId!: string;

  @IsString()
  productId!: string;

  @IsNumber()
  @Min(0.0001)
  quantity!: number;
}
