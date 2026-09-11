import { CommandRunner, SubCommand } from 'nest-commander';
import { LocationsService } from '../locations.service.js';

@SubCommand({ name: 'list', description: 'Konumları (rafları) listeler' })
export class LocationListCommand extends CommandRunner {
  constructor(private readonly locationsService: LocationsService) {
    super();
  }

  async run(): Promise<void> {
    const locations = await this.locationsService.findAll();
    if (locations.length === 0) {
      console.log('Kayıtlı konum yok.');
      return;
    }
    console.table(
      locations.map((location) => ({
        code: location.code,
        name: location.name,
        warehouse: location.warehouse.code,
        isDefault: location.isDefault,
        isActive: location.isActive,
      })),
    );
    console.log(`${locations.length} konum`);
  }
}
