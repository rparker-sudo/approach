// 2.4.2 acceptance (docs/specs/v2.4.2.md v1.1; content/programs/program-planner-v3.md v1.0): Part A (program length planner),
// Part B (Your weight room), Part C (rack-aware generation), Part D (coaching layer and cooldown), Data. Logic and source
// checks; the screens are checked in the browser (browser-v242.js).
/* eslint-disable @typescript-eslint/no-require-imports */
declare const require: (m: string) => unknown;
declare const __dirname: string;
const fs = require('fs') as { readFileSync: (p: string, e: 'utf8') => string; readdirSync: (p: string) => string[]; existsSync: (p: string) => boolean };
const path = require('path') as { join: (...p: string[]) => string };
import { FLAGS } from '../../src/lib/flags';
import { generateProgram, type GeneratorInput } from '../../src/lib/generator';
import { planWeek, type BlockType } from '../../src/lib/generatorV3';
import { resolveSession, type AthleteContext } from '../../src/lib/resolve';
import { addDays, dateKey, fromKey, weekPlan, mondayOf } from '../../src/lib/calendar';
import { blockRuns, endSuggestions, offSeasonBlocks, planOf, planTimeline, summaryLine, defaultEndType, lengthLine, dateError, type PlanInput } from '../../src/lib/planner';
import { setupFromProgram, type DayKind } from '../../src/lib/homeV3';
import type { CalendarEvent, EndType, Program } from '../../src/lib/types';

let f = 0;
const ok = (c: boolean, m: string) => {
  console.log(c ? 'pass' : 'FAIL', m);
  if (!c) f++;
};
const read = (p: string) => fs.readFileSync(path.join(__dirname, '../..', p), 'utf8');
const short = (list: { block: string; weeks: number }[]) => list.map((b) => `${b.block}${b.weeks}`).join(' ');
const kindsOf = (s: string): DayKind[] => s.split(' ').map((x) => ({ O: 'off', W: 'room', H: 'home', M: 'mobility' })[x] as DayKind);
const off = Array(7).fill('off') as Program['volleyballWeek'];
const ath = (level: 1 | 2 | 3, extra: Partial<AthleteContext> = {}): AthleteContext => ({ level, logs: [], minor: true, levelConfirmed: false, homeEquipment: [], ...extra });
const team = (p: Program, events: CalendarEvent[] = []): Program => ({ ...p, teamId: 't', postedAt: 'x', events });
const build = (kinds: string, o: Partial<GeneratorInput> = {}) =>
  generateProgram({ position: 'Outside Hitter', phase: 'off', experience: 'intermediate', volleyballWeek: off, liftDaysPerWeek: 2, kinds: kindsOf(kinds), ...o });
const inp = (start: string, end: string, endType: EndType, events: CalendarEvent[] = [], phase: PlanInput['phase'] = 'off'): PlanInput => ({ start, end, endType, phase, events, liftDays: [1, 3] });

/* =================== PART A =================== */
ok(FLAGS.plannerV3 === true, 'Kill switch: plannerV3 is a code constant, on (spec D-068.6)');

// A-1: start + end date or start + weeks, end type; the plan shows every week's block, deloads, taper and testing suggestions.
const p8 = planTimeline(inp('2026-11-30', '2027-01-24', 'season', [{ date: '2027-01-26', type: 'game' }]));
ok(p8.rows.length === 8 && p8.rows.every((r) => r.block && r.weekInBlock >= 1 && r.blockWeeks >= 1) && p8.rows.some((r) => r.deload) && p8.rows[7].taper && !!p8.rows[0].testDate && !!p8.rows[7].testDate,
  `A-1 plan view rows: every week has a block and week in block, deloads, the taper and testing suggestions (${p8.rows.map((r) => `${r.block}${r.weekInBlock}/${r.blockWeeks}${r.deload ? 'D' : ''}${r.taper ? 'T' : ''}${r.testDate ? '*' : ''}`).join(' ')})`);
const sumLine = summaryLine(p8, inp('2026-11-30', '2027-01-24', 'season', [{ date: '2027-01-26', type: 'game' }]));
ok(sumLine === '8 weeks, Nov 30 – Jan 24: Accumulation (3) → Strength (3) → Power (2). Tapers into the first match on Jan 26.', `A-1 / F59a summary line = the planner example with Legal's one substitution (known conflict 4): "${sumLine}"`);
ok(lengthLine('2026-11-30', '2027-01-24') === '8 weeks · Mon Nov 30 – Sun Jan 24.' && lengthLine('2026-11-30', '2027-01-20') === '7 weeks and 3 days · Mon Nov 30 – Wed Jan 20. The last 3 days are a short week.' && lengthLine('2026-11-30', '2026-12-06') === '1 week · Mon Nov 30 – Sun Dec 6.',
  'A-1 / F58b length line shows both forms (and the short-week variant)');
ok(dateError('2026-11-30', '2026-11-29', true, '2026-11-20') === 'End date must be after the start date.' && dateError('2026-11-30', '2027-12-30', true, '2026-11-20') === 'Programs can be up to 52 weeks. Pick an earlier end date.' && dateError('2026-11-10', '2026-12-30', true, '2026-11-20') === 'Pick today or a later start date.' && dateError('2026-11-30', '2027-11-28', true, '2026-11-20') === null,
  'A-1 / F58e validation lines (input errors only; 52 weeks allowed)');

// A-2: 8-week season = Acc 3 → Str 3 → Power 2, last week −30%; 8-week nothing special = Acc 4 → Str 4.
const s8 = offSeasonBlocks(8, 'season');
const n8 = offSeasonBlocks(8, 'none');
ok(short(s8) === 'accumulation3 strength3 power2' && s8[2].taper && !s8[2].deload, `A-2 8 weeks, Season starts: ${short(s8)}, last week taper (−30% volume)`);
ok(short(n8) === 'accumulation4 strength4', `A-2 8 weeks, Nothing special: ${short(n8)}`);
// Taper = −30% volume in resolveSession (sets × 0.7 on the main lift).
{
  const prog = team(build('O W O W O O O', { start: '2026-11-30', endDate: '2027-01-24', endType: 'season', planEvents: [{ date: '2027-01-26', type: 'game' }] }), [{ date: '2027-01-26', type: 'game' }]);
  const s = prog.sessions.find((x) => x.name.startsWith('Day 1'))!;
  const w7 = resolveSession(prog, s, ath(2), fromKey('2027-01-12')).exercises.find((e) => e.exerciseId === 'back-squat');
  const w8 = resolveSession(prog, s, ath(2), fromKey('2027-01-19')).exercises.find((e) => e.exerciseId === 'back-squat');
  const pw = planWeek(prog, fromKey('2027-01-19'));
  // Power week 2 is 3 × 2 at 82.5% (program-design §5b); the taper keeps the intensity and cuts sets about 30% (3 → 2).
  ok(pw.block === 'power' && !!pw.taper && !!w7 && !!w8 && w7.sets === 3 && w8.sets === 2 && w8.pct === 82.5, `A-2 taper week in the athlete's session: Back Squat ${w7?.sets} sets (Power week 1) → ${w8?.sets} sets at ${w8?.pct}% (Power week 2 is 3 × 2: −30% volume, same intensity), block ${pw.block}`);
}

// A-3: crossing the first practice switches to preseason Power at that date; crossing the first match switches to Maintain.
const ev3: CalendarEvent[] = [{ date: '2026-12-15', type: 'practice' }];
for (let k = 0; k < 9; k++) ev3.push({ date: dateKey(addDays(fromKey('2027-01-05'), k * 7)), type: 'game' });
const pSpan = planTimeline(inp('2026-11-02', '2027-01-24', 'none', ev3));
const firstPre = pSpan.rows.find((r) => r.phase === 'pre')!;
const firstIn = pSpan.rows.find((r) => r.phase === 'in')!;
ok(firstPre.start <= '2026-12-15' && firstPre.end >= '2026-12-15' && pSpan.rows.filter((r) => r.phase === 'pre').every((r) => r.block === 'power'),
  `A-3 crosses the first practice (Dec 15): preseason Power from that week (${firstPre.start})`);
ok(firstIn.start <= '2027-01-05' && firstIn.end >= '2027-01-05' && pSpan.rows.filter((r) => r.phase === 'in').every((r) => r.block === 'maintain'),
  `A-3 crosses the first match (Jan 5): Maintain from that week (${firstIn.start})`);
const spanLine = summaryLine(pSpan, inp('2026-11-02', '2027-01-24', 'none', ev3));
ok(spanLine === '12 weeks, Nov 2 – Jan 24: Strength (4) → Strength-Power (2) → Power (preseason, 3) → Maintain (in-season, 3).', `A-3 / F59a spans-phases line = the UX example: "${spanLine}"`);
{
  // The athlete's session follows the date's block (prescriptions) and phase (§9 plyo cap).
  const prog = team(build('O W O W O O O', { start: '2026-11-02', endDate: '2027-01-24', endType: 'none', planEvents: ev3 }), ev3);
  const b = (d: string) => planWeek(prog, fromKey(d));
  ok(b('2026-11-10').block === 'strength' && b('2026-12-22').block === 'power' && b('2026-12-22').phase === 'pre' && b('2027-01-12').block === 'maintain' && b('2027-01-12').phase === 'in',
    `A-3 resolveSession block by date: Nov 10 ${b('2026-11-10').block}, Dec 22 ${b('2026-12-22').block}/${b('2026-12-22').phase}, Jan 12 ${b('2027-01-12').block}/${b('2027-01-12').phase}`);
}

// A-4: a coach break inside the window re-flows to the same end date, shortening Accumulation first; no block under 2.
{
  const ev: CalendarEvent[] = [{ date: '2027-01-26', type: 'game' }, { date: '2026-12-21', type: 'break', endDate: '2027-01-03', label: 'Winter break' }];
  const p = planTimeline(inp('2026-11-30', '2027-01-24', 'season', ev));
  const runs = blockRuns(p);
  const paused = p.rows.filter((r) => !r.block).length;
  const lens: Record<string, number> = {};
  for (const r of p.rows) if (r.block) lens[`${r.block}:${r.blockWeeks}`] = r.blockWeeks;
  ok(p.rows[p.rows.length - 1].end === '2027-01-24' && paused === 2 && !runs.some((r) => r.block === 'accumulation') && Object.values(lens).every((n) => n >= 2) && p.rows[p.rows.length - 1].taper,
    `A-4 Winter break (2 weeks) inside an 8-week plan: still ends Jan 24 with the taper; Accumulation removed first; no block under 2 (${runs.map((r) => `${r.block} ${r.weeks}`).join(' → ')})`);
  const ev2: CalendarEvent[] = [{ date: '2026-12-07', type: 'break', endDate: '2026-12-13', label: 'Break' }];
  const q = planTimeline(inp('2026-11-30', '2027-01-24', 'none', ev2));
  ok(blockRuns(q).map((r) => `${r.block}${r.weeks}`).join(' ') === 'accumulation3 strength4' && q.rows[1].block === null, `A-4 one-week break in an 8-week Nothing special plan: Accumulation 4 → 3, Strength 4 kept (${blockRuns(q).map((r) => `${r.block}${r.weeks}`).join(' ')})`);
  const ev3b: CalendarEvent[] = [{ date: '2026-12-21', type: 'break', endDate: '2027-01-10', label: 'Long break' }];
  const lb = planTimeline(inp('2026-11-30', '2027-03-21', 'none', ev3b));
  ok(lb.rows.some((r) => r.restart) && lb.rows[lb.rows.length - 1].end === '2027-03-21', `A-4 break of 14+ days: the interrupted block restarts at week 1 after it (§1b step 6), plan still ends Mar 21`);
}

// A-5: rebuilding after a date change only changes generated sessions.
{
  const base = build('O W O W O H M', { start: '2026-11-30', endDate: '2027-01-24', endType: 'season' });
  const src = read('src/app/builder.tsx');
  ok(/if \(\(weekSetup \|\| planner\) && existing\)/.test(src) && /sourceOf\(existing, prev\) === 'coach'/.test(src) && /Approach Strength's sessions are rebuilt\. Sessions you've edited keep your edits\./.test(src),
    'A-5 rebuild (D-068.5): a coach-edited session keeps its edits on its day; the F57a confirm wording');
  void base;
}

// A-6 (Product): every §1c row, both columns; in-between lengths add the extra week to the earliest block.
const T: Record<number, [string, string]> = {
  1: ['power1', 'strength1'], 2: ['power2', 'strength2'], 3: ['strength_power2 power1', 'strength3'], 4: ['strength2 power2', 'strength4'],
  5: ['accumulation2 strength_power2 power1', 'accumulation2 strength3'], 6: ['strength3 strength_power2 power1', 'accumulation3 strength3'],
  7: ['strength4 strength_power2 power1', 'accumulation4 strength3'], 8: ['accumulation3 strength3 power2', 'accumulation4 strength4'],
  9: ['accumulation4 strength3 power2', 'accumulation5 strength4'], 10: ['accumulation3 strength4 strength_power2 power1', 'accumulation3 strength4 strength_power3'],
  11: ['accumulation4 strength4 strength_power2 power1', 'accumulation4 strength4 strength_power3'], 12: ['accumulation4 strength4 strength_power3 power1', 'accumulation4 strength4 strength_power4'],
  13: ['accumulation5 strength4 strength_power3 power1', 'accumulation5 strength4 strength_power4'], 14: ['accumulation4 strength4 strength2 strength_power3 power1', 'accumulation4 strength4 strength_power4 strength2'],
  16: ['accumulation4 strength4 strength4 strength_power3 power1', 'accumulation4 strength4 strength_power4 strength4'],
};
const bad6: string[] = [];
for (const [n, [sea, none]] of Object.entries(T)) {
  if (short(offSeasonBlocks(Number(n), 'season')) !== sea) bad6.push(`${n} season: ${short(offSeasonBlocks(Number(n), 'season'))}`);
  if (short(offSeasonBlocks(Number(n), 'none')) !== none) bad6.push(`${n} none: ${short(offSeasonBlocks(Number(n), 'none'))}`);
}
ok(!bad6.length, `A-6 §1c table rows 1–16 (both columns; 7, 9, 11, 13 add the week to the earliest block)${bad6.length ? ` · ${bad6.join('; ')}` : ''}`);
// Deloads: every block ends with one except the one right before the taper week; never more than 4 loading weeks in a row.
const flagsBad: string[] = [];
for (let n = 1; n <= 52; n++) for (const e of ['season', 'none', 'testing', 'break'] as EndType[]) {
  const list = offSeasonBlocks(n, e);
  if (list.reduce((x, b) => x + b.weeks, 0) !== n) flagsBad.push(`${n}${e}: sum`);
  let run = 0;
  for (const b of list) for (let w = 1; w <= b.weeks; w++) {
    const deload = w === b.weeks && b.deload;
    const taper = w === b.weeks && b.taper;
    run = deload || taper || b.block === 'restore' ? 0 : run + 1;
    if (run > 4) flagsBad.push(`${n}${e}: ${run} loading weeks`);
  }
  if (e === 'testing' && !list[list.length - 1].deload) flagsBad.push(`${n} testing: last week not a deload`);
  if (e === 'break' && list[list.length - 1].deload) flagsBad.push(`${n} break: last week is a deload`);
  if (list.slice(0, -1).some((b) => b.weeks < 2 && b.block !== 'restore')) flagsBad.push(`${n}${e}: block under 2`);
}
ok(!flagsBad.length, `A-6 deloads (§1b step 4) and end types for 1–52 weeks: sums, ≤ 4 loading weeks in a row, Testing day ends on a deload, Break ends loading, no block under 2${flagsBad.length ? ` · ${[...new Set(flagsBad)].slice(0, 5).join('; ')}` : ''}`);
// 17+: Strength → Strength-Power cycles with a Restore week every 12–16 weeks, anchored to the end.
const long: string[] = [];
for (let n = 17; n <= 52; n++) for (const e of ['season', 'none'] as EndType[]) {
  const list = offSeasonBlocks(n, e);
  const flat = list.flatMap((b) => Array(b.weeks).fill(b.block) as BlockType[]);
  const restores = flat.map((b, i) => (b === 'restore' ? i : -1)).filter((i) => i >= 0);
  const gaps = [...restores.map((i, k) => (k ? i - restores[k - 1] : null)).filter((x): x is number => x != null), flat.length - 1 - (restores[restores.length - 1] ?? -99)];
  const middle = list.slice(2, e === 'season' ? -2 : -1).every((b) => ['strength', 'strength_power', 'restore'].includes(b.block));
  const tail = e === 'season' ? list[list.length - 1].block === 'power' && list[list.length - 2].block === 'strength_power' : list[list.length - 1].block === 'strength_power';
  const head = list[0].block === 'accumulation' && list[1].block === 'strength';
  if (!middle || !tail || !head || (restores.length && gaps.some((g) => g > 16))) long.push(`${n}${e}: ${short(list)}`);
}
ok(!long.length, `A-6 17–52 weeks: Accumulation → Strength, then Strength / Strength-Power cycles with Restore weeks ≤ 16 weeks apart, anchored to the end${long.length ? ` · ${long.slice(0, 3).join('; ')}` : ''}`);
// Other phases table.
{
  const pre = (n: number) => {
    const ev: CalendarEvent[] = [{ date: '2026-11-30', type: 'practice' }, { date: dateKey(addDays(fromKey('2026-11-30'), n * 7 + 1)), type: 'game' }];
    return planTimeline(inp('2026-11-30', dateKey(addDays(fromKey('2026-11-30'), n * 7 - 1)), 'season', ev));
  };
  const p2 = pre(2);
  const p4 = pre(4);
  ok(p2.rows.every((r) => r.phase === 'pre' && r.block === 'power' && !r.deload) && p2.rows[1].taper && p4.rows.every((r) => r.block === 'power') && p4.rows.slice(0, 3).every((r) => !r.taper && !r.deload) && p4.rows[3].taper,
    'A-6 preseason: 1–2 weeks all Power, no deload, last week −30%; 3–4 weeks Power 3 + taper week');
  const ev: CalendarEvent[] = [];
  for (let k = 0; k < 10; k++) if (k !== 5) ev.push({ date: dateKey(addDays(fromKey('2026-09-02'), k * 7)), type: 'game' });
  const ins = planTimeline(inp('2026-08-31', dateKey(addDays(fromKey('2026-08-31'), 10 * 7 - 1)), 'none', ev));
  const inRows = ins.rows.filter((r) => r.phase === 'in');
  ok(inRows.every((r) => r.block === 'maintain' && r.blockWeeks === 2) && inRows.map((r) => r.weekInBlock).join('') === '1212121212' && inRows[3].taper && !inRows[7].taper,
    `A-6 in-season: Maintain 2-week cycles; −30% every 4th week unless a bye week is in that stretch (weeks 4: ${inRows[3].taper}, 8: ${inRows[7].taper}; bye in week 6)`);
  const evp: CalendarEvent[] = [{ date: '2026-11-01', type: 'game' }, { date: '2026-11-08', type: 'game' }];
  const post = planTimeline(inp('2026-11-09', '2027-01-31', 'none', evp));
  const pr = post.rows.filter((r) => r.phase === 'post');
  ok(pr.length >= 2 && pr.length <= 4 && pr.every((r) => r.block === 'restore') && post.rows.filter((r) => r.phase === 'off')[0]?.block === 'accumulation',
    `A-6 post-season: Restore ${pr.length} weeks, then off-season Accumulation`);
}

// A-7 (Product): Testing day end; testing suggestions never within 48 h of a match on the combined calendar.
{
  const pt = planTimeline(inp('2026-11-30', '2027-01-24', 'testing'));
  const last = pt.rows[pt.rows.length - 1];
  ok(last.deload && last.testDate === '2027-01-21', `A-7 Testing day: the last week is a deload with the suggested test on its last lift day (${last.testDate})`);
  // Another team's match (an athlete's combined calendar) on Sat Jan 23 blocks Thu Jan 21; Tue Jan 19 is used.
  const other: CalendarEvent[] = [{ date: '2027-01-23', type: 'game', teamName: 'Club 16s' }];
  const po = planTimeline(inp('2026-11-30', '2027-01-24', 'testing', other));
  ok(po.rows[po.rows.length - 1].testDate === '2027-01-19', `A-7 48 h rule checks every team on the combined calendar: another team's Sat match moves the suggestion to Tue (${po.rows[po.rows.length - 1].testDate})`);
  const s = summaryLine(po, inp('2026-11-30', '2027-01-24', 'testing', other));
  ok(!/Club|16s/.test(s) && !/Club|16s/.test(JSON.stringify(po.rows)), 'A-7 another team is never named in the plan (neutral)');
  // If no lift day in the last week qualifies: an earlier day or none.
  const all: CalendarEvent[] = [{ date: '2027-01-20', type: 'game' }, { date: '2027-01-23', type: 'game' }];
  const pn = planTimeline(inp('2026-11-30', '2027-01-24', 'testing', all));
  ok(!pn.rows[7].testDate && pn.rows[6].testDate === '2027-01-14', `A-7 no qualifying day in the last week: an earlier day (${pn.rows[6].testDate}), never inside 48 h`);
  // Baseline: only when this team has had no testing day in the last 12 weeks (this team's days only).
  const recentOwn = planTimeline(inp('2026-11-30', '2027-01-24', 'none', [{ date: '2026-10-15', type: 'practice', test: 'full' }]));
  const recentOther = planTimeline(inp('2026-11-30', '2027-01-24', 'none', [{ date: '2026-10-15', type: 'practice', test: 'full', teamName: 'Club' }]));
  ok(!recentOwn.rows[0].testDate && !!recentOther.rows[0].testDate, 'A-7 week-1 baseline uses this team\'s testing days only (another team\'s testing never counts or shows)');
  // Suggestions are date markers only: they don't write calendar events or unlock anything.
  const prog = build('O W O W O O O', { start: '2026-11-30', endDate: '2027-01-24', endType: 'testing' });
  ok(!(prog.events ?? []).some((e) => e.test) && !/testDate/.test(JSON.stringify(prog)), 'A-7 suggestions are never stored or written as testing days (the coach adds one through the existing Add testing day rules)');
}

// A-8 (Product): a program saved before 2.4.2 keeps rolling blocks; the end prompt shows once the end date passes.
{
  const legacy = team(build('O W O W O O O'));
  const w0 = planWeek(legacy, fromKey(legacy.blockStart!));
  const w5 = planWeek(legacy, addDays(fromKey(legacy.blockStart!), 35));
  ok(!legacy.endDate && planOf(legacy) === null && w0.week === 1 && w5.week === 2 && w5.blockIndex === 1, `A-8 no endDate: rolling 4-week blocks unchanged (week 6 = block 2 week 2: ${w5.blockIndex + 1}/${w5.week})`);
  const ended = { ...team(build('O W O W O O O', { start: '2026-11-30', endDate: '2027-01-24', endType: 'season' })) };
  const wk = weekPlan(ended, mondayOf(fromKey('2027-01-25')));
  ok(wk.every((d) => !d.sessionId) && wk[1].note === 'Program finished', 'A-8 after the end date there is no session (F59g athlete line)');
  const src = read('src/lib/planner.ts');
  ok(/todayKey > program\.endDate/.test(src) && /'s program ended \$\{md\(endDate\)\}\. Build the next one\?/.test(src), 'A-8 / F59g the ended prompt shows from the day after the end date, never for rolling programs');
}

// F58d / F58c: suggested end dates from this team's own first practice or match only; default end type.
{
  const ev: CalendarEvent[] = [{ date: '2027-01-04', type: 'practice' }, { date: '2027-01-26', type: 'game' }, { date: '2026-12-12', type: 'game', teamName: 'Club' }];
  const sug = endSuggestions(ev, '2026-11-30');
  ok(sug.map((x) => x.label).join(' | ') === 'Sun Jan 3 · before first practice Jan 4 | Sun Jan 24 · before first match Jan 26', `F58d chips: ${sug.map((x) => x.label).join(' | ')}`);
  ok(defaultEndType(ev, '2026-11-30') === 'season' && defaultEndType([{ date: '2027-01-26', type: 'game', teamName: 'Club' }], '2026-11-30') === 'none', 'F58c default: Season starts only with this team\'s first match after the start');
}

/* =================== DATA =================== */
// (Completed after Parts B–D.)

console.log(f ? `${f} FAIL` : 'all pass');
if (f) process.exitCode = 1;
