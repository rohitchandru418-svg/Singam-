import { NextResponse } from "next/server";
import { fail, ok, readBody } from "@/lib/server/api";
import { AuthError, verifyOtp } from "@/lib/server/auth";
import { HttpError, SESSION_COOKIE } from "@/lib/server/session";

export const dynamic = "force-dynamic";

/**
 * Step two of sign-in: check the code and open a session.
 *
 * The token is handed back in the body and set as an httpOnly cookie. The cookie is what the
 * browser uses, so the token is not reachable from JavaScript; the body copy is there for
 * scripts and for an API client.
 */
export async function POST(request: Request) {
  try {
    const body = await readBody(request);
    const identifier = String(body.identifier ?? body.email ?? body.phone ?? "");
    const code = String(body.code ?? body.otp ?? "");
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
    const userAgent = request.headers.get("user-agent") ?? "";

    const result = verifyOtp(identifier, code, { ip, userAgent });

    const response = NextResponse.json({
      ok: true,
      data: {
        actor: result.actor,
        created: result.created,
        startupId: result.startupId,
        expiresAt: result.expiresAt,
        token: result.token,
      },
    });
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
    if (error instanceof AuthError) return fail(new HttpError(error.status, error.message));
    return fail(error);
  }
}

export async function GET() {
  return ok({ message: "POST an identifier and a code to sign in." });
}
