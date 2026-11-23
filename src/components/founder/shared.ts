import type { FounderStageStatus, FounderStageTrack } from "@/lib/client/api";

/** Shared helpers for the founder portal screens. */

export const str = (row: Record<string, unknown> | null | undefined, key: string): string =>
  row && row[key] !== null && row[key] !== undefined ? String(row[key]) : "";

export const num = (row: Record<string, unknown> | null | undefined, key: string): number =>
  row && row[key] !== null && row[key] !== undefined ? Number(row[key]) : 0;

/** "12 Nov 2026" from an ISO date or timestamp. */
export function humanDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const datePart = iso.split("T")[0];
  const [y, m, d] = datePart.split("-").map(Number);
  if (!y || !m || !d) return "";
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d} ${months[m - 1]} ${y}`;
}

export function humanDateTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = humanDate(iso);
  const time = iso.includes("T") ? iso.split("T")[1]?.slice(0, 5) : "";
  return time ? `${date}, ${time}` : date;
}

export const STAGE_TONE: Record<FounderStageStatus, { dot: string; ring: string; text: string; label: string; chip: string }> = {
  completed: { dot: "bg-ok", ring: "ring-ok/30", text: "text-ok", label: "Completed", chip: "bg-ok-soft text-ok" },
  in_progress: { dot: "bg-brand", ring: "ring-brand/25", text: "text-brand-ink", label: "In progress", chip: "bg-brand-soft text-brand-ink" },
  action_required: { dot: "bg-warn", ring: "ring-warn/30", text: "text-warn", label: "Action required", chip: "bg-warn-soft text-warn" },
  upcoming: { dot: "bg-hair-strong", ring: "ring-hair", text: "text-faint", label: "Upcoming", chip: "bg-hover text-faint" },
  on_hold: { dot: "bg-warn", ring: "ring-warn/30", text: "text-warn", label: "On hold", chip: "bg-warn-soft text-warn" },
  not_selected: { dot: "bg-risk", ring: "ring-risk/30", text: "text-risk", label: "Not selected", chip: "bg-risk-soft text-risk" },
};

/** The track labels, matching the founder journey sheet. */
export const TRACK_LABEL: Record<FounderStageTrack, string> = {
  sequential: "Sequential",
  parallel_content: "Parallel – content",
  parallel_money: "Parallel – money",
  ongoing: "Ongoing",
};

export const DOC_STATUS: Record<string, { label: string; chip: string }> = {
  not_uploaded: { label: "Not uploaded", chip: "bg-hover text-faint" },
  uploaded: { label: "Uploaded", chip: "bg-brand-soft text-brand-ink" },
  under_verification: { label: "Under verification", chip: "bg-brand-soft text-brand-ink" },
  info_required: { label: "Clarification requested", chip: "bg-warn-soft text-warn" },
  resubmission_required: { label: "Resubmission required", chip: "bg-risk-soft text-risk" },
  verified: { label: "Verified", chip: "bg-ok-soft text-ok" },
};

export const PROOF_STATUS: Record<string, { label: string; chip: string }> = {
  submitted: { label: "Awaiting verification", chip: "bg-brand-soft text-brand-ink" },
  verified: { label: "Verified", chip: "bg-ok-soft text-ok" },
  rejected: { label: "Needs attention", chip: "bg-risk-soft text-risk" },
};
