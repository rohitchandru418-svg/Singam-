import { fail, ok, readBody } from "@/lib/server/api";
import { AuthError, requestOtp } from "@/lib/server/auth";
import { HttpError } from "@/lib/server/session";

export const dynamic = "force-dynamic";

/**
 * Step one of sign-in: send a one-time code to an email address or a mobile number.
 *
 * The reply never says whether an account exists for the identifier, so this endpoint
 * cannot be used to work out who has an account. The `known` flag reports only that, and is
 * not used to decide whether sign-in proceeds.
 */
export async function POST(request: Request) {
  try {
    const body = await readBody(request);
    const identifier = String(body.identifier ?? body.email ?? body.phone ?? "");
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
    const userAgent = request.headers.get("user-agent") ?? "";
    const result = requestOtp(identifier, { ip, userAgent });
    return ok(result);
  } catch (error) {
    if (error instanceof AuthError) return fail(new HttpError(error.status, error.message));
    return fail(error);
  }
}
