import { IsNumber, Min } from 'class-validator';

export class CreateProductionReportDto {
  @IsNumber()
  @Min(0.0001)
  quantity!: number;
}
