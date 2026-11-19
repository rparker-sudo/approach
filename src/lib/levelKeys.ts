/**
 * 2.4.0 · Legal ruling #2 (compliance § 2.4.0 build rulings, 11/19): the per-athlete "Adjust to level" flag is stored in
 * the posted program (`Program.levelAdjustOffFor`) only as a keyed hash, HMAC-SHA256(server secret, team id : user id),
 * that teammates can't recompute. The server hands out the keys (`level_off_keys`, migration 011): every member's key to
 * the team's coach or trainer, and only their own key to an athlete. This cache holds the keys the backend loaded.
 */
const keys = new Map<string, string>();
const id = (teamId: string, userId: string) => `${teamId}:${userId}`;

export type LevelKeyRow = { teamId: string; userId: string; key: string };

/** Replace the keys for these teams with the rows the backend returned. */
export function setLevelOffKeys(teamIds: string[], rows: LevelKeyRow[]): void {
  const teams = new Set(teamIds);
  for (const k of [...keys.keys()]) if (teams.has(k.slice(0, k.indexOf(':')))) keys.delete(k);
  for (const r of rows) keys.set(id(r.teamId, r.userId), r.key);
}

/** This athlete's key in this team, when this device was given it (own key, or the coach's members); else null. */
export function levelOffKey(teamId: string | undefined, userId: string): string | null {
  if (!teamId) return null;
  return keys.get(id(teamId, userId)) ?? null;
}

/** Every key this device holds (saved on the device so an offline start still knows the athlete's own setting). */
export function allLevelOffKeys(): LevelKeyRow[] {
  return [...keys.entries()].map(([k, key]) => ({ teamId: k.slice(0, k.indexOf(':')), userId: k.slice(k.indexOf(':') + 1), key }));
}

/** Restore saved keys without overwriting fresher ones from the server. */
export function restoreLevelOffKeys(rows: LevelKeyRow[]): void {
  for (const r of rows) if (!keys.has(id(r.teamId, r.userId))) keys.set(id(r.teamId, r.userId), r.key);
}

/** On sign-out, and in tests. */
export function clearLevelOffKeys(): void {
  keys.clear();
}
