import { apiClient } from '../lib/apiClient';
import type { CreateWarehouseInput, UpdateWarehouseInput, Warehouse } from '../types/warehouse';

export const warehousesApi = {
  list: () => apiClient.get<Warehouse[]>('/warehouses'),
  get: (id: string) => apiClient.get<Warehouse>(`/warehouses/${id}`),
  create: (input: CreateWarehouseInput) => apiClient.post<Warehouse>('/warehouses', input),
  update: (id: string, input: UpdateWarehouseInput) => apiClient.patch<Warehouse>(`/warehouses/${id}`, input),
  remove: (id: string) => apiClient.delete<void>(`/warehouses/${id}`),
};
