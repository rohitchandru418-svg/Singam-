/**
 * Authentication configuration.
 *
 * The app has one real sign-in: an email address or mobile number and a one-time code. Two
 * affordances exist only to make local development and automated testing possible, and both
 * are off in production:
 *
 *   - `devCode` returns the generated code to the caller instead of delivering it, because a
 *     development machine has no mail or SMS gateway. In production the code is delivered and
 *     never returned.
 *   - the `x-actor` header selects the acting user without a session, so the end-to-end suite
 *     can drive every department through the HTTP API. In production every request must carry
 *     a real session token.
 *
 * Both default to on outside production and off inside it. Set `SINGAM_AUTH_DEV=0` to force
 * them off in a non-production environment, or `SINGAM_AUTH_DEV=1` to force them on.
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

export function authDevMode(): boolean {
  const flag = process.env.SINGAM_AUTH_DEV;
  if (flag === "0") return false;
  if (flag === "1") return true;
  return !isProduction();
}
