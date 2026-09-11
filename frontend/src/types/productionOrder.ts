import type { ProductionOrderStatus } from './enums';
import type { BillOfMaterial } from './bom';
import type { Product } from './product';
import type { BareStockMovement } from './stockMovement';
import type { Warehouse } from './warehouse';

export interface ProductionOrder {
  id: string;
  productId: string;
  bomId: string;
  warehouseId: string;
  plannedQuantity: string;
  producedQuantity: string;
  status: ProductionOrderStatus;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  actualStartDate: string | null;
  actualEndDate: string | null;
  createdAt: string;
  updatedAt: string;
  product: Product;
  bom: BillOfMaterial;
  warehouse: Warehouse;
  movements?: BareStockMovement[];
}

export interface CreateProductionOrderInput {
  productId: string;
  bomId?: string;
  warehouseId: string;
  plannedQuantity: number;
  plannedStartDate?: string;
  plannedEndDate?: string;
}

export interface UpdateProductionOrderInput {
  producedQuantity?: number;
  plannedStartDate?: string;
  plannedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
}
