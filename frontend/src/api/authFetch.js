import { API_BASE } from "./base";

let refreshPromise = null;

async function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    }).then((r) => {
      refreshPromise = null;
      return r;
    }).catch(() => {
      refreshPromise = null;
      return null;
    });
  }
  return refreshPromise;
}

export async function authFetch(url, options = {}) {
  const res = await fetch(url, {
    credentials: "include",
    ...options,
    headers: {
      ...(options.headers || {}),
    },
  });

  if (res.status === 403) {
    const refreshRes = await refreshSession();
    if (refreshRes && refreshRes.ok) {
      return fetch(url, {
        credentials: "include",
        ...options,
        headers: {
          ...(options.headers || {}),
        },
      });
    }
    localStorage.removeItem("role");
    localStorage.removeItem("user");
    if (window.location.pathname !== "/signin") {
      window.location.href = "/signin";
    }
  }

  return res;
}
