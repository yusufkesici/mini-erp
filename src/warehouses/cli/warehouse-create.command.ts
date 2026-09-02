import { CommandRunner, Option, SubCommand } from 'nest-commander';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { WarehousesService } from '../warehouses.service.js';
import { CreateWarehouseDto } from '../dto/create-warehouse.dto.js';

interface WarehouseCreateOptions {
  code: string;
  name: string;
  address?: string;
}

@SubCommand({ name: 'create', description: 'Yeni depo oluşturur' })
export class WarehouseCreateCommand extends CommandRunner {
  constructor(private readonly warehousesService: WarehousesService) {
    super();
  }

  async run(_passedParams: string[], options: WarehouseCreateOptions): Promise<void> {
    const dto = plainToInstance(CreateWarehouseDto, options);
    const errors = await validate(dto);
    if (errors.length > 0) {
      console.error('Doğrulama hatası:');
      for (const error of errors) {
        console.error(` - ${error.property}: ${Object.values(error.constraints ?? {}).join(', ')}`);
      }
      process.exitCode = 1;
      return;
    }

    const warehouse = await this.warehousesService.create(dto);
    console.log(`Depo oluşturuldu: ${warehouse.code} (${warehouse.id})`);
  }

  @Option({ flags: '-c, --code <code>', description: 'Depo kodu' })
  parseCode(val: string): string {
    return val;
  }

  @Option({ flags: '-n, --name <name>', description: 'Depo adı' })
  parseName(val: string): string {
    return val;
  }

  @Option({ flags: '-a, --address [address]', description: 'Adres' })
  parseAddress(val: string): string {
    return val;
  }
}
