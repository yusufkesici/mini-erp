import { IsDateString, IsOptional } from 'class-validator';

// productId/bomId/warehouseId/plannedQuantity oluşturmadan sonra değiştirilmez; status da
// (updateStatus()/PATCH :id/status) ve producedQuantity de (reportProduction()/POST
// :id/report-production, stokla senkron kalması için) burada değil. Bu DTO yalnızca
// tarih alanlarını hedefler.
export class UpdateProductionOrderDto {
  @IsOptional()
  @IsDateString()
  plannedStartDate?: string;

  @IsOptional()
  @IsDateString()
  plannedEndDate?: string;

  @IsOptional()
  @IsDateString()
  actualStartDate?: string;

  @IsOptional()
  @IsDateString()
  actualEndDate?: string;
}
