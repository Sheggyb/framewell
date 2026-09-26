/**
 * Routes a pointer's later events to `el` even when the finger leaves it. Best effort:
 * capture can fail (e.g. the pointer already lifted), and a drag should still work then.
 */
export function capturePointer(el: Element | null, pointerId: number): void {
  try {
    el?.setPointerCapture(pointerId);
  } catch {
    // Events still arrive while the pointer stays over the element.
  }
}
