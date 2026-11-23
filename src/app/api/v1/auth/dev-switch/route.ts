import { NextResponse } from "next/server";
import { fail, readBody } from "@/lib/server/api";
import { signInAs } from "@/lib/server/auth";
import { authDevMode } from "@/lib/server/auth-config";
import { HttpError, SESSION_COOKIE } from "@/lib/server/session";

export const dynamic = "force-dynamic";

/**
 * Re-issue the current session as another account.
 *
 * This backs the acting-user switcher, which lets a reviewer move between the internal roles
 * and the two external sides without a mail gateway. It hands out a session with no proof of
 * identity, so it is refused unless `authDevMode()` is on — which it is never in production.
 */
export async function POST(request: Request) {
  try {
    if (!authDevMode()) {
      throw new HttpError(403, "Switching the acting user is disabled in this environment");
    }
    const body = await readBody(request);
    const userId = String(body.userId ?? body.user_id ?? "");
    if (!userId) throw new HttpError(422, "field userId is required");

    const result = signInAs(userId, {
      ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "",
      userAgent: request.headers.get("user-agent") ?? "",
    });
    if (!result) throw new HttpError(404, "No active user with that id");

    const response = NextResponse.json({ ok: true, data: result });
    response.cookies.set({
      name: SESSION_COOKIE,
      value: result.token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });
    return response;
  } catch (error) {
    return fail(error);
  }
}
