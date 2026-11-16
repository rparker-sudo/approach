import type { Member, Readiness, Team, TeamLog } from './backend/types';
import { endsSoon, programLine, weekIndex, weekSessions } from './general';
import { clientKey } from './backend/types';
import type { Program } from './types';

/**
 * 2.3.0 F37/F38: what the trainer sees about each client. Sort orders are by name, date, or flags only; nothing ranks
 * clients against each other (compliance T6, spec B6).
 */
export type ClientFlag = { label: string; tone: 'warning' | 'muted'; line?: string };

export type ClientRow = {
  member: Member;
  first: string;
  programs: Program[];
  primary: Program | undefined;
  line: string;
  done: number;
  planned: number;
  last: TeamLog | undefined;
  checkin: string;
  flags: ClientFlag[];
};

const DAY = 864e5;
const ALL = 'all';
/** Same as team.tsx teamProgramId (kept here so this file stays free of React for the checks). */
const teamProgramId = (teamId: string, groupKey: string) => (groupKey === ALL ? `team-${teamId}` : `team-${teamId}-${groupKey}`);

/** Programs that reach a client, own first: their program, their group's, the whole team's (posted or local copy). */
export function programsFor(team: Team, member: Member, programs: Program[]): Program[] {
  const keys = [clientKey(member.userId), ...(member.groupId ? [member.groupId] : []), ALL];
  return keys.map((k) => programs.find((p) => p.id === teamProgramId(team.id, k))).filter((p): p is Program => !!p && !!p.postedAt);
}

function monday(d: Date) {
  const s = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  s.setDate(s.getDate() - ((s.getDay() + 6) % 7));
  return s;
}

export function clientRow(team: Team, member: Member, programs: Program[], logs: TeamLog[], today: Readiness[], now = new Date()): ClientRow {
  const mine = programsFor(team, member, programs);
  const primary = mine[0];
  const first = member.name.split(' ')[0] || member.name;
  const ws = monday(now).getTime();
  const own = logs.filter((l) => l.userId === member.userId && l.kind !== 'extra_recovery').sort((a, b) => b.date.localeCompare(a.date));
  const done = own.filter((l) => new Date(l.date).getTime() >= ws).length;
  const planned = mine.reduce((n, p) => {
    const w = weekIndex(p, now);
    return w == null ? n : n + weekSessions(p, w).filter(Boolean).length;
  }, 0);
  const last = own[0];
  const lastDay = last ? new Date(last.date).toLocaleDateString(undefined, { weekday: 'short' }) : null;
  const line = primary ? `${programLine(primary, now)} · ${done} of ${planned} this week${lastDay ? ` · last session ${lastDay}` : ''}` : 'No program.';
  const ci = today.find((r) => r.userId === member.userId);
  // "No check-in shared" covers both off states (the trainer can't tell which, compliance T5).
  const checkin = member.perms.shareCheckins ? (ci ? 'Checked in today' : 'No check-in today') : 'No check-in shared';
  const flags: ClientFlag[] = [];
  if (member.perms.shareCheckins && ci?.pain) flags.push({ label: 'Pain reported today', tone: 'warning', line: `Check in with ${first} in person.` });
  // Only once a program has been running for 7+ days (a client who started this week isn't flagged).
  const weekAgo = new Date(now.getTime() - 7 * DAY);
  const active = mine.some((p) => weekIndex(p, now) != null && weekIndex(p, weekAgo) != null);
  if (active && (!last || now.getTime() - new Date(last.date).getTime() >= 7 * DAY)) flags.push({ label: 'No session in 7 days', tone: 'warning' });
  if (primary && endsSoon(primary, now)) flags.push({ label: 'Program ends in 2 weeks', tone: 'muted' });
  if (primary?.goal === 'back_after_break') {
    const w = weekIndex(primary, now);
    if (w == null ? (primary.startDate ?? '') < now.toISOString().slice(0, 10) : w >= 4) {
      flags.push({ label: 'Back after a break done', tone: 'muted', line: `${first} finished Back after a break. Pick their next goal.` });
    }
  }
  return { member, first, programs: mine, primary, line, done, planned, last, checkin, flags };
}

export type SortBy = 'name' | 'last' | 'flags';

export function sortRows(rows: ClientRow[], by: SortBy): ClientRow[] {
  const name = (a: ClientRow, b: ClientRow) => a.member.name.localeCompare(b.member.name);
  if (by === 'name') return [...rows].sort(name);
  if (by === 'last') return [...rows].sort((a, b) => (b.last?.date ?? '').localeCompare(a.last?.date ?? '') || name(a, b));
  return [...rows].sort((a, b) => b.flags.length - a.flags.length || name(a, b));
}
