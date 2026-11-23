"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useSession } from "./SessionProvider";
import { Badge, EmptyState, ToneDot } from "./ui";
import { Icon, type IconName } from "./icons";
import { PersonaSwitcher } from "./PersonaSwitcher";
import { apiSearch, type SearchResponse } from "@/lib/client/api";
import { DEPARTMENT_MAP } from "@/lib/domain/departments";
import { WORKSPACES, workspaceForPath, screenForPath, workspaceVisibleForRole, type Workspace } from "@/lib/domain/navigation";

interface NavItem {
  href: string;
  label: string;
  module: string;
  icon: IconName;
  badge?: "tasks" | "notifications";
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

function searchGroups(workspaces: Workspace[]): NavGroup[] {
  return workspaces.map((ws) => ({ label: ws.label, items: ws.screens }));
}

export function AppShell({ children }: { children: ReactNode }) {
  return <Shell>{children}</Shell>;
}

function BrandLockup() {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-lg ring-1 ring-hair">
        <Image src="/singam-logo.png" alt="" width={26} height={22} className="h-[19px] w-auto" priority />
      </span>
      <span className="min-w-0">
        <span className="ss-wordmark block truncate text-[13.5px] font-semibold leading-tight text-ink">
          Startup Singam
        </span>
        <span className="block text-[10.5px] leading-tight text-faint">Operations console</span>
      </span>
    </div>
  );
}

/**
 * Season switcher.
 *
 * The show runs in numbered seasons and the same startup can apply in more than one, so the
 * whole app is scoped to one season at a time. This control is the single place the season
 * changes; every screen and the dashboard follow it.
 */
function SeasonSwitcher({ compact = false }: { compact?: boolean }) {
  const { seasons, seasonId, season, switchSeason, loading } = useSession();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [open]);

  if (loading && seasons.length === 0) {
    return <div className={`${compact ? "h-8 w-28" : "h-9 w-full"} ss-shimmer rounded-lg`} aria-hidden />;
  }
  if (seasons.length === 0) return null;

  const live = season?.status === "live";

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Change season"
        className={`flex items-center gap-2 rounded-lg border border-hair bg-canvas text-left transition hover:bg-hover ${
          compact ? "px-2 py-1" : "w-full px-2.5 py-1.5"
        }`}
      >
        <Icon name="calendar" className="h-[14px] w-[14px] shrink-0 text-faint" />
        {compact ? (
          <span className="text-[12.5px] font-medium text-ink">{season?.name ?? "Season"}</span>
        ) : (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[12.5px] font-medium leading-tight text-ink">
              {season?.name ?? "Season"}
            </span>
            <span className="flex items-center gap-1 text-[10.5px] leading-tight text-faint">
              <span className={`h-1.5 w-1.5 rounded-full ${live ? "bg-ok" : "bg-hair-strong"}`} aria-hidden />
              {season ? `${season.code} · ${live ? "live" : "closed"}` : ""}
            </span>
          </span>
        )}
        <Icon name={open ? "chevron-up" : "chevron-down"} className="h-3.5 w-3.5 shrink-0 text-faint" strokeWidth={2} />
      </button>

      {open ? (
        <ul
          role="listbox"
          aria-label="Seasons"
          className="absolute left-0 top-full z-50 mt-1.5 w-full min-w-[13rem] overflow-hidden rounded-xl border border-hair bg-canvas p-1 shadow-overlay"
        >
          {[...seasons].reverse().map((s) => {
            const active = s.id === seasonId;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    switchSeason(s.id);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12.5px] transition ${
                    active ? "bg-brand-soft font-medium text-brand-ink" : "text-ink-soft hover:bg-hover hover:text-ink"
                  }`}
                >
                  <Icon name={active ? "check" : "calendar"} className="h-[14px] w-[14px] shrink-0" strokeWidth={2} />
                  <span className="min-w-0 flex-1 truncate">{s.name}</span>
                  <span className="font-mono text-[10.5px] text-faint">{s.code}</span>
                  {s.status === "live" ? <span className="h-1.5 w-1.5 rounded-full bg-ok" aria-hidden /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

/**
 * The left rail.
 *
 * Every workspace is listed, but only the active one expands to show its screens, so the
 * rail stays short while the current department's whole job is visible at once. A workspace
 * row is a real destination: clicking it opens that workspace's first screen.
 */
function Rail({
  workspaces,
  activeKey,
  pathname,
  alertCount,
  onNavigate,
}: {
  workspaces: Workspace[];
  activeKey: string;
  pathname: string;
  alertCount: number;
  onNavigate: () => void;
}) {
  const router = useRouter();
  return (
    <nav aria-label="Workspaces" className="flex flex-col gap-0.5 px-2 pb-4">
      {workspaces.map((ws) => {
        const expanded = ws.key === activeKey;
        return (
          <div key={ws.key}>
            <button
              type="button"
              aria-expanded={expanded}
              onClick={() => {
                const first = ws.screens[0];
                if (first && first.href !== pathname) router.push(first.href);
              }}
              className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-left text-[13px] transition ${
                expanded ? "bg-surface font-semibold text-ink" : "font-medium text-ink-soft hover:bg-hover hover:text-ink"
              }`}
            >
              <Icon
                name={ws.icon}
                className={`h-[15px] w-[15px] shrink-0 ${expanded ? "text-brand" : "text-faint"}`}
              />
              <span className="min-w-0 flex-1 truncate">{ws.label}</span>
              <Icon
                name={expanded ? "chevron-up" : "chevron-down"}
                className="h-3.5 w-3.5 shrink-0 text-hair-strong"
                strokeWidth={2}
              />
            </button>
            {expanded ? (
              <ul className="mb-1 ml-[13px] mt-0.5 space-y-px border-l border-hair pl-2">
                {ws.screens.map((item) => {
                  const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onNavigate}
                        aria-current={active ? "page" : undefined}
                        className={`relative flex items-center gap-2 rounded-lg px-2 py-[5px] text-[12.5px] transition ${
                          active
                            ? "bg-brand-soft font-medium text-brand-ink"
                            : "text-ink-soft hover:bg-hover hover:text-ink"
                        }`}
                      >
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                        {item.badge === "tasks" && alertCount > 0 ? (
                          <span className="ss-num rounded-full bg-brand px-1.5 text-[10.5px] font-semibold leading-[17px] text-white">
                            {alertCount}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const { session, loading, error, canAccessModule, signOut } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // A workspace is offered only when the acting role's department owns it (or it is
  // cross-cutting / the role oversees every department), with the role's own screens kept.
  const actorDepartment = session?.actor.department ?? "";
  const workspaces = useMemo(
    () =>
      WORKSPACES.map((ws) => ({ ...ws, screens: ws.screens.filter((s) => canAccessModule(s.module)) })).filter(
        (ws) => workspaceVisibleForRole(ws, actorDepartment, canAccessModule),
      ),
    [canAccessModule, actorDepartment],
  );

  const department = session ? DEPARTMENT_MAP[session.actor.department] : null;
  const alertCount = session?.notifications.length ?? 0;
  const current = useMemo(() => screenForPath(pathname), [pathname]);
  const activeKey = useMemo(() => workspaceForPath(pathname)?.key ?? workspaces[0]?.key ?? "", [pathname, workspaces]);
  const groups = useMemo(() => searchGroups(workspaces), [workspaces]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    setSidebarOpen(false);
    setNotificationsOpen(false);
  }, [pathname]);

  const rail = (
    <>
      <div className="flex h-14 shrink-0 items-center border-b border-hair px-3">
        <Link href="/" className="min-w-0 rounded-lg px-1 py-1 transition hover:bg-hover">
          <BrandLockup />
        </Link>
      </div>
      <div className="shrink-0 px-3 py-3">
        <SeasonSwitcher />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <p className="px-4 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-faint">Workspaces</p>
        <Rail
          workspaces={workspaces}
          activeKey={activeKey}
          pathname={pathname}
          alertCount={alertCount}
          onNavigate={() => setSidebarOpen(false)}
        />
        {loading && workspaces.length === 0 ? (
          <div className="space-y-1.5 px-3" aria-hidden>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="ss-shimmer h-7 rounded-lg" />
            ))}
          </div>
        ) : null}
      </div>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-page">
      {/* Desktop rail */}
      <aside className="hidden w-[248px] shrink-0 flex-col border-r border-hair bg-side lg:flex">{rail}</aside>

      {/* Mobile rail */}
      {sidebarOpen ? (
        <>
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-ink/25 backdrop-blur-[1px] lg:hidden"
          />
          <aside className="ss-rise fixed inset-y-0 left-0 z-50 flex w-[264px] flex-col border-r border-hair bg-side lg:hidden">
            {rail}
          </aside>
        </>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-hair bg-canvas/90 backdrop-blur">
          <div className="flex h-14 items-center gap-2 px-3 sm:px-5">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="-ml-1 rounded-lg p-1.5 text-ink-soft transition hover:bg-hover lg:hidden"
              aria-label="Open navigation"
            >
              <Icon name="menu" className="h-[18px] w-[18px]" />
            </button>

            <div className="hidden min-w-0 lg:block">
              <Breadcrumbs current={current} />
            </div>

            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="ml-auto flex items-center gap-2 rounded-lg border border-hair bg-surface px-2.5 py-1.5 text-[12.5px] text-faint transition hover:border-hair-strong hover:bg-canvas hover:text-ink-soft sm:w-[260px]"
            >
              <Icon name="search" className="h-[14px] w-[14px]" />
              <span className="hidden truncate sm:inline">Search or jump to&hellip;</span>
              <span className="ml-auto hidden rounded border border-hair-strong bg-canvas px-1.5 py-px font-sans text-[10px] text-faint sm:inline">
                &#8984;K
              </span>
            </button>

            <div className="relative flex items-center gap-1.5">
              <PersonaSwitcher />
              <button
                type="button"
                onClick={() => setNotificationsOpen((v) => !v)}
                aria-expanded={notificationsOpen}
                aria-label={`Alerts${alertCount ? `, ${alertCount} outstanding` : ""}`}
                className="relative rounded-lg border border-hair bg-canvas p-1.5 text-ink-soft transition hover:bg-hover hover:text-ink"
              >
                <Icon name="bell" className="h-[16px] w-[16px]" />
                {alertCount > 0 ? (
                  <span className="ss-num absolute -right-1 -top-1 grid h-[17px] min-w-[17px] place-items-center rounded-full bg-brand px-1 text-[10px] font-semibold text-white ring-2 ring-canvas">
                    {alertCount}
                  </span>
                ) : null}
              </button>

              {session ? (
                <span className="hidden items-center gap-2 sm:flex">
                  <span className="text-right">
                    <span className="block text-[12.5px] font-medium leading-tight text-ink">{session.actor.name}</span>
                    <span className="block text-[10.5px] leading-tight text-faint">
                      {session.roles.find((r) => r.key === session.actor.role)?.label ?? session.actor.role}
                    </span>
                  </span>
                </span>
              ) : null}
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
              {department ? (
                <Badge tone="info" className="hidden xl:inline-flex">
                  {department.short}
                </Badge>
              ) : null}

              {notificationsOpen && session ? (
                <div className="ss-rise absolute right-0 top-[calc(100%+0.5rem)] z-40 w-[24rem] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-xl border border-hair bg-canvas shadow-overlay">
                  <div className="flex items-center justify-between border-b border-hair px-3.5 py-2.5">
                    <p className="text-[13px] font-semibold text-ink">Alerts and notifications</p>
                    <button
                      type="button"
                      className="rounded p-0.5 text-faint transition hover:text-ink"
                      onClick={() => setNotificationsOpen(false)}
                      aria-label="Close alerts"
                    >
                      <Icon name="x" className="h-3.5 w-3.5" strokeWidth={2} />
                    </button>
                  </div>
                  {session.notifications.length === 0 ? (
                    <div className="p-3">
                      <EmptyState
                        title="Nothing outstanding"
                        hint="Alerts appear here when a deadline, fee or sync needs attention."
                      />
                    </div>
                  ) : (
                    <ul className="max-h-[22rem] divide-y divide-hair overflow-y-auto">
                      {session.notifications.map((n) => (
                        <li key={String(n.id)} className="px-3.5 py-2.5 transition hover:bg-surface">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-[12.5px] font-medium text-ink">{String(n.title)}</p>
                            <Badge tone="warning">{String(n.recipient_role)}</Badge>
                          </div>
                          <p className="mt-0.5 text-[12px] leading-snug text-ink-soft">{String(n.body)}</p>
                          <p className="mt-1 font-mono text-[10.5px] text-faint">
                            {String(n.entity_type)} / {String(n.entity_id)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </header>

        {session && !session.canWrite ? (
          <div className="flex items-center gap-2 border-b border-warn-line bg-warn-soft px-4 py-1.5 text-[12px] text-warn sm:px-6">
            <ToneDot tone="warning" />
            Read-only role ({session.actor.role}). Mutating actions are disabled.
          </div>
        ) : null}

        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1320px] px-4 py-6 sm:px-6 lg:px-8">
            {error ? (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-risk-line bg-risk-soft px-3 py-2 text-[12.5px] text-risk">
                <ToneDot tone="danger" />
                {error}
              </div>
            ) : null}
            {children}
            <footer className="mt-14 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-hair pt-5 text-[11.5px] text-faint">
              <span className="font-medium text-ink-soft">Startup Singam ERP</span>
              <span aria-hidden>&middot;</span>
              <span>Selection, production, investment, community and finance are tracked separately by design.</span>
              <span aria-hidden className="hidden sm:inline">&middot;</span>
              <a
                href="/startup-singam-erp.zip"
                download
                className="font-medium text-accent underline decoration-dotted underline-offset-2 transition hover:text-ink"
              >
                Download source (.zip)
              </a>
            </footer>
          </div>
        </main>
      </div>

      {searchOpen ? <CommandPalette onClose={() => setSearchOpen(false)} groups={groups} /> : null}
    </div>
  );
}

function Breadcrumbs({ current }: { current: { workspace: Workspace; screen: NavItem } | null }) {
  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1 text-[12.5px]">
      <Link href="/" className="rounded-md px-1.5 py-0.5 text-faint transition hover:bg-hover hover:text-ink">
        Dashboard
      </Link>
      {current && current.screen.href !== "/" ? (
        <>
          <Icon name="chevron-right" className="h-3.5 w-3.5 shrink-0 text-hair-strong" strokeWidth={2} />
          <span className="truncate px-1.5 py-0.5 text-faint">{current.workspace.label}</span>
          <Icon name="chevron-right" className="h-3.5 w-3.5 shrink-0 text-hair-strong" strokeWidth={2} />
          <span className="truncate px-1.5 py-0.5 font-medium text-ink">{current.screen.label}</span>
        </>
      ) : null}
    </nav>
  );
}

/**
 * Command palette.
 *
 * One place to jump to a screen or open a record. Navigation matches instantly on the
 * client; records come from the search API after a short debounce. Arrow keys and Enter
 * drive it so it never needs the mouse.
 */
function CommandPalette({ onClose, groups }: { onClose: () => void; groups: NavGroup[] }) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState(0);
  const router = useRouter();

  const navMatches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = groups.flatMap((g) => g.items.map((i) => ({ ...i, group: g.label })));
    if (!q) return all;
    return all.filter((i) => i.label.toLowerCase().includes(q) || i.group.toLowerCase().includes(q));
  }, [groups, query]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResult(null);
      setBusy(false);
      return;
    }
    let cancelled = false;
    setBusy(true);
    const timer = setTimeout(() => {
      apiSearch(query)
        .then((r) => {
          if (!cancelled) setResult(r);
        })
        .catch(() => {
          if (!cancelled) setResult(null);
        })
        .finally(() => {
          if (!cancelled) setBusy(false);
        });
    }, 180);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const navShown = useMemo(() => navMatches.slice(0, query ? 5 : 40), [navMatches, query]);
  const recordShown = useMemo(() => (busy ? [] : result?.results ?? []), [busy, result]);
  const options = useMemo(
    () => [
      ...navShown.map((n) => ({ href: n.href })),
      ...recordShown.map((r) => ({ href: `/records/${r.entity}/${r.id}` })),
    ],
    [navShown, recordShown],
  );

  useEffect(() => setActive(0), [query]);

  const go = (href: string) => {
    router.push(href);
    onClose();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, Math.max(0, options.length - 1)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      const target = options[active];
      if (target) {
        e.preventDefault();
        go(target.href);
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-ink/25 p-4 backdrop-blur-[2px] sm:p-20"
      onMouseDown={onClose}
    >
      <div
        className="ss-rise w-full max-w-xl overflow-hidden rounded-2xl border border-hair bg-canvas shadow-overlay"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 border-b border-hair px-3.5 py-2.5">
          <Icon name="search" className="h-[16px] w-[16px] shrink-0 text-faint" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search records, or jump to a screen&hellip;"
            aria-label="Search"
            className="min-w-0 flex-1 border-0 bg-transparent py-1 text-[13.5px] text-ink outline-none placeholder:text-faint"
          />
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded border border-hair-strong px-1.5 py-0.5 text-[10.5px] text-faint transition hover:text-ink"
          >
            Esc
          </button>
        </div>

        <div className="max-h-[58vh] overflow-y-auto p-1.5">
          {navShown.length > 0 ? (
            <div className="mb-1">
              <p className="px-2 pb-1 pt-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-faint">
                Jump to
              </p>
              {navShown.map((i, idx) => (
                <button
                  key={i.href}
                  type="button"
                  onMouseEnter={() => setActive(idx)}
                  onClick={() => go(i.href)}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-[13px] transition ${
                    active === idx ? "bg-hover text-ink" : "text-ink-soft hover:bg-hover hover:text-ink"
                  }`}
                >
                  <Icon name={i.icon} className="h-[15px] w-[15px] shrink-0 text-faint" />
                  <span className="truncate">{i.label}</span>
                  <span className="ml-auto shrink-0 text-[11px] text-faint">{i.group}</span>
                </button>
              ))}
            </div>
          ) : null}

          {query.trim().length >= 2 ? (
            <div>
              <p className="px-2 pb-1 pt-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-faint">
                Records
              </p>
              {busy ? <p className="px-2 py-2 text-[12.5px] text-faint">Searching&hellip;</p> : null}
              {result && result.results.length === 0 && !busy ? (
                <p className="px-2 py-2 text-[12.5px] text-faint">No records match &ldquo;{result.query}&rdquo;.</p>
              ) : null}
              {recordShown.map((r, idx) => {
                const flatIndex = navShown.length + idx;
                return (
                  <button
                    key={`${r.entity}-${r.id}`}
                    type="button"
                    onMouseEnter={() => setActive(flatIndex)}
                    onClick={() => go(`/records/${r.entity}/${r.id}`)}
                    className={`flex w-full items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-left transition ${
                      active === flatIndex ? "bg-hover" : "hover:bg-hover"
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] text-ink">{r.title}</span>
                      <span className="block truncate text-[11.5px] text-faint">
                        {r.entityLabel} &middot; {r.subtitle}
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-[10.5px] text-faint">{r.id}</span>
                  </button>
                );
              })}
            </div>
          ) : null}

          {query.trim().length < 2 ? (
            <p className="px-2 py-3 text-[11.5px] text-faint">
              Type two or more characters to search across every record in the season.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
