import { NextResponse } from "next/server";
import { DEMO_CREDENTIALS } from "@/lib/auth/config";
import { createSession } from "@/lib/auth/session";

export async function POST(request: Request) {
  let body: { username?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { username, password } = body;
  if (!username || !password) {
    return NextResponse.json(
      { error: "Username and password are required" },
      { status: 400 },
    );
  }

  if (
    username !== DEMO_CREDENTIALS.username ||
    password !== DEMO_CREDENTIALS.password
  ) {
    return NextResponse.json(
      { error: "Invalid username or password" },
      { status: 401 },
    );
  }

  await createSession(username);
  return NextResponse.json({ ok: true });
}
