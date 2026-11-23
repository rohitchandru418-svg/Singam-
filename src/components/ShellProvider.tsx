"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { AppShell } from "./AppShell";
import { SessionProvider, useSession } from "./SessionProvider";
import { SimulationDock } from "./SimulationDock";
import { StartupShell } from "./StartupShell";
import { InvestorShell } from "./InvestorShell";

/**
 * Chooses the chrome for the acting user and keeps a signed-out visitor on the sign-in screen.
 *
 * The internal console is for staff, the startup side is for a founder login and the investor
 * side is for an investor login. A visitor with no real session is sent to `/login`.
 */
function ShellSwitch({ children }: { children: ReactNode }) {
  const { session, loading, actorKind, authenticated } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  const onLoginPage = pathname === "/login";

  useEffect(() => {
    if (loading || !session) return;
    if (!authenticated && !onLoginPage) router.replace("/login");
    if (authenticated && onLoginPage) router.replace("/");
  }, [loading, session, authenticated, onLoginPage, router]);

  if (loading && !session) {
    return <div className="grid min-h-screen place-items-center bg-page text-[13px] text-faint">Loading&hellip;</div>;
  }

  // The sign-in screen is its own full-page surface, not a panel inside the console chrome.
  if (onLoginPage) return <>{children}</>;

  return (
    <>
      {actorKind === "founder" ? (
        <StartupShell>{children}</StartupShell>
      ) : actorKind === "investor" ? (
        <InvestorShell>{children}</InvestorShell>
      ) : (
        <AppShell>{children}</AppShell>
      )}
      {/* The live simulation dock sits above the real screens, never in place of them. */}
      <SimulationDock />
    </>
  );
}

export function ShellProvider({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ShellSwitch>{children}</ShellSwitch>
    </SessionProvider>
  );
}
