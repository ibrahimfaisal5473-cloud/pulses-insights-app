import { NextResponse, type NextRequest } from "next/server";
import { ingestPulses, MAX_BATCH, type IncomingPulse } from "@/lib/db/ingest";

/**
 * POST /api/v1/pulses — the ingestion endpoint.
 *
 * Accepts a BATCH of detections:
 *   { "pulses": [ { camera_code, face_id, detected_at, age, gender, emotion }, ... ] }
 *
 * Batching is the point. One request per detection at 1,000/sec is 1,000
 * requests/sec of HTTP and connection-pool overhead for what amounts to a
 * trivial amount of database work. A request carrying 100 detections reduces
 * that to 10 req/s.
 *
 * Authenticated by a shared key, not a user session: the caller is a camera
 * gateway, not a person with a browser.
 */
export async function POST(request: NextRequest) {
  const expected = process.env.INGEST_API_KEY;
  if (!expected) {
    console.error("[api] INGEST_API_KEY is not configured");
    return NextResponse.json({ error: "Ingestion is not configured" }, { status: 503 });
  }
  if (request.headers.get("x-api-key") !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body must be valid JSON" }, { status: 400 });
  }

  // Accept either a bare array or { pulses: [...] } so a camera gateway does
  // not have to care which convention it was written against.
  const pulses: unknown = Array.isArray(body)
    ? body
    : (body as { pulses?: unknown })?.pulses;

  if (!Array.isArray(pulses)) {
    return NextResponse.json(
      { error: "Expected an array of pulses, or { pulses: [...] }" },
      { status: 400 },
    );
  }

  if (pulses.length > MAX_BATCH) {
    return NextResponse.json(
      { error: `Batch too large: ${pulses.length} pulses, maximum is ${MAX_BATCH}` },
      { status: 413 },
    );
  }

  try {
    const started = Date.now();
    const result = await ingestPulses(pulses as IncomingPulse[]);
    const ms = Date.now() - started;

    // 207 when some rows were rejected: the batch partially succeeded, and the
    // caller needs to know which ones so it can fix or resend them. Silently
    // dropping bad rows would violate "without data loss".
    return NextResponse.json(
      { ...result, ms },
      { status: result.rejected.length > 0 ? 207 : 201 },
    );
  } catch (err) {
    console.error("[api] /pulses", err);
    return NextResponse.json({ error: "Failed to ingest pulses" }, { status: 500 });
  }
}
