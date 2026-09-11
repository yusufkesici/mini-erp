import type { Location } from './location';
import type { Product } from './product';

export type ResolveExpect = 'LOCATION' | 'PRODUCT';

export type ResolveScanResult = { kind: 'LOCATION'; data: Location } | { kind: 'PRODUCT'; data: Product };

export interface WarehouseScanMovementInput {
  locationId: string;
  productId: string;
  quantity: number;
}
