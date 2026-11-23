"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useSession } from "./SessionProvider";
import { Icon } from "./icons";
import { PersonaSwitcher } from "./PersonaSwitcher";

/**
 * The chrome for an investor-side login.
 *
 * An investor is not a staff member: there is no workspace rail and no season switcher, just
 * the show's identity, the investor's own name and any notices addressed to them.
 */
export function InvestorShell({ children }: { children: ReactNode }) {
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
            <span className="block text-[10.5px] leading-tight text-faint">Investor side</span>
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
              <span className="block text-[10.5px] leading-tight text-faint">Investor</span>
            </span>
            <button
              type="button"
              onClick={() => {
                void signOut().then(() => router.replace("/login"));
              }}
              aria-label="Sign out"
              className="rounded-lg border border-hair bg-canvas p-1.5 text-ink-soft transition hover:bg-hover hover:text-ink"
            >
              <Icon name="logout" className="h-[16px] w-[16px]" />
            </button>
          </div>
        </div>

        {noticesOpen ? (
          <div className="border-t border-hair bg-canvas">
            <div className="mx-auto w-full max-w-5xl px-4 py-2">
              {notices.length === 0 ? (
                <p className="text-[12.5px] text-faint">No new notices.</p>
              ) : (
                <ul className="divide-y divide-hair">
                  {notices.map((n) => (
                    <li key={String(n.id)} className="py-2">
                      <p className="text-[12.5px] font-medium text-ink">{String(n.title)}</p>
                      <p className="text-[12px] text-ink-soft">{String(n.body)}</p>
                    </li>
                  ))}
                </ul>
              )}
              <button
                type="button"
                onClick={() => {
                  setNoticesOpen(false);
                  void refresh();
                }}
                className="mt-2 text-[12px] font-medium text-brand"
              >
                Close
              </button>
            </div>
          </div>
        ) : null}
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>

      <footer className="border-t border-hair bg-canvas">
        <div className="mx-auto w-full max-w-5xl px-4 py-3 text-[11.5px] text-faint">
          Startup Singam · Investor workspace
        </div>
      </footer>
    </div>
  );
}
