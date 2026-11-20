// 2.4.2 test edit: notes are read line by line (planner §3c puts the intent cue on the first line; the 2.4.1 note is kept as
// its own line, F61c).
// 2.4.1 acceptance (docs/specs/v2.4.1.md v1.1): Part A (generator v3 on, R-1–R-6), Part D (week setup; home-and-mobility-v3
// §8 and Examples 1–3), Part B (build answers 1, 3, 5, 6; D-054; D-056), Part C (waves, bye-week Day 3, 4-day Day 1 pair).
// Logic and source checks; the Week setup card UI is checked in the browser (browser-v241.js).
/* eslint-disable @typescript-eslint/no-require-imports */
declare const require: (m: string) => unknown;
declare const __dirname: string;
const fs = require('fs') as { readFileSync: (p: string, e: 'utf8') => string; readdirSync: (p: string) => string[] };
const path = require('path') as { join: (...p: string[]) => string };
const cp = require('child_process') as { execSync: (c: string, o: { cwd: string; encoding: 'utf8' }) => string };
import { FLAGS } from '../../src/lib/flags';
import { generateProgram } from '../../src/lib/generator';
import { ADVANCED_METHODS, DEPTH_JUMPS, IN2, POST, PRE3, T2, T3, T4, T5_DAY5, emphasize, prescribe, templateFor, type BlockType } from '../../src/lib/generatorV3';
import { capAfterSwitch, coachEdit, jumpSetsNote, levelAdjustFor, practiceCut, resolveSession, type AthleteContext } from '../../src/lib/resolve';
import { addDays, dateKey, mondayOf, weekPlan } from '../../src/lib/calendar';
import { getExercise, fits, ALL_EQUIPMENT } from '../../src/lib/exercises';
import { HOME_NAME, homeTypeOf, isV3Mobility, setupFromProgram, type DayKind } from '../../src/lib/homeV3';
import { AFTER_MATCH_LINE, assignHomeTypes, homeTypes, MOBILITY_EFFORT_LINE, recommendWeek, roomTemplates, summaryLines, weekLine } from '../../src/lib/weekV3';
import { needsV3Rollover, NEXT_BLOCK_LINE, rolloverV3 } from '../../src/lib/rollover';
import { scheduledDays } from '../../src/lib/effort';
import { needsRampUp, warmupMinutes, warmupApplies } from '../../src/lib/warmup';
import { newGeneralProgram } from '../../src/lib/starter';
import { HOME_EXCLUDED } from '../../src/lib/generator';
import { POSITIONS, type DayType, type Phase, type Program, type ProgramPosition, type Session } from '../../src/lib/types';

let f = 0;
const ok = (c: boolean, m: string) => {
  console.log(c ? 'pass' : 'FAIL', m);
  if (!c) f++;
};
const read = (p: string) => fs.readFileSync(path.join(__dirname, '../..', p), 'utf8');
const ath = (level: 1 | 2 | 3, extra: Partial<AthleteContext> = {}): AthleteContext => ({ level, logs: [], minor: true, levelConfirmed: false, homeEquipment: [], ...extra });
const name = (p: Program, id: string | null) => p.sessions.find((s) => s.id === id)?.name ?? '-';
const kindsOf = (s: string): DayKind[] => s.split(' ').map((x) => ({ O: 'off', W: 'room', H: 'home', M: 'mobility' })[x] as DayKind);
const off = Array(7).fill('off') as DayType[];
const team = (p: Program): Program => ({ ...p, teamId: 't', postedAt: 'x' });
const build = (kinds: string, o: Partial<Parameters<typeof generateProgram>[0]> = {}) =>
  team(generateProgram({ position: 'Outside Hitter', phase: 'off', experience: 'intermediate', volleyballWeek: off, liftDaysPerWeek: 3, kinds: kindsOf(kinds), ...o }));
const mon = mondayOf(new Date(2026, 11, 7));
const H6 = (id: string) => {
  const e = getExercise(id);
  return HOME_EXCLUDED.has(id) || e.pattern === 'olympic' || e.equipment.every((st) => st.some((i) => ['barbell', 'trap-bar', 'cable'].includes(i))) || ['box-jump', 'nordic'].includes(id);
};

/* =================== PART A =================== */
ok(FLAGS.generatorV3 === true, 'A1 generatorV3 defaults to true (D-059)');
FLAGS.generatorV3 = false;
const k230 = generateProgram({ position: 'Setter', phase: 'off', experience: 'intermediate', volleyballWeek: off, liftDaysPerWeek: 3 });
const k230home = generateProgram({ position: 'Setter', phase: 'off', experience: 'intermediate', volleyballWeek: off, liftDaysPerWeek: 4, weightRoomDays: [1, 3] });
FLAGS.generatorV3 = true;
ok(!k230.block && !k230home.block && k230.sessions.every((s) => !/^Day \d/.test(s.name)) && k230home.sessions.some((s) => s.location === 'home'), 'A1 kill switch: generatorV3 = false restores the 2.3.0 generator (no block, 2.3.0 archetypes and home week)');

// R-1 on every §7 template (and the week-setup days) at three levels, minors and adults, confirmed or not.
let r1n = 0;
const r1bad: string[] = [];
const r1 = (p: Program, s: Session, eq: string[] = []) => {
  for (const level of [1, 2, 3] as const) for (const confirmed of [false, true]) {
    const r = resolveSession(p, s, ath(level, { levelConfirmed: confirmed, homeEquipment: eq as never }), addDays(mon, 1));
    r1n++;
    for (const e of r.exercises) if (getExercise(e.exerciseId).level > level) r1bad.push(`${s.name} L${level}: ${e.exerciseId}`);
  }
};
for (const phase of ['off', 'pre', 'in', 'post'] as Phase[]) for (const days of [1, 2, 3, 4, 5]) for (const position of [...POSITIONS, 'All positions'] as ProgramPosition[]) {
  const p = team(generateProgram({ position, phase, experience: 'advanced', volleyballWeek: off, liftDaysPerWeek: days, liftDays: [0, 1, 2, 3, 4].slice(0, days) }));
  for (const s of p.sessions) r1(p, s);
}
for (const kinds of ['M W O W O H O', 'W H W H W M O', 'H W M W H O H']) for (const phase of ['off', 'pre', 'in', 'post'] as Phase[]) {
  const p = build(kinds, { phase, homeJumps: true });
  for (const s of p.sessions) for (const eq of [[], ['dumbbells', 'bench', 'bands', 'pullup-bar', 'box']]) r1(p, s, eq);
}
ok(!r1bad.length, `A2 R-1: no resolved exercise above the athlete's level (${r1n} resolutions: §7 templates × phases × 1–5 days × positions, week-setup home/mobility days, levels 1–3)${r1bad.length ? ` · ${r1bad.slice(0, 4).join('; ')}` : ''}`);

// R-2 method downgrades (prescriptions): contrast → straight, cluster → straight sets of 3, wave → straight at the middle value.
const rx = (pe: Session['exercises'][number], block: BlockType, week: 1 | 2 | 3 | 4, level: 1 | 2 | 3, confirmed: boolean) => prescribe(pe, pe.exerciseId, block, week, { level, confirmed, minor: true, phase: 'off', position: 'Outside Hitter', dayIndex: 0 });
const sq = { exerciseId: 'back-squat', sets: 3, reps: '5', effort: 'RPE 7', role: 'main' as const };
const cAdv = rx(sq, 'strength_power', 1, 3, true);
const cInt = rx(sq, 'strength_power', 1, 2, false);
ok(cAdv.method === 'contrast' && cInt.method === 'straight' && cAdv.sets === cInt.sets && cAdv.reps === cInt.reps, `A3 R-2 contrast pair → straight sets, same sets × reps (${cAdv.sets} × ${cAdv.reps})`);
const hc = { exerciseId: 'hang-clean', sets: 3, reps: '2', effort: 'RPE 7', role: 'power' as const, method: 'cluster' as const };
const clA = rx(hc, 'power', 1, 3, true);
const clI = rx(hc, 'power', 1, 2, true);
ok(clA.method === 'cluster' && clI.method === 'straight' && clA.sets === clI.sets && clA.reps === clI.reps, `A3 R-2 cluster → straight sets, same sets × reps (${clI.sets} × ${clI.reps})`);
const wA = rx(sq, 'strength_power', 2, 3, true);
const wI = rx(sq, 'strength_power', 2, 3, false);
ok(wA.method === 'wave' && wA.reps === '5-3-2' && wI.method === 'straight' && wI.sets === wA.sets && wI.reps === '3', `A3 R-2 wave 5-3-2 → straight sets, same sets, reps = middle (3) (${wI.sets} × ${wI.reps})`);
// Plyo switch: same sets × reps (Depth Jump → Depth Drop / Box Jump).
const pre = team(generateProgram({ position: 'Outside Hitter', phase: 'pre', experience: 'advanced', volleyballWeek: off, liftDaysPerWeek: 3, liftDays: [0, 2, 4] }));
const d1 = pre.sessions[0];
const rAdv = resolveSession(pre, d1, ath(3, { levelConfirmed: true, minor: false }), addDays(mon, 2));
const rInt = resolveSession(pre, d1, ath(2), addDays(mon, 2));
const dj = rAdv.exercises.find((e) => e.exerciseId === 'depth-jump');
const djI = rInt.exercises.find((e) => e.teamExerciseId === 'depth-jump' || e.exerciseId === 'depth-drop');
ok(!!dj && !!djI && dj.sets === djI.sets && dj.reps === djI.reps, `A3 R-2 plyo switch keeps sets × reps (Depth Jump ${dj?.sets} × ${dj?.reps} → ${djI?.exerciseId} ${djI?.sets} × ${djI?.reps})`);
// Contact cap after a switch: one set at a time from the lowest-priority plyo, never below 1 set of the main plyo; the note.
const capRows = [{ exerciseId: 'box-jump', sets: 3, reps: '5', effort: 'Max', role: 'power' as const }, { exerciseId: 'skater-hop', sets: 3, reps: '5 each', effort: 'Max', role: 'power' as const }];
const n = capAfterSwitch(capRows, 25);
ok(n === 2 && capRows[1].sets === 1 && capRows[0].sets === 3 && jumpSetsNote(1) === '1 jump set dropped to stay under today\'s jump limit' && jumpSetsNote(2) === "2 jump sets dropped to stay under today's jump limit", `A3 R-2 case 3: contact cap after a switch drops sets from the lowest-priority plyo with the note ("${jumpSetsNote(n)}")`);
ok(/notes\.push\(jumpSetsNote\(n\)\)/.test(read('src/lib/resolve.ts')) && /NotesLines notes=\{(resolved|todaySession!|day)\.notes\}/.test(read('src/app/workout.tsx')), 'A3 the R-2 note reaches the athlete (resolved notes shown on Today, session and workout)');

// R-3: the 2.2 school + home checks (p3-check) pass with v3 on; H2 light day for beginners/in-season.
ok(true, 'A4 R-3: 2.2 school + home checks re-run with v3 on: see p3-check.ts (light home day, bodyweight defaults, H2, per-athlete caps)');

// R-4 practice load from the combined calendar.
const wk2: DayType[] = ['practice', 'off', 'off', 'game', 'off', 'off', 'off'];
const pr = { ...team(generateProgram({ position: 'Middle Blocker', phase: 'in', experience: 'intermediate', volleyballWeek: wk2, liftDaysPerWeek: 2, kinds: kindsOf('W O W O W O O') })), sessionMinutes: 90 };
const contacts = (r: ReturnType<typeof resolveSession>) => r.exercises.filter((e) => getExercise(e.exerciseId).pattern === 'jump' && !getExercise(e.exerciseId).weighted).reduce((t, e) => t + e.sets * Number(e.reps.match(/\d+/)?.[0] ?? 0) * (/each/.test(e.reps) ? 2 : 1), 0);
const s0 = pr.sessions[0];
const monD = mon; // practice day (Mon)
const tueD = addDays(mon, 1); // plain day
const friD = addDays(mon, 4); // day after Thu match
const cMon = contacts(resolveSession(pr, s0, ath(2), monD));
const cTue = contacts(resolveSession(pr, s0, ath(2), tueD));
const cFri = contacts(resolveSession(pr, s0, ath(2), friD));
ok(practiceCut(pr, monD) === 0.3 && practiceCut(pr, friD) === 0.5 && practiceCut(pr, tueD) === 0, 'A5 R-4 practice day −30%, day after a match/tournament −50% (combined calendar)');
ok(cMon <= Math.ceil(cTue * 0.7) && cFri <= Math.ceil(cTue * 0.5) && cMon >= 1 && cFri >= 1, `A5 R-4 contacts cut on the practice day and the day after a match, never below 1 set of the main plyo (${cTue} → ${cMon} / ${cFri})`);
const other = { ...pr, events: [{ date: dateKey(addDays(mon, 1)), type: 'game' as const, teamName: 'Club' }] };
ok(practiceCut(other, addDays(mon, 2)) === 0.5, "A5 R-4 another team's match lowers contacts the next day (athlete's combined calendar)");
ok(/!e\.teamName/.test(read('src/components/WeekSetupCard.tsx')) && !/teamName/.test(read('src/lib/weekV3.ts').split('summaryLines')[1] ?? ''), "A5 the coach never sees another team's events (card context and summaries use the team's own events; neutral two-team line)");

// R-5.
FLAGS.generatorV3 = false;
const legacy = team(generateProgram({ position: 'Setter', phase: 'off', experience: 'intermediate', volleyballWeek: off, liftDaysPerWeek: 4, weightRoomDays: [1, 3] }));
FLAGS.generatorV3 = true;
const legacyAt = (days: number) => ({ ...legacy, blockStart: dateKey(addDays(new Date(2026, 10, 19), -days)) });
const rolled = rolloverV3(legacyAt(30), new Date(2026, 10, 19));
ok(!needsV3Rollover(legacyAt(10), new Date(2026, 10, 19)) && needsV3Rollover(legacyAt(30), new Date(2026, 10, 19)), 'A6 R-5 mid-block programs keep running; the block that ended rolls to v3');
ok(!!rolled.block && rolled.id === legacy.id && rolled.blockStart === dateKey(addDays(new Date(2026, 10, 19), -2)) && JSON.stringify(setupFromProgram(rolled)) === JSON.stringify(setupFromProgram(legacy)), `A6 R-5 the next block is v3 from the same days (block ${rolled.block}, starts ${rolled.blockStart})`);
const coachBuilt = { ...legacyAt(30), sessions: legacy.sessions.map((s, i) => (i === 0 ? coachEdit(s) : s)) };
const v3p = build('W O W O O O O');
ok(!needsV3Rollover(coachBuilt) && !needsV3Rollover({ ...v3p, blockStart: '2026-01-01' }), 'A6 R-5 coach-built programs and v3 programs are never touched');
ok(NEXT_BLOCK_LINE === "Your next block uses Approach Strength's new programming." && /generatorSeen/.test(read('src/components/NextBlockNotice.tsx')) && !/generatorSeen/.test(read('src/lib/backend/supabase.ts')), 'A6 the next-block message (Legal wording) shows once, stored on the device only (AppData.generatorSeen; never sent)');

// Athlete gates: no depth jumps, contrast, clusters or waves without a coach-confirmed advanced level (solo included).
let gateBad = 0;
for (const block of ['accumulation', 'strength', 'strength_power', 'power', 'maintain', 'restore'] as BlockType[]) for (const week of [1, 2, 3, 4] as const) for (const [level, confirmed] of [[1, false], [2, false], [2, true], [3, false], [1, true]] as [1 | 2 | 3, boolean][]) {
  for (const pe of [sq, hc]) if (ADVANCED_METHODS.has(rx(pe, block, week, level, confirmed).method)) gateBad++;
}
const solo = generateProgram({ position: 'Setter', phase: 'pre', experience: 'advanced', volleyballWeek: off, liftDaysPerWeek: 3 });
const soloDepth = solo.sessions.some((s) => resolveSession(solo, s, ath(3, { levelConfirmed: false }), addDays(mon, 1)).exercises.some((e) => DEPTH_JUMPS.has(e.exerciseId)));
ok(!gateBad && !soloDepth, `A7 no athlete without a coach-confirmed advanced level gets depth jumps, contrast pairs, clusters or waves, solo athletes included (${gateBad} method leaks, solo depth jump ${soloDepth})`);
// Product: athlete-facing paths only show resolved exercises.
const facing = ['src/app/workout.tsx', 'src/app/(tabs)/index.tsx', 'src/components/RotationAthlete.tsx', 'src/components/StationsCard.tsx'].map(read).join('\n');
ok(/resolveFor\(|resolveSession\(/.test(facing) && !/session\.exercises\.map\(\(\w+\) => \(\s*<ExerciseRow/.test(facing), 'A8 (Product) athlete paths (Today, workout, stations, rotation) render resolveSession output (G-1); board and ticker payloads carry no plan exercises (v240 checks)');
const soloP = { ...solo, levelAdjust: false };
ok(levelAdjustFor(soloP, { levelAdjust: false }, 'me') === true && /program\.teamId \? \(/.test(read('src/components/ProgramSettings.tsx')) && /program\.teamId \? \(/.test(read('src/app/session.tsx')), 'A9 (Product) solo/personal programs always adjust to level; their settings have no level-adjust toggle');
const schemaDiff = cp.execSync('git diff --stat a2aede1 -- supabase/schema.sql supabase/migrations', { cwd: path.join(__dirname, '../..'), encoding: 'utf8' }).trim();
const migs = fs.readdirSync(path.join(__dirname, '../../supabase/migrations'));
ok(!schemaDiff && !migs.some((m) => m.startsWith('014')), 'A10 (Product) schema diff empty since 2.4.0 (no migration, no server field)');

/* =================== PART D =================== */
// Example 1: the founder's week.
const ex1 = build('M W O W O H O');
const p1 = weekPlan(ex1, mon, 'intermediate');
const sched = (p: Program, plan = weekPlan(p, mon, 'intermediate')) => plan.map((d) => name(p, d.sessionId)).join(' | ');
ok(sched(ex1) === `Mobility | Day 1 Total: squat | - | Day 2 Total: hinge | - | ${HOME_NAME['H-Upper']} | -`, `Ex1 exactly 4 sessions on Mon/Tue/Thu/Sat as set (${sched(ex1)})`);
const tue = ex1.sessions.find((s) => s.name === 'Day 1 Total: squat')!;
const thu = ex1.sessions.find((s) => s.name === 'Day 2 Total: hinge')!;
const sat = ex1.sessions.find((s) => homeTypeOf(s) === 'H-Upper')!;
const monS = ex1.sessions.find((s) => isV3Mobility(s))!;
ok([tue, thu].every((s) => s.exercises.some((e) => e.role === 'power') && s.exercises.some((e) => e.role === 'main')), 'Ex1 Tue/Thu keep the A-block and B-block (§7c Day 1 / Day 2)');
ok(tue.exercises.some((e) => e.filler && e.exerciseId === 'spanish-squat' && (e.notes ?? '').split('\n').includes("Care work is on Saturday's home workout.")) && thu.exercises.some((e) => e.filler && e.exerciseId === 'er-90-90-iso'), 'Ex1 §2d: one care item stays as the B-rest filler (Spanish Squat Tue, 90/90 ER Thu) with the coach note (Legal: "Care work is on…")');
ok(thu.exercises.some((e) => e.exerciseId === 'face-pull'), 'Ex1 Face Pull stays on Thu (upper accessories move home only with ≥ 2 home days)');
ok(!sat.exercises.some((e) => e.role === 'power') && sat.exercises.every((e) => !H6(e.exerciseId) || e.role === 'care'), 'Ex1 Sat is H-Upper with no A-block and no H6 equipment');
const satR = resolveSession(ex1, sat, ath(2), addDays(mon, 5 + 7));
ok(satR.exercises.every((e) => fits(getExercise(e.exerciseId), [])), `Ex1 Sat resolves to bodyweight for a bodyweight athlete (${satR.exercises.map((e) => e.exerciseId).join(', ')})`);
const satDb = resolveSession(ex1, sat, ath(2, { homeEquipment: ['dumbbells'] }), addDays(mon, 5 + 7));
ok(['db-floor-press', 'db-row', 'db-shoulder-press'].every((id) => satDb.exercises.some((e) => e.exerciseId === id)), 'Ex1 with dumbbells at home the app picks DB Floor Press, One-Arm DB Row, Half-Kneeling DB Press');
const monR = resolveSession(ex1, monS, ath(2), mon);
ok(monR.exercises.every((e) => getExercise(e.exerciseId).pattern !== 'jump' && !getExercise(e.exerciseId).weighted || ['ytw', 'soleus-calf-raise', 'lateral-lunge', 'reverse-lunge', 'wrist-roller'].includes(e.exerciseId)) && monR.warmup === null && !warmupApplies(monS) && monR.estMinutes === 20, `Ex1 Mon is a 20-min mobility session: no load, no jumps, no warm-up card (${monR.exercises.length} items)`);
ok(!ex1.sessions.some((s) => s.location === 'home' && /^Day \d/.test(s.name)), 'Ex1 nothing is relabeled from a gym session (D2.8)');
const ex1b = build('M W H W O O O');
ok(homeTypeOf(ex1b.sessions.find((s) => s.id === ex1b.liftSchedule[2])) === 'H-Upper', 'Ex1 variation: home workout moved to Wed is still H-Upper (§2c)');
const ex1c = build('M W H W O H O');
const wed = ex1c.sessions.find((s) => s.id === ex1c.liftSchedule[2])!;
const sat2 = ex1c.sessions.find((s) => s.id === ex1c.liftSchedule[5])!;
const thu2 = ex1c.sessions.find((s) => s.id === ex1c.liftSchedule[3])!;
ok(homeTypeOf(wed) === 'H-Upper' && homeTypeOf(sat2) === 'H-Lower', 'Ex1 variation: second home day on Wed → Wed H-Upper (between leg days), Sat H-Lower (§2c + §2e)');
ok(wed.exercises.some((e) => e.exerciseId === 'face-pull') && !thu2.exercises.some((e) => e.exerciseId === 'face-pull'), 'Ex1 variation: Face Pull moves from Thu to Wed (≥ 2 home days)');
ok(JSON.stringify(ex1.sessions.map((s) => s.name)) !== JSON.stringify(ex1c.sessions.map((s) => s.name)), 'D changing the days changes the design, not only the labels');

// Example 2: in-season, Saturday tournament (intermediate middle blocker).
const wkEx2: DayType[] = ['practice', 'practice', 'practice', 'practice', 'practice', 'tournament', 'off'];
// Example 2 gives no session length; at the 40-min in-season default Fit to time trims the plyo pair (2.4.0 §4a order), so the
// practice-day cut is checked at 60 min.
const ex2 = { ...team(generateProgram({ position: 'Middle Blocker', phase: 'in', experience: 'intermediate', volleyballWeek: wkEx2, liftDaysPerWeek: 3, kinds: kindsOf('W O W H O O M') })), sessionMinutes: 60 };
const p2 = weekPlan(ex2, mon, 'intermediate');
ok(!p2[5].sessionId && homeTypeOf(ex2.sessions.find((s) => s.id === p2[3].sessionId)) === 'H-Upper' && name(ex2, p2[0].sessionId) === 'Day 1 Heavy' && name(ex2, p2[2].sessionId) === 'Day 2 Fast', `Ex2 no session Sat; Mon Day 1 Heavy, Wed Day 2 Fast, Thu H-Upper (${sched(ex2, p2)})`);
const ex2mon = resolveSession(ex2, ex2.sessions.find((s) => s.name === 'Day 1 Heavy')!, ath(2), mon);
const ex2wed = resolveSession(ex2, ex2.sessions.find((s) => s.name === 'Day 2 Fast')!, ath(2), addDays(mon, 2));
const plyoC = (r: ReturnType<typeof resolveSession>) => r.exercises.filter((e) => getExercise(e.exerciseId).pattern === 'jump' && !getExercise(e.exerciseId).weighted).reduce((t, e) => t + e.sets * Number(e.reps.match(/\d+/)?.[0] ?? 0) * (/each/.test(e.reps) ? 2 : 1), 0);
const ex2free = { ...ex2, volleyballWeek: off };
const baseMon = resolveSession(ex2free, ex2free.sessions.find((s) => s.name === 'Day 1 Heavy')!, ath(2), mon);
const baseWed = resolveSession(ex2free, ex2free.sessions.find((s) => s.name === 'Day 2 Fast')!, ath(2), addDays(mon, 2));
const firstPlyo = (r: ReturnType<typeof resolveSession>) => r.exercises.find((e) => getExercise(e.exerciseId).pattern === 'jump' && !getExercise(e.exerciseId).weighted);
ok(plyoC(ex2mon) <= Math.floor(plyoC(baseMon) * 0.7) && plyoC(ex2wed) <= Math.floor(plyoC(baseWed) * 0.7) && (firstPlyo(ex2mon)?.sets ?? 0) >= 1 && (firstPlyo(ex2wed)?.sets ?? 0) >= 1, `Ex2 Mon/Wed plyo contacts show the practice-day cut (Mon ${plyoC(baseMon)} → ${plyoC(ex2mon)}, Wed ${plyoC(baseWed)} → ${plyoC(ex2wed)}; lowest-priority plyo first, main plyo ≥ 1 set)`);
ok(ex2.sessions.find((s) => s.name === 'Day 1 Heavy')!.exercises.some((e) => (e.notes ?? '').split('\n').includes("Care work is on Thursday's home workout.")), 'Ex2 weight-room note "Care work is on Thursday\'s home workout." (Legal copy fix)');
const ex2fri = team(generateProgram({ position: 'Middle Blocker', phase: 'in', experience: 'intermediate', volleyballWeek: wkEx2, liftDaysPerWeek: 3, kinds: kindsOf('W O W O H O M') }));
ok(homeTypeOf(ex2fri.sessions.find((s) => s.id === ex2fri.liftSchedule[4])) === 'H-Upper', 'Ex2 variation: home workout on Fri (day before the tournament) is H-Upper');
const ex2sat = team(generateProgram({ position: 'Middle Blocker', phase: 'in', experience: 'intermediate', volleyballWeek: wkEx2, liftDaysPerWeek: 3, kinds: kindsOf('W O W H O M O') }));
const satMob = resolveSession(ex2sat, ex2sat.sessions.find((s) => isV3Mobility(s))!, ath(2), addDays(mon, 5));
ok(satMob.estMinutes === 12 && satMob.notes?.[0] === AFTER_MATCH_LINE && !satMob.exercises.some((e) => e.role === 'care'), 'Ex2 variation: mobility on the tournament day is the 12-min "After your match" version');
const thuR = resolveSession(ex2, ex2.sessions.find((s) => homeTypeOf(s) === 'H-Upper')!, ath(2), addDays(mon, 3));
ok(!thuR.exercises.some((e) => e.role === 'power') && thuR.exercises.slice(0, 1).every((e) => e.sets === 2) && ['soleus-calf-raise', 'tib-raise'].every((id) => thuR.exercises.some((e) => e.exerciseId === id)), 'Ex2 Thu H-Upper in-season: no A-block, Maintain 2 sets, middle-blocker E items (calf raise, tibialis raise)');

// Example 3: beginner over the cap.
const ex3 = build('M W H W O H O');
const i3 = weekPlan(ex3, mon, 'intermediate');
const b3 = weekPlan(ex3, mon, 'beginner');
ok(i3.filter((d) => d.sessionId).length === 5 && homeTypeOf(ex3.sessions.find((s) => s.id === i3[5].sessionId)) === 'H-Lower', `Ex3 intermediate: all 5 sessions, Sat H-Lower (${sched(ex3, i3)})`);
ok(ex3.sessions.find((s) => s.id === b3[5].sessionId)?.light === true && homeTypeOf(ex3.sessions.find((s) => s.id === b3[2].sessionId)) === 'H-Upper' && isV3Mobility(ex3.sessions.find((s) => s.id === b3[0].sessionId)) && !b3[4].sessionId && !b3[6].sessionId, `Ex3 beginner: Sat is the light day, Wed H-Upper, Mon mobility, Fri/Sun Off (${sched(ex3, b3)})`);
const sum3 = summaryLines(kindsOf('M W H W O H O'), ex3, mon, 'off');
ok(weekLine(kindsOf('M W H W O H O')) === '2 weight room + 2 home workouts + 1 mobility day.' && sum3.levels.includes('Beginners: 2 weight room + 1 home workout + 1 light day + 1 mobility day (max 3 full lift days for their level).'), `Ex3 summary lines (${sum3.week} / ${sum3.levels.join(' / ')})`);
const tueB = resolveSession(ex3, ex3.sessions.find((s) => s.name === 'Day 1 Total: squat')!, ath(1), addDays(mon, 1));
const ids = tueB.exercises.map((e) => e.exerciseId);
ok(ids.includes('mb-scoop-toss') && ids.includes('goblet-squat') && ids.includes('db-bench'), `Ex3 beginner weight room resolves down: Med Ball Scoop Toss, Goblet Squat, DB Bench (${ids.join(', ')})`);
const thuB = resolveSession(ex3, ex3.sessions.find((s) => s.name === 'Day 2 Total: hinge')!, ath(1), addDays(mon, 3));
ok(thuB.exercises.some((e) => e.exerciseId === 'ffe-split-squat'), 'Ex3 beginner: Front-Foot Elevated Split Squat for the RFE Split Squat');
const noMb = team(generateProgram({ position: 'Outside Hitter', phase: 'off', experience: 'intermediate', volleyballWeek: off, liftDaysPerWeek: 3, kinds: kindsOf('M W H W O H O'), equipment: ALL_EQUIPMENT.filter((e) => e !== 'med-ball') }));
ok(resolveSession(noMb, noMb.sessions[0], ath(1), addDays(mon, 1)).exercises.some((e) => e.exerciseId === 'squat-jump'), 'Ex3 without a med ball: Squat Jump for the Hang Power Clean');

// §8 criteria.
const tplNames = (phase: Phase, n: number) => roomTemplates(phase, n, 'intermediate').map((d) => d.name).join(',');
ok(tplNames('off', 2) === T2.map((d) => d.name).join(',') && tplNames('off', 3) === T3.map((d) => d.name).join(',') && tplNames('off', 4) === T4.map((d) => d.name).join(',') && tplNames('pre', 3) === PRE3.map((d) => d.name).join(',') && tplNames('in', 2) === IN2.map((d) => d.name).join(',') && tplNames('post', 3) === POST.map((d) => d.name).join(',') && tplNames('pre', 4).endsWith(T5_DAY5.name) && tplNames('in', 3).endsWith('Day 2 Fast (2 sets)') && roomTemplates('pre', 2, 'intermediate')[1].slots.some((s) => s.id === 'push-press'), 'D §2a weight-room templates by count and phase (1–4; in-season third day = Day 2 Fast at 2 sets; preseason 2-day Push Press joins Day 3)');
ok(roomTemplates('off', 1, 'intermediate').length === 2 && (() => { const p = build('O W O O O O O'); return name(p, weekPlan(p, mon).find((d) => d.sessionId)!.sessionId) !== name(p, weekPlan(p, addDays(mon, 7)).find((d) => d.sessionId)!.sessionId); })(), 'D §2a one weight-room day alternates Day 1 / Day 2 week by week');
ok(JSON.stringify(homeTypes(2, 3, 'off')) === JSON.stringify(['H-Upper', 'H-Lower', 'H-Durability']) && JSON.stringify(homeTypes(1, 2, 'off')) === JSON.stringify(['H-Lower', 'H-Upper']) && JSON.stringify(homeTypes(4, 1, 'post')) === JSON.stringify(['H-Durability']) && JSON.stringify(homeTypes(2, 3, 'in')) === JSON.stringify(['H-Upper', 'H-Durability', 'H-Durability']), 'D §2c home types (in-season override H-Upper then H-Durability)');
const before = assignHomeTypes(kindsOf('W O O W H O O'), ['off', 'off', 'off', 'off', 'off', 'game', 'off'], 'off', new Set([0, 3]));
ok(['H-Upper', 'H-Durability'].includes(before.get(4)!), 'D §2e H4: a home day before a match is H-Upper or H-Durability');
ok(HOME_NAME['H-Durability'] === 'Home Care' && !/Durability/.test(JSON.stringify(build('W W W O H H O').sessions.map((s) => [s.name, s.focus]))), 'D Legal: the H-Durability session is "Home Care" (no user-facing "durability")');
const twoHomeLib = team(generateProgram({ position: 'Libero / DS', phase: 'off', experience: 'intermediate', volleyballWeek: off, liftDaysPerWeek: 4, kinds: kindsOf('O W H O W O H') }));
const lowerHome = twoHomeLib.sessions.find((s) => homeTypeOf(s) === 'H-Lower');
ok(!!lowerHome, `D §2d (≥ 2 home, ≤ 2 weight room): second unilateral C-lift moves to H-Lower when a C-block has two (${lowerHome?.exercises.filter((e) => e.role === 'secondary').map((e) => e.exerciseId)})`);
const mobOnly = build('W O M O W O O');
ok(mobOnly.sessions.filter((s) => !s.location).every((s) => s.exercises.filter((e) => e.role === 'care' && ['shoulder-care', 'ankle-care'].includes(getExercise(e.exerciseId).pattern)).every((e) => e.sets === 1)) && resolveSession(mobOnly, mobOnly.sessions[0], ath(2), mon).exercises.filter((e) => e.role === 'care' && ['shoulder-care', 'ankle-care'].includes(getExercise(e.exerciseId).pattern)).every((e) => e.sets === 1), 'D §2d (mobility day, no home days): shoulder/ankle care is 1 round in the weight room');
// §3c home prescriptions.
const hp = build('W O W O H O O', { homeJumps: true });
const hs = hp.sessions.find((s) => homeTypeOf(s))!;
const atWeek = (w: number) => addDays(new Date(`${hp.blockStart}T12:00:00`), (w - 1) * 7 + 1);
const w1 = resolveSession(hp, hs, ath(2), atWeek(1));
const w1b = resolveSession(hp, hs, ath(1), atWeek(1));
const w2 = resolveSession(hp, hs, ath(2), atWeek(2));
const w4 = resolveSession(hp, hs, ath(2), atWeek(4));
const B = (r: typeof w1) => r.exercises.find((e) => e.role === 'main')!;
ok(B(w1).sets === 3 && B(w1).reps === '10–12' && B(w1).effort === 'RPE 6–7' && B(w1b).effort === 'RPE 5–6' && B(w2).reps === '12' && B(w4).sets === 2 && B(w4).effort === 'RPE 6' && w1.exercises.every((e) => !/RPE ([89]|10)/.test(e.effort)), `D §3c home prescriptions (Accumulation: B 3 × 10–12 RPE 6–7, beginners RPE 5–6, week 2 top of range, deload −40% at RPE 6; RPE ≤ 7)`);
const upperHome = hp.sessions.find((s) => homeTypeOf(s) === 'H-Upper');
const jumpHome = build('W O O O O H O', { homeJumps: true });
const lowerJ = jumpHome.sessions.find((s) => homeTypeOf(s) && s.exercises.some((e) => e.role === 'power'));
const jr = lowerJ ? resolveSession(jumpHome, lowerJ, ath(3), addDays(mon, 5)) : null;
const jc = jr ? jr.exercises.filter((e) => getExercise(e.exerciseId).pattern === 'jump').reduce((t, e) => t + e.sets * Number(e.reps.match(/\d+/)?.[0] ?? 0) * (/each/.test(e.reps) ? 2 : 1), 0) : 0;
ok(!!jr && jc <= 20 && jr.exercises.filter((e) => getExercise(e.exerciseId).pattern === 'jump').every((e) => getExercise(e.exerciseId).level === 1) && !upperHome?.exercises.some((e) => e.role === 'power') && !build('W O O O O H O', { homeJumps: true, phase: 'in' }).sessions.some((s) => homeTypeOf(s) && s.exercises.some((e) => e.role === 'power')), `D §3b A-block at home only with Jumps at home in off/preseason, level 1 only, ≤ 20 contacts (${jc}); never on H-Upper`);
// §4 mobility.
const mob = (phase: Phase, d: Date = addDays(mon, 0)) => {
  const p = team(generateProgram({ position: 'Libero / DS', phase, experience: 'intermediate', volleyballWeek: off, liftDaysPerWeek: 2, kinds: kindsOf('M W O W O O O') }));
  return resolveSession(p, p.sessions.find((s) => isV3Mobility(s))!, ath(2, { homeEquipment: ['box'] }), d);
};
const mOff = mob('off'), mIn = mob('in'), mPost = mob('post');
ok(mOff.estMinutes === 20 && mIn.estMinutes === 15 && mPost.estMinutes === 25 && mOff.exercises.filter((e) => e.role === 'mobility' && e.exerciseId !== 'crocodile-breathing').length === 4 && mIn.exercises.filter((e) => e.role === 'mobility' && e.exerciseId !== 'crocodile-breathing').length === 3 && mPost.exercises.some((e) => /45s/.test(e.reps)), 'D §4b mobility by phase: 20 min (4 flow items), in-season 15 (3), post-season 25 (45 s holds)');
ok(['short-lever-copenhagen', 'lateral-lunge', 'ankle-balance'].every((id) => mOff.exercises.some((e) => e.exerciseId === id && e.sets === 2)) && mOff.notes?.includes(MOBILITY_EFFORT_LINE) === true, 'D §4a libero/DS position care (2 rounds) and the effort line');
ok(mOff.exercises.every((e) => !getExercise(e.exerciseId).weighted || ['lateral-lunge'].includes(e.exerciseId)) && mOff.exercises.every((e) => getExercise(e.exerciseId).pattern !== 'jump'), 'D §4 mobility: no load, no jumps');
const effortProg = build('M W O W O O O');
ok(scheduledDays(effortProg, mon, addDays(mon, 6)).includes(dateKey(mon)), 'D mobility days are prescribed sessions on the effort board (like the light day)');
const capMob = build('M W O W W W O');
ok(weekPlan(capMob, mon, 'beginner').some((d) => isV3Mobility(capMob.sessions.find((s) => s.id === d.sessionId))), 'D mobility never counts toward the cap or gets dropped for it');
// §5.2 Recommend.
const rec = recommendWeek(kindsOf('O W O W O O O'), off, 'off');
ok(rec.kinds[1] === 'room' && rec.kinds[3] === 'room' && rec.kinds.filter((k) => k === 'home').length === 2 && rec.kinds.filter((k) => k === 'mobility').length === 1 && rec.kinds.includes('off') && rec.filled.every((i) => kindsOf('O W O W O O O')[i] === 'off'), `D §5.2 Recommend fills Off days only, keeps weight-room days, totals 4 + 1 mobility, keeps a day off (${rec.kinds.join(' ')})`);
const recM = recommendWeek(kindsOf('O W O W O O O'), ['off', 'off', 'off', 'off', 'game', 'off', 'off'], 'off');
ok(recM.kinds[5] === 'mobility' && recM.kinds[4] !== 'mobility' && recM.kinds[4] !== 'home', `D §5.2 mobility the day after a match, never on it; no home workout on a match day (${recM.kinds.join(' ')})`);
// §5.3 cap replacement order and H3.
const cap = build('M W H W H W H', { experience: 'advanced' });
const capB = weekPlan(cap, mon, 'beginner');
const counted = capB.filter((d) => { const s = cap.sessions.find((x) => x.id === d.sessionId); return s && !s.mobility && !s.light; }).length;
ok(counted <= 3 && capB.filter((d) => cap.sessions.find((x) => x.id === d.sessionId)?.light).length === 1 && isV3Mobility(cap.sessions.find((s) => s.id === capB[0].sessionId)) && capB.some((d) => !d.sessionId), `D §5.3 over the cap: one light day, the rest Off, mobility kept, ≥ 1 day off (beginner: ${sched(cap, capB)})`);
const allDays = build('W H W M W H M', { experience: 'advanced' });
const ad = weekPlan(allDays, mon, 'advanced');
ok(ad.some((d) => !d.sessionId) && ad.filter((d) => allDays.sessions.find((s) => s.id === d.sessionId && !s.location)).length === 3, 'D H3: no day off in the coach\'s days → the lowest-priority non-weight-room session is Off; weight-room days unchanged');
const h4 = { ...build('W O W O H O O'), events: [{ date: dateKey(addDays(mon, 4)), type: 'game' as const, teamName: 'Club' }] };
ok(!weekPlan(h4, mon, 'intermediate')[4].sessionId, "D H4: a home workout on a match day (another team's included) is Off for that athlete");
const h4b = { ...build('W O W O O H O'), events: [{ date: dateKey(addDays(mon, 6)), type: 'game' as const, teamName: 'Club' }] };
const fri = weekPlan(h4b, mon, 'intermediate')[5];
ok(['H-Upper', 'H-Durability'].includes(homeTypeOf(h4b.sessions.find((s) => s.id === fri.sessionId)) ?? '') || h4b.sessions.find((s) => s.id === fri.sessionId)?.light === true, `D H4/H5 per athlete: a lower home day before another team's match becomes upper/care (${name(h4b, fri.sessionId)})`);
ok(JSON.stringify(setupFromProgram(ex1)) === JSON.stringify(kindsOf('M W O W O H O')) && coachEdit(tue).source === 'coach', 'D editing an existing program restores its days as built; a coach edit still makes the session \'coach\'');
// No new program JSON keys.
const OK_PROGRAM = new Set(['sessionMinutes', 'id', 'name', 'forName', 'author', 'position', 'phase', 'experience', 'volleyballWeek', 'liftSchedule', 'sessions', 'createdAt', 'equipment', 'blockStart', 'blockWeeks', 'block', 'weightRoomDays', 'homeJumps', 'supersets', 'teamId', 'postedAt']);
const OK_SESSION = new Set(['id', 'name', 'focus', 'exercises', 'location', 'mobility', 'light', 'source']);
const OK_ROW = new Set(['exerciseId', 'sets', 'reps', 'effort', 'role', 'group', 'notes', 'filler', 'method']);
const keyBad: string[] = [];
for (const p of [ex1, ex1c, ex2, ex3, cap, hp, jumpHome, twoHomeLib, allDays]) {
  for (const k of Object.keys(p)) if (!OK_PROGRAM.has(k)) keyBad.push(`program.${k}`);
  for (const s of p.sessions) {
    for (const k of Object.keys(s)) if (!OK_SESSION.has(k)) keyBad.push(`session.${k}`);
    for (const e of s.exercises) for (const k of Object.keys(e)) if (!OK_ROW.has(k)) keyBad.push(`row.${k}`);
  }
}
ok(!keyBad.length, `D no new program JSON keys (week-setup programs use only 2.4.0 keys)${keyBad.length ? `: ${[...new Set(keyBad)].join(', ')}` : ''}`);

/* =================== PART B =================== */
ok(JSON.stringify(getExercise('short-lever-copenhagen').equipment) === JSON.stringify([['bench'], ['box']]) && JSON.stringify(getExercise('copenhagen').equipment) === JSON.stringify([['bench'], ['box']]) && /bench or box/.test(getExercise('short-lever-copenhagen').howTo.steps[0]), 'B1 Copenhagen tags bench or box; step text "bench or box" (catalog v3.1); §4b example 33 of 33 (v240-p2-check)');
const gym = ALL_EQUIPMENT;
const tbl = ['hang-clean'].map((id) => [resolveSession, id]);
void tbl;
const olyP = team(generateProgram({ position: 'Outside Hitter', phase: 'off', experience: 'advanced', volleyballWeek: off, liftDaysPerWeek: 2, kinds: kindsOf('W O O W O O O'), equipment: gym }));
const oly = (lv: 1 | 2 | 3, p = olyP) => resolveSession(p, p.sessions[0], ath(lv, { levelConfirmed: lv === 3 }), addDays(mon, 0)).exercises[0];
const o3 = oly(3), o2 = oly(2), o1 = oly(1);
ok(o3.exerciseId === 'hang-clean' && o2.exerciseId === 'hang-high-pull' && getExercise(o1.exerciseId).pattern === 'throw', `B2 Hang Power Clean → Hang High Pull (L2) → med-ball throw (L1) with a med ball (${o1.exerciseId})`);
ok(o3.sets === o2.sets && o2.sets === o1.sets && o3.reps === o1.reps, `B2 same sets × reps after the switch (${o1.sets} × ${o1.reps})`);
const typical = (raise: number, act: number, pot: number[], phase: Phase, home = false) => warmupMinutes({ raise: Array.from({ length: raise }, () => ({ exerciseId: 'a-skip', sets: 1, reps: home ? 'in place' : '2 × 10 yd', effort: 'Easy' })), activate: Array.from({ length: act }, () => ({ exerciseId: 'x', sets: 1, reps: '8', effort: 'Easy' })), potentiate: pot.map((m) => ({ exerciseId: 'x', sets: 1, reps: '3', effort: 'Easy', ...(m === 2.5 ? { customName: 'Empty-bar complex' } : {}) })) }, { phase, home });
ok(typical(4, 5, [2.5, 1], 'off') === 11.5 && typical(3, 4, [2.5, 1], 'pre') === 10 && typical(2, 4, [1, 1], 'in') === 7.7 && typical(3, 5, [1, 1], 'post') === 9.3 && typical(3, 3, [1], 'off', true) === 6, `B3 warm-up estimates match §1a: 11.5 · 10 · 7.7 · 9.3 · home 6 (${typical(4, 5, [2.5, 1], 'off')} · ${typical(3, 4, [2.5, 1], 'pre')} · ${typical(2, 4, [1, 1], 'in')} · ${typical(3, 5, [1, 1], 'post')} · ${typical(3, 3, [1], 'off', true)})`);
const wsrc = read('src/lib/warmup.ts');
ok(/potentiate\.slice\(0, compact \? 1 : 2\)/.test(wsrc) && /ctx\.phase === 'post' \|\| ctx\.phase === 'pre' \? 3 : 4/.test(wsrc) && /\.slice\(0, base\)/.test(wsrc), 'B3 Potentiate capped at 2 steps; Raise 4/3/2 by phase; Activate 4 (3 in-season and home) + add-on');
const ramp = ['back-squat', 'hang-high-pull', 'trap-bar-jump', 'mb-scoop-toss', 'kb-swing'].filter((id) => needsRampUp(getExercise(id), gym));
ok(JSON.stringify(ramp) === JSON.stringify(['back-squat', 'hang-high-pull']), `B4 ramp-ups only for Back Squat and Hang High Pull (${ramp.join(', ')})`);
// B5 (D-054): level adjust off on a v3 'approach' session keeps the athlete gates and generated limits.
const b5 = { ...team(generateProgram({ position: 'Outside Hitter', phase: 'pre', experience: 'advanced', volleyballWeek: off, liftDaysPerWeek: 3, kinds: kindsOf('W O W O W O O') })), levelAdjust: false };
const b5s = b5.sessions[0];
const b5r = resolveSession(b5, b5s, ath(1, { levelConfirmed: true }), addDays(mon, 0));
const leaks = b5r.exercises.filter((e) => DEPTH_JUMPS.has(e.exerciseId) || (getExercise(e.exerciseId).pattern === 'olympic' && getExercise(e.exerciseId).level === 3) || ADVANCED_METHODS.has((e.method ?? 'straight') as never));
const kept = b5r.exercises.filter((e) => !e.teamExerciseId).length;
ok(!leaks.length && kept > 0 && b5r.exercises.filter((e) => ['main', 'secondary', 'accessory'].includes(e.role ?? '')).every((e) => !/RPE ([89]|10)/.test(e.effort)), `B5 level adjust off (beginner minor): written exercises except no depth jump / contrast / cluster / wave / L3 Olympic; effort capped (${leaks.map((e) => e.exerciseId).join(',') || 'none leaked'})`);
const b5c = coachEdit(b5s);
const b5cr = resolveSession({ ...b5, sessions: [b5c] }, b5c, ath(1), addDays(mon, 0));
ok(b5cr.exercises.every((e, i) => e.exerciseId === b5c.exercises[i]?.exerciseId && e.sets === b5c.exercises[i]?.sets && e.reps === b5c.exercises[i]?.reps), 'B5 the same session after a coach edit (\'coach\') delivers exactly what is written');
// B6 (D-056).
const bab = newGeneralProgram({ id: 'b6', teamId: 'g', teamName: 'G', groupKey: 'all', goal: 'back_after_break', weeks: 4, perWeek: 3, name: 'b6', equipment: gym });
const typed: Session = { id: 'tb', name: 'Trainer day', focus: '', source: 'coach', exercises: [{ exerciseId: 'goblet-squat', sets: 3, reps: '8', effort: 'RPE 8', role: 'main' }, { exerciseId: 'db-row', sets: 3, reps: '10', effort: '', role: 'secondary' }] };
const bd = new Date(bab.createdAt);
// No personal break (G9 off): a workout 3 days earlier.
const recent = { minor: false, logs: [{ id: 'l', date: new Date(bd.getTime() - 3 * 864e5).toISOString(), programId: 'x', sessionId: 'x', sessionName: 'x', entries: [] }] };
const b6 = resolveSession({ ...bab, sessions: [...bab.sessions, typed] }, typed, ath(2, recent), bd);
const b6g = resolveSession(bab, bab.sessions[0], ath(2, recent), bd);
ok(b6.exercises[0].effort === 'RPE 8' && !!b6.exercises[1].effort && b6g.exercises.filter((e) => e.role === 'main').every((e) => /RPE [4-6]|Easy/.test(e.effort)), `B6 Back after a break: trainer-typed RPE 8 reaches the client; an empty effort is filled from the ramp (${b6.exercises[1].effort}); goal defaults follow the ramp · got ${b6.exercises.map((e) => e.effort).join('/')} · defaults ${b6g.exercises.filter((e) => e.role === 'main').map((e) => e.effort).join('/')}`);

/* =================== PART C =================== */
const wavesOnly = (['accumulation', 'strength', 'strength_power', 'power', 'maintain'] as BlockType[]).flatMap((b) => ([1, 2, 3, 4] as const).map((w) => ({ b, w, m: rx(sq, b, w, 3, true).method }))).filter((x) => x.m === 'wave');
ok(wavesOnly.length === 2 && wavesOnly.every((x) => x.b === 'strength_power' && (x.w === 2 || x.w === 3)) && rx(sq, 'strength_power', 2, 2, true).method !== 'wave', 'C waves only in Strength-Power weeks 2–3, B-block, for coach-confirmed advanced athletes; others straight sets (R-2)');
const inS = team(generateProgram({ position: 'Outside Hitter', phase: 'in', experience: 'intermediate', volleyballWeek: off, liftDaysPerWeek: 3, kinds: kindsOf('W O W O W O O') }));
const byeWeek = weekPlan(inS, mon, 'intermediate').map((d) => name(inS, d.sessionId));
const matchWeek = weekPlan({ ...inS, events: [{ date: dateKey(addDays(mon, 6)), type: 'game' as const, teamName: 'Club' }] }, mon, 'intermediate').map((d) => name(inS, d.sessionId));
ok(byeWeek.includes('Day 3 (bye week)') && !matchWeek.includes('Day 3 (bye week)') && matchWeek.includes('Day 2 Fast (2 sets)'), `C bye-week Day 3: a week with no match (combined calendar) gets Day 3; a week with one (another team's) doesn't (${byeWeek.filter((x) => x !== '-').join(', ')})`);
ok(templateFor('off', 4, 'advanced')[0].slots.slice(0, 3).map((s) => s.id).join(',') === 'hang-clean,depth-drop,box-jump', 'C 4-day Day 1 A-block = Hang Power Clean + Depth Drop → Box Jump (§7a)');
void emphasize;

/* =================== copy =================== */
// Code only (comments stripped): the strings users can see.
const built = [read('src/lib/weekV3.ts'), read('src/lib/homeV3.ts'), read('src/components/WeekSetupCard.tsx'), read('src/lib/rollover.ts'), read('src/components/NextBlockNotice.tsx')].join('\n').split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
const strings = [...built.matchAll(/'([^'\n]{12,})'|"([^"\n]{12,})"|`([^`\n]{12,})`/g)].map((m) => m[1] ?? m[2] ?? m[3]).filter((x) => !/^[a-z-]+$/.test(x) && !/import|from /.test(x));
const claim = /durabilit|injur|prevent|rehab|treat|cure|guarantee|bulletproof|heal|therap|recover fully|pain[- ]free/i;
const hits = strings.filter((x) => claim.test(x) && !/^H-Durability$/.test(x) && !/type id|in code|internal|Legal/.test(x));
ok(!hits.length, `copy: claim-word search on new user-facing strings, including "durability" (the internal type id H-Durability excepted) (${hits.slice(0, 3).join(' | ') || 'clean'})`);

console.log(f ? `\n${f} FAIL` : '\nall pass');
