import { IsEnum } from 'class-validator';
import { SalesOrderStatus } from '../../generated/prisma/enums.js';

export class UpdateSalesOrderStatusDto {
  @IsEnum(SalesOrderStatus)
  status!: SalesOrderStatus;
}
