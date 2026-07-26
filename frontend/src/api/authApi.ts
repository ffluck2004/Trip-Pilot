import { apiRequest, setToken, clearToken } from './client';

export async function loginUser(email: string, password: string) {
  const data = await apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (data.token) setToken(data.token);
  return data;
}

export async function registerUser(email: string, password: string, name: string, preferences?: { styles: string[]; interests: string[] }) {
  const body: any = { email, password, name };
  if (preferences) {
    body.preferencesStyles = preferences.styles.join(',');
    body.preferencesInterests = preferences.interests.join(',');
  }
  const data = await apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (data.token) setToken(data.token);
  return data;
}

export async function getProfile(userId: string) {
  return apiRequest(`/auth/profile/${userId}`);
}

export async function updatePreferences(userId: string, styles: string[], interests: string[]) {
  return apiRequest(`/auth/profile/${userId}/preferences`, {
    method: 'POST',
    body: JSON.stringify({ styles: styles.join(','), interests: interests.join(',') }),
  });
}

export function logoutUser() {
  clearToken();
}
