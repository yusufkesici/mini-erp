import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { BillOfMaterialsService } from './bill-of-materials.service.js';
import { CreateBomDto } from './dto/create-bom.dto.js';
import { UpdateBomDto } from './dto/update-bom.dto.js';

@Controller('bill-of-materials')
export class BillOfMaterialsController {
  constructor(private readonly billOfMaterialsService: BillOfMaterialsService) {}

  @Post()
  create(@Body() dto: CreateBomDto) {
    return this.billOfMaterialsService.create(dto);
  }

  @Get()
  findAll() {
    return this.billOfMaterialsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.billOfMaterialsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBomDto) {
    return this.billOfMaterialsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.billOfMaterialsService.remove(id);
  }
}
