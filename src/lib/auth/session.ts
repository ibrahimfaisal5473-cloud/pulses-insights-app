import "server-only";
import { cookies } from "next/headers";
import { encrypt, decrypt, type SessionPayload } from "./jwt";
import { SESSION_COOKIE, SESSION_DURATION_MS } from "./config";

/**
 * Server-only cookie session operations.
 * Reads/writes the httpOnly session cookie; signing lives in `./jwt`.
 */

export async function createSession(username: string): Promise<void> {
  const token = await encrypt({ username });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(Date.now() + SESSION_DURATION_MS),
  });
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  return decrypt(cookieStore.get(SESSION_COOKIE)?.value);
}
