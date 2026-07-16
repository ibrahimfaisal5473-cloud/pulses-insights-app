import "server-only";
import { NextResponse } from "next/server";
import { getSession } from "./session";

/**
 * Session gate for API route handlers. The proxy matcher excludes /api, so
 * every handler protects itself (checks live close to the data, per the DAL
 * pattern). Returns a 401 response to short-circuit with, or null when the
 * request is authenticated.
 */
export async function requireApiSession(): Promise<NextResponse | null> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
