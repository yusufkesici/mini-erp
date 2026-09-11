import { apiClient } from '../lib/apiClient';
import type { CreateLocationInput, Location, UpdateLocationInput } from '../types/location';

export const locationsApi = {
  list: () => apiClient.get<Location[]>('/locations'),
  get: (id: string) => apiClient.get<Location>(`/locations/${id}`),
  getByCode: (code: string) => apiClient.get<Location>(`/locations/by-code/${code}`),
  create: (input: CreateLocationInput) => apiClient.post<Location>('/locations', input),
  update: (id: string, input: UpdateLocationInput) => apiClient.patch<Location>(`/locations/${id}`, input),
  remove: (id: string) => apiClient.delete<void>(`/locations/${id}`),
};
