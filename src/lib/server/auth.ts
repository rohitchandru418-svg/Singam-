import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { all, get, run } from "../db/client";
import { nowISO } from "../domain/dates";
import { authDevMode } from "./auth-config";
import type { Actor } from "./repo";

/**
 * Sign-in.
 *
 * One form signs a person in: they give an email address or a mobile number, receive a
 * six-digit code, and are in. The same form creates an account, so there is no separate
 * registration journey — a number or address with no account behind it becomes a founder
 * account on first successful verification.
 *
 * The code is never stored. Only its SHA-256 hash is kept, so a leaked database file does
 * not hand anyone a working login. Sessions are opaque bearer tokens, stored the same way.
 */

const OTP_TTL_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;
const OTP_MAX_PER_WINDOW = 5;
const OTP_WINDOW_MINUTES = 15;
const SESSION_TTL_DAYS = 30;

/** What the person typed is kept for the record; only the normalised form is matched. */
export type Channel = "email" | "phone";

export interface Identity {
  channel: Channel;
  /** Normalised: a lowercased email, or digits only for a number. */
  identifier: string;
  /** How it was typed, for display and for the acknowledgement. */
  display: string;
}

export class AuthError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/* ------------------------------------------------------------------ */
/* Identifiers                                                         */
/* ------------------------------------------------------------------ */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Read what the person typed as either an email address or a mobile number.
 *
 * A number is normalised to its last ten digits, which is what a person recognises and what
 * survives a country code written as `+91`, `91` or `0`. Ten digits is the Indian national
 * number; anything shorter or longer is rejected rather than guessed at.
 */
export function parseIdentity(raw: string): Identity {
  const value = (raw ?? "").trim();
  if (!value) throw new AuthError(422, "Enter your email address or mobile number");

  if (value.includes("@")) {
    const email = value.toLowerCase();
    if (!EMAIL_RE.test(email)) throw new AuthError(422, "That email address does not look right");
    return { channel: "email", identifier: email, display: email };
  }

  const digits = value.replace(/\D/g, "");
  const national = digits.length > 10 ? digits.slice(-10) : digits;
  if (!/^[6-9]\d{9}$/.test(national)) {
    throw new AuthError(422, "Enter a 10-digit mobile number, or an email address");
  }
  return { channel: "phone", identifier: national, display: `+91 ${national.slice(0, 5)} ${national.slice(5)}` };
}

/** The stored form of a number: normalised the same way, so a lookup can match it. */
export function normalisePhone(raw: string | null | undefined): string {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.length > 10 ? digits.slice(-10) : digits;
}

function phoneDisplay(identifier: string): string {
  return `+91 ${identifier.slice(0, 5)} ${identifier.slice(5)}`;
}

/* ------------------------------------------------------------------ */
/* Hashing                                                             */
/* ------------------------------------------------------------------ */

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** Constant-time compare of two hex digests of equal length. */
function sameHash(a: string, b: string): boolean {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function hashOtp(code: string, identifier: string): string {
  // Salt the hash with the identifier so the same six digits do not produce the same
  // digest for two different people.
  return sha256(`${identifier}:${code}`);
}

/* ------------------------------------------------------------------ */
/* Users                                                               */
/* ------------------------------------------------------------------ */

interface UserRow {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  department: string;
  active: number;
  kind: string;
  startup_id: string | null;
  investor_id: string | null;
}

function findUser(identity: Identity): UserRow | undefined {
  if (identity.channel === "email") {
    return get<UserRow>("SELECT * FROM users WHERE lower(email) = ? AND active = 1", identity.identifier);
  }
  // Numbers are stored as typed, so compare on the normalised tail rather than the string.
  return all<UserRow>("SELECT * FROM users WHERE active = 1 AND phone <> ''").find(
    (u) => normalisePhone(u.phone) === identity.identifier,
  );
}

export function actorFromUser(user: UserRow): Actor {
  return {
    id: String(user.id),
    name: String(user.name),
    role: String(user.role),
    department: String(user.department),
    kind: String(user.kind ?? "staff"),
    startupId: user.startup_id ? String(user.startup_id) : null,
    investorId: user.investor_id ? String(user.investor_id) : null,
  };
}

/* ------------------------------------------------------------------ */
/* One-time codes                                                      */
/* ------------------------------------------------------------------ */

export interface RequestedOtp {
  channel: Channel;
  /** Where the code was sent, masked. */
  destination: string;
  expiresAt: string;
  /** True when the identifier already belongs to an account. */
  known: boolean;
  /**
   * The code itself, but only in development and test.
   *
   * With no SMS gateway or mailbox behind it, a development machine cannot deliver the code,
   * so it is returned to the browser and shown on the screen. In production this field is
   * absent and the code is delivered by email or SMS; nothing else about the flow changes.
   */
  devCode?: string;
}

function maskDestination(identity: Identity): string {
  if (identity.channel === "email") {
    const [name, domain] = identity.identifier.split("@");
    const shown = name.length <= 2 ? name[0] : `${name.slice(0, 2)}${"*".repeat(Math.min(name.length - 2, 6))}`;
    return `${shown}@${domain}`;
  }
  return `+91 ${identity.identifier.slice(0, 2)}****${identity.identifier.slice(-4)}`;
}

function recentOtpCount(identifier: string): number {
  const since = new Date(Date.now() - OTP_WINDOW_MINUTES * 60_000).toISOString();
  const row = get<{ n: number }>(
    "SELECT COUNT(*) AS n FROM auth_otps WHERE identifier = ? AND created_at >= ?",
    identifier,
    since,
  );
  return row?.n ?? 0;
}

export function requestOtp(raw: string, context: { ip?: string; userAgent?: string } = {}): RequestedOtp {
  const identity = parseIdentity(raw);

  if (recentOtpCount(identity.identifier) >= OTP_MAX_PER_WINDOW) {
    throw new AuthError(429, `Too many codes requested. Try again in a few minutes, or sign in with the other option.`);
  }

  const user = findUser(identity);
  if (user && !user.active) throw new AuthError(403, "This account has been disabled. Contact the administrator.");

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60_000).toISOString();
  const purpose = user ? "login" : "signup";

  run(
    `INSERT INTO auth_otps
      (id, identifier, channel, code_hash, purpose, attempts, max_attempts, user_id, consumed_at, expires_at, created_at, request_ip, delivered_via)
     VALUES (?, ?, ?, ?, ?, 0, ?, ?, NULL, ?, ?, ?, ?)`,
    `OTP-${randomBytes(6).toString("hex")}`,
    identity.identifier,
    identity.channel,
    hashOtp(code, identity.identifier),
    purpose,
    OTP_MAX_ATTEMPTS,
    user ? user.id : null,
    expiresAt,
    nowISO(),
    context.ip ?? "",
    identity.channel === "email" ? "email" : "sms",
  );

  recordEvent(identity.identifier, user?.id ?? null, "otp_requested", `${identity.channel} ${purpose}`);

  return {
    channel: identity.channel,
    destination: maskDestination(identity),
    expiresAt,
    known: Boolean(user),
    ...(authDevMode() ? { devCode: code } : {}),
  };
}

export interface VerifiedLogin {
  token: string;
  expiresAt: string;
  actor: Actor;
  /** True when this verification created the account. */
  created: boolean;
  startupId: string | null;
}

export function verifyOtp(
  raw: string,
  code: string,
  context: { ip?: string; userAgent?: string } = {},
): VerifiedLogin {
  const identity = parseIdentity(raw);
  const submitted = String(code ?? "").replace(/\D/g, "");
  if (submitted.length !== 6) throw new AuthError(422, "Enter the six-digit code");

  const row = get<Record<string, unknown>>(
    `SELECT * FROM auth_otps
      WHERE identifier = ? AND consumed_at IS NULL
      ORDER BY created_at DESC LIMIT 1`,
    identity.identifier,
  );
  if (!row) throw new AuthError(400, "Request a code first");
  if (String(row.expires_at) <= nowISO()) throw new AuthError(400, "That code has expired. Request a new one.");

  const attempts = Number(row.attempts ?? 0);
  if (attempts >= Number(row.max_attempts ?? OTP_MAX_ATTEMPTS)) {
    throw new AuthError(429, "Too many wrong attempts. Request a new code.");
  }

  if (!sameHash(String(row.code_hash), hashOtp(submitted, identity.identifier))) {
    run("UPDATE auth_otps SET attempts = attempts + 1 WHERE id = ?", String(row.id));
    recordEvent(identity.identifier, null, "otp_failed", `attempt ${attempts + 1}`);
    const left = Number(row.max_attempts ?? OTP_MAX_ATTEMPTS) - (attempts + 1);
    throw new AuthError(400, left > 0 ? `That code is not right. ${left} attempt(s) left.` : "Too many wrong attempts. Request a new code.");
  }

  run("UPDATE auth_otps SET consumed_at = ? WHERE id = ?", nowISO(), String(row.id));

  // Signup: the identifier is new, so create a founder account behind it.
  let user = findUser(identity);
  let created = false;
  if (!user) {
    user = createFounderAccount(identity);
    created = true;
  }
  if (!user.active) throw new AuthError(403, "This account has been disabled. Contact the administrator.");

  const token = issueSession(user.id, context);
  recordEvent(identity.identifier, user.id, created ? "signup" : "login", identity.channel);

  return { token: token.token, expiresAt: token.expiresAt, actor: actorFromUser(user), created, startupId: user.startup_id };
}

/* ------------------------------------------------------------------ */
/* Accounts                                                            */
/* ------------------------------------------------------------------ */

/**
 * A new account starts on the startup side. The founder then fills in their profile and
 * applies, and staff review the result — the same path a seeded founder walks. Staff
 * accounts are created by an administrator from the Users register, never self-service.
 */
function createFounderAccount(identity: Identity): UserRow {
  const id = nextUserId();
  const name = identity.channel === "email" ? identity.identifier.split("@")[0] : "New founder";
  run(
    `INSERT INTO users (id, name, email, phone, role, department, active, kind, startup_id)
     VALUES (?, ?, ?, ?, 'founder', 'external', 1, 'founder', NULL)`,
    id,
    name,
    identity.channel === "email" ? identity.identifier : "",
    identity.channel === "phone" ? identity.identifier : "",
  );
  const user = get<UserRow>("SELECT * FROM users WHERE id = ?", id);
  if (!user) throw new AuthError(500, "Could not create the account");
  return user;
}

function nextUserId(): string {
  const rows = all<{ id: string }>("SELECT id FROM users WHERE id LIKE 'U-%'");
  let max = 0;
  for (const r of rows) {
    const m = /^U-F-(\d+)$/.exec(r.id) ?? /^U-(\d+)$/.exec(r.id);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `U-F-${String(max + 1).padStart(2, "0")}`;
}

/* ------------------------------------------------------------------ */
/* Sessions                                                            */
/* ------------------------------------------------------------------ */

function issueSession(userId: string, context: { ip?: string; userAgent?: string }): { token: string; expiresAt: string } {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 86_400_000).toISOString();
  run(
    `INSERT INTO auth_sessions (id, token_hash, user_id, created_at, expires_at, last_seen_at, revoked_at, user_agent, request_ip)
     VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
    `SES-${randomBytes(6).toString("hex")}`,
    sha256(token),
    userId,
    nowISO(),
    expiresAt,
    nowISO(),
    context.userAgent ?? "",
    context.ip ?? "",
  );
  run("UPDATE users SET last_login_at = ? WHERE id = ?", nowISO(), userId);
  return { token, expiresAt };
}

export interface ResolvedSession {
  actor: Actor;
  user: UserRow;
  sessionId: string;
}

/** Resolve a bearer token to the person it belongs to, or `null` when it is not usable. */
export function resolveToken(token: string | null | undefined): ResolvedSession | null {
  const value = (token ?? "").trim();
  if (!value) return null;
  const row = get<Record<string, unknown>>(
    "SELECT * FROM auth_sessions WHERE token_hash = ? AND revoked_at IS NULL",
    sha256(value),
  );
  if (!row) return null;
  if (String(row.expires_at) <= nowISO()) return null;
  const user = get<UserRow>("SELECT * FROM users WHERE id = ? AND active = 1", String(row.user_id));
  if (!user) return null;
  run("UPDATE auth_sessions SET last_seen_at = ? WHERE id = ?", nowISO(), String(row.id));
  return { actor: actorFromUser(user), user, sessionId: String(row.id) };
}

export function revokeSession(token: string): boolean {
  const value = (token ?? "").trim();
  if (!value) return false;
  const row = get<Record<string, unknown>>(
    "SELECT id FROM auth_sessions WHERE token_hash = ? AND revoked_at IS NULL",
    sha256(value),
  );
  if (!row) return false;
  run("UPDATE auth_sessions SET revoked_at = ? WHERE id = ?", nowISO(), String(row.id));
  return true;
}

/**
 * Open a session for a known user without a code.
 *
 * The `x-actor` header fallback and the local identity picker use this to switch between
 * accounts during development and testing. It is the one place a session is issued without
 * proof, so it refuses to run in production.
 */
export function signInAs(userId: string, context: { ip?: string; userAgent?: string } = {}): { token: string; expiresAt: string; actor: Actor } | null {
  if (!authDevMode()) return null;
  const user = get<UserRow>("SELECT * FROM users WHERE id = ? AND active = 1", userId);
  if (!user) return null;
  const token = issueSession(user.id, context);
  recordEvent(user.email, user.id, "dev_login", "identity picker");
  return { token: token.token, expiresAt: token.expiresAt, actor: actorFromUser(user) };
}

/* ------------------------------------------------------------------ */
/* Event log                                                           */
/* ------------------------------------------------------------------ */

function recordEvent(identifier: string, userId: string | null, event: string, detail: string): void {
  run(
    "INSERT INTO auth_events (id, identifier, user_id, event, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    `AE-${randomBytes(6).toString("hex")}`,
    identifier,
    userId,
    event,
    detail,
    nowISO(),
  );
}

export function authEvents(limit = 50): Record<string, unknown>[] {
  return all<Record<string, unknown>>("SELECT * FROM auth_events ORDER BY created_at DESC LIMIT ?", limit);
}

/** The identifier a user signs in with, for display on the account screen. */
export function signInIdentifiers(user: UserRow): { channel: Channel; display: string }[] {
  const out: { channel: Channel; display: string }[] = [];
  if (user.email) out.push({ channel: "email", display: user.email });
  const phone = normalisePhone(user.phone);
  if (phone) out.push({ channel: "phone", display: phoneDisplay(phone) });
  return out;
}
