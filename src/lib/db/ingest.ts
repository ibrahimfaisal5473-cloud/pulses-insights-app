import "server-only";
import { query } from "./client";

/**
 * Pulse ingestion — the write path.
 *
 * The endpoint accepts an ARRAY of detections rather than one, and that is the
 * central design decision. At 1,000 detections/sec, one HTTP request per
 * detection means 1,000 requests/sec of connection handling, JSON parsing and
 * connection-pool churn — and the database is nowhere near being the
 * bottleneck. Cameras naturally buffer, so a request carrying 100 detections
 * turns 1,000 req/s into 10 req/s of real work.
 *
 * Measured locally on this schema:
 *   one INSERT per row, autocommit     ~10,400 rows/sec
 *   multi-row INSERT, 500 per statement ~66,400 rows/sec
 */

const GENDERS = new Set(["male", "female", "unknown"]);
const EMOTIONS = new Set(["happy", "neutral", "sad"]);

/** Guard against a client sending an unbounded array and exhausting memory. */
export const MAX_BATCH = 1000;

export type IncomingPulse = {
  camera_code: string;
  face_id: string;
  detected_at: string;
  age?: number | null;
  gender?: string | null;
  emotion?: string | null;
};

export type IngestResult = {
  /** Rows newly written. Excludes duplicates, which were already stored. */
  accepted: number;
  /**
   * Rows that were already present, matched on (face_id, camera_id,
   * detected_at). Reported separately from `accepted` so a caller can tell a
   * successful retry from a first delivery — both are successes, and neither
   * is an error worth alarming on.
   */
  duplicates: number;
  rejected: { index: number; reason: string }[];
};

type ValidPulse = {
  cameraId: number;
  faceId: string;
  detectedAt: Date;
  age: number | null;
  gender: string | null;
  emotion: string | null;
};

/**
 * Validate and insert a batch.
 *
 * Invalid rows are reported rather than silently dropped, and they do not fail
 * the whole batch. A camera with one malformed reading should not lose the
 * other ninety-nine — "without data loss" is a requirement.
 */
export async function ingestPulses(batch: IncomingPulse[]): Promise<IngestResult> {
  const rejected: IngestResult["rejected"] = [];
  if (batch.length === 0) return { accepted: 0, duplicates: 0, rejected };

  // Resolve every camera code in ONE query rather than one lookup per pulse.
  // This is the per-batch equivalent of a foreign key check, done once.
  const codes = [...new Set(batch.map((p) => p?.camera_code).filter(Boolean))];
  const cameraRows = await query<{ camera_id: number; code: string }>(
    `SELECT camera_id, code FROM camera WHERE code = ANY($1::text[])`,
    [codes],
  );
  const cameraByCode = new Map(cameraRows.map((r) => [r.code, r.camera_id]));

  const valid: ValidPulse[] = [];

  batch.forEach((p, index) => {
    const reject = (reason: string) => rejected.push({ index, reason });

    if (!p || typeof p !== "object") return reject("not an object");

    const cameraId = cameraByCode.get(p.camera_code);
    if (cameraId === undefined) return reject(`unknown camera_code "${p.camera_code}"`);

    if (typeof p.face_id !== "string" || p.face_id.length === 0) {
      return reject("face_id is required");
    }

    const detectedAt = new Date(p.detected_at);
    if (Number.isNaN(detectedAt.getTime())) return reject("detected_at is not a valid timestamp");

    // Age, gender and emotion are all optional: a face can be detected clearly
    // enough to count as footfall without being readable.
    let age: number | null = null;
    if (p.age !== undefined && p.age !== null) {
      if (!Number.isInteger(p.age) || p.age < 0 || p.age > 120) {
        return reject("age must be an integer between 0 and 120");
      }
      age = p.age;
    }

    let gender: string | null = null;
    if (p.gender !== undefined && p.gender !== null) {
      if (!GENDERS.has(p.gender)) return reject(`gender must be one of ${[...GENDERS].join(", ")}`);
      gender = p.gender;
    }

    let emotion: string | null = null;
    if (p.emotion !== undefined && p.emotion !== null) {
      if (!EMOTIONS.has(p.emotion)) return reject(`emotion must be one of ${[...EMOTIONS].join(", ")}`);
      emotion = p.emotion;
    }

    valid.push({ cameraId, faceId: p.face_id, detectedAt, age, gender, emotion });
  });

  if (valid.length === 0) return { accepted: 0, duplicates: 0, rejected };

  // One multi-row INSERT: a single statement, a single round trip, a single
  // transaction. The placeholders are generated (structure), the values are
  // still bound parameters (data) — so this stays injection-proof.
  const cols = 6;
  const placeholders = valid
    .map((_, i) => {
      const b = i * cols;
      return `($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4}, $${b + 5}, $${b + 6})`;
    })
    .join(", ");

  const params = valid.flatMap((p) => [
    p.cameraId,
    p.faceId,
    p.detectedAt.toISOString(),
    p.age,
    p.gender,
    p.emotion,
  ]);

  // ON CONFLICT DO NOTHING against the natural key (face_id, camera_id,
  // detected_at) makes a retried batch idempotent rather than duplicating it.
  // A gateway that times out cannot know whether its batch committed, so its
  // only safe move is to resend — and resending must be a no-op, not silent
  // inflation of every count on the dashboard.
  //
  // RETURNING emits one row per row actually written, so counting them
  // distinguishes a first delivery from a retry. Without it the statement
  // reports success either way and the difference is invisible.
  const inserted = await query<{ ok: number }>(
    `INSERT INTO pulse (camera_id, face_id, detected_at, age, gender, emotion)
     VALUES ${placeholders}
     ON CONFLICT (face_id, camera_id, detected_at) DO NOTHING
     RETURNING 1 AS ok`,
    params,
  );

  return {
    accepted: inserted.length,
    duplicates: valid.length - inserted.length,
    rejected,
  };
}
