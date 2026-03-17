const PROD_BASE_URL = "https://devilfruittcg.gg";

export const AUTH_CALLBACK_PATH = "/auth/callback";
export const ACCOUNT_PASSWORD_RECOVERY_PATH = "/account?mode=recovery";

function normalizeBaseUrl(value: string) {
  const url = new URL(value);
  return url.origin.replace(/\/$/, "");
}

export function getAppBaseUrl() {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (envUrl) {
    return normalizeBaseUrl(envUrl);
  }

  if (typeof window !== "undefined") {
    return normalizeBaseUrl(window.location.origin);
  }

  return PROD_BASE_URL;
}

export function normalizeAuthNextPath(value: string | null | undefined, fallback = "/account") {
  if (!value) return fallback;

  const raw = value.trim();
  if (!raw) return fallback;

  try {
    const decoded = decodeURIComponent(raw);

    if (decoded.startsWith("/") && !decoded.startsWith("//")) {
      return decoded;
    }

    if (/^https?:\/\//i.test(decoded)) {
      const url = new URL(decoded);
      if (url.origin === getAppBaseUrl()) {
        return `${url.pathname}${url.search}${url.hash}`;
      }
    }
  } catch {
    return fallback;
  }

  return fallback;
}

export function getAuthCallbackUrl(nextPath?: string | null) {
  const next = normalizeAuthNextPath(nextPath, "");
  const params = new URLSearchParams();
  if (next) params.set("next", next);
  const query = params.toString();
  return `${getAppBaseUrl()}${AUTH_CALLBACK_PATH}${query ? `?${query}` : ""}`;
}

export function getPasswordRecoveryUrl() {
  return `${getAppBaseUrl()}${ACCOUNT_PASSWORD_RECOVERY_PATH}`;
}
