import { apiRequest } from './client';

export async function getPlaces(params?: { featured?: string; type?: string; category?: string }) {
  const query = new URLSearchParams();
  if (params?.featured) query.set('featured', params.featured);
  if (params?.type) query.set('type', params.type);
  if (params?.category) query.set('category', params.category);
  const qs = query.toString();
  return apiRequest(`/places${qs ? '?' + qs : ''}`);
}

export async function getNearbyPlaces(lat: number, lng: number, radius?: number) {
  const query = `lat=${lat}&lng=${lng}${radius ? '&radius=' + radius : ''}`;
  return apiRequest(`/places/nearby?${query}`);
}

export async function getPlace(id: string) {
  return apiRequest(`/places/${id}`);
}

export async function searchPlaces(q?: string, lat?: number, lng?: number, radius?: number) {
  const query = new URLSearchParams();
  if (q) query.set('q', q);
  if (lat) query.set('lat', String(lat));
  if (lng) query.set('lng', String(lng));
  if (radius) query.set('radius', String(radius));
  return apiRequest(`/places/search?${query.toString()}`);
}
