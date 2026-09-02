import type { Product } from './product';
import type { Warehouse } from './warehouse';

export interface Stock {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: string;
  minStockLevel: string | null;
  createdAt: string;
  updatedAt: string;
  product: Product;
  warehouse: Warehouse;
}

export interface CreateStockInput {
  productId: string;
  warehouseId: string;
  quantity?: number;
  minStockLevel?: number;
}

export interface UpdateStockInput {
  quantity?: number;
  minStockLevel?: number;
}
