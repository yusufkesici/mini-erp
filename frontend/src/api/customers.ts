import { apiClient } from '../lib/apiClient';
import type { CreateCustomerInput, Customer, UpdateCustomerInput } from '../types/customer';

export const customersApi = {
  list: () => apiClient.get<Customer[]>('/customers'),
  get: (id: string) => apiClient.get<Customer>(`/customers/${id}`),
  create: (input: CreateCustomerInput) => apiClient.post<Customer>('/customers', input),
  update: (id: string, input: UpdateCustomerInput) => apiClient.patch<Customer>(`/customers/${id}`, input),
  remove: (id: string) => apiClient.delete<void>(`/customers/${id}`),
};
