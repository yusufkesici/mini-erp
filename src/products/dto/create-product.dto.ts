import { ProductType, TrackingType, UnitOfMeasure } from '../../generated/prisma/enums.js';
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateProductDto {
  @IsString()
  code!: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(ProductType)
  type!: ProductType;

  @IsOptional()
  @IsEnum(UnitOfMeasure)
  unit?: UnitOfMeasure;

  // BOM_AUTO (varsayılan) / BARCODE_MANUAL — bkz. schema.prisma TrackingType enum yorumu.
  @IsOptional()
  @IsEnum(TrackingType)
  trackingType?: TrackingType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  costPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  salePrice?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
