import { apiClient } from '../lib/apiClient';
import type { BillOfMaterial, CreateBomInput, UpdateBomInput } from '../types/bom';

export const bomApi = {
  list: () => apiClient.get<BillOfMaterial[]>('/bill-of-materials'),
  get: (id: string) => apiClient.get<BillOfMaterial>(`/bill-of-materials/${id}`),
  create: (input: CreateBomInput) => apiClient.post<BillOfMaterial>('/bill-of-materials', input),
  update: (id: string, input: UpdateBomInput) => apiClient.patch<BillOfMaterial>(`/bill-of-materials/${id}`, input),
  remove: (id: string) => apiClient.delete<void>(`/bill-of-materials/${id}`),
};
