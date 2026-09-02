import { Module } from '@nestjs/common';
import { CustomersService } from './customers.service.js';
import { CustomersController } from './customers.controller.js';
import { CustomerCommand } from './cli/customer.command.js';
import { CustomerCreateCommand } from './cli/customer-create.command.js';
import { CustomerListCommand } from './cli/customer-list.command.js';

@Module({
  controllers: [CustomersController],
  providers: [CustomersService, CustomerCommand, CustomerCreateCommand, CustomerListCommand],
  exports: [CustomersService],
})
export class CustomersModule {}
