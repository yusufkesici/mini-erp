import { Command, CommandRunner } from 'nest-commander';
import { LocationCreateCommand } from './location-create.command.js';
import { LocationListCommand } from './location-list.command.js';

@Command({
  name: 'location',
  description: 'Konum/raf işlemleri (create, list)',
  subCommands: [LocationCreateCommand, LocationListCommand],
})
export class LocationCommand extends CommandRunner {
  async run(): Promise<void> {
    console.log('Kullanım: location <create|list> [options]');
  }
}
