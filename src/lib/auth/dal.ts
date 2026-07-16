import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getSession } from "./session";

/**
 * Data Access Layer — the authoritative session check, run close to the data
 * (Server Components / route handlers). Proxy only does an optimistic redirect;
 * this is the real gate. Memoized per render pass with React `cache`.
 */

export const verifySession = cache(async () => {
  const session = await getSession();
  if (!session) redirect("/login");
  return { username: session.username };
});

export const getCurrentUser = cache(async () => {
  const session = await getSession();
  return session ? { username: session.username } : null;
});
