import type { Product } from './product';

export interface BomItem {
  id: string;
  bomId: string;
  componentProductId: string;
  quantity: string;
  component?: Product;
}

export interface BillOfMaterial {
  id: string;
  productId: string;
  name: string | null;
  isActive: boolean;
  outputQuantity: string;
  createdAt: string;
  updatedAt: string;
  product: Product;
  items: BomItem[];
}

export interface CreateBomItemInput {
  componentProductId: string;
  quantity: number;
}

export interface CreateBomInput {
  productId: string;
  name?: string;
  outputQuantity?: number;
  isActive?: boolean;
  items: CreateBomItemInput[];
}

export type UpdateBomInput = Partial<CreateBomInput>;
