const API_URL = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");

export async function api(path, options = {}) {
  const token = localStorage.getItem("customerhub_token");
  const isForm = options.body instanceof FormData;
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { ...(isForm ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
  });
  const data = await response.json().catch(() => ({}));
  if (response.status === 401 && path !== "/auth/login") window.dispatchEvent(new Event("session-revoked"));
  if (!response.ok) throw new Error(data.message || "Request failed.");
  return data;
}

export const sessionEventsUrl = (token) => `${API_URL}/auth/events?access_token=${encodeURIComponent(token)}`;
