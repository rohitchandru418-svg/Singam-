import { NextResponse } from "next/server";
import { fail } from "@/lib/server/api";
import { revokeSession } from "@/lib/server/auth";
import { SESSION_COOKIE, tokenFromRequest } from "@/lib/server/session";

export const dynamic = "force-dynamic";

/** Sign out: revoke the session server-side, then clear the cookie. */
export async function POST(request: Request) {
  try {
    const token = tokenFromRequest(request);
    const revoked = token ? revokeSession(token) : false;
    const response = NextResponse.json({ ok: true, data: { revoked } });
    response.cookies.set({ name: SESSION_COOKIE, value: "", httpOnly: true, path: "/", maxAge: 0 });
    return response;
  } catch (error) {
    return fail(error);
  }
}
