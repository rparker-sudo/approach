import { today } from './calendar';
import { Level, resolveSession, ResolvedSession } from './resolve';
import type { AppData, Experience, Program, Session } from './types';

/**
 * The athlete's side of `resolveSession` (G-1): which level to resolve to.
 * Q-7: the lower of the athlete's levels across all their teams (confirmed or self-reported).
 * A team whose level isn't filled in yet counts as the athlete's own experience.
 */
export const LEVEL_OF: Record<Experience, Level> = { beginner: 1, intermediate: 2, advanced: 3 };
export const LEVEL_NAME: Record<number, string> = { 1: 'Beginner', 2: 'Intermediate', 3: 'Advanced' };

export function ownLevel(data: AppData): Level {
  return LEVEL_OF[data.profile?.experience ?? 'beginner'] ?? 1;
}

export function athleteLevel(data: AppData): Level {
  const own = ownLevel(data);
  const lv = Object.values(data.teamLevels ?? {}).map((t) => t.level ?? own);
  return (lv.length ? Math.min(...lv) : own) as Level;
}

const EXP_OF: Record<number, Experience> = { 1: 'beginner', 2: 'intermediate', 3: 'advanced' };

/** For the weekly lift-day cap: the athlete's level as an experience (athletes only; coaches see the plan as built). */
export function capExperience(data: AppData): Experience | undefined {
  return data.profile?.role === 'coach' ? undefined : EXP_OF[athleteLevel(data)];
}

/** Two or more teams with different levels: the athlete may see why (copy review §4.4). */
export function followsLowerLevel(data: AppData): boolean {
  const own = ownLevel(data);
  const lv = Object.values(data.teamLevels ?? {}).map((t) => t.level ?? own);
  return lv.length > 1 && new Set(lv).size > 1;
}

/** 2.4.0: the signed-in account id (set by the team provider), for the per-athlete "Adjust to level" override (§1.2). */
let currentUserId: string | null = null;
export function setCurrentUserId(id: string | null | undefined) {
  currentUserId = id ?? null;
}

/** The one way screens get an athlete's session. */
export function resolveFor(data: AppData, program: Program, session: Session, date: Date = today()): ResolvedSession {
  const confirmed = !!(program.teamId && data.teamLevels?.[program.teamId]?.confirmed);
  return resolveSession(
    program,
    session,
    { level: athleteLevel(data), logs: data.logs, homeEquipment: data.homeEquipment ?? [], harderPicks: data.harderPicks, userId: currentUserId, levelConfirmed: confirmed, minor: data.profile?.isMinor !== false },
    date,
  );
}

/** Load-test level rule on the athlete's device (mirrors can_load_test; the server decides). */
export function levelAllowsLoadTest(data: AppData, teamId: string): boolean {
  const minor = data.profile?.isMinor !== false;
  if (!minor) return athleteLevel(data) >= 2;
  const mine = data.teamLevels?.[teamId];
  if (!mine?.confirmed || (mine.level ?? 0) < 2) return false;
  return !Object.entries(data.teamLevels ?? {}).some(([id, t]) => id !== teamId && t.confirmed && t.level === 1);
}
