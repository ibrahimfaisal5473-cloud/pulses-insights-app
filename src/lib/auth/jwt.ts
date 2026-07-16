import { SignJWT, jwtVerify } from "jose";
import { getSecretKey } from "./config";

/**
 * Pure JWT sign/verify (jose only — no next/headers, no server-only) so it is
 * safe to import from `proxy.ts` for the optimistic session check.
 */

export type SessionPayload = {
  username: string;
};

export async function encrypt(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecretKey());
}

export async function decrypt(
  token?: string,
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      algorithms: ["HS256"],
    });
    if (typeof payload.username !== "string") return null;
    return { username: payload.username };
  } catch {
    return null;
  }
}
