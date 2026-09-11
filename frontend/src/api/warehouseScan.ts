import { apiClient } from '../lib/apiClient';
import type { BareStockMovement } from '../types/stockMovement';
import type { ResolveExpect, ResolveScanResult, WarehouseScanMovementInput } from '../types/warehouseScan';

export const warehouseScanApi = {
  resolve: (code: string, expect: ResolveExpect) =>
    apiClient.get<ResolveScanResult>(
      `/warehouse-scan/resolve?code=${encodeURIComponent(code)}&expect=${expect}`,
    ),
  scanIn: (input: WarehouseScanMovementInput) =>
    apiClient.post<BareStockMovement>('/warehouse-scan/in', input),
  scanOut: (input: WarehouseScanMovementInput) =>
    apiClient.post<BareStockMovement>('/warehouse-scan/out', input),
};
