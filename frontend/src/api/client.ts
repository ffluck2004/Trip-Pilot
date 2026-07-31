const API_BASE = 'https://trip-pilot-ogsq.onrender.com/api/v1';

function getToken(): string | null {
  return localStorage.getItem('jwt_token');
}

export function setToken(token: string) {
  localStorage.setItem('jwt_token', token);
}

export function clearToken() {
  localStorage.removeItem('jwt_token');
}

export async function apiRequest<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ message: res.statusText }));

    // If unauthorized or forbidden, session is stale — force re-auth
    if (res.status === 401 || res.status === 403) {
      clearToken();
      localStorage.removeItem("trippilot_user");
      localStorage.removeItem("temp_user");
      window.location.reload();
      throw new Error("Session expired. Please log in again.");
    }

    throw new Error(errorBody.message || errorBody.error || `Request failed: ${res.status}`);
  }

  return res.json();
}
