import { IsNumber, IsOptional, Min } from 'class-validator';

// quantity kasıtlı olarak yok: stok miktarı yalnızca StockMovementsService üzerinden
// (ADJUSTMENT_IN/ADJUSTMENT_OUT dahil) denetimli şekilde değişebilir, ledger'ı atlayarak değil.
export class UpdateStockDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  minStockLevel?: number;
}
