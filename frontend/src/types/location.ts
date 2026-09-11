import type { Warehouse } from './warehouse';

export interface Location {
  id: string;
  code: string;
  name: string;
  isDefault: boolean;
  warehouseId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  warehouse: Warehouse;
}

export interface CreateLocationInput {
  code: string;
  name: string;
  warehouseId: string;
  isActive?: boolean;
}

export type UpdateLocationInput = Partial<CreateLocationInput>;
