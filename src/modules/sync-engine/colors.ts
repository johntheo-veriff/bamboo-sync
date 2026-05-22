import { EntryType } from "./types";

// Google Calendar event colorId values (1–11)
export const COLOR_TIME_OFF = "10"; // Tomato — signals absence
export const COLOR_HOLIDAY = "2";   // Sage — signals a non-working day
export const COLOR_FALLBACK = "11"; // Graphite — neutral fallback

const PREFERRED: Record<EntryType, string> = {
  "time-off": COLOR_TIME_OFF,
  holiday: COLOR_HOLIDAY,
};

export function colorFor(type: EntryType, unavailable: Set<string> = new Set()): string {
  const preferred = PREFERRED[type];
  if (!unavailable.has(preferred)) return preferred;
  return COLOR_FALLBACK;
}
