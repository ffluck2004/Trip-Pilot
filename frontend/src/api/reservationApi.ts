import { apiRequest } from './client';

export async function getReservationsByUser(userId: string) {
  return apiRequest(`/reservations/user/${userId}`);
}

export async function parseReservation(rawText: string) {
  return apiRequest('/reservations/parse', {
    method: 'POST',
    body: JSON.stringify({ rawText }),
  });
}

export async function searchTransportAndHotels(params: {
  destination: string;
  type?: string;
  from?: string;
  date?: string;
}) {
  const qs = new URLSearchParams();
  qs.set("destination", params.destination);
  if (params.type) qs.set("type", params.type);
  if (params.from) qs.set("from", params.from);
  if (params.date) qs.set("date", params.date);
  return apiRequest(`/reservations/search?${qs.toString()}`);
}

export async function createReservation(params: {
  userId: string;
  tripId?: string;
  type?: string;
  title?: string;
  confirmationCode?: string;
  dateTime?: string;
  details?: string;
  cost?: number;
}) {
  return apiRequest('/reservations', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}
