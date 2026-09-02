import { apiClient } from '../lib/apiClient';
import type { AccountingEntry, AccountingSummary, CreateAccountingEntryInput } from '../types/accounting';

export const accountingApi = {
  listEntries: () => apiClient.get<AccountingEntry[]>('/accounting/entries'),
  getEntry: (id: string) => apiClient.get<AccountingEntry>(`/accounting/entries/${id}`),
  createEntry: (input: CreateAccountingEntryInput) => apiClient.post<AccountingEntry>('/accounting/entries', input),
  getSummary: () => apiClient.get<AccountingSummary>('/accounting/summary'),
};
