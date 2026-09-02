import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { AccountingEntryType } from '../../generated/prisma/enums.js';

export class CreateAccountingEntryDto {
  @IsEnum(AccountingEntryType)
  type!: AccountingEntryType;

  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  entryDate?: string;
}
