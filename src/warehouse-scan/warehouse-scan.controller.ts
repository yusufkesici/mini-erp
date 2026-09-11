import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { WarehouseScanService } from './warehouse-scan.service.js';
import { ResolveScanDto } from './dto/resolve-scan.dto.js';
import { WarehouseScanMovementDto } from './dto/warehouse-scan-movement.dto.js';

@Controller('warehouse-scan')
export class WarehouseScanController {
  constructor(private readonly warehouseScanService: WarehouseScanService) {}

  @Get('resolve')
  resolve(@Query() dto: ResolveScanDto) {
    return this.warehouseScanService.resolve(dto.code, dto.expect);
  }

  @Post('in')
  scanIn(@Body() dto: WarehouseScanMovementDto) {
    return this.warehouseScanService.scanIn(dto);
  }

  @Post('out')
  scanOut(@Body() dto: WarehouseScanMovementDto) {
    return this.warehouseScanService.scanOut(dto);
  }
}
