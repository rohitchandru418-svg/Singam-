"use client";

import type { StartupBoardRow } from "@/lib/server/metrics";

/**
 * Browser API client.
 *
 * The acting user travels in the `x-actor` header so role restrictions are exercised the
 * same way they would be after a real login.
 */

export interface ApiEnvelope<T> {
  ok: boolean;
  data: T;
  error?: string;
  status?: number;
}

/** Error thrown by the API client, carrying the HTTP status so callers can react to it. */
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

let currentActor = "U-MGMT";
let currentSeason = "";

/**
 * The browser holds the session in an httpOnly cookie, so the token is never in JavaScript.
 * A copy is kept in memory for the one request that has to send it explicitly; it is cleared
 * on sign-out. `hasSession` only records whether the browser believes it is signed in.
 */
let sessionToken: string | null = null;
const SESSION_FLAG = "singam.session";

export function setSessionToken(token: string | null): void {
  sessionToken = token;
  if (typeof window !== "undefined") {
    if (token) window.localStorage.setItem(SESSION_FLAG, "1");
    else window.localStorage.removeItem(SESSION_FLAG);
  }
}

export function getSessionToken(): string | null {
  return sessionToken;
}

export function hasSessionFlag(): boolean {
  if (typeof window !== "undefined") return window.localStorage.getItem(SESSION_FLAG) === "1";
  return false;
}

export function setActor(id: string): void {
  currentActor = id;
  if (typeof window !== "undefined") window.localStorage.setItem("singam.actor", id);
}

export function getActor(): string {
  if (typeof window !== "undefined") {
    const stored = window.localStorage.getItem("singam.actor");
    if (stored) return stored;
  }
  return currentActor;
}

/** The season every request is scoped to. Empty until the session resolves. */
export function setSeason(id: string): void {
  currentSeason = id;
  if (typeof window !== "undefined") window.localStorage.setItem("singam.season", id);
}

export function getSeason(): string {
  if (typeof window !== "undefined") {
    const stored = window.localStorage.getItem("singam.season");
    if (stored) return stored;
  }
  return currentSeason;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const doFetch = () =>
    fetch(path, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        "x-actor": getActor(),
        ...(getSeason() ? { "x-season": getSeason() } : {}),
        ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
      credentials: "same-origin",
    });

  const read = async (response: Response) => {
    const text = await response.text();
    let payload: ApiEnvelope<T> | null = null;
    if (text) {
      try {
        payload = JSON.parse(text) as ApiEnvelope<T>;
      } catch {
        payload = null;
      }
    }
    return { payload, status: response.status };
  };

  // A 5xx with no JSON envelope is a framework-level failure, not a handler result: it happens
  // when the dev server is still compiling the route and the request lands mid-recompile, and
  // the handler was never reached, so nothing was written and it is safe to retry once. A real
  // action failure always carries the JSON envelope from `fail()`, so it is never retried.
  let { payload, status } = await read(await doFetch());
  if (!payload && status >= 500) {
    await new Promise((r) => setTimeout(r, 700));
    ({ payload, status } = await read(await doFetch()));
  }

  if (!payload) {
    throw new ApiError(`Request to ${path} failed with status ${status}`, status);
  }
  if (!payload.ok) throw new ApiError(payload.error ?? `Request failed with status ${status}`, status);
  return payload.data;
}

export interface ListResponse {
  entity: string;
  label: string;
  singular?: string;
  season?: string;
  total: number;
  limit: number;
  offset: number;
  items: Record<string, unknown>[];
}

export function apiList(
  entity: string,
  options: { search?: string; filters?: Record<string, string>; limit?: number; offset?: number; sort?: string; direction?: string } = {},
): Promise<ListResponse> {
  const params = new URLSearchParams();
  if (options.search) params.set("search", options.search);
  if (options.limit) params.set("limit", String(options.limit));
  if (options.offset) params.set("offset", String(options.offset));
  if (options.sort) params.set("sort", options.sort);
  if (options.direction) params.set("direction", options.direction);
  for (const [k, v] of Object.entries(options.filters ?? {})) if (v !== "" && v !== undefined) params.set(k, v);
  return request<ListResponse>(`/api/v1/${entity}?${params.toString()}`);
}

export interface DetailResponse {
  entity: string;
  label: string;
  record: Record<string, unknown>;
  related: Record<string, Record<string, unknown>[]>;
  /** Startup-journey stages the record's startup has reached, resolved server-side. */
  stageKeys?: string[];
}

export function apiGet(entity: string, id: string): Promise<DetailResponse> {
  return request<DetailResponse>(`/api/v1/${entity}/${id}`);
}

export function apiCreate(entity: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  return request(`/api/v1/${entity}`, { method: "POST", body: JSON.stringify(body) });
}

export function apiUpdate(entity: string, id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  return request(`/api/v1/${entity}/${id}`, { method: "PATCH", body: JSON.stringify(body) });
}

export function apiDelete(entity: string, id: string): Promise<{ deleted: string }> {
  return request(`/api/v1/${entity}/${id}`, { method: "DELETE" });
}

export interface ActionResult {
  ok?: boolean;
  message?: string;
  data?: unknown;
}

export function apiAction(action: string, payload: Record<string, unknown> = {}): Promise<ActionResult> {
  return request<ActionResult>("/api/v1/actions", {
    method: "POST",
    body: JSON.stringify({ action, payload }),
  });
}

/** A sign-in persona, as returned by the session endpoint. */
export interface PersonaOption {
  key: string;
  label: string;
  blurb: string;
  audience: "external" | "internal";
  role: string;
  userId: string;
  href: string;
  portal?: "founder" | "investor";
}

export interface SessionResponse {
  actor: { id: string; name: string; role: string; department: string; kind?: string; startupId?: string | null };
  canWrite: boolean;
  /** True when the request carried a real session, false for the anonymous or header fallback. */
  authenticated: boolean;
  /** True when the acting-user switcher and local identity picker are available (never in production). */
  devMode: boolean;
  identifiers?: { channel: "email" | "phone"; display: string }[];
  users: { id: string; name: string; role: string; department: string; roleLabel: string; kind?: string; startupId?: string | null }[];
  /** The sign-in personas, offered only where the switcher is available. */
  personas?: PersonaOption[];
  roles: { key: string; label: string; department: string; modules: string[]; external?: boolean }[];
  departments: { key: string; label: string; short: string; description: string; colour: string }[];
  seasons: { id: string; code: string; name: string; status: string; starts_on: string; ends_on: string }[];
  currentSeasonId: string;
  notifications: Record<string, unknown>[];
}

export function apiSession(): Promise<SessionResponse> {
  return request<SessionResponse>("/api/v1/session");
}

/* ------------------------------------------------------------------ */
/* Sign-in                                                             */
/* ------------------------------------------------------------------ */

export interface OtpRequest {
  channel: "email" | "phone";
  destination: string;
  expiresAt: string;
  known: boolean;
  /** Present only where no mail or SMS gateway is connected, so a reviewer can sign in. */
  devCode?: string;
}

export function apiRequestOtp(identifier: string): Promise<OtpRequest> {
  return request<OtpRequest>("/api/v1/auth/request-otp", {
    method: "POST",
    body: JSON.stringify({ identifier }),
  });
}

export interface VerifyResult {
  actor: SessionResponse["actor"];
  created: boolean;
  startupId: string | null;
  expiresAt: string;
  token: string;
}

export async function apiVerifyOtp(identifier: string, code: string): Promise<VerifyResult> {
  const result = await request<VerifyResult>("/api/v1/auth/verify", {
    method: "POST",
    body: JSON.stringify({ identifier, code }),
  });
  setSessionToken(result.token);
  return result;
}

export function apiLogout(): Promise<{ revoked: boolean }> {
  return request<{ revoked: boolean }>("/api/v1/auth/logout", { method: "POST" }).finally(() => setSessionToken(null));
}

export interface AuthMe {
  actor: SessionResponse["actor"];
  canWrite: boolean;
  authenticated: boolean;
  seasonId: string;
  identifiers: { channel: "email" | "phone"; display: string }[];
}

export function apiAuthMe(): Promise<AuthMe> {
  return request<AuthMe>("/api/v1/auth/me");
}

/**
 * Development and test only: re-issue the current session as another account.
 *
 * The acting-user switcher needs this once a real session cookie is set, because the server
 * trusts the cookie and ignores the `x-actor` header. The route is refused in production, so
 * the switcher itself never appears there.
 */
export async function apiDevSwitch(userId: string): Promise<{ token: string }> {
  const result = await request<{ token: string }>("/api/v1/auth/dev-switch", {
    method: "POST",
    body: JSON.stringify({ userId }),
  });
  setSessionToken(result.token);
  return result;
}

/* ------------------------------------------------------------------ */
/* Startup side                                                        */
/* ------------------------------------------------------------------ */

export type FounderStageStatus = "completed" | "in_progress" | "action_required" | "upcoming" | "on_hold" | "not_selected";

export type FounderStageTrack = "sequential" | "parallel_content" | "parallel_money" | "ongoing";

export interface FounderStageView {
  key: string;
  order: number;
  label: string;
  status: FounderStageStatus;
  track: FounderStageTrack;
  mapsFrom: string[];
  owner: string;
  needsYou: boolean;
  content: {
    title: string;
    summary: string;
    whatThisMeans: string;
    latestUpdate: string;
    deadline?: string;
    nextStep?: string;
  };
}

export interface FounderMessage {
  id: string;
  stage_key: string;
  author_side: "founder" | "team";
  author_name: string;
  body: string;
  attachment_document_id: string | null;
  created_at: string;
}

export interface FounderDocumentRequest {
  id: string;
  stage_key: string;
  purpose: string;
  title: string;
  instructions: string;
  mandatory: number;
  accepted_formats: string;
  max_size_mb: number;
  status: string;
  document_id: string | null;
  clarification: string;
  submitted_on: string | null;
  verified_on: string | null;
}

export interface FounderPitchDayOption {
  id: string;
  option_date: string;
  slot_note: string;
  slot_time: string;
  status: string;
  founder_available: number;
  approval: string;
  review_note: string;
  investor_name: string;
  investor_category: string;
}

export interface FounderVirtualPitch {
  id: string;
  scheduledAt: string;
  attended: number;
  missed: number;
  meetLink: string;
  response: string;
  materialShared: string;
  pitchMin: number;
  qaMin: number;
}

export interface FounderPaymentProof {
  id: string;
  fee_id: string;
  amount: number;
  reference: string;
  note: string;
  file_ref: string;
  status: string;
  reviewed_on: string | null;
  review_note: string;
  created_at: string;
}

export interface FounderAgreement {
  id: string;
  status: string;
  shared_on: string;
  signing_deadline: string;
  legal_ama_on: string | null;
  signed_on: string | null;
  commercial_schedule: string;
  approved_exceptions: string;
  response: string;
  document: { id: string; title: string; file_ref: string; uploaded_on: string } | null;
}

export interface StartupSideData {
  /** Null until a brand-new founder names their business in the onboarding step. */
  startup: Record<string, unknown> | null;
  founders: Record<string, unknown>[];
  profile: {
    percent: number;
    complete: number;
    total: number;
    missing: string[];
    missingSections: string[];
    sections: { name: string; complete: number; total: number }[];
  };
  eligibility: { ok: boolean; blocking: string[]; advisories: string[] };
  applications: {
    id: string; reference_no: string; season_id: string | null; season_code: string | null;
    season_name: string | null; program_id: string | null; status: string; stage_at_application: string;
    completion_pct: number; submitted_at: string | null; acknowledged_at: string | null; linked_to: string | null; notes: string;
  }[];
  currentApplicationId: string | null;
  /** The live season the founder is viewing; `currentApplicationId` only ever points into it. */
  currentSeasonId: string;
  currentSeasonName: string;
  documents: Record<string, unknown>[];
  documentRequests: FounderDocumentRequest[];
  messages: FounderMessage[];
  pitchDayOptions: FounderPitchDayOption[];
  paymentProofs: FounderPaymentProof[];
  agreement: FounderAgreement | null;
  bootcamp: {
    status: string; invitedOn: string; attendedOn: string | null; sessionDates: string; meetLink: string;
    preparationCompleted: number; acknowledgement: string; acknowledgedOn: string | null;
  } | null;
  virtualPitch: {
    id: string; scheduledAt: string; attended: number; missed: number;
    rescheduleReason: string; meetLink: string; response: string;
  } | null;
  virtualPitches: FounderVirtualPitch[];
  supportRequests: Record<string, unknown>[];
  tasks: Record<string, unknown>[];
  notices: Record<string, unknown>[];
  history: { date: string; title: string; detail: string; tone: "ok" | "info" | "warn" | "risk" }[];
  programs: {
    id: string; title: string; status: string; opens_on: string; closes_on: string;
    description: string; eligibility: string; season: string; applied: boolean;
  }[];
  journey: {
    stages: FounderStageView[];
    currentKey: string | null;
    currentLabel: string;
    completedCount: number;
  };
  finance: {
    fee: Record<string, unknown> | null;
    committed: number;
    committedCount: number;
    deployed: number;
    successFee: {
      id: string;
      status: string;
      invoiceNo: string;
      feeDue: number;
      collected: number;
      outstanding: number;
      dueDate: string | null;
      base: number;
      ratePercent: number;
      structure: string;
      cap: number;
      invoiced: number;
    } | null;
  };
  shoot: {
    av_id: string | null;
    av_status: string | null;
    av_scheduled_on: string | null;
    av_location: string;
    av_availability: string;
    mock_scheduled_on: string | null;
    main_scheduled_on: string | null;
    main_status: string | null;
  };
  mock: {
    status: string;
    scheduledOn: string | null;
    productDemoReady: number;
    stageMovementRehearsed: number;
    finalReadinessApprovedOn: string | null;
  } | null;
  telecast: {
    episodeNo: string;
    telecastDate: string | null;
    status: string;
    promoAssetsApproved: number;
    founderPostingDone: number;
    promoRequirements?: string;
    promoPosts?: string;
    announcementWording?: string;
    publicAnnouncement?: string;
    founderFeedback?: string;
  } | null;
  episodeNo: string;
  investment: {
    hasCommitment: boolean;
    committed: number;
    committedCount: number;
    deployed: number;
    trancheCount: number;
    verifiedTranches: number;
    dealStatus: string | null;
    agreementPending: boolean;
  };
  dealsPerInvestor: FounderDeal[];
  fundingPerDeal: FounderFundingDeal[];
  meta: { needsFinancials: boolean };
}

export interface FounderDeal {
  id: string;
  investorName: string;
  investorCategory: string;
  status: string;
  committed: number;
  valuation: string;
  milestones: { label: string; date: string }[];
  openDocuments: string;
  openConditions: string;
  withdrawalReason: string;
  replacementName: string;
  documents: { purpose: string; type: string; status: string; receivedOn: string | null; signedOn: string | null }[];
}

export interface FounderFundingDeal {
  dealId: string;
  investorName: string;
  committed: number;
  received: number;
  pending: number;
  tranches: {
    id: string;
    seq: number;
    scheduledAmount: number;
    scheduledOn: string | null;
    reportedAmount: number;
    reportedOn: string | null;
    startupConfirmedOn: string | null;
    verifiedAmount: number;
    verifiedOn: string | null;
    status: string;
    reversalReason: string;
  }[];
}

export function apiStartupSide(): Promise<StartupSideData> {
  return request<StartupSideData>("/api/v1/startup-side");
}

export interface UploadResult {
  file_ref: string;
  url: string;
  name: string;
  size: number;
  mime: string;
}

/**
 * Upload a file with real multipart progress.
 *
 * `XMLHttpRequest` is used rather than `fetch` so the form can show genuine progress: fetch
 * has no upload-progress event. The auth headers match the JSON client so the same session
 * applies.
 */
export function apiUploadFile(file: File, extra: Record<string, string> = {}): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("file", file);
    for (const [key, value] of Object.entries(extra)) form.append(key, value);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/v1/founder-upload");
    xhr.setRequestHeader("x-actor", getActor());
    if (getSeason()) xhr.setRequestHeader("x-season", getSeason());
    if (sessionToken) xhr.setRequestHeader("Authorization", `Bearer ${sessionToken}`);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) progressHandler?.(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      try {
        const payload = JSON.parse(xhr.responseText) as ApiEnvelope<UploadResult>;
        if (!payload.ok) reject(new ApiError(payload.error ?? "Upload failed", xhr.status));
        else resolve(payload.data);
      } catch {
        reject(new ApiError("Upload failed", xhr.status));
      }
    };
    xhr.onerror = () => reject(new ApiError("Upload failed. Check your connection.", 0));
    xhr.send(form);
  });
}

/** Set for the duration of one upload so `apiUploadFile` can report progress. */
let progressHandler: ((percent: number) => void) | null = null;
export function onUploadProgress(handler: ((percent: number) => void) | null): void {
  progressHandler = handler;
}

/* ------------------------------------------------------------------ */
/* Investor side                                                       */
/* ------------------------------------------------------------------ */

export interface InvestorSideOpportunity {
  matchId: string;
  startupId: string;
  startupName: string;
  sector: string;
  stage: string;
  geography: string;
  pitch: string;
  targetFundraise: number;
  logo: string;
  status: string;
  /** The pairing match percentage shown on the match card; the pairing score, not the grade. */
  matchPct: number;
  information_shared: string;
  info_version: string;
  shared_on: string | null;
  response: string;
  questions: string;
  documents_requested: string;
  indicative_amount: number;
  next_action: string;
  next_action_due: string | null;
  meetings: {
    id: string;
    meeting_type: string;
    scheduled_at: string;
    held_at: string | null;
    minutes: string;
    minutes_acknowledged: number;
  }[];
}

export interface InvestorSideData {
  investor: Record<string, unknown> | null;
  agreements: Record<string, unknown>[];
  opportunities: InvestorSideOpportunity[];
  pitches: Record<string, unknown>[];
  pitchDaySlots: Record<string, unknown>[];
  commitments: Record<string, unknown>[];
  deals: Record<string, unknown>[];
  documents: Record<string, unknown>[];
  tasks: Record<string, unknown>[];
  notices: Record<string, unknown>[];
  journey: {
    steps: { key: string; label: string; status: "done" | "current" | "pending"; detail: string; owner: string }[];
    currentKey: string | null;
    currentLabel: string;
  };
  summary: {
    verified: boolean;
    onboarded: boolean;
    allocation: number;
    maxPerStartup: number;
    commitmentConfirmed: boolean;
    committed: number;
    committedCount: number;
    deployed: number;
    available: number;
    openOpportunities: number;
  };
}

export function apiInvestorSide(): Promise<InvestorSideData> {
  return request<InvestorSideData>("/api/v1/investor-side");
}

/**
 * Record that the investor opened a startup's Investment Readiness Report.
 *
 * The report itself is served as part of `InvestorSideData`; this call only writes the view
 * log the console reads, so it is safe to fire-and-forget.
 */
export function apiInvestorIrrView(matchId: string): Promise<{ viewedAt: string; version: number }> {
  return request<{ viewedAt: string; version: number }>("/api/v1/investor-side", {
    method: "POST",
    body: JSON.stringify({ matchId }),
  });
}

/** One startup's line on the progress board; every status is tracked separately. */
export type BoardRow = StartupBoardRow;

export interface DashboardResponse {
  season?: string;
  kpis: {
    applications: { total: number; submitted: number; inScreening: number; proceeded: number; rejected: number; conversionPct: number };
    stageBacklog: { stage: string; department: string; count: number; oldestDays: number }[];
    investors: { total: number; onboarded: number; verificationPending: number; agreementPending: number; gradeMix: Record<string, number> };
    matching: { suggested: number; approved: number; shared: number; advanced: number; passed: number; coveragePct: number };
    upfront: { due: number; collected: number; overdue: number; overdueCount: number };
    shoot: { paidAwaitingAv: number; avCompleted: number; mockReady: number; shootCompleted: number; telecastReady: number; telecastDone: number };
    commitments: { committed: number; signedDeals: number; deployed: number; outstanding: number; atRiskDeals: number };
    successFees: { due: number; invoiced: number; collected: number; overdue: number; overdueCount: number };
    community: { members: number; events: number; registrations: number; attendance: number; qualifiedReferrals: number; convertedReferrals: number; supportOpen: number; supportResolved: number; referralFunding: number };
    overdueByDepartment: { department: string; count: number }[];
    exceptions: {
      id: string;
      title: string;
      department: string;
      severity: string;
      detail: string;
      entityType: string;
      entityId: string;
      entityLabel: string;
      ageDays: number;
      count: number;
    }[];
  };
  departments: (Record<string, unknown> & { key: string; label: string; short: string; description: string; metrics: Record<string, number> })[];
  board: BoardRow[];
}

export function apiDashboard(): Promise<DashboardResponse> {
  return request<DashboardResponse>("/api/v1/dashboard");
}

export function apiBoard(startupId?: string): Promise<BoardRow[] | BoardRow> {
  const suffix = startupId ? `?startup_id=${startupId}` : "";
  return request(`/api/v1/startup-board${suffix}`);
}

export interface JourneyStageView {
  key: string;
  label: string;
  journey: string;
  order: number;
  department: string;
  ownerRole: string;
  deadline?: { workingDays: number; fromEvent: string };
  requiredOutput: string;
  evidence: string;
  approverRole?: string;
  requiredDocuments?: string[];
  escalation?: string;
  statusRegistry?: string;
  module?: string;
  notes?: string;
  route: string | null;
  openCount: number;
  oldestDays: number;
  openStatusLabels: string[];
  statuses: { value: string; label: string; tone: string; terminal?: boolean }[];
  backlogLabel: string | null;
}

export interface JourneyView {
  key: string;
  label: string;
  description: string;
  department: string;
  stageCount: number;
  openCount: number;
  stages: JourneyStageView[];
}

export function apiJourneys(): Promise<{ season: string; journeys: JourneyView[] }> {
  return request<{ season: string; journeys: JourneyView[] }>("/api/v1/journeys");
}

export type FieldKind = "text" | "textarea" | "number" | "money" | "date" | "boolean" | "select" | "relation";

export interface FieldMeta {
  name: string;
  label: string;
  kind: FieldKind;
  required: boolean;
  options?: { value: string; label: string }[];
  relation?: { entity: string; label: string };
  hint?: string;
  system?: boolean;
}

export interface FieldsResponse {
  entity: string;
  label: string;
  plural: string;
  fields: FieldMeta[];
}

export function apiFields(entity: string): Promise<FieldsResponse> {
  return request<FieldsResponse>(`/api/v1/fields/${entity}`);
}

/** The display label for a row: its own name, or its reference number, or its id. */
export function rowLabel(row: Record<string, unknown>): string {
  const candidate = row.name ?? row.title ?? row.code ?? row.reference_no ?? row.invoice_no;
  if (candidate !== undefined && candidate !== null && candidate !== "") return String(candidate);
  // Records without a name of their own (a match, a tranche, an upfront fee) are labelled by
  // the related records the API already resolves, so a picker shows a person or a startup
  // rather than a bare id.
  const related = Object.entries(row)
    .filter(([key, value]) => key.endsWith("_label") && value !== null && value !== undefined && value !== "")
    .map(([, value]) => String(value));
  if (related.length > 0) return related.slice(0, 2).join(" \u00b7 ");
  return String(row.id);
}

/** A list of an entity reduced to `{ value, label }` pairs, for a picker that shows names. */
export async function apiOptions(entity: string, label?: string): Promise<{ value: string; label: string }[]> {
  const res = await apiList(entity, { limit: 500, sort: label });
  return res.items.map((row) => ({ value: String(row.id), label: rowLabel(row) }));
}

export interface MetaResponse {
  entities: { key: string; label: string; plural: string; module: string; status?: { column: string; registry: string }; searchable: string[]; relations?: { column: string; entity: string; label: string }[] }[];
  statuses: Record<string, Record<string, { value: string; label: string; tone: string; terminal?: boolean }>>;
  journeys: { key: string; label: string; description: string; department: string }[];
  stages: {
    key: string; label: string; journey: string; order: number; department: string; ownerRole: string;
    deadline?: { workingDays: number; fromEvent: string };
    requiredOutput: string; evidence: string; approverRole?: string; requiredDocuments?: string[];
    escalation?: string; statusRegistry?: string; module?: string; notes?: string;
  }[];
  departments: { key: string; label: string; short: string; description: string; colour: string }[];
  modules: string[];
  roles: { key: string; label: string; department: string; modules: string[] }[];
  fieldRestrictions: Record<string, string[]>;
  screening: { criteria: { key: string; label: string; max: number; hint: string; canBeNotApplicable: boolean }[]; max: number; defaultRule: Record<string, unknown>; effectiveRule?: Record<string, unknown> };
  policies: { code: string; title: string; category: string; question: string; valueSchema: string; defaultValue: Record<string, unknown> }[];
  documentPurposes: { key: string; label: string; stageKey: string; audience: string[]; confidential: boolean }[];
}

export function apiMeta(): Promise<MetaResponse> {
  return request<MetaResponse>("/api/v1/meta");
}

export interface ActionCatalogResponse {
  role: string;
  canWrite: boolean;
  total: number;
  catalog: { name: string; group: string; label: string; description: string; roles: string[] }[];
  allowed: string[];
}

export function apiActionCatalog(): Promise<ActionCatalogResponse> {
  return request<ActionCatalogResponse>("/api/v1/actions");
}

export interface SearchResponse {
  query: string;
  total?: number;
  results: { entity: string; entityLabel: string; id: string; title: string; subtitle: string }[];
}

export function apiSearch(q: string): Promise<SearchResponse> {
  return request<SearchResponse>(`/api/v1/search?q=${encodeURIComponent(q)}`);
}
