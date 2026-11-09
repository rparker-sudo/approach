/**
 * Rest timer math, based on an end timestamp so it stays right when the phone
 * is locked or the app is in the background (JS timers pause; clocks don't).
 */
export type Rest = { endAt: number; total: number; label: string };

export function startRest(seconds: number, label: string, now = Date.now()): Rest | null {
  if (!seconds || seconds <= 0) return null;
  return { endAt: now + seconds * 1000, total: seconds, label };
}

/** Whole seconds left (never negative). */
export function secondsLeft(rest: Rest, now = Date.now()): number {
  return Math.max(0, Math.ceil((rest.endAt - now) / 1000));
}

/** Add or remove time; never below zero left. */
export function adjustRest(rest: Rest, deltaSec: number, now = Date.now()): Rest {
  const endAt = Math.max(now, rest.endAt + deltaSec * 1000);
  return { ...rest, endAt, total: Math.max(1, rest.total + deltaSec) };
}

/** 95 → "1:35" */
export function clock(sec: number): string {
  return `${Math.floor(sec / 60)}:${String(Math.max(0, sec) % 60).padStart(2, '0')}`;
}
