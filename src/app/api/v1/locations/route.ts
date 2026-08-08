import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/auth/guard";
import { getHierarchy } from "@/lib/db/metrics";

/**
 * GET /api/v1/locations
 *
 * The Location -> Zone -> Camera hierarchy. The dashboard needs this to build
 * its filter dropdowns without hardcoding zone names.
 */
export async function GET() {
  const denied = await requireApiSession();
  if (denied) return denied;

  try {
    return NextResponse.json(await getHierarchy());
  } catch (err) {
    console.error("[api] /locations", err);
    return NextResponse.json({ error: "Failed to load hierarchy" }, { status: 500 });
  }
}
