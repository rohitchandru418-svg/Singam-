"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useSession } from "./SessionProvider";
import { Icon } from "./icons";
import { PersonaSwitcher } from "./PersonaSwitcher";

/**
 * The chrome for a startup-side login.
 *
 * A founder is not a staff member: there is no workspace rail and no season switcher, just
 * the show's identity, the founder's own name and any notices addressed to them.
 */
export function StartupShell({ children }: { children: ReactNode }) {
  const { session, refresh, signOut } = useSession();
  const router = useRouter();
  const [noticesOpen, setNoticesOpen] = useState(false);

  const notices = session?.notifications ?? [];

  return (
    <div className="flex min-h-screen flex-col bg-page">
      <header className="sticky top-0 z-30 border-b border-hair bg-canvas/95 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-2.5 px-4">
          <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-lg ring-1 ring-hair">
            <Image src="/singam-logo.png" alt="" width={26} height={22} className="h-[19px] w-auto" priority />
          </span>
          <span className="min-w-0">
            <span className="ss-wordmark block truncate text-[13.5px] font-semibold leading-tight text-ink">Startup Singam</span>
            <span className="block text-[10.5px] leading-tight text-faint">Startup side</span>
          </span>

          <div className="relative ml-auto flex items-center gap-2">
            <PersonaSwitcher />
            <button
              type="button"
              onClick={() => setNoticesOpen((v) => !v)}
              aria-label={`Notices${notices.length ? `, ${notices.length} new` : ""}`}
              className="relative rounded-lg border border-hair bg-canvas p-1.5 text-ink-soft transition hover:bg-hover hover:text-ink"
            >
              <Icon name="bell" className="h-[16px] w-[16px]" />
              {notices.length > 0 ? (
                <span className="ss-num absolute -right-1 -top-1 grid h-[17px] min-w-[17px] place-items-center rounded-full bg-brand px-1 text-[10px] font-semibold text-white ring-2 ring-canvas">
                  {notices.length}
                </span>
              ) : null}
            </button>
            <span className="hidden text-right sm:block">
              <span className="block text-[12.5px] font-medium leading-tight text-ink">{session?.actor.name ?? ""}</span>
              <span className="block text-[10.5px] leading-tight text-faint">Founder</span>
            </span>
            <button
              type="button"
              onClick={() => {
                void signOut().then(() => router.replace("/login"));
              }}
              className="rounded-lg border border-hair bg-canvas p-1.5 text-ink-soft transition hover:bg-hover hover:text-ink"
              aria-label="Sign out"
              title="Sign out"
            >
              <Icon name="logout" className="h-[16px] w-[16px]" />
            </button>
            <button
              type="button"
              onClick={() => {
                void refresh();
              }}
              className="rounded-lg border border-hair bg-canvas p-1.5 text-ink-soft transition hover:bg-hover hover:text-ink"
              aria-label="Refresh"
            >
              <Icon name="refresh" className="h-[16px] w-[16px]" />
            </button>

            {noticesOpen ? (
              <div className="ss-rise absolute right-0 top-[calc(100%+0.5rem)] z-40 w-[24rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-hair bg-canvas shadow-overlay">
                <div className="border-b border-hair px-3.5 py-2.5">
                  <p className="text-[13px] font-semibold text-ink">Notices from the team</p>
                </div>
                {notices.length === 0 ? (
                  <p className="px-3.5 py-4 text-[12.5px] text-faint">Nothing new.</p>
                ) : (
                  <ul className="divide-y divide-hair">
                    {notices.map((n) => (
                      <li key={String(n.id)} className="px-3.5 py-2.5">
                        <p className="text-[12.5px] font-medium text-ink">{String(n.title)}</p>
                        <p className="mt-0.5 text-[12px] leading-snug text-ink-soft">{String(n.body ?? "")}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-5">{children}</main>

      <footer className="border-t border-hair bg-canvas">
        <p className="mx-auto w-full max-w-5xl px-4 py-3 text-[11.5px] text-faint">
          Startup Singam · Baanhem Ventures. This is your own view of your application, fee, shoot and telecast.
        </p>
      </footer>
    </div>
  );
}
