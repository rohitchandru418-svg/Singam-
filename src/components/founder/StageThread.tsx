"use client";

import { useState } from "react";
import { Button, Textarea } from "../ui";
import type { StartupSideData } from "@/lib/client/api";
import { humanDateTime } from "./shared";

/**
 * A stage thread: the founder and the team talking about one stage of the founder's journey.
 * A founder writes here; the team answers from the console. Internal-only notes never appear,
 * because only messages addressed to the founder are stored in this thread at all.
 */

export function StageThread({
  data,
  stageKey,
  onAction,
  compact,
}: {
  data: StartupSideData;
  stageKey: string;
  onAction: (a: string, p: Record<string, unknown>, d: string) => Promise<boolean>;
  compact?: boolean;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const messages = data.messages.filter((m) => m.stage_key === stageKey);

  const send = async () => {
    if (!text.trim()) return;
    setBusy(true);
    const ok = await onAction("founder_side.message_send", { stage_key: stageKey, body: text.trim() }, "Message sent");
    if (ok) setText("");
    setBusy(false);
  };

  return (
    <div className="rounded-xl border border-hair bg-canvas shadow-card">
      <div className="border-b border-hair px-3.5 py-2.5">
        <p className="text-[12.5px] font-semibold text-ink">Messages with the Startup Singam team</p>
        <p className="mt-0.5 text-[11.5px] text-faint">Ask a question or reply to the team about this stage.</p>
      </div>

      {messages.length === 0 ? (
        <p className="px-3.5 py-3 text-[12.5px] text-faint">No messages yet.</p>
      ) : (
        <ul className={`space-y-2.5 px-3.5 py-3 ${compact ? "max-h-56 overflow-y-auto" : ""}`}>
          {messages.map((m) => {
            const mine = m.author_side === "founder";
            return (
              <li key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-xl px-3 py-2 text-[12.5px] leading-relaxed ${mine ? "bg-brand text-white" : "bg-surface text-ink"}`}>
                  <p className={`mb-0.5 text-[10.5px] font-medium ${mine ? "text-white/75" : "text-faint"}`}>
                    {m.author_name || (mine ? "You" : "Team")} · {humanDateTime(m.created_at)}
                  </p>
                  <p className="whitespace-pre-wrap">{m.body}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="border-t border-hair p-3">
        <Textarea value={text} onChange={setText} rows={2} placeholder="Write a message…" />
        <div className="mt-2 flex justify-end">
          <Button size="sm" onClick={() => void send()} disabled={busy || !text.trim()}>
            {busy ? "Sending…" : "Send"}
          </Button>
        </div>
      </div>
    </div>
  );
}
