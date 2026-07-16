/**
 * Auth configuration shared across the session/JWT/proxy layers.
 * (Mock authentication for the internship project — not production security.)
 */

/** Name of the httpOnly session cookie. */
export const SESSION_COOKIE = "pulses_session";

/** How long a session lasts. */
export const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/** Demo credentials (overridable via env). */
export const DEMO_CREDENTIALS = {
  username: process.env.AUTH_USERNAME ?? "admin",
  password: process.env.AUTH_PASSWORD ?? "password123",
};

/**
 * Secret key used to sign/verify the session JWT.
 * Falls back to a dev-only value so the app runs without a .env.local.
 */
export function getSecretKey(): Uint8Array {
  const secret =
    process.env.SESSION_SECRET ?? "dev-only-insecure-secret-change-me";
  return new TextEncoder().encode(secret);
}
