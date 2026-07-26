import { apiRequest } from './client';

export async function generateTrip(params: {
  userId?: string;
  destination: string;
  durationInDays: number;
  durationInHours?: number;
  budget?: number;
  peopleCount?: number;
  travelRadiusKm?: number;
  interests?: string[];
  travelStyle?: string;
  preferences?: string;
}) {
  return apiRequest('/trips/generate', {
    method: 'POST',
    body: JSON.stringify({
      ...params,
      interests: Array.isArray(params.interests) ? params.interests.join(',') : params.interests,
    }),
  });
}

export async function getTripsByUser(userId: string) {
  return apiRequest(`/trips/user/${userId}`);
}

export async function getTrip(tripId: string) {
  return apiRequest(`/trips/${tripId}`);
}

export async function updateTripStatus(tripId: string, status?: string, currentLocationIdx?: number) {
  return apiRequest(`/trips/${tripId}/status`, {
    method: 'POST',
    body: JSON.stringify({ status, currentLocationIdx }),
  });
}

export async function addItineraryItem(tripId: string, item: {
  title: string;
  description?: string;
  category?: string;
  lat?: number;
  lng?: number;
  costEstimation?: number;
  estimatedDurationMinutes?: number;
  address?: string;
  day?: number;
}) {
  return apiRequest(`/trips/${tripId}/itinerary/add`, {
    method: 'POST',
    body: JSON.stringify(item),
  });
}

export async function toggleItineraryItem(tripId: string, itemId: string, completed: boolean) {
  return apiRequest(`/trips/${tripId}/itinerary/${itemId}/toggle`, {
    method: 'POST',
    body: JSON.stringify({ completed }),
  });
}

export async function swapItineraryItem(tripId: string, itemId: string) {
  return apiRequest(`/trips/${tripId}/itinerary/${itemId}/swap`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function voteItineraryItem(tripId: string, itemId: string, vote: 'up' | 'down') {
  return apiRequest(`/trips/${tripId}/itinerary/${itemId}/vote`, {
    method: 'POST',
    body: JSON.stringify({ vote }),
  });
}
