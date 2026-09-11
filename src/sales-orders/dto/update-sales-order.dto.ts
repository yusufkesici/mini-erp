import { IsDateString, IsOptional, IsString } from 'class-validator';

export class UpdateSalesOrderDto {
  @IsOptional()
  @IsDateString()
  orderDate?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
