"use client";

import { Film, House, Lock, Sparkles, type LucideIcon } from "lucide-react";
import { useSyncExternalStore, type ReactNode } from "react";
import { useT } from "@/i18n";
import { cn } from "@/lib/utils";
import { useProjects } from "./ProjectList";

export type HomeTab = "home" | "videos" | "features" | "privacy";

const TABS: { id: HomeTab; icon: LucideIcon }[] = [
  { id: "home", icon: House },
  { id: "videos", icon: Film },
  { id: "features", icon: Sparkles },
  { id: "privacy", icon: Lock },
];

const isTab = (v: string): v is HomeTab => TABS.some((t) => t.id === v);

/**
 * Switches tab. Replaces the URL instead of following a `#link`: a plain hash link adds a
 * history entry without Next.js's router state, and going Back onto such an entry from the
 * editor changes the address without changing the page.
 */
export function showTab(id: HomeTab) {
  window.history.replaceState(window.history.state, "", `#${id}`);
  window.dispatchEvent(new HashChangeEvent("hashchange"));
  window.scrollTo({ top: 0 });
}

/** A link to another tab (e.g. "See what it can do" → Features). */
export function TabLink({ tab, className, children }: { tab: HomeTab; className?: string; children: ReactNode }) {
  return (
    <button type="button" onClick={() => showTab(tab)} className={className}>
      {children}
    </button>
  );
}

/** The tab named in the URL (#videos …), so links and reloads land on the right one. */
function useHashTab(): HomeTab | null {
  const hash = useSyncExternalStore(
    (onChange) => {
      window.addEventListener("hashchange", onChange);
      return () => window.removeEventListener("hashchange", onChange);
    },
    () => window.location.hash.slice(1),
    () => "",
  );
  return isTab(hash) ? hash : null;
}

/**
 * The home page in tabs, so it is short and app-like: Home, My videos, Features, Privacy.
 * Tabs sit in the top bar on larger screens and in a bottom tab bar on phones. Returning
 * creators open on My videos; everyone else on Home.
 */
export function HomeTabs({
  brand,
  action,
  panels,
}: {
  brand: ReactNode;
  action: ReactNode;
  panels: Record<HomeTab, ReactNode>;
}) {
  const t = useT();
  const projects = useProjects();
  const hashTab = useHashTab();
  const tab: HomeTab = hashTab ?? (projects && projects.length > 0 ? "videos" : "home");
  const count = projects?.length ?? 0;

  const choose = showTab;

  const badge = (id: HomeTab) =>
    id === "videos" && count > 0 ? (
      <span className="ms-1 rounded-full bg-gold/20 px-1.5 text-[10px] font-semibold leading-4 text-gold">{count}</span>
    ) : null;

  const topTabs = (
    <div role="tablist" aria-label={t("home.tabs.label")} className="hidden items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1 md:flex">
      {TABS.map(({ id }) => (
        <button
          key={id}
          type="button"
          role="tab"
          id={`tab-${id}`}
          aria-selected={tab === id}
          aria-controls={`panel-${id}`}
          onClick={() => choose(id)}
          className={cn(
            "flex h-8 items-center rounded-full px-4 text-sm font-medium transition-colors",
            tab === id ? "bg-white text-neutral-950" : "text-neutral-400 hover:text-neutral-100",
          )}
        >
          {t(`home.tabs.${id}`)}
          {tab !== id && badge(id)}
        </button>
      ))}
    </div>
  );

  return (
    <>
      <nav className="flex h-14 items-center justify-between gap-3">
        {brand}
        {topTabs}
        {action}
      </nav>
      {TABS.map(({ id }) => (
        <div
          key={id}
          role="tabpanel"
          id={`panel-${id}`}
          aria-labelledby={`tab-${id}`}
          hidden={tab !== id}
          className="animate-[fw-rise_0.45s_cubic-bezier(0.2,0.8,0.2,1)]"
        >
          {panels[id]}
        </div>
      ))}

      {/* Phones: an app-style tab bar at the bottom, in thumb reach. */}
      <nav
        aria-label={t("home.tabs.label")}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.08] bg-[#09090b]/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
      >
        <div className="mx-auto flex max-w-md">
          {TABS.map(({ id, icon: Icon }) => (
            <button
              key={id}
              type="button"
              aria-current={tab === id ? "page" : undefined}
              onClick={() => choose(id)}
              className={cn(
                "relative flex flex-1 flex-col items-center gap-1 pt-2.5 pb-2 text-[11px] font-medium transition-colors",
                tab === id ? "text-gold" : "text-neutral-500",
              )}
            >
              <span className="relative">
                <Icon className="size-[22px]" />
                {id === "videos" && count > 0 && (
                  <span className="absolute -top-1.5 -end-2.5 min-w-4 rounded-full bg-gold px-1 text-center text-[10px] font-bold leading-4 text-neutral-950">
                    {count}
                  </span>
                )}
              </span>
              {t(`home.tabs.${id}`)}
            </button>
          ))}
        </div>
      </nav>
    </>
  );
}
