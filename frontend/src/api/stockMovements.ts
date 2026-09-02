import { apiClient } from '../lib/apiClient';
import type { CreateStockMovementInput, StockMovement } from '../types/stockMovement';

export const stockMovementsApi = {
  list: () => apiClient.get<StockMovement[]>('/stock-movements'),
  get: (id: string) => apiClient.get<StockMovement>(`/stock-movements/${id}`),
  create: (input: CreateStockMovementInput) => apiClient.post<StockMovement>('/stock-movements', input),
};
