import { Transaction, Budget } from '@/types/finance';

const API_BASE = '/api';

// Transaction API functions
export const transactionApi = {
  async getAll(): Promise<Transaction[]> {
    const response = await fetch(`${API_BASE}/transactions`);
    if (!response.ok) {
      throw new Error('Failed to fetch transactions');
    }
    return response.json();
  },

  async create(transaction: Omit<Transaction, '_id' | 'createdAt'>): Promise<Transaction> {
    const response = await fetch(`${API_BASE}/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(transaction),
    });
    if (!response.ok) {
      throw new Error('Failed to create transaction');
    }
    return response.json();
  },

  async update(id: string, transaction: Omit<Transaction, '_id' | 'createdAt'>): Promise<Transaction> {
    const response = await fetch(`${API_BASE}/transactions/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(transaction),
    });
    if (!response.ok) {
      throw new Error('Failed to update transaction');
    }
    return response.json();
  },

  async delete(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/transactions/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete transaction');
    }
  },
};

// Budget API functions
export const budgetApi = {
  async getAll(): Promise<Budget[]> {
    const response = await fetch(`${API_BASE}/budgets`);
    if (!response.ok) {
      throw new Error('Failed to fetch budgets');
    }
    return response.json();
  },

  async saveAll(budgets: Omit<Budget, '_id' | 'spent' | 'remaining' | 'percentage'>[]): Promise<Budget[]> {
    const response = await fetch(`${API_BASE}/budgets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(budgets),
    });
    if (!response.ok) {
      throw new Error('Failed to save budgets');
    }
    return response.json();
  },
};