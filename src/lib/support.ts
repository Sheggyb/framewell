/**
 * Voluntary tips. Framewell only ever links out to Ko-fi (new tab): no Ko-fi widget or script
 * is loaded, so the app stays free of third-party code and trackers.
 */
export const SUPPORT_URL = "https://ko-fi.com/framewell";

const HIDE_KEY = "framewell:hide-support";

/** The creator chose "don't show again" for the tip line after an export. */
export function supportHidden(): boolean {
  try {
    return localStorage.getItem(HIDE_KEY) === "1";
  } catch {
    return false;
  }
}

export function hideSupport(): void {
  try {
    localStorage.setItem(HIDE_KEY, "1");
  } catch {
    // Storage unavailable: it shows again next time, which is harmless.
  }
}
