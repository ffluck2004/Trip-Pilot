const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://trip-pilot-ogsq.onrender.com/api/v1';
const BACKUP_API_BASE = import.meta.env.VITE_API_BACKUP_URL || 'https://trippilot-backup.onrender.com/api/v1';

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
  options: RequestInit = {},
  timeoutMs: number = 90000
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  // Try the primary backend first; on a network failure, automatically
  // retry against the backup backend so the site keeps working even if
  // the primary service (or its database) is down.
  const bases = BACKUP_API_BASE && BACKUP_API_BASE !== API_BASE
    ? [API_BASE, BACKUP_API_BASE]
    : [API_BASE];

  let lastError: any;
  for (const base of bases) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      let res: Response;
      try {
        res = await fetch(`${base}${path}`, {
          ...options,
          headers,
          signal: controller.signal,
        });
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          throw new Error('Request timed out. Please try again.');
        }
        // Network-level failure (backend unreachable) — try the backup base.
        lastError = err;
        continue;
      }

      if (res.ok) {
        return res.json();
      }

      const errorBody = await res.json().catch(() => ({ message: res.statusText }));

      // If unauthorized or forbidden, session is stale — force re-auth
      if (res.status === 401 || res.status === 403) {
        clearToken();
        localStorage.removeItem("trippilot_user");
        localStorage.removeItem("temp_user");
        window.location.reload();
        throw new Error("Session expired. Please log in again.");
      }

      // The server responded — do not retry the backup; surface the error.
      throw new Error(errorBody.message || errorBody.error || `Request failed: ${res.status}`);
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError ?? new Error('All API endpoints are unreachable.');
}
