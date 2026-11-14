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

/** Two or more teams with different levels: the athlete may see why (copy review §4.4). */
export function followsLowerLevel(data: AppData): boolean {
  const own = ownLevel(data);
  const lv = Object.values(data.teamLevels ?? {}).map((t) => t.level ?? own);
  return lv.length > 1 && new Set(lv).size > 1;
}

/** The one way screens get an athlete's session. */
export function resolveFor(data: AppData, program: Program, session: Session, date: Date = today()): ResolvedSession {
  return resolveSession(program, session, { level: athleteLevel(data), logs: data.logs }, date);
}
