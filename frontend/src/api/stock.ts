import { apiClient } from '../lib/apiClient';
import type { CreateStockInput, Stock, UpdateStockInput } from '../types/stock';

export const stockApi = {
  list: () => apiClient.get<Stock[]>('/stock'),
  get: (id: string) => apiClient.get<Stock>(`/stock/${id}`),
  create: (input: CreateStockInput) => apiClient.post<Stock>('/stock', input),
  update: (id: string, input: UpdateStockInput) => apiClient.patch<Stock>(`/stock/${id}`, input),
  remove: (id: string) => apiClient.delete<void>(`/stock/${id}`),
};
