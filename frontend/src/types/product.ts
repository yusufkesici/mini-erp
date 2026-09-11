import type { ProductType, TrackingType, UnitOfMeasure } from './enums';

export interface Product {
  id: string;
  code: string;
  barcode: string | null;
  name: string;
  description: string | null;
  type: ProductType;
  unit: UnitOfMeasure;
  trackingType: TrackingType;
  costPrice: string | null;
  salePrice: string | null;
  isActive: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductInput {
  code: string;
  barcode?: string;
  name: string;
  description?: string;
  type: ProductType;
  unit?: UnitOfMeasure;
  trackingType?: TrackingType;
  costPrice?: number;
  salePrice?: number;
  isActive?: boolean;
}

export type UpdateProductInput = Partial<CreateProductInput>;
