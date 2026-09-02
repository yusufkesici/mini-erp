import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateSalesOrderItemDto } from './create-sales-order-item.dto.js';

export class UpdateSalesOrderItemDto extends PartialType(OmitType(CreateSalesOrderItemDto, ['productId'] as const)) {}
