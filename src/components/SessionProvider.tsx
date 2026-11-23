"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { apiLogout, apiSession, getSeason, setSeason, type PersonaOption, type SessionResponse } from "@/lib/client/api";
import { roleCanAccessModule } from "@/lib/domain/rbac";

export interface SeasonOption {
  id: string;
  code: string;
  name: string;
  status: string;
}

interface SessionContextValue {
  session: SessionResponse | null;
  loading: boolean;
  error: string | null;
  /** The sign-in personas, offered only where the local sign-in picker is available. */
  personas: PersonaOption[];
  refresh: () => Promise<void>;
  canAccessModule: (module: string) => boolean;
  /** True when the acting user is an external startup-side login. */
  external: boolean;
  /** 'staff', 'founder' or 'investor' — which surface the acting user gets. */
  actorKind: string;
  /** True when the request carried a real session. */
  authenticated: boolean;
  /** True when the local sign-in picker is available (development and test only). */
  devMode: boolean;
  /** Revoke the session and return to the sign-in screen. */
  signOut: () => Promise<void>;
  /** Seasons available to switch between, newest first. */
  seasons: SeasonOption[];
  /** The season the whole app is currently scoped to. */
  seasonId: string;
  season: SeasonOption | null;
  switchSeason: (id: string) => void;
}

const SessionContext = createContext<SessionContextValue>({
  session: null,
  loading: true,
  error: null,
  personas: [],
  refresh: async () => {},
  canAccessModule: () => true,
  external: false,
  actorKind: "staff",
  authenticated: false,
  devMode: false,
  signOut: async () => {},
  seasons: [],
  seasonId: "",
  season: null,
  switchSeason: () => {},
});

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seasonId, setSeasonId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiSession();
      setSession(data);
      // A stored season that no longer exists (or none stored yet) falls back to the
      // server's current season, so the selector always shows a real season.
      const stored = getSeason();
      const known = data.seasons.some((s) => s.id === stored);
      const chosen = known ? stored : data.currentSeasonId;
      setSeason(chosen);
      setSeasonId(chosen);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load session");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const switchSeason = useCallback((id: string) => {
    setSeason(id);
    setSeasonId(id);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await apiLogout();
    } finally {
      // A fresh sign-in is required to change persona, so the session is fully cleared here.
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("singam.actor");
      }
      setSession(null);
      // Reload the anonymous session so the sign-in screen still has the persona picker; without
      // this the picker disappears after a sign-out until the page is refreshed.
      await load();
    }
  }, [load]);

  const canAccessModule = useCallback(
    (module: string) => {
      if (!session) return false;
      if (session.actor.role === "admin") return true;
      return roleCanAccessModule(session.actor.role, module);
    },
    [session],
  );

  const seasons = useMemo<SeasonOption[]>(
    () => (session?.seasons ?? []).map((s) => ({ id: s.id, code: s.code, name: s.name, status: s.status })),
    [session],
  );
  const season = useMemo(() => seasons.find((s) => s.id === seasonId) ?? null, [seasons, seasonId]);
  const external = session?.actor.kind === "founder";
  const actorKind = session?.actor.kind ?? "staff";
  const authenticated = session?.authenticated ?? false;

  const value = useMemo(
    () => ({ session, loading, error, personas: session?.personas ?? [], refresh: load, canAccessModule, external, actorKind, authenticated, devMode: session?.devMode ?? false, signOut, seasons, seasonId, season, switchSeason }),
    [session, loading, error, load, canAccessModule, external, actorKind, authenticated, signOut, seasons, seasonId, season, switchSeason],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  return useContext(SessionContext);
}

/**
 * Renders the children only when the acting role may open the module; otherwise it
 * shows a short notice instead of a screen full of empty, access-denied tables.
 */
export function ModuleGate({ module, children }: { module: string; children: ReactNode }) {
  const { session, loading, canAccessModule } = useSession();
  if (loading) return <div className="p-8 text-center text-[13px] text-faint">Loading&hellip;</div>;
  if (session && !canAccessModule(module)) {
    return (
      <div className="rounded-md border border-dashed border-hair-strong bg-surface px-4 py-8 text-center">
        <p className="text-[13.5px] font-medium text-ink-soft">This module is not available for your role.</p>
        <p className="mt-1 text-[12.5px] text-faint">
          {session.actor.name} ({session.actor.role}) cannot open {module}. Sign out and sign in as the persona that
          owns this module.
        </p>
      </div>
    );
  }
  return <>{children}</>;
}
