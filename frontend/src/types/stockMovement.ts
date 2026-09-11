import type { StockMovementType } from './enums';
import type { Product } from './product';
import type { Location } from './location';

export interface BareStockMovement {
  id: string;
  productId: string;
  locationId: string;
  productionOrderId: string | null;
  type: StockMovementType;
  quantity: string;
  note: string | null;
  createdAt: string;
}

export interface StockMovement extends BareStockMovement {
  product: Product;
  location: Location;
}

export interface CreateStockMovementInput {
  productId: string;
  locationId: string;
  productionOrderId?: string;
  type: StockMovementType;
  quantity: number;
  note?: string;
}
