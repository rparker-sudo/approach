import { addDays, dateKey, fromKey, weekdayOf } from './calendar';
import type { BlockType } from './generatorV3';
import type { CalendarEvent, EndType, Phase, Program } from './types';

/**
 * 2.4.2 Part A · Program length planner (content/programs/program-planner-v3.md §1; spec A1–A4; UX F57–F59).
 * Pure functions; no React. Plans a program **backward from its end date**: phase by date from the team's own calendar
 * (§1b step 1), the end anchored by end type (step 2), the §1c block table (step 3; D-068.1: the table wins over §1b), deloads
 * (step 4), testing suggestions (step 5) and breaks (step 6).
 * Data (spec §4): only `program.endDate` and `program.endType` are stored; the start is the existing `program.blockStart`.
 * The timeline is derived every time and never stored.
 */

export const BLOCK_NAME: Record<BlockType, string> = {
  restore: 'Restore',
  accumulation: 'Accumulation',
  strength: 'Strength',
  strength_power: 'Strength-Power',
  power: 'Power',
  maintain: 'Maintain',
};
export const PHASE_NAME: Record<Phase, string> = { off: 'off-season', pre: 'preseason', in: 'in-season', post: 'post-season' };
export const END_TYPES: EndType[] = ['season', 'testing', 'break', 'none'];

/** One block of the plan. `deload` = its last week is a deload; `taper` = its last week is the −30% volume week. */
export type PlanBlock = { block: BlockType; weeks: number; deload: boolean; taper: boolean };

const blk = (block: BlockType, weeks: number): PlanBlock => ({ block, weeks, deload: false, taper: false });
const A = (n: number) => blk('accumulation', n);
const S = (n: number) => blk('strength', n);
const SP = (n: number) => blk('strength_power', n);
const P = (n: number) => blk('power', n);
const R = (n: number) => blk('restore', n);
const total = (list: PlanBlock[]) => list.reduce((n, b) => n + b.weeks, 0);

/**
 * §1c table (off-season; weeks include deloads). "X n + deload" = n + 1 weeks. Weeks between rows add the extra week to the
 * **earliest** block (spec A2). Season = "Season starts"; every other end type uses the second column.
 */
function table(n: number, season: boolean): PlanBlock[] {
  if (n <= 2) return season ? [P(n)] : [S(n)];
  if (n === 3) return season ? [SP(2), P(1)] : [S(3)];
  if (n === 4) return season ? [S(2), P(2)] : [S(4)];
  if (n === 5) return season ? [A(2), SP(2), P(1)] : [A(2), S(3)];
  if (n === 6 || n === 7) return grow(season ? [S(3), SP(2), P(1)] : [A(3), S(3)], n);
  if (n === 8 || n === 9) return grow(season ? [A(3), S(3), P(2)] : [A(4), S(4)], n);
  if (n === 10 || n === 11) return grow(season ? [A(3), S(4), SP(2), P(1)] : [A(3), S(4), SP(3)], n);
  if (n === 12) return season ? [A(4), S(4), SP(3), P(1)] : [A(4), S(4), SP(4)];
  if (n <= 16) {
    // 12-week plan + one more Strength block (season: before Strength-Power; otherwise a repeat at the end). One extra week
    // can't be a block (never under 2 weeks), so it goes to the earliest block.
    const k = n - 12;
    if (k < 2) return grow(table(12, season), n);
    return season ? [A(4), S(4), S(k), SP(3), P(1)] : [A(4), S(4), SP(4), S(k)];
  }
  return longPlan(n, season);
}
/** Add weeks to the earliest block until the plan has `n` weeks. */
function grow(list: PlanBlock[], n: number): PlanBlock[] {
  const out = list.map((b) => ({ ...b }));
  out[0].weeks += Math.max(0, n - total(out));
  return out;
}

/**
 * 17+ weeks: Accumulation 4 · Strength 4, then Strength → Strength-Power cycles to the end, with a 1-week Restore every 12–16
 * weeks, anchored to the end (the tail is Strength-Power 3 · Power 1 for "Season starts", Strength-Power 4 otherwise).
 */
function longPlan(n: number, season: boolean): PlanBlock[] {
  const tail = season ? [SP(3), P(1)] : [SP(4)];
  const head = [A(4), S(4)];
  let rem = n - total(head) - total(tail);
  const middle: PlanBlock[] = [];
  let since = total(tail);
  let kind: BlockType = 'strength';
  while (rem > 0) {
    if (since >= 12) {
      middle.unshift(R(1));
      rem -= 1;
      since = 0;
      continue;
    }
    if (rem < 2) break;
    const take = Math.min(4, rem);
    middle.unshift(blk(kind, take));
    rem -= take;
    since += take;
    kind = kind === 'strength' ? 'strength_power' : 'strength';
  }
  const out = [...head, ...middle, ...tail];
  return rem > 0 ? grow(out, n) : out;
}

/** Deload and taper flags (§1b step 4): every block ends with a deload except the one right before the taper week. */
function flag(list: PlanBlock[], end: EndType, n: number): PlanBlock[] {
  const out = list.map((b) => ({ ...b, deload: true, taper: false }));
  const last = out[out.length - 1];
  for (let i = 0; i < out.length; i++) {
    const b = out[i];
    if (b.block === 'restore') b.deload = false;
    // The block right before the taper week: the next block is the 1-week taper.
    const next = out[i + 1];
    if (next && end === 'season' && next === last && next.block === 'power' && next.weeks === 1) b.deload = false;
  }
  if (end === 'season') {
    last.deload = false;
    last.taper = true;
  } else if (end === 'testing') {
    // Testing day: the last week is a deload with the test on its last lift day.
    last.deload = true;
  } else if (end === 'break') {
    // Break: the last week is a normal loading week.
    last.deload = false;
  } else if (n <= 2) {
    // Nothing special, 1–2 weeks: "Strength (no deload)".
    last.deload = false;
  }
  return out;
}

/** §1c: the off-season blocks for `n` weeks ending in `end`. */
export function offSeasonBlocks(n: number, end: EndType): PlanBlock[] {
  if (n <= 0) return [];
  return flag(table(n, end === 'season'), end, n);
}

/**
 * Shorten or lengthen a plan to `n` weeks (breaks, step 6): remove weeks from Accumulation first, then Strength-Power, then
 * Strength; a block never goes under 2 weeks (it's removed instead); extra weeks go to the earliest block.
 */
export function fitBlocks(list: PlanBlock[], n: number): PlanBlock[] {
  let out = list.map((b) => ({ ...b }));
  const order: BlockType[] = ['accumulation', 'strength_power', 'strength', 'restore', 'maintain', 'power'];
  let guard = 200;
  while (total(out) > n && out.length && guard--) {
    const kind = order.find((k) => out.slice(0, -1).some((b) => b.block === k)) ?? out[out.length - 1].block;
    const i = out.findIndex((b, k) => b.block === kind && (k < out.length - 1 || out.length === 1));
    const b = out[i];
    if (b.weeks > 2 || (out.length === 1 && b.weeks > 1)) b.weeks -= 1;
    else out = out.filter((_, k) => k !== i);
  }
  if (!out.length) return [];
  if (total(out) < n) out[0].weeks += n - total(out);
  return out;
}

/* ---------- other phases (§1c "Other phases") ---------- */
function preseasonBlocks(n: number, end: EndType | null): PlanBlock[] {
  if (n <= 0) return [];
  // 1–2 weeks: no deload, last week −30%. 3–4 weeks: Power 3 + taper week. Longer: no more than 4 loading weeks in a row.
  const loading = n - 1;
  const out: PlanBlock[] = [];
  if (n <= 2) out.push(P(n));
  else {
    let left = loading;
    while (left > 4) {
      out.push({ ...P(4), deload: true });
      left -= 4;
    }
    out.push(P(left + 1));
  }
  const last = out[out.length - 1];
  // The program ends inside preseason with an end type other than "Season starts": that end type decides the last week.
  if (end && end !== 'season') {
    last.taper = false;
    last.deload = end === 'testing';
  } else last.taper = true;
  return out;
}

/* ---------- the timeline ---------- */
export type PlanInput = {
  /** First day (YYYY-MM-DD): `program.blockStart`. */
  start: string;
  /** Last day (YYYY-MM-DD), inclusive: `program.endDate`. */
  end: string;
  endType: EndType;
  /** Used when the calendar has no season dates (F57b fallback). */
  phase: Phase;
  /** The program's calendar. Own events have no `teamName`; another team's (an athlete's combined calendar) do. */
  events: CalendarEvent[];
  /** Weekdays (Monday = 0) with a weight-room lift (testing suggestions go on the week's last one). */
  liftDays: number[];
};

export type PlanRow = {
  /** 1-based. */
  week: number;
  start: string;
  end: string;
  phase: Phase;
  /** null = paused (a break covers the week). */
  block: BlockType | null;
  weekInBlock: number;
  blockWeeks: number;
  deload: boolean;
  taper: boolean;
  /** Week 1 again after a break of 14+ days (§1b step 6). */
  restart?: boolean;
  /** The coach's break covering this week (its label). */
  breakLabel?: string;
  /** A suggested testing day in this week (date marker only, compliance § 2.4.2 check #4). */
  testDate?: string;
  /** Restore week in a 17+ week plan. */
  restore?: boolean;
  /** A short last week (end date not on a week boundary): its length in days. */
  shortDays?: number;
};

export type Plan = {
  rows: PlanRow[];
  /** Whole weeks (a short last week counts as part of the last block, F58b). */
  weeks: number;
  extraDays: number;
  firstPractice?: string;
  firstMatch?: string;
  /** The plan crosses a phase boundary (F59a "spans phases"). */
  spans: boolean;
  /** Breaks inside the window (own team only). */
  breaks: { label: string; start: string; end: string }[];
};

const isMatchType = (t: string) => t === 'game' || t === 'tournament';
const daysBetween = (a: string, b: string) => Math.round((fromKey(b).getTime() - fromKey(a).getTime()) / 864e5);

/** Season dates from this team's own events only (compliance § Multiple teams; another team's events never decide phases). */
export function seasonDates(events: CalendarEvent[], start: string): { firstPractice?: string; firstMatch?: string; lastMatch?: string } {
  const own = events.filter((e) => !e.teamName && e.type !== 'break');
  const matches = [...new Set(own.filter((e) => isMatchType(e.type)).map((e) => e.date))].sort();
  // A season is a run of matches with gaps of 3 weeks or less. The run that's under way at the start (a match in the 2 weeks
  // before it), else the next one.
  const before = matches.filter((d) => d < start);
  const ongoing = before.length && daysBetween(before[before.length - 1], start) <= 14;
  let i = ongoing ? before.length - 1 : matches.findIndex((d) => d >= start);
  let firstMatch: string | undefined;
  let lastMatch: string | undefined;
  if (i >= 0) {
    while (i > 0 && daysBetween(matches[i - 1], matches[i]) <= 21) i--;
    firstMatch = matches[i];
    let j = i;
    while (j < matches.length - 1 && daysBetween(matches[j], matches[j + 1]) <= 21) j++;
    lastMatch = matches[j];
  } else if (before.length) lastMatch = before[before.length - 1];
  const practices = own.filter((e) => e.type === 'practice').map((e) => e.date).sort();
  const firstPractice = firstMatch
    ? practices.find((d) => d < firstMatch! && daysBetween(d, firstMatch!) <= 120)
    : practices.find((d) => d >= start);
  return { firstPractice, firstMatch, lastMatch };
}

/** P6.1 / compliance § 2.4.2 #4: a testing suggestion is never within 48 h before a match on ANY team in the calendar. */
function goodTestDay(events: CalendarEvent[], key: string): boolean {
  const d = fromKey(key);
  for (let i = 0; i <= 2; i++) {
    const k = dateKey(addDays(d, i));
    if (events.some((e) => e.date === k && isMatchType(e.type))) return false;
  }
  return !events.some((e) => e.type === 'break' && !e.teamName && e.date <= key && (e.endDate ?? e.date) >= key);
}

/** The program's timeline (§1d), derived from the inputs. */
export function planTimeline(input: PlanInput): Plan {
  const days = daysBetween(input.start, input.end) + 1;
  const weeks = Math.max(1, Math.floor(days / 7));
  const extraDays = days >= 7 ? days % 7 : 0;
  const nRows = weeks + (extraDays ? 1 : 0);
  const s0 = fromKey(input.start);
  const season = seasonDates(input.events, input.start);
  const known = !!(season.firstMatch || season.firstPractice);
  const breaks = input.events
    .filter((e) => e.type === 'break' && !e.teamName && e.endDate && e.endDate >= input.start && e.date <= input.end)
    .map((e) => ({ label: e.label?.trim() || 'Break', start: e.date, end: e.endDate! }));

  const rows: PlanRow[] = Array.from({ length: nRows }, (_, i) => {
    const a = dateKey(addDays(s0, i * 7));
    const b = i === nRows - 1 ? input.end : dateKey(addDays(s0, i * 7 + 6));
    let phase: Phase = input.phase;
    if (known) {
      const { firstPractice, firstMatch, lastMatch } = season;
      if (firstMatch && b >= firstMatch && lastMatch && a <= lastMatch) phase = 'in';
      else if (firstPractice && b >= firstPractice && (!firstMatch || b < firstMatch)) phase = 'pre';
      else if (lastMatch && a > lastMatch && daysBetween(lastMatch, a) <= 28) phase = 'post';
      else phase = 'off';
    }
    // Paused: a break covers 4+ days of the week.
    const brk = breaks.find((x) => {
      let n = 0;
      for (let k = a; k <= b; k = dateKey(addDays(fromKey(k), 1))) if (k >= x.start && k <= x.end) n++;
      return n >= 4;
    });
    return { week: i + 1, start: a, end: b, phase, block: null, weekInBlock: 0, blockWeeks: 0, deload: false, taper: false, ...(brk ? { breakLabel: brk.label } : {}), ...(i === nRows - 1 && extraDays ? { shortDays: extraDays } : {}) };
  });

  // Segments: runs of the same phase. Each is planned by its phase's rule; the off-season part ends at the season's start.
  const segs: { phase: Phase; idx: number[] }[] = [];
  rows.forEach((r, i) => {
    const last = segs[segs.length - 1];
    if (last && last.phase === r.phase) last.idx.push(i);
    else segs.push({ phase: r.phase, idx: [i] });
  });
  segs.forEach((seg, si) => {
    const isLast = si === segs.length - 1;
    const train = seg.idx.filter((i) => !rows[i].breakLabel);
    const all = seg.idx.length - (isLast && extraDays ? 1 : 0); // whole weeks in the segment
    const n = train.length - (isLast && extraDays && !rows[seg.idx[seg.idx.length - 1]].breakLabel ? 1 : 0);
    if (n <= 0 && !train.length) return;
    if (seg.phase === 'in') {
      // Maintain 2-week cycles to the end; every 4th week −30% volume if there's no bye week in that stretch.
      train.forEach((i, k) => {
        const r = rows[i];
        r.block = 'maintain';
        r.weekInBlock = (k % 2) + 1;
        r.blockWeeks = 2;
        if ((k + 1) % 4 === 0) {
          const stretch = train.slice(k - 3, k + 1).map((j) => rows[j]);
          const bye = stretch.some((x) => !input.events.some((e) => !e.teamName && isMatchType(e.type) && e.date >= x.start && e.date <= x.end));
          if (!bye) r.taper = true;
        }
      });
      return;
    }
    const end: EndType = isLast ? input.endType : 'season';
    let blocks: PlanBlock[];
    if (seg.phase === 'pre') blocks = preseasonBlocks(Math.max(1, n), isLast ? input.endType : null);
    else if (seg.phase === 'post') {
      const restore = Math.min(4, Math.max(1, n));
      blocks = [R(restore), ...offSeasonBlocks(n - restore, end)];
    } else {
      let base = offSeasonBlocks(Math.max(1, all), end);
      // Followed by preseason (all Power): the off-season part ends before it, so its own Power taper goes and those weeks
      // join the earliest block (F59a spans-phases example: Strength (4) → Strength-Power (2) → Power (preseason, 3)).
      if (segs[si + 1]?.phase === 'pre' && base.length > 1 && base[base.length - 1].block === 'power') {
        const p = base[base.length - 1];
        base = grow(base.slice(0, -1).map((b) => ({ ...b })), total(base));
        void p;
      }
      blocks = fitBlocks(base, Math.max(1, n));
    }
    // The short last week is part of the last block (F58b).
    if (isLast && extraDays && blocks.length && !rows[seg.idx[seg.idx.length - 1]].breakLabel) blocks[blocks.length - 1] = { ...blocks[blocks.length - 1], weeks: blocks[blocks.length - 1].weeks + 1 };
    lay(rows, train, blocks, breaks);
  });

  // §1b step 5: testing suggestions (date markers only; existing testing rules unchanged).
  const lift = new Set(input.liftDays);
  const lastLiftDay = (r: PlanRow) => {
    const out: string[] = [];
    for (let k = r.start; k <= r.end; k = dateKey(addDays(fromKey(k), 1))) if (lift.has(weekdayOf(fromKey(k))) && goodTestDay(input.events, k)) out.push(k);
    return out[out.length - 1];
  };
  const trainRows = rows.filter((r) => r.block);
  if (trainRows.length) {
    // Week-1 baseline when this team has had no testing day in the 12 weeks before the start (this team's days only).
    const since = dateKey(addDays(s0, -84));
    const recent = input.events.some((e) => !e.teamName && e.test && e.date >= since && e.date < input.start);
    if (!recent) {
      const d = lastLiftDay(trainRows[0]);
      if (d) trainRows[0].testDate = d;
    }
    if ((input.endType === 'testing' || input.endType === 'season') && trainRows.length > 1) {
      // The last week; if no lift day there qualifies (48 h rule), an earlier day; otherwise none.
      const last = trainRows[trainRows.length - 1];
      const prev = trainRows[trainRows.length - 2];
      const d = lastLiftDay(last);
      if (d) last.testDate = d;
      else {
        const e = lastLiftDay(prev);
        if (e && !prev.testDate) prev.testDate = e;
      }
    }
  }
  const spans = new Set(rows.map((r) => r.phase)).size > 1;
  return { rows, weeks, extraDays, firstPractice: season.firstPractice, firstMatch: season.firstMatch, spans, breaks };
}

/** Put blocks on the training weeks in order. A block that a break of 14+ days interrupts restarts at week 1 after it. */
function lay(rows: PlanRow[], train: number[], blocks: PlanBlock[], breaks: { start: string; end: string }[]) {
  const longBreakBetween = (i: number, j: number) => breaks.some((b) => daysBetween(b.start, b.end) + 1 >= 14 && b.start > rows[i].end && b.end < rows[j].start);
  let k = 0;
  const queue = blocks.map((b) => ({ ...b }));
  for (let q = 0; q < queue.length; q++) {
    const b = queue[q];
    const mine = train.slice(k, k + b.weeks);
    k += b.weeks;
    // Restart after a long break inside this block.
    const cut = mine.findIndex((r, x) => x > 0 && longBreakBetween(mine[x - 1], r));
    const parts = cut > 0 ? [mine.slice(0, cut), mine.slice(cut)] : [mine];
    if (parts.length === 2 && parts[1].length === 1 && queue[q + 1]) {
      // One week left after the restart: it joins the next block (never a 1-week block).
      parts.pop();
      k -= 1;
      queue[q + 1].weeks += 1;
    }
    parts.forEach((part, pi) => {
      part.forEach((ri, x) => {
        const r = rows[ri];
        const lastWeek = x === part.length - 1;
        const finished = pi === parts.length - 1;
        Object.assign(r, {
          block: b.block,
          weekInBlock: x + 1,
          blockWeeks: part.length,
          deload: finished && lastWeek && b.deload,
          taper: finished && lastWeek && b.taper,
          ...(pi > 0 && x === 0 ? { restart: true } : {}),
          ...(b.block === 'restore' && b.weeks === 1 ? { restore: true } : {}),
        });
      });
    });
  }
}

/* ---------- labels (F59) ---------- */
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
/** "Jan 24" */
export const md = (key: string) => {
  const d = fromKey(key);
  return `${MON[d.getMonth()]} ${d.getDate()}`;
};
/** "Thu Jan 21" */
export const dmd = (key: string) => `${DOW[weekdayOf(fromKey(key))]} ${md(key)}`;
/** "Nov 30 – Dec 6" / "Dec 7 – 13" (same month). */
export function rangeLabel(a: string, b: string): string {
  const x = fromKey(a);
  const y = fromKey(b);
  return x.getMonth() === y.getMonth() ? `${md(a)} – ${y.getDate()}` : `${md(a)} – ${md(b)}`;
}
/** "Strength · week 2 of 4" */
export const blockWeekLabel = (r: Pick<PlanRow, 'block' | 'weekInBlock' | 'blockWeeks'>) => (r.block ? `${BLOCK_NAME[r.block]} · week ${r.weekInBlock} of ${r.blockWeeks}` : 'Paused');

/** Block runs for the summary line: consecutive weeks of the same block (paused weeks don't split a run). */
export function blockRuns(plan: Plan): { block: BlockType; weeks: number; phase: Phase }[] {
  const out: { block: BlockType; weeks: number; phase: Phase }[] = [];
  for (const r of plan.rows) {
    if (!r.block) continue;
    const last = out[out.length - 1];
    if (last && last.block === r.block && last.phase === r.phase) last.weeks++;
    else out.push({ block: r.block, weeks: 1, phase: r.phase });
  }
  return out;
}

/**
 * F59a summary line: "{N} weeks, {start} – {end}: {Block} ({weeks}) → … {ending}". Known conflict 4 (Legal): "Ends fresh"
 * becomes "Tapers into".
 */
export function summaryLine(plan: Plan, input: Pick<PlanInput, 'start' | 'end' | 'endType' | 'events'>): string {
  const n = plan.weeks;
  const len = `${n} week${n === 1 ? '' : 's'}`;
  const runs = blockRuns(plan)
    .map((r) => (plan.spans && r.phase !== 'off' ? `${BLOCK_NAME[r.block]} (${PHASE_NAME[r.phase]}, ${r.weeks})` : `${BLOCK_NAME[r.block]} (${r.weeks})`))
    .join(' → ');
  let tail = '';
  if (input.endType === 'season') {
    // The first match after the end (this team's own calendar), when it's within 2 weeks.
    const next = input.events
      .filter((e) => !e.teamName && isMatchType(e.type) && e.date > input.end && daysBetween(input.end, e.date) <= 14)
      .map((e) => e.date)
      .sort()[0];
    tail = next ? ` Tapers into the first match on ${md(next)}.` : ' Tapers into the season.';
  } else if (input.endType === 'testing') {
    const t = [...plan.rows].reverse().find((r) => r.testDate)?.testDate;
    tail = t && t >= plan.rows[plan.rows.length - 1].start ? ` Ends with a lighter week and testing on ${dmd(t)}.` : ' Ends with a lighter week.';
  } else if (input.endType === 'break') tail = ' Full training through the last week.';
  return `${len}, ${md(input.start)} – ${md(input.end)}: ${runs}.${tail}`;
}

/** F59a rolling line for a program with no end date. */
export function rollingLine(block: BlockType, week: number, blockWeeks = 4): string {
  return `Rolling 4-week blocks, no end date. Now: ${BLOCK_NAME[block]} · week ${week} of ${blockWeeks}.`;
}

/** F58b length line: "8 weeks · Mon Nov 30 – Sun Jan 24" / "7 weeks and 3 days · … The last 3 days are a short week." */
export function lengthLine(start: string, end: string): string {
  const days = daysBetween(start, end) + 1;
  if (days < 1) return '';
  const w = Math.floor(days / 7);
  const x = days % 7;
  const range = `${dmd(start)} – ${dmd(end)}`;
  if (!w) return `${x} day${x === 1 ? '' : 's'} · ${range}.`;
  if (!x) return `${w} week${w === 1 ? '' : 's'} · ${range}.`;
  return `${w} week${w === 1 ? '' : 's'} and ${x} day${x === 1 ? '' : 's'} · ${range}. The last ${x} day${x === 1 ? ' is' : 's are'} a short week.`;
}

/** F58b: end date = start + weeks × 7 − 1 day. */
export const endFromWeeks = (start: string, weeks: number) => dateKey(addDays(fromKey(start), weeks * 7 - 1));
/** Whole weeks from start to end (rounded up when a short week is left). */
export const weeksBetween = (start: string, end: string) => Math.max(1, Math.ceil((daysBetween(start, end) + 1) / 7));
/** F58a default start: next Monday. */
export function nextMonday(from: Date): string {
  const wd = weekdayOf(from);
  return dateKey(addDays(from, wd === 0 ? 7 : 7 - wd));
}

/** F58e validation (input errors only). */
export function dateError(start: string, end: string, isNew: boolean, todayKey: string): string | null {
  if (!start || !end) return null;
  if (isNew && start < todayKey) return 'Pick today or a later start date.';
  if (end <= start) return 'End date must be after the start date.';
  if (daysBetween(start, end) + 1 > 52 * 7) return 'Programs can be up to 52 weeks. Pick an earlier end date.';
  return null;
}

/**
 * F58d suggested end dates from this team's own calendar: the Sunday before the week of the season's first practice and first
 * match, earliest first. Another team's events never appear.
 */
export function endSuggestions(events: CalendarEvent[], start: string): { date: string; label: string; kind: 'practice' | 'match' }[] {
  const s = seasonDates(events, start);
  const out: { date: string; label: string; kind: 'practice' | 'match' }[] = [];
  const sundayBefore = (k: string) => dateKey(addDays(fromKey(k), -weekdayOf(fromKey(k)) - 1));
  if (s.firstPractice && s.firstPractice > start) {
    const d = sundayBefore(s.firstPractice);
    if (d > start) out.push({ date: d, label: `${dmd(d)} · before first practice ${md(s.firstPractice)}`, kind: 'practice' });
  }
  if (s.firstMatch && s.firstMatch > start) {
    const d = sundayBefore(s.firstMatch);
    if (d > start && !out.some((x) => x.date === d)) out.push({ date: d, label: `${dmd(d)} · before first match ${md(s.firstMatch)}`, kind: 'match' });
  }
  return out;
}

/** F58c default end type for a new program: Season starts when the team calendar has a first match after the start. */
export function defaultEndType(events: CalendarEvent[], start: string): EndType {
  return seasonDates(events, start).firstMatch && (seasonDates(events, start).firstMatch ?? '') > start ? 'season' : 'none';
}

/** The plan for a stored program (null without an end date, or for trainer programs). */
export function planOf(program: Pick<Program, 'blockStart' | 'createdAt' | 'endDate' | 'endType' | 'phase' | 'events' | 'liftSchedule' | 'sessions' | 'general'>): Plan | null {
  if (!program.endDate || program.general) return null;
  const start = program.blockStart ?? program.createdAt.slice(0, 10);
  const key = `${start}|${program.endDate}|${program.endType}|${program.phase}|${JSON.stringify(program.events ?? [])}|${program.liftSchedule.join(',')}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const plan = planTimeline({ start, end: program.endDate, endType: program.endType ?? 'none', phase: program.phase, events: program.events ?? [], liftDays: liftDaysOf(program) });
  if (cache.size > 50) cache.clear();
  cache.set(key, plan);
  return plan;
}
const cache = new Map<string, Plan>();

/** Weight-room lift weekdays of a program (not home, mobility or light). */
export function liftDaysOf(program: Pick<Program, 'liftSchedule' | 'sessions'>): number[] {
  return program.liftSchedule
    .map((sid, i) => {
      const s = program.sessions.find((x) => x.id === sid);
      return s && !s.mobility && !s.light && s.location !== 'home' ? i : -1;
    })
    .filter((i) => i >= 0);
}

/** The plan row for a date (clamped to the plan; a paused week takes the nearest earlier training week). */
export function rowFor(plan: Plan, date: Date): PlanRow | null {
  const k = dateKey(date);
  const rows = plan.rows;
  if (!rows.length) return null;
  let i = rows.findIndex((r) => k >= r.start && k <= r.end);
  if (i < 0) i = k < rows[0].start ? 0 : rows.length - 1;
  while (i > 0 && !rows[i].block) i--;
  if (!rows[i].block) i = rows.findIndex((r) => r.block);
  return i >= 0 ? rows[i] : null;
}

/** Prescription week for a row: 1–3 loading (capped at 3), 4 = deload (generatorV3.prescribe). */
export const rxWeek = (r: PlanRow): 1 | 2 | 3 | 4 => (r.deload ? 4 : (Math.min(3, Math.max(1, r.weekInBlock)) as 1 | 2 | 3));

/** F59g: the program has ended (from the day after `endDate`). Never for rolling programs. */
export const programEnded = (program: Pick<Program, 'endDate'>, todayKey: string) => !!program.endDate && todayKey > program.endDate;
/** F59g coach banner. */
export const endedLine = (teamName: string, endDate: string) => `${teamName}'s program ended ${md(endDate)}. Build the next one?`;
/** F59g athlete line (UX proposal, Product to confirm). */
export const athleteEndedLine = (endDate: string) => `Your program finished ${md(endDate)}. Your coach is setting up the next one.`;

/** F58c end type lines (known conflict 4: "Ends fresh" → "Tapers into"). */
export const END_TYPE_TEXT: Record<EndType, { title: string; line: string }> = {
  season: { title: 'Season starts', line: 'Tapers into the first match or practice.' },
  testing: { title: 'Testing day', line: 'The last week is lighter, with testing at the end.' },
  break: { title: 'Break', line: 'Full training through the last week.' },
  none: { title: 'Nothing special', line: 'Blocks run in order to the end.' },
};
