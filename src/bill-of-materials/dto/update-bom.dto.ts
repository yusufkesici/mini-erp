import { PartialType } from '@nestjs/mapped-types';
import { CreateBomDto } from './create-bom.dto.js';

export class UpdateBomDto extends PartialType(CreateBomDto) {}
