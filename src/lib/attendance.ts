import type { AttendanceKind, TeamSettings } from './backend/types';
import { addDays, dateKey, dayTypeOn, today } from './calendar';
import type { Program } from './types';

/**
 * Attendance (P5): practices come from the team's usual week unless the calendar marks the date
 * otherwise; matches and tournaments come from calendar events.
 */
export function attendanceKindOn(program: Program | undefined, d: Date): AttendanceKind | null {
  if (!program) return null;
  const t = dayTypeOn(program, d);
  if (t === 'game') return 'match';
  if (t === 'tournament') return 'tournament';
  if (t === 'practice') return 'practice';
  return null;
}

export function minutesFor(settings: TeamSettings, kind: AttendanceKind): number {
  return kind === 'practice' ? settings.practiceMin : kind === 'match' ? settings.matchMin : settings.tournamentMin;
}

/** Athletes can tap "I was there" until the end of the next day: today and yesterday. */
export function markableDays(program: Program | undefined, now: Date = today()): { day: string; kind: AttendanceKind; label: string }[] {
  const out: { day: string; kind: AttendanceKind; label: string }[] = [];
  for (const [d, when] of [
    [now, 'today'],
    [addDays(now, -1), 'yesterday'],
  ] as const) {
    const kind = attendanceKindOn(program, d);
    if (kind) out.push({ day: dateKey(d), kind, label: `${KIND_LABEL[kind]} ${when}` });
  }
  return out;
}

export const KIND_LABEL: Record<AttendanceKind, string> = { practice: 'Practice', match: 'Match', tournament: 'Tournament' };
