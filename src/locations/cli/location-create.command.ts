import { CommandRunner, Option, SubCommand } from 'nest-commander';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { NotFoundException } from '@nestjs/common';
import { LocationsService } from '../locations.service.js';
import { CreateLocationDto } from '../dto/create-location.dto.js';
import { WarehousesService } from '../../warehouses/warehouses.service.js';

interface LocationCreateOptions {
  code: string;
  name: string;
  warehouseCode: string;
}

@SubCommand({ name: 'create', description: 'Yeni raf/konum oluşturur' })
export class LocationCreateCommand extends CommandRunner {
  constructor(
    private readonly locationsService: LocationsService,
    private readonly warehousesService: WarehousesService,
  ) {
    super();
  }

  async run(_passedParams: string[], options: LocationCreateOptions): Promise<void> {
    let warehouse;
    try {
      warehouse = await this.warehousesService.findByCode(options.warehouseCode);
    } catch (error) {
      if (error instanceof NotFoundException) {
        console.error(error.message);
        process.exitCode = 1;
        return;
      }
      throw error;
    }

    const dto = plainToInstance(CreateLocationDto, {
      code: options.code,
      name: options.name,
      warehouseId: warehouse.id,
    });
    const errors = await validate(dto);
    if (errors.length > 0) {
      console.error('Doğrulama hatası:');
      for (const error of errors) {
        console.error(` - ${error.property}: ${Object.values(error.constraints ?? {}).join(', ')}`);
      }
      process.exitCode = 1;
      return;
    }

    const location = await this.locationsService.create(dto);
    console.log(`Konum oluşturuldu: ${location.code} (depo: ${warehouse.code})`);
  }

  @Option({ flags: '-c, --code <code>', description: 'Konum kodu (barkod, "LOC-" ile başlamalı)' })
  parseCode(val: string): string {
    return val;
  }

  @Option({ flags: '-n, --name <name>', description: 'Konum adı' })
  parseName(val: string): string {
    return val;
  }

  @Option({ flags: '-w, --warehouse-code <warehouseCode>', description: 'Bağlı olduğu depo kodu' })
  parseWarehouseCode(val: string): string {
    return val;
  }
}
