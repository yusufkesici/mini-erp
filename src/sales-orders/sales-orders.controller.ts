import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { SalesOrdersService } from './sales-orders.service.js';
import { CreateSalesOrderDto } from './dto/create-sales-order.dto.js';
import { UpdateSalesOrderStatusDto } from './dto/update-sales-order-status.dto.js';
import { UpdateSalesOrderItemDto } from './dto/update-sales-order-item.dto.js';

@Controller('sales-orders')
export class SalesOrdersController {
  constructor(private readonly salesOrdersService: SalesOrdersService) {}

  @Post()
  create(@Body() dto: CreateSalesOrderDto) {
    return this.salesOrdersService.create(dto);
  }

  @Get()
  findAll() {
    return this.salesOrdersService.findAll();
  }

  @Get('customer/:customerId')
  findByCustomer(@Param('customerId') customerId: string) {
    return this.salesOrdersService.findByCustomer(customerId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.salesOrdersService.findOne(id);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateSalesOrderStatusDto) {
    return this.salesOrdersService.updateStatus(id, dto);
  }

  @Patch(':orderId/items/:itemId')
  updateItem(@Param('orderId') orderId: string, @Param('itemId') itemId: string, @Body() dto: UpdateSalesOrderItemDto) {
    return this.salesOrdersService.updateItem(orderId, itemId, dto);
  }

  @Delete(':orderId/items/:itemId')
  removeItem(@Param('orderId') orderId: string, @Param('itemId') itemId: string) {
    return this.salesOrdersService.removeItem(orderId, itemId);
  }
}
