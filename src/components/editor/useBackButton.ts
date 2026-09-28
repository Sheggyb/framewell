"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useEditor } from "@/store/editor";

/**
 * Back (phone back button, iOS edge swipe, browser back) and Escape step out of the editor one
 * level at a time, the way a native app does, instead of leaving it from wherever you are.
 *
 * The editor keeps one extra history entry for the same URL on top of its own. Going back pops it:
 * if something was closed, the entry is pushed again; if there was nothing left to close, we go
 * back once more and leave the editor. (Next.js copies its router state into our entry, so its
 * own popstate handling sees an ordinary same-page traverse.)
 */
const GUARD = "framewellBack";

/** Back handlers of open overlays the store doesn't know about (e.g. the export dialog), innermost last. */
const overlays: { current: () => boolean }[] = [];

/** An overlay with its own Back handler is open: editor shortcuts stand down. */
export const overlayOpen = () => overlays.length > 0;

/** Closes the innermost open overlay, panel or selection. False when there was nothing to close. */
export function goBack(): boolean {
  const top = overlays.at(-1);
  if (top) return top.current();
  return useEditor.getState().stepBack();
}

/**
 * While mounted, Back and Escape go to `handler` first. It returns true when it dealt with Back
 * (it may also ignore it, e.g. while an export is running) and false to let it through.
 */
export function useBackHandler(handler: () => boolean) {
  const ref = useRef(handler);
  useEffect(() => {
    ref.current = handler;
  });
  useEffect(() => {
    const entry = { current: () => ref.current() };
    overlays.push(entry);
    return () => void overlays.splice(overlays.indexOf(entry), 1);
  }, []);
}

const onGuard = () => (window.history.state as Record<string, unknown> | null)?.[GUARD] === true;
const pushGuard = () => window.history.pushState({ ...window.history.state, [GUARD]: true }, "");

/** The Navigation API, where the browser has it. */
interface NavigationLike {
  canGoBack?: boolean;
  currentEntry?: { index: number } | null;
  entries?: () => { url: string | null }[];
}
const navigation = () => (window as { navigation?: NavigationLike }).navigation;

/** False when the editor is the first page in this tab (opened from a link or bookmark). Unknown → true. */
const canGoBack = () => navigation()?.canGoBack ?? true;

/** Set while we are leaving the editor through history, so our popstate handler stands aside. */
let leaving = false;

/**
 * "Back to projects": goes back to the project list when that is where the editor was opened
 * from (so Back on the list doesn't return to the editor), else opens the list.
 */
export function leaveEditor(router: { push: (href: string) => void }) {
  const nav = navigation();
  const index = nav?.currentEntry?.index;
  const steps = onGuard() ? 2 : 1;
  const url = index !== undefined ? nav?.entries?.()[index - steps]?.url : null;
  if (url && new URL(url).origin === window.location.origin && new URL(url).pathname === "/") {
    leaving = true;
    window.history.go(-steps);
  } else {
    router.push("/");
  }
}

/**
 * Installs the Back button handling for the editor. Call once, from the editor root, with
 * `ready` once the project is open (its final `?id=` URL is in place).
 */
export function useBackButton(ready: boolean) {
  const router = useRouter();
  useEffect(() => {
    if (!ready) return;
    leaving = false;
    // Already on the guard after a reload (or React's dev double-mount): don't stack another.
    if (!onGuard()) pushGuard();
    const onPopState = () => {
      // Forward onto our entry again, or on our way out: nothing to do.
      if (onGuard() || leaving) return;
      if (goBack()) pushGuard();
      else if (canGoBack()) {
        // Stand aside for the popstate this causes, or it would run again and go back twice.
        leaving = true;
        window.history.back();
      }
      else router.replace("/");
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [ready, router]);
}
