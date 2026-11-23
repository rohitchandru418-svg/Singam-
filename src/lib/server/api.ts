import { NextResponse } from "next/server";
import { HttpError } from "./session";

export function ok<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json({ ok: true, data }, init);
}

export function fail(error: unknown, context?: string): NextResponse {
  const prefix = context ? `${context}: ` : "";
  if (error instanceof HttpError) {
    return NextResponse.json({ ok: false, error: `${prefix}${error.message}`, status: error.status }, { status: error.status });
  }
  const message = error instanceof Error ? error.message : "Unexpected error";
  return NextResponse.json({ ok: false, error: `${prefix}${message}`, status: 500 }, { status: 500 });
}

export async function readBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const text = await request.text();
    if (!text) return {};
    const parsed = JSON.parse(text) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return {};
  } catch {
    throw new HttpError(400, "Request body must be valid JSON");
  }
}

export function queryFilters(url: URL, reserved: string[]): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  url.searchParams.forEach((value, key) => {
    if (reserved.includes(key)) return;
    out[key] = value;
  });
  return out;
}

export const RESERVED_QUERY = ["search", "limit", "offset", "sort", "direction", "actor", "module"];
