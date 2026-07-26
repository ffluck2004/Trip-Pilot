import { apiRequest } from './client';

export async function getExpensesByTrip(tripId: string) {
  return apiRequest(`/expenses/trip/${tripId}`);
}

export async function createExpense(params: {
  tripId: string;
  amount: number;
  category: string;
  description?: string;
  date?: string;
}) {
  return apiRequest('/expenses', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}
