import { IsBoolean, IsOptional, IsString, Matches } from 'class-validator';

export class CreateLocationDto {
  @IsString()
  @Matches(/^LOC-/, { message: 'Konum kodu "LOC-" ile başlamalıdır' })
  code!: string;

  @IsString()
  name!: string;

  @IsString()
  warehouseId!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
