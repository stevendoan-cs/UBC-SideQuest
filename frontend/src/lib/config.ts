// Public, browser-safe settings. None of these are secrets: the Auth0 domain, client ID and
// API audience are designed to be shipped to the browser. Override any of them with a
// VITE_* variable (e.g. in a local `.env.local`).

const env = import.meta.env;

/** Backend base URL (no trailing slash). */
export const API_URL = (env.VITE_API_URL || "https://45-32-230-78.sslip.io").replace(/\/+$/, "");

export const AUTH0 = {
  domain: env.VITE_AUTH0_DOMAIN || "dev-g3dq8mjgmfyqjdkh.us.auth0.com",
  clientId: env.VITE_AUTH0_CLIENT_ID || "agjMp8EJUchKtfFPOCCykZanIkoS6FDR",
  audience: env.VITE_AUTH0_AUDIENCE || "https://api.ubc-sidequest",
} as const;

/**
 * "dev" skips Auth0 and sends `Bearer dev:<name>` tokens, which only a backend running with
 * AUTH_MODE=dev accepts. It can only be switched on in a local dev build (`vite dev`), never
 * in a production build.
 */
export const AUTH_MODE: "auth0" | "dev" = env.DEV && env.VITE_AUTH_MODE === "dev" ? "dev" : "auth0";
