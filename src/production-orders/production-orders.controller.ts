import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ProductionOrdersService } from './production-orders.service.js';
import { CreateProductionOrderDto } from './dto/create-production-order.dto.js';
import { UpdateProductionOrderDto } from './dto/update-production-order.dto.js';
import { UpdateProductionOrderStatusDto } from './dto/update-production-order-status.dto.js';
import { CreateProductionReportDto } from './dto/create-production-report.dto.js';

@Controller('production-orders')
export class ProductionOrdersController {
  constructor(
    private readonly productionOrdersService: ProductionOrdersService,
  ) {}

  @Post()
  create(@Body() dto: CreateProductionOrderDto) {
    return this.productionOrdersService.create(dto);
  }

  @Get()
  findAll() {
    return this.productionOrdersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productionOrdersService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProductionOrderDto) {
    return this.productionOrdersService.update(id, dto);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateProductionOrderStatusDto,
  ) {
    return this.productionOrdersService.updateStatus(id, dto);
  }

  // Her çağrı yeni StockMovement kayıtları yaratır (idempotent değil) — PATCH değil POST.
  @Post(':id/report-production')
  reportProduction(
    @Param('id') id: string,
    @Body() dto: CreateProductionReportDto,
  ) {
    return this.productionOrdersService.reportProduction(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productionOrdersService.remove(id);
  }
}
