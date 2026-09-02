import { IsNumber, IsString, Min } from 'class-validator';

export class CreateSalesOrderItemDto {
  @IsString()
  productId!: string;

  @IsNumber()
  @Min(0.0001)
  quantity!: number;

  @IsNumber()
  @Min(0)
  unitPrice!: number;
}
