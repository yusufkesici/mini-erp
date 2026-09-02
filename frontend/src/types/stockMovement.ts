import type { StockMovementType } from './enums';
import type { Product } from './product';
import type { Warehouse } from './warehouse';

export interface BareStockMovement {
  id: string;
  productId: string;
  warehouseId: string;
  productionOrderId: string | null;
  type: StockMovementType;
  quantity: string;
  note: string | null;
  createdAt: string;
}

export interface StockMovement extends BareStockMovement {
  product: Product;
  warehouse: Warehouse;
}

export interface CreateStockMovementInput {
  productId: string;
  warehouseId: string;
  productionOrderId?: string;
  type: StockMovementType;
  quantity: number;
  note?: string;
}
