import { apiClient } from '../lib/apiClient';
import type { SalesOrderStatus } from '../types/enums';
import type { CreateSalesOrderInput, SalesOrder, UpdateSalesOrderItemInput } from '../types/salesOrder';

export const salesOrdersApi = {
  list: () => apiClient.get<SalesOrder[]>('/sales-orders'),
  get: (id: string) => apiClient.get<SalesOrder>(`/sales-orders/${id}`),
  listByCustomer: (customerId: string) => apiClient.get<SalesOrder[]>(`/sales-orders/customer/${customerId}`),
  create: (input: CreateSalesOrderInput) => apiClient.post<SalesOrder>('/sales-orders', input),
  updateStatus: (id: string, status: SalesOrderStatus) =>
    apiClient.patch<SalesOrder>(`/sales-orders/${id}/status`, { status }),
  updateItem: (orderId: string, itemId: string, input: UpdateSalesOrderItemInput) =>
    apiClient.patch<SalesOrder>(`/sales-orders/${orderId}/items/${itemId}`, input),
  removeItem: (orderId: string, itemId: string) => apiClient.delete<void>(`/sales-orders/${orderId}/items/${itemId}`),
};
