"use client";

import { Button, EmptyState } from "../ui";
import { Icon } from "../icons";
import type { StartupSideData } from "@/lib/client/api";
import { humanDateTime } from "./shared";

/**
 * The founder's notices: what the team has told them, in one place. Opening this tab clears
 * the unread flag, the same as the bell in the header.
 */
export function NoticesPanel({
  data,
  onAction,
}: {
  data: StartupSideData;
  onAction: (a: string, p: Record<string, unknown>, d: string) => Promise<boolean>;
}) {
  const notices = data.notices;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-hair bg-canvas px-4 py-3 shadow-card">
        <div>
          <h2 className="text-[15px] font-semibold text-ink">Notices</h2>
          <p className="mt-0.5 text-[12.5px] text-ink-soft">Messages the Startup Singam team has sent you.</p>
        </div>
        {notices.length > 0 ? (
          <Button variant="secondary" size="sm" onClick={() => void onAction("founder_side.read_notices", {}, "Notices cleared")}>
            Mark all as read
          </Button>
        ) : null}
      </div>

      {notices.length === 0 ? (
        <EmptyState title="Nothing new" hint="When the team needs something from you, or has an update, it appears here." />
      ) : (
        <ul className="space-y-2.5">
          {notices.map((n) => (
            <li key={String(n.id)} className="rounded-xl border border-hair bg-canvas p-3.5 shadow-card">
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-soft text-brand-ink">
                  <Icon name="bell" className="h-[14px] w-[14px]" />
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-ink">{String(n.title)}</p>
                  {n.body ? <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-soft">{String(n.body)}</p> : null}
                  <p className="mt-1 text-[11px] text-faint">{humanDateTime(String(n.created_at))}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
