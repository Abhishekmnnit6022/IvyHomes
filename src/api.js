// API client: owns configuration, sessions, retry behavior, and pagination.
const BASE = import.meta.env.VITE_API_BASE_URL || 'https://solve.ivy.homes';
const KEY = import.meta.env.VITE_API_KEY || '';

// Read the persisted user session, if the visitor has already logged in.
export const getSession = () => JSON.parse(localStorage.getItem('ivy-session') || 'null');
// Persist the latest access and refresh tokens after login/refresh.
export const setSession = (session) => localStorage.setItem('ivy-session', JSON.stringify(session));
// Remove credentials locally when the user signs out.
export const clearSession = () => localStorage.removeItem('ivy-session');

// Keep HTTP status with the message so callers can make safe retry choices.
class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}

// Make a single request with required API-key and bearer-token headers.
async function raw(path, options = {}) {
  const session = getSession();
  const response = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(KEY ? { 'X-API-Key': KEY } : {}),
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      ...options.headers,
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(body.detail || `Request failed (${response.status})`, response.status);
  return body;
}

// Exchange demo credentials for an API session.
export async function login(email, password) {
  const session = await raw('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  setSession(session);
  return session;
}

// Renew an expired access token using the server-provided refresh endpoint.
export async function refreshSession() {
  const session = getSession();
  if (!session?.refresh_token) throw new Error('Please log in again.');
  const renewed = await raw(session.refresh_url || '/auth/refresh', { method: 'POST', body: JSON.stringify({ refresh_token: session.refresh_token }) });
  setSession(renewed);
  return renewed;
}

// Public request helper that retries once after a 401 refresh.
export async function api(path, options) {
  try { return await raw(path, options); }
  catch (error) {
    // Retry once after refreshing only an expired/invalid authenticated session.
    if (error.status === 401 && getSession()?.refresh_token) {
      await refreshSession();
      return raw(path, options);
    }
    throw error;
  }
}

// Add only meaningful query parameters to a collection URL.
export const query = (path, params = {}) => {
  const search = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== '' && value != null));
  return api(`${path}${search.size ? `?${search}` : ''}`);
};

// Semantic alias used by collection hooks.
export const getPage = (path, params = {}) => query(path, params);

// Fetch every page by following server-authoritative limit and has_more fields.
export async function getAll(path) {
  const firstPage = await getPage(path, { limit: 50, offset: 0 });
  return getAllPages(path, firstPage);
}

// Starts from an already-rendered page and downloads later pages in small batches.
export async function getAllPages(path, firstPage) {
  const results = [...firstPage.results];
  let offset = firstPage.offset + firstPage.limit;
  let hasMore = firstPage.has_more;
  const batchSize = 8;
  while (hasMore) {
    // Eight requests stay far below the API limit while cutting long downloads sharply.
    const offsets = Array.from({ length: batchSize }, (_, index) => offset + index * 50);
    const pages = await Promise.all(offsets.map((pageOffset) => getPage(path, { limit: 50, offset: pageOffset })));
    for (const page of pages) {
      if (page.results?.length) results.push(...page.results);
    }
    const lastUsefulPage = pages.find((page) => !page.has_more);
    hasMore = !lastUsefulPage;
    offset += batchSize * 50;
  }
  return results;
}
