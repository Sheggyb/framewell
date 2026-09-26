import type { Micros } from "./time";

export const TRANSITIONS = [
  "crossfade",
  "dip-black",
  "dip-white",
  "flash",
  "slide-left",
  "slide-up",
  "push-left",
  "whip",
  "zoom-in",
  "zoom-out",
  "wipe",
  "circle",
  "spin",
] as const;

export type TransitionType = (typeof TRANSITIONS)[number];

/** Stored on the incoming clip; centred on the cut. */
export interface Transition {
  type: TransitionType;
  duration: Micros;
}
