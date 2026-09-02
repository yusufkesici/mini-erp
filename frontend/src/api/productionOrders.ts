import { apiClient } from '../lib/apiClient';
import type { CreateProductionOrderInput, ProductionOrder, UpdateProductionOrderInput } from '../types/productionOrder';

export const productionOrdersApi = {
  list: () => apiClient.get<ProductionOrder[]>('/production-orders'),
  get: (id: string) => apiClient.get<ProductionOrder>(`/production-orders/${id}`),
  create: (input: CreateProductionOrderInput) => apiClient.post<ProductionOrder>('/production-orders', input),
  update: (id: string, input: UpdateProductionOrderInput) =>
    apiClient.patch<ProductionOrder>(`/production-orders/${id}`, input),
  remove: (id: string) => apiClient.delete<void>(`/production-orders/${id}`),
};
