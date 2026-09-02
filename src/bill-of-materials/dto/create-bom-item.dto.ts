import { IsNumber, IsString, Min } from 'class-validator';

export class CreateBomItemDto {
  @IsString()
  componentProductId!: string;

  @IsNumber()
  @Min(0.0001)
  quantity!: number;
}
