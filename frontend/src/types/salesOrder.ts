import type { SalesOrderStatus } from './enums';
import type { Customer } from './customer';
import type { Product } from './product';

export interface SalesOrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: string;
  unitPrice: string;
  product: Product;
}

export interface SalesOrder {
  id: string;
  customerId: string;
  orderDate: string;
  status: SalesOrderStatus;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  customer: Customer;
  items: SalesOrderItem[];
}

export interface CreateSalesOrderItemInput {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface CreateSalesOrderInput {
  customerId: string;
  orderDate?: string;
  note?: string;
  items: CreateSalesOrderItemInput[];
}

export interface UpdateSalesOrderItemInput {
  quantity?: number;
  unitPrice?: number;
}
