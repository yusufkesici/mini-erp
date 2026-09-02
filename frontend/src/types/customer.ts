export interface Customer {
  id: string;
  code: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  isActive: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerInput {
  code: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  isActive?: boolean;
}

export type UpdateCustomerInput = Partial<CreateCustomerInput>;
