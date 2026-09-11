import { apiClient } from '../lib/apiClient';
import type { CreateProductionOrderInput, ProductionOrder, UpdateProductionOrderInput } from '../types/productionOrder';
import type { ProductionOrderStatus } from '../types/enums';

export const productionOrdersApi = {
  list: () => apiClient.get<ProductionOrder[]>('/production-orders'),
  get: (id: string) => apiClient.get<ProductionOrder>(`/production-orders/${id}`),
  create: (input: CreateProductionOrderInput) => apiClient.post<ProductionOrder>('/production-orders', input),
  update: (id: string, input: UpdateProductionOrderInput) =>
    apiClient.patch<ProductionOrder>(`/production-orders/${id}`, input),
  // Saf durum geçişi — stok/BOM'a dokunmaz (bkz. reportProduction).
  updateStatus: (id: string, status: ProductionOrderStatus) =>
    apiClient.patch<ProductionOrder>(`/production-orders/${id}/status`, { status }),
  // Aşamalı üretim bildirimi: `quantity` bu ÇAĞRIDA üretilen artış miktarıdır (toplam değil).
  // Backend, BOM'u bu artış için özyinelemeli patlatıp bileşenleri düşer ve üretilen ürünü
  // depoya ekler (tek transaction) — tekrar tekrar çağrılabilir.
  reportProduction: (id: string, quantity: number) =>
    apiClient.post<ProductionOrder>(`/production-orders/${id}/report-production`, { quantity }),
  remove: (id: string) => apiClient.delete<void>(`/production-orders/${id}`),
};
