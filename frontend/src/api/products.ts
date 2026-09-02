import { apiClient } from '../lib/apiClient';
import type { CreateProductInput, Product, UpdateProductInput } from '../types/product';

export const productsApi = {
  list: () => apiClient.get<Product[]>('/products'),
  get: (id: string) => apiClient.get<Product>(`/products/${id}`),
  create: (input: CreateProductInput) => apiClient.post<Product>('/products', input),
  update: (id: string, input: UpdateProductInput) => apiClient.patch<Product>(`/products/${id}`, input),
  remove: (id: string) => apiClient.delete<void>(`/products/${id}`),
};
