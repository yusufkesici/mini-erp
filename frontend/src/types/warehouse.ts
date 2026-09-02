export interface Warehouse {
  id: string;
  code: string;
  name: string;
  address: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWarehouseInput {
  code: string;
  name: string;
  address?: string;
  isActive?: boolean;
}

export type UpdateWarehouseInput = Partial<CreateWarehouseInput>;
