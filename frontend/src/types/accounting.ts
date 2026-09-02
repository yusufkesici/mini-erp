import type { AccountingEntryType } from './enums';

export interface AccountingEntry {
  id: string;
  type: AccountingEntryType;
  amount: string;
  category: string | null;
  description: string | null;
  entryDate: string;
  createdAt: string;
}

export interface CreateAccountingEntryInput {
  type: AccountingEntryType;
  amount: number;
  category?: string;
  description?: string;
  entryDate?: string;
}

export interface AccountingSummary {
  totalIncome: string;
  totalExpense: string;
  balance: string;
}
