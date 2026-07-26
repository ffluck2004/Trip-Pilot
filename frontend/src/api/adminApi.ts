import { apiRequest } from './client';

export async function getAdminAnalytics() {
  return apiRequest('/admin/analytics');
}

export async function getAdminPlaces() {
  return apiRequest('/admin/places');
}

export async function createAdminPlace(params: {
  title: string;
  category?: string;
  lat?: number;
  lng?: number;
  address?: string;
  rating?: number;
}) {
  return apiRequest('/admin/places', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function deleteAdminPlace(id: string) {
  return apiRequest(`/admin/places/${id}`, { method: 'DELETE' });
}

export async function getAdminUsers() {
  return apiRequest('/admin/users');
}
