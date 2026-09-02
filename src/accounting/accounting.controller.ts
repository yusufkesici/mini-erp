import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { AccountingService } from './accounting.service.js';
import { CreateAccountingEntryDto } from './dto/create-accounting-entry.dto.js';

// Değiştirilemez defter — kasıtlı olarak update/delete uç noktası yok
@Controller('accounting')
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  @Post('entries')
  create(@Body() dto: CreateAccountingEntryDto) {
    return this.accountingService.create(dto);
  }

  @Get('entries')
  findAll() {
    return this.accountingService.findAll();
  }

  @Get('summary')
  summary() {
    return this.accountingService.summary();
  }

  @Get('entries/:id')
  findOne(@Param('id') id: string) {
    return this.accountingService.findOne(id);
  }
}
