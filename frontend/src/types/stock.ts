import type { Product } from './product';
import type { Location } from './location';

export interface Stock {
  id: string;
  productId: string;
  locationId: string;
  quantity: string;
  minStockLevel: string | null;
  createdAt: string;
  updatedAt: string;
  product: Product;
  location: Location;
}

export interface CreateStockInput {
  productId: string;
  locationId: string;
  quantity?: number;
  minStockLevel?: number;
}

export interface UpdateStockInput {
  minStockLevel?: number;
}
