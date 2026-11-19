import type { Phase, Program, Session } from './types';

/**
 * 2.4.1 Part D (spec D2; content/programs/home-and-mobility-v3.md v1.0): shared pieces of the v3 week setup that the calendar,
 * the generator and resolveSession all read. Pure; no imports beyond types (calendar.ts imports this).
 *
 * Everything is stored in existing keys only (spec D5): a home workout is a session with `location: 'home'` whose `name` is its
 * type; a mobility day is a session with `mobility: true` and `location: 'home'` (2.3.0 extra-mobility sessions have no
 * location); the light home day keeps `light: true`.
 */

export type DayKind = 'off' | 'room' | 'home' | 'mobility';
export type HomeType = 'H-Upper' | 'H-Lower' | 'H-Total' | 'H-Durability';

/**
 * Session names. Legal's 2.4.1 copy fix (compliance § 2.4.1 check; CLAUDE.md known conflict 4): H-Durability is "Home Care"
 * in the app, never "Home Durability". The type id stays H-Durability in code.
 */
export const HOME_NAME: Record<HomeType, string> = {
  'H-Upper': 'Home Upper',
  'H-Lower': 'Home Lower',
  'H-Total': 'Home Total',
  'H-Durability': 'Home Care',
};
export const MOBILITY_NAME = 'Mobility';
export const LIGHT_NAME = 'Light Home';

/** The home type of a v3 home workout (null for anything else). */
export function homeTypeOf(s: Pick<Session, 'name' | 'location' | 'mobility' | 'light'> | undefined | null): HomeType | null {
  if (!s || s.location !== 'home' || s.mobility || s.light) return null;
  const hit = (Object.keys(HOME_NAME) as HomeType[]).find((t) => HOME_NAME[t] === s.name);
  return hit ?? null;
}

/** A v3 mobility day (week setup), as opposed to the 2.3.0 extra-mobility session (no location). */
export const isV3Mobility = (s: Pick<Session, 'mobility' | 'location'> | undefined | null) => !!s?.mobility && s.location === 'home';

/** A program built from the week setup by generator v3 (block set, and its sessions carry the setup's kinds). */
export const isSetupProgram = (p: Pick<Program, 'block' | 'weightRoomDays'>) => !!p.block && Array.isArray(p.weightRoomDays);

/** §5.3: which home workout becomes the light day first, then Off. */
export const CAP_REPLACE_ORDER: HomeType[] = ['H-Durability', 'H-Lower', 'H-Total', 'H-Upper'];

/** Home and mobility day defaults (spec D2.7; home-and-mobility §3c, §4b). */
export const HOME_MINUTES = 30;
export const MOBILITY_MINUTES: Record<Phase | 'matchDay', number> = { off: 20, pre: 20, in: 15, post: 25, matchDay: 12 };

/** The kind of each weekday in a stored program (the Week setup card restores itself from these, spec D1). */
export function setupFromProgram(p: Pick<Program, 'liftSchedule' | 'sessions'>): DayKind[] {
  return p.liftSchedule.map((sid) => {
    const s = sid ? p.sessions.find((x) => x.id === sid) : undefined;
    if (!s) return 'off';
    if (s.mobility) return 'mobility';
    if (s.location === 'home') return 'home';
    return 'room';
  });
}

/** Weekday names for coach notes ("Care work is on Saturday's home workout."). */
export const WEEKDAY_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
