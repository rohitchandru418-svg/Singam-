import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";

/**
 * Liveness/readiness probe for a hosting platform (Fly, Railway, Render, a load balancer).
 *
 * It opens the database so the probe fails when the SQLite file cannot be reached, which is
 * the one dependency a platform restart can break (a missing or read-only volume).
 */
export const dynamic = "force-dynamic";

export function GET(): NextResponse {
  try {
    const db = getDb();
    const row = db.prepare("SELECT COUNT(*) AS n FROM seasons").get() as { n: number } | undefined;
    return NextResponse.json({ status: "ok", seasons: row?.n ?? 0 });
  } catch (error) {
    return NextResponse.json(
      { status: "degraded", error: error instanceof Error ? error.message : "database unavailable" },
      { status: 503 },
    );
  }
}
