const API_BASE = "http://127.0.0.1:8000";

async function apiRequest(path, method = "GET", body = null) {
  const headers = { "Content-Type": "application/json" };
  try {
    const currentUserId =
      typeof getUserId === "function" ? getUserId() : (typeof window !== "undefined" && typeof window.getUserId === "function" ? window.getUserId() : null);
    if (currentUserId) headers["X-User-Id"] = String(currentUserId);
  } catch (_) {
    // Ignore header injection issues on public pages (e.g., login/register).
  }

  const options = {
    method,
    headers,
    cache: "no-store",
  };

  if (body) options.body = JSON.stringify(body);

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, options);
  } catch (_) {
    throw new Error(
      `Cannot reach backend at ${API_BASE}. Start FastAPI and try again.`
    );
  }

  if (!res.ok) {
    const contentType = res.headers.get("content-type") || "";
    const statusText = res.statusText ? ` ${res.statusText}` : "";
    const prefix = `Request failed (${res.status}${statusText}).`;

    if (contentType.includes("application/json")) {
      const text = await res.text();
      if (text && text.trim()) {
        try {
          const payload = JSON.parse(text);
          const detail =
            payload.detail || payload.message || payload.error || text;
          throw new Error(`${prefix} ${detail}`);
        } catch {
          throw new Error(`${prefix} ${text}`);
        }
      }
    } else {
      const text = await res.text();
      if (text && text.trim()) throw new Error(`${prefix} ${text}`);
    }

    throw new Error(prefix);
  }

  // Handle empty 204/empty-body responses safely.
  if (res.status === 204) return null;

  // If backend returns JSON content-type with empty body, don't crash.
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const text = await res.text();
    if (!text || !text.trim()) return null;
    return JSON.parse(text);
  }

  return null;
}
