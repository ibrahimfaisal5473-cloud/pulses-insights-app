import { NextResponse } from "next/server";

/**
 * Support request intake for the pre-login help page.
 *
 * This records the request and hands back a reference the user can quote.
 * There is no mail transport wired up yet — swap the `console.info` below for
 * the real ticketing/email integration when one exists.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Digits, spaces and the usual separators; 7–20 digits once stripped. */
const PHONE_RE = /^\+?[\d\s().-]{7,25}$/;

const MAX_ISSUE = 2000;

/** Short, human-quotable reference — not a security token. */
function reference() {
  return `SUP-${Date.now().toString(36).toUpperCase().slice(-6)}`;
}

export async function POST(request: Request) {
  let body: { email?: string; phone?: string; issue?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const email = body.email?.trim() ?? "";
  const phone = body.phone?.trim() ?? "";
  const issue = body.issue?.trim() ?? "";

  if (!email || !phone || !issue) {
    return NextResponse.json(
      { error: "Email, phone number and a description of the issue are all required." },
      { status: 400 },
    );
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "That email address doesn't look right." },
      { status: 400 },
    );
  }
  if (!PHONE_RE.test(phone)) {
    return NextResponse.json(
      { error: "That phone number doesn't look right." },
      { status: 400 },
    );
  }
  if (issue.length > MAX_ISSUE) {
    return NextResponse.json(
      { error: `Please keep the description under ${MAX_ISSUE} characters.` },
      { status: 400 },
    );
  }

  const ticket = reference();
  console.info("[support] request received", { ticket, email, phone, issue });

  return NextResponse.json({ ok: true, reference: ticket });
}
