// 2.4.0 Training v3 Part 1 (docs/specs/training-v3.md v1.0 §1.1–§1.5): coach freedom, generated sessions keep the rules,
// the level toggle, warm-ups (warmups.md §9), session length (program-design §4a). Logic only; the UI is checked in the browser.
/* eslint-disable @typescript-eslint/no-require-imports */
declare const require: (m: string) => unknown;
declare const __dirname: string;
const fs = require('fs') as { readFileSync: (p: string, e: 'utf8') => string };
const path = require('path') as { join: (...p: string[]) => string };
import { generateProgram, restSecFor } from '../../src/lib/generator';
import { getExercise, EXERCISES, CATALOG_V3_IDS, fits, ALL_EQUIPMENT } from '../../src/lib/exercises';
import { coachEdit, levelAdjustFor, levelOffKey, resolveSession, sourceOf, coachEstimate } from '../../src/lib/resolve';
import { setLevelOffKeys } from '../../src/lib/levelKeys';
import { groupRows } from '../../src/lib/groups';
import { stationChecks, withBlockLetters } from '../../src/lib/stations';
import { weekPlan, mondayOf, generatedWeek, withRoomMinutes, dateKey, addDays } from '../../src/lib/calendar';
import { postChecks, sessionsPerWeek } from '../../src/lib/general';
import { newGeneralProgram } from '../../src/lib/starter';
import { restFor, tierOf } from '../../src/lib/rest';
import { buildWarmup, rampSetsFor, sessionType, warmupFor, warmupMinutes, needsRampUp, SESSION_TYPE_LABEL, blockOf } from '../../src/lib/warmup';
import { fitSession, applyTrims, estimateSession, targetFor, expressSession, type FitCtx } from '../../src/lib/fit';
import { withTeamWarmup } from '../../src/lib/warmupTeam';
import { DEFAULT_TEAM_SETTINGS, setsDone } from '../../src/lib/backend/types';
import { suggestWeight } from '../../src/lib/progression';
import type { Program, ProgramExercise, Session, WorkoutLog } from '../../src/lib/types';

let f = 0;
const ok = (c: boolean, m: string) => {
  console.log(c ? 'pass' : 'FAIL', m);
  if (!c) f++;
};
const wk = ['practice', 'off', 'practice', 'off', 'practice', 'off', 'off'] as Program['volleyballWeek'];
const d = new Date('2026-11-24T12:00:00'); // a Tuesday
const row = (exerciseId: string, sets: number, reps: string, effort: string, role: ProgramExercise['role'], extra: Partial<ProgramExercise> = {}): ProgramExercise => ({ exerciseId, sets, reps, effort, role, ...extra });

/* ================= §1.1 Coach freedom ================= */
const team: Program = { ...generateProgram({ position: 'Outside Hitter', phase: 'off', experience: 'advanced', volleyballWeek: wk, liftDaysPerWeek: 3 }), teamId: 't', postedAt: 'x' };
const coachSes: Session = coachEdit({
  id: 'cs', name: 'Coach day', focus: 'Lower', exercises: [
    row('back-squat', 4, '5', 'RPE 10', 'main', { restSec: 30, restSetByCoach: true }),
    row('rdl', 3, '6', 'to failure', 'secondary'),
    row('split-squat', 3, '8 each', 'max', 'accessory'),
    row('db-row', 3, 'AMRAP', 'RPE 9', 'accessory'),
  ],
});
const prog: Program = { ...team, sessions: [...team.sessions, coachSes], liftSchedule: [coachSes.id, null, null, null, null, null, null] };
const r10 = resolveSession(prog, coachSes, { level: 3, logs: [] }, d);
ok(r10.exercises[0].effort === 'RPE 10' && r10.exercises[1].effort === 'to failure' && r10.exercises[2].effort === 'max' && r10.exercises[3].reps === 'AMRAP', 'minors team: RPE 10, "to failure", "max", AMRAP in strength slots save and reach athletes as written (no block, warning or note)');
ok(r10.exercises[0].restSecResolved === 30, `rest 0:30 on a back squat saves as typed (${r10.exercises[0].restSecResolved}s)`);
ok(restFor(getExercise('back-squat'), { reps: '5', effort: 'RPE 7' }) === 180, '"Auto 3:00" is the suggestion for back squat × 5 (restFor)');
const twoA = groupRows([row('back-squat', 3, '5', 'RPE 7', 'main'), row('bench', 3, '5', 'RPE 7', 'main')], [0, 1]).list;
ok(twoA.every((e) => e.group === twoA[0].group && !!e.group), 'two tier A lifts pair with no message');
const five = groupRows([row('hang-clean', 3, '3', 'Max effort', 'power'), row('db-row', 3, '8', 'RPE 7', 'accessory'), row('pallof', 3, '8', 'Controlled', 'core'), row('pushup', 3, '10', 'RPE 7', 'accessory'), row('plank', 3, '30s', 'Controlled', 'core')], [0, 1, 2, 3, 4]).list;
ok(new Set(five.map((e) => e.group)).size === 1, 'a power lift goes in a circuit of 5 with no message');
const stList = withBlockLetters([row('hang-clean', 3, '3', 'Max effort', 'power'), row('db-row', 3, '8', 'RPE 7', 'accessory')]);
const st = [{ id: 's1', name: 'Platform', groups: [stList[0].group!], minutes: 8 }, { id: 's2', name: 'DB', groups: [stList[1].group!], minutes: 8 }];
ok(stationChecks(stList, st, 2).every((c) => c.tone === 'info' && !/Part 1|fresh/.test(c.text)), 'a hang clean in a station: no message (checks are neutral info only)');
// 6 lift days to a beginner minor (coach-built) and 7 sessions to a trainer client
const six: Program = { ...prog, experience: 'beginner', liftSchedule: [coachSes.id, coachSes.id, coachSes.id, coachSes.id, coachSes.id, coachSes.id, null], volleyballWeek: Array(7).fill('off') as Program['volleyballWeek'] };
const sixPlan = weekPlan(six, mondayOf(d), 'beginner');
ok(!generatedWeek(six) && sixPlan.filter((p) => p.sessionId).length === 6, `coach-built: 6 lift days a week for a beginner minor stay 6 (${sixPlan.filter((p) => p.sessionId).length})`);
const tp = newGeneralProgram({ id: 'g', teamId: 'gt', teamName: 'G', groupKey: 'client:a', goal: 'strength', weeks: 4, perWeek: 3, name: 'g', equipment: ['barbell', 'dumbbells', 'bench', 'bike'] });
const t7: Program = { ...tp, sessions: tp.sessions.map(coachEdit), weeks: tp.weeks!.map((w) => ({ ...w, schedule: [0, 1, 2, 3, 4, 5, 6].map((i) => tp.sessions[i % tp.sessions.length].id) })) };
const pc = postChecks(t7, [{ userId: 'a', name: 'Alex Client', level: 1, existing: [] }]);
ok(sessionsPerWeek([t7]) === 7 && pc.every((c) => c.kind === 'info') && pc.some((c) => c.message === 'Alex: 7 sessions a week across all programs.'), `trainer: 7 sessions to a client, no block; post screen shows "${pc[0]?.message}"`);
// Code search: no builder-side block left
const src = (p: string) => fs.readFileSync(path.join(__dirname, '../../src', p), 'utf8');
const builderFiles = ['app/session.tsx', 'lib/team.tsx', 'components/StationsEditor.tsx', 'components/general/PostSheet.tsx', 'components/general/GeneralProgram.tsx', 'app/schedule.tsx', 'lib/groups.ts', 'lib/stations.ts', 'lib/general.ts'];
const banned = /effortProblem|generalEffortProblem|clockProblem|CLOCK_REASON|PART1_REASON|FLOOR_MESSAGE|REST_FLOOR|cardioProblems|EFFORT_BLOCK|Effort clamp|Circuit clamp|Supersets are for 2|kind: 'block'|Blocked: /;
const hits = builderFiles.filter((p) => banned.test(src(p)));
ok(!hits.length, `code search: no builder-side block for effort, rest, pairing, circuits, stations, order or weekly days (${hits.join(', ') || 'none'})`);
ok(/source = 'approach'|approach/.test(src('lib/resolve.ts')) && /free: !approach/.test(src('lib/resolve.ts')), "the rules live in resolveSession keyed to source = 'approach'");

/* ================= §0.1 Generated sessions keep the rules ================= */
const gen = generateProgram({ position: 'Middle Blocker', phase: 'off', experience: 'beginner', volleyballWeek: wk, liftDaysPerWeek: 3 });
const gs = gen.sessions[0];
ok(gen.sessions.every((s) => s.source === 'approach') && sourceOf(gen, gs) === 'approach', "generator writes source = 'approach'");
const hot: Session = { ...gs, exercises: gs.exercises.map((e) => (e.role === 'main' ? { ...e, effort: 'RPE 9', restSec: 30, restSetByCoach: true } : e)) };
const rg = resolveSession({ ...gen, teamId: 't', sessions: [hot] }, hot, { level: 1, logs: [] }, d);
const main = rg.exercises.find((e) => e.role === 'main')!;
ok(/RPE [67]\b/.test(main.effort) && !/RPE [89]/.test(main.effort), `generated, minor beginner: effort capped ≤ RPE 7 (${main.effort})`);
ok(main.restSecResolved >= (tierOf(getExercise(main.exerciseId)) === 'A' ? 120 : 0), `generated: rest floor kept (${main.restSecResolved}s on ${main.exerciseId})`);
const genWeek = { ...gen, liftSchedule: Array(7).fill(gs.id) };
ok(generatedWeek(genWeek) && weekPlan(genWeek, mondayOf(d)).filter((p) => p.sessionId && !genWeek.sessions.find((s) => s.id === p.sessionId)?.mobility).length <= 3, 'generated week: R6 cap (beginner 3) still applied');
const homeGen = generateProgram({ position: 'Setter', phase: 'off', experience: 'intermediate', volleyballWeek: wk, liftDaysPerWeek: 4, weightRoomDays: [1, 3], homeJumps: true });
const homeJ = homeGen.sessions.filter((s) => s.location === 'home').flatMap((s) => s.exercises.filter((e) => getExercise(e.exerciseId).pattern === 'jump'));
ok(homeJ.every((e) => /20 contacts/.test(e.notes ?? '')), 'generated home jumps keep the plyo cap (up to 20 contacts)');
const tg = newGeneralProgram({ id: 'tg', teamId: 'gt', teamName: 'G', groupKey: 'all', goal: 'strength', weeks: 4, perWeek: 3, name: 'tg', equipment: ALL_EQUIPMENT });
const tgs = { ...tg.sessions[0], exercises: tg.sessions[0].exercises.map((e) => (e.role === 'main' ? { ...e, effort: 'RPE 10' } : e)) };
const rtg = resolveSession({ ...tg, sessions: [tgs] }, tgs, { level: 3, logs: [] }, new Date(`${tg.startDate}T12:00:00`));
ok(tgs.source === 'approach' && rtg.exercises.filter((e) => ['main', 'secondary', 'accessory'].includes(e.role ?? '')).every((e) => !/RPE (9|10)/.test(e.effort)), 'trainer goal-default session stays at RPE ≤ 8');
// Editing flips the source; warm-up, length and level toggle don't
ok(coachEdit(gs).source === 'coach', "editing a generated session's exercise or effort flips it to source = 'coach' (coachEdit)");
const sessionTsx = src('app/session.tsx');
const editCalls = (sessionTsx.match(/\bedit\(\{/g) ?? []).length;
ok(editCalls >= 6 && /onChange=\{update\} \/>/.test(sessionTsx) && /function setLevelAdjust[\s\S]{0,400}update\(\{ \.\.\.session!, levelAdjust: v \}\)/.test(sessionTsx), `session editor: exercise/set/rep/effort/rest/group/order/station edits call edit() (${editCalls}); warm-up, length (FitBanner) and level toggle call update()`);
// Suggestions follow the old rules
ok(restSecFor(row('back-squat', 3, '5', 'RPE 8', 'main'), {}) >= 120, 'auto rest suggestion keeps the floors');
const auto = generateProgram({ position: 'Setter', phase: 'in', experience: 'advanced', volleyballWeek: wk, liftDaysPerWeek: 2, supersets: true });
ok(auto.sessions.every((s) => s.exercises.every((e) => !(e.group && ['A', 'P'].includes(tierOf(getExercise(e.exerciseId)))))), 'auto-pairing never pairs tier A or P (rest-and-supersets §4b)');

/* ================= §1.2 Level toggle ================= */
const adv: Session = coachEdit({ id: 'fs', name: 'Front', focus: '', exercises: [row('front-squat', 4, '5', 'RPE 7', 'main')] });
const advP: Program = { ...team, experience: 'advanced', sessions: [adv] };
ok(resolveSession(advP, adv, { level: 1, logs: [] }, d).exercises[0].exerciseId === 'goblet-squat', 'default on: a beginner on an advanced program gets Goblet Squat for Front Squat');
const offP = { ...advP, levelAdjust: false };
const ro = resolveSession(offP, adv, { level: 1, logs: [{ id: 'old', date: '2026-10-01T12:00:00Z', programId: 'x', sessionId: 'x', sessionName: 'x', entries: [] }] }, d);
ok(ro.exercises[0].exerciseId === 'front-squat' && !ro.exercises[0].teamExerciseId && ro.exercises[0].effort === 'RPE 7' && !ro.easing.active, 'program off: exact exercise and effort, no "Your version" line, no G9 adjustment');
ok(levelAdjustFor(offP, { levelAdjust: true }, 'u') === true && resolveSession(offP, { ...adv, levelAdjust: true }, { level: 1, logs: [] }, d).exercises[0].exerciseId === 'goblet-squat', 'session override on wins over program off');
ok(levelAdjustFor(advP, { levelAdjust: false }, 'u') === false, 'session override off wins over program on');
// Legal ruling #2: keys come from the server (level_off_keys); this device was given u1's and u2's keys.
setLevelOffKeys([advP.teamId!], [{ teamId: advP.teamId!, userId: 'u1', key: 'k0f3a9c1d2e4b5a6978c0d1e2f3a4b5c6' }, { teamId: advP.teamId!, userId: 'u2', key: 'k77aa01bb02cc03dd04ee05ff06aa07bb' }]);
const athOff = { ...advP, levelAdjustOffFor: [levelOffKey(advP.teamId, 'u1')!] };
ok(!JSON.stringify(athOff).includes('u1'), 'compliance V4: the posted program carries an opaque key, never the athlete id');
ok(resolveSession(athOff, { ...adv, levelAdjust: true }, { level: 1, logs: [], userId: 'u1' }, d).exercises[0].exerciseId === 'front-squat' && resolveSession(athOff, adv, { level: 1, logs: [], userId: 'u2' }, d).exercises[0].exerciseId === 'goblet-squat', 'athlete override (off-only) is the most specific: wins over a session set on; other athletes unchanged');
const athleteTs = fs.readFileSync(path.join(__dirname, '../../src/lib/athlete.ts'), 'utf8');
ok(/export function levelAllowsLoadTest[\s\S]{0,400}athleteLevel\(data\)/.test(athleteTs) && !/levelAdjust/.test(athleteTs.slice(athleteTs.indexOf('export function levelAllowsLoadTest'))), 'toggling off never changes testing eligibility (load-test rule reads the confirmed level only)');

/* ================= §1.3 Warm-ups ================= */
const ctx = { phase: 'off' as const, position: 'Outside Hitter' as const, equipment: ALL_EQUIPMENT };
const squatDay: Session = { id: 'sq', name: 'Lower', focus: '', source: 'approach', exercises: [row('hang-clean', 4, '2', 'Max effort', 'power'), row('box-jump', 3, '3', 'Max effort', 'power'), row('back-squat', 5, '4', 'RPE 8', 'main'), row('split-squat', 3, '8 each', 'RPE 7', 'secondary')] };
const w = buildWarmup(squatDay, ctx);
ok(w.raise.length >= 3 && w.activate.length >= 4 && w.potentiate.length >= 1, `Warm-up has Raise (${w.raise.length}), Activate (${w.activate.length}), Potentiate (${w.potentiate.length})`);
const squatPool = ['ankle-rock', 'hip-90-90', 'worlds-greatest', 'band-lateral-walk', 'glute-bridge', 'bodyweight-squat'];
ok(sessionType(squatDay) === 'squat' && w.activate.slice(0, 4).every((e) => squatPool.includes(e.exerciseId)), `squat-first: Activate from the Lower: squat pool (${w.activate.map((e) => e.exerciseId).join(', ')})`);
ok(w.activate.some((e) => ['band-er', 'er-90-90-iso'].includes(e.exerciseId)), 'position add-on for an outside hitter (band ER / 90/90 hold)');
ok(/Empty-bar complex/.test(w.potentiate[0].customName ?? ''), 'Olympic derivative → the empty-bar complex');
const pullDay: Session = { id: 'pl', name: 'Upper', focus: '', exercises: [row('pullup', 4, '5', 'RPE 7', 'main'), row('db-row', 3, '8', 'RPE 7', 'secondary')] };
const pullPool = ['wall-slide', 'lat-reach', 'band-er', 'thoracic-rotation', 'cat-camel', 'er-90-90-iso'];
const pw = buildWarmup(pullDay, { ...ctx, position: 'All positions' });
ok(sessionType(pullDay) === 'pull' && pw.activate.every((e) => pullPool.includes(e.exerciseId)), `upper pull: Activate from the Upper: pull pool (${pw.activate.map((e) => e.exerciseId).join(', ')})`);
const mini = (wu: Session['warmup'], s: Session) => warmupFor({ ...s, warmup: wu }, ctx);
ok(mini(undefined, { ...squatDay, light: true }) === null && mini(undefined, { ...squatDay, mobility: true }) === null && mini(null, squatDay) === null, 'no warm-up card for light home days, recovery sessions, or when the coach removed it');
const general = newGeneralProgram({ id: 'gw', teamId: 'gt', teamName: 'G', groupKey: 'all', goal: 'general', weeks: 4, perWeek: 3, name: 'gw', equipment: ['dumbbells', 'bench', 'rower'] });
const gw = warmupFor(general.sessions[0], { phase: 'off', equipment: ['dumbbells', 'bench', 'rower'], general: true });
ok(!!gw && gw.raise[0].exerciseId === 'rower' && /3 min · Easy/.test(gw.raise[0].reps) && gw.raise.length === 3, 'trainer mode: Raise starts with easy cardio from the gym profile, then 2 drills (replaces W1–W3)');
const rg2 = resolveSession(general, general.sessions[0], { level: 2, logs: [] }, new Date(`${general.startDate}T12:00:00`));
ok(!!rg2.warmup, 'every session (trainer gym) shows a warm-up through resolveSession');
const homeS: Session = { ...pullDay, id: 'h', location: 'home' };
const hw = warmupFor(homeS, { ...ctx, equipment: [], home: true });
ok(!!hw && hw.raise.every((e) => /In place|Standing|shuffles|steps/.test(e.reps)) && [...hw.raise, ...hw.activate, ...hw.potentiate].every((e) => e.customName || fits(getExercise(e.exerciseId), [])), 'home: in-place Raise drills, no-equipment items only');
const lim = buildWarmup(squatDay, { ...ctx, limitedSpace: true });
ok(lim.raise.every((e) => /In place|Standing|shuffles|steps/.test(e.reps)), 'limited space: in-place Raise drills');
const noBands = buildWarmup(squatDay, { ...ctx, equipment: ['barbell', 'box'] });
ok(noBands.activate.every((e) => fits(getExercise(e.exerciseId), ['barbell', 'box'])) && !noBands.activate.some((e) => e.exerciseId === 'band-lateral-walk'), 'equipment: band items fall back to their bodyweight options');
const deload = buildWarmup({ ...squatDay, exercises: squatDay.exercises.slice(1) }, { ...ctx, deload: true });
ok(deload.potentiate.every((e) => !/75%|80%/.test(e.reps)) && deload.potentiate.some((e) => /70%/.test(e.reps)), 'deload: potentiation stops at about 70%');
const r1 = buildWarmup(squatDay, { ...ctx, rotation: 0 }).raise.map((e) => e.exerciseId).join();
const r2 = buildWarmup(squatDay, { ...ctx, rotation: 1 }).raise.map((e) => e.exerciseId).join();
ok(r1 !== r2, 'pools rotate across the week');
const inS = buildWarmup(squatDay, { ...ctx, phase: 'in', compact: false });
ok(warmupMinutes(inS, { phase: 'in' }) <= 9 && warmupMinutes(w, { phase: 'off' }) >= 10 && warmupMinutes(w, { phase: 'off' }) <= 12, `totals: off-season ${warmupMinutes(w, { phase: 'off' })} min (10–12), in-season ${warmupMinutes(inS, { phase: 'in' })} min (8)`);
const cpt = buildWarmup(squatDay, { ...ctx, compact: true });
ok(cpt.raise.length === 2 && cpt.activate.length <= 4 && cpt.potentiate.length === 1 && warmupMinutes(cpt, { phase: 'off' }) >= 6 && warmupMinutes(buildWarmup(squatDay, { ...ctx, phase: 'in', compact: true }), { phase: 'in' }) >= 5, 'compact: one Raise round (2), 3–4 Activate, one Potentiate step; ≥ 6 min (5 in-season)');
// Ramp-ups
const bs = getExercise('back-squat');
ok(needsRampUp(bs) && needsRampUp(getExercise('hang-clean')) && !needsRampUp(getExercise('pallof')) && !needsRampUp(getExercise('box-jump')), 'ramp-ups for loaded tier A/P only');
ok(rampSetsFor(bs, 225, { heavyPct: true }).map((r) => r.label).join(' · ') === 'Bar × 8 · 90 lb × 5 · 135 lb × 3 · 170 lb × 2 · 190 lb × 1', `> 185 lb: ${rampSetsFor(bs, 225, { heavyPct: true }).map((r) => r.label).join(' · ')}`);
ok(rampSetsFor(bs, 135).map((r) => r.label).join(' · ') === 'Bar × 8 · 70 lb × 5 · 95 lb × 3', `95–185 lb: ${rampSetsFor(bs, 135).map((r) => r.label).join(' · ')}`);
ok(rampSetsFor(bs, 85).length === 1 && rampSetsFor(getExercise('hang-clean'), 135).map((r) => r.label).join() === 'Bar × 5,70 lb × 3,95 lb × 2' && rampSetsFor(bs, null)[0].label === 'Bar or light weight × 8' && rampSetsFor(bs, 135, { samePatternBefore: true })[0].label !== 'Bar × 8', '≤ 95 lb one set; Olympic table; no weight yet → "Bar or light weight × 8"; same-pattern second lift skips the bar × 8');
const log = (warm: boolean): WorkoutLog => ({ id: 'l', date: '2026-11-20T12:00:00Z', programId: 'p', sessionId: 's', sessionName: 's', entries: [{ exerciseId: 'back-squat', sets: [{ weight: '185', reps: '5', done: true }], ...(warm ? { warmupSets: [{ weight: '95', reps: '5', done: true, warmup: true }, { weight: '135', reps: '3', done: true, warmup: true }] } : {}) }] });
ok(setsDone(log(true)) === 1 && JSON.stringify(suggestWeight([log(true)], row('back-squat', 3, '5', 'RPE 7', 'main'))) === JSON.stringify(suggestWeight([log(false)], row('back-squat', 3, '5', 'RPE 7', 'main'))), 'ramp-up sets are logged as warm-up, never counted as work sets, never used for weight suggestions');
// Regenerate unless edited
const changed: Session = { ...squatDay, exercises: [row('rdl', 4, '5', 'RPE 7', 'main'), row('db-row', 3, '8', 'RPE 7', 'secondary')] };
ok(sessionType(changed) === 'total' || sessionType(changed) === 'hinge', 'type follows the main lift');
ok(JSON.stringify(warmupFor(changed, ctx)?.activate) !== JSON.stringify(warmupFor(squatDay, ctx)?.activate), 'changing the main lift regenerates the warm-up');
const edited = { ...w, edited: true };
ok(JSON.stringify(warmupFor({ ...changed, warmup: edited }, ctx)?.activate) === JSON.stringify(w.activate) && warmupFor({ ...changed, warmup: edited }, ctx)?.source === 'edited', 'an edited warm-up keeps the coach\'s version (tag "Edited", Regenerate offered)');
ok(warmupFor({ ...squatDay, warmup: 'W2' }, ctx)?.source === 'approach', '2.3.0 W1–W3 ids read as "generate"');
// Templates and the team default
const tpl = { id: 'w1', teamId: 't', name: 'Our lower warm-up', items: { raise: w.raise, activate: w.activate.slice(0, 2), potentiate: [] }, createdAt: 'x' };
const stampedT = withTeamWarmup(squatDay, { ...DEFAULT_TEAM_SETTINGS, defaultWarmup: 'template', defaultWarmupTemplateId: 'w1' }, tpl);
ok(warmupFor(stampedT, ctx)?.source === 'template' && warmupFor(stampedT, ctx)?.activate.length === 2, 'team default "My template" applies the template (tag "Template: name")');
ok(warmupFor(withTeamWarmup(squatDay, { ...DEFAULT_TEAM_SETTINGS, defaultWarmup: 'none' }, undefined), ctx) === null, 'team default "None": no warm-up card');
ok(warmupFor(withTeamWarmup(squatDay, DEFAULT_TEAM_SETTINGS, undefined), ctx)?.source === 'approach', 'team default "Approach": generated');
ok(withTeamWarmup({ ...squatDay, warmup: edited }, { ...DEFAULT_TEAM_SETTINGS, defaultWarmup: 'none' }, undefined).warmup === edited, 'sessions the coach edited keep their warm-up');
const lsW = withTeamWarmup(squatDay, { ...DEFAULT_TEAM_SETTINGS, limitedSpace: true }, undefined);
ok(!!warmupFor(lsW, ctx)?.raise.every((e) => /In place|Standing|shuffles|steps/.test(e.reps)), 'team Limited space → in-place Raise drills');
const mig = fs.readFileSync(path.join(__dirname, '../../supabase/migrations/011_training_v3_p1.sql'), 'utf8');
ok(/create table if not exists public\.warmup_templates/.test(mig) && /default_warmup text/.test(mig) && /default_warmup_template_id/.test(mig) && /limited_space boolean/.test(mig), 'migration 011: warmup_templates + teams.default_warmup(_template_id) + limited space');
// 15 catalog drills
const P1 = ['a-skip', 'lateral-shuffle', 'carioca', 'high-knees', 'walking-knee-hug', 'walking-quad-stretch', 'push-up-plus', 'wall-slide', 'er-90-90-iso', 'band-lateral-walk', 'short-lever-copenhagen', 'soleus-calf-raise', 'cmj', 'line-hops', 'skater-hop'];
const v3 = EXERCISES.filter((e) => P1.includes(e.id) && CATALOG_V3_IDS.has(e.id));
const tierOk: Record<string, string> = { cmj: 'P', 'line-hops': 'P', 'skater-hop': 'P', 'short-lever-copenhagen': 'C', 'soleus-calf-raise': 'C' };
ok(v3.length === 15 && v3.every((e) => tierOf(e) === (tierOk[e.id] ?? 'D') && e.level === 1 && !e.scope), `the 15 movement-prep and warm-up exercises are present with their §3 tags (${v3.length})`);
const CLAIMS = /\b(prevent\w*|injury[- ]proof|injury|safe for|guarantee\w*|proven|science-backed|clinically|rehab\w*|treat\w*|cure\w*|heal\w*|weight loss|fat loss|burn fat|calorie\w*|tone|toning|durability|recover\w*)\b/i;
const v3text = v3.map((e) => [e.name, e.cue, e.howTo.why, ...e.howTo.steps, ...e.howTo.cues, ...e.howTo.mistakes].join(' ')).join(' ');
ok(!CLAIMS.test(v3text), `claim-word search clean on the 15 (${(v3text.match(CLAIMS) ?? []).join(', ')})`);
ok(!generateProgram({ position: 'Middle Blocker', phase: 'pre', experience: 'advanced', volleyballWeek: wk, liftDaysPerWeek: 4 }).sessions.some((s) => s.exercises.some((e) => CATALOG_V3_IDS.has(e.exerciseId))), 'the 2.3.0 generator never picks catalog v3 exercises (unchanged until generatorV3)');

/* ================= §1.4 Session length ================= */
const lp: Program = { ...gen, sessionMinutes: 45, minutesByWeekday: [null, 30, null, null, null, null, null], liftSchedule: [gs.id, gs.id, null, null, null, null, null] };
ok(targetFor(lp, gs, new Date('2026-11-23T12:00:00')).minutes === 45 && targetFor(lp, gs, new Date('2026-11-24T12:00:00')).minutes === 30, 'program default and per-weekday length (weekday wins)');
const withRoom = withRoomMinutes({ ...lp, teamId: 't' }, '2026-11-24', 25);
ok(targetFor(withRoom, gs, new Date('2026-11-24T12:00:00')).minutes === 25 && targetFor(withRoom, gs, new Date('2026-11-24T12:00:00')).source === 'date', 'per-date weight room time wins over the weekday');
ok(targetFor(gen, gs, null, 0).minutes === 75 && targetFor(tg, tg.sessions[0], null, 0).minutes === 60, 'unset: phase targets (off-season 60–75; trainer gym 45–60)');
const other = { ...withRoom, events: (withRoom.events ?? []).map((e) => ({ ...e, teamName: 'Club' })) };
ok(targetFor(other, gs, new Date('2026-11-24T12:00:00')).source !== 'date', "another team's event never carries its room time");
const fctx: FitCtx = { rest: { phase: 'off' }, warmup: { phase: 'off', equipment: ALL_EQUIPMENT, position: 'Outside Hitter' }, kind: 'school' };
const big: Session = { id: 'big', name: 'Big', focus: '', source: 'approach', exercises: [
  row('hang-clean', 5, '2', 'Max effort', 'power'), row('box-jump', 3, '3', 'Max effort', 'power'),
  row('back-squat', 5, '4', 'RPE 8', 'main'),
  row('split-squat', 4, '8 each', 'RPE 7', 'secondary'), row('copenhagen', 4, '20s each', 'Controlled', 'secondary'),
  row('nordic', 3, '5', 'RPE 7', 'accessory'), row('pallof', 3, '10 each', 'Controlled', 'core'),
  row('band-er', 2, '15 each', 'Light', 'care'), row('tib-raise', 2, '15', 'Light', 'care'),
] };
const before = estimateSession(big, fctx);
const fit45 = fitSession(big, 45, fctx);
const order = fit45.trims.map((t) => t.step);
ok(before > 45 && order.every((s, i) => i === 0 || s >= order[i - 1]), `trims in the §4a order (${fit45.trims.map((t) => `${t.step}:${t.key}`).join(' ')}) · ${before} → ${fit45.after} min`);
ok(fit45.session.exercises.some((e) => blockOf(e) === 'B') && fit45.session.exercises.filter((e) => blockOf(e) === 'B').every((e) => e.sets >= 3), 'the B-block is never removed and never below 3 sets');
const rbig = (s: Session) => s.exercises.map((e) => restSecFor(e, fctx.rest));
ok(fit45.session.exercises.every((e) => { const k = big.exercises.findIndex((x) => x.exerciseId === e.exerciseId); return k < 0 || restSecFor(e, fctx.rest) >= rbig(big)[k]; }), 'rest is never shortened in a generated session');
ok(!!warmupFor(fit45.session, { ...fctx.warmup, compact: fit45.compactWarmup }), 'the warm-up is never removed (compacted at most)');
const fit20 = fitSession(big, 20, fctx);
ok(fit20.express && expressSession(big).exercises.length <= 4, `a target under about 25 min produces an Express session (${fit20.session.exercises.map((e) => e.exerciseId).join(', ')})`);
ok(fit45.trims.every((t) => t.text.length > 3) && fitSession(big, 45, fctx, { skip: [fit45.trims[0].key] }).trims.every((t) => t.key !== fit45.trims[0].key), 'each trim is a line, and undo skips that trim (fitLog undo:<step>)');
const coachBig = coachEdit(big);
const sugg = fitSession(coachBig, 45, { ...fctx, rest: { ...fctx.rest, free: true } }, { all: true });
ok(sugg.trims.length > 0 && JSON.stringify(coachBig.exercises) === JSON.stringify(coachEdit(big).exercises), 'coach-built: Fit to time only suggests; the session is unchanged until a suggestion is applied');
const applied = applyTrims(coachBig, [sugg.trims[0].key], { ...fctx, rest: { ...fctx.rest, free: true } });
ok(JSON.stringify(applied.exercises) !== JSON.stringify(coachBig.exercises), 'applying one suggestion changes only that trim');
const est = coachEstimate({ ...gen, sessions: [coachBig], teamId: 't', postedAt: 'x' }, coachBig, null, 0);
ok(est.minutes > 45, `coach-built estimate shows against the target (${est.minutes} / ${est.target.minutes})`);
const oldGen: Session = { ...gs, exercises: gs.exercises };
ok(oldGen.exercises.every((e) => blockOf(e) !== null) && fitSession(oldGen, 30, { ...fctx, warmup: { ...fctx.warmup, position: 'Middle Blocker' } }).trims.length > 0, 'before generatorV3: fitting works on 2.3.0 generated sessions via the slot-role → block mapping');
const rs30 = resolveSession({ ...gen, sessionMinutes: 30 }, gs, { level: 1, logs: [] }, d);
const rs75 = resolveSession({ ...gen, sessionMinutes: 75 }, gs, { level: 1, logs: [] }, d);
ok(rs30.estMinutes < rs75.estMinutes || rs30.express, `athlete Today estimate follows the fitted session (${rs30.estMinutes} at 30 vs ${rs75.estMinutes} at 75)`);
void SESSION_TYPE_LABEL; void addDays; void dateKey;

console.log(f ? `\n${f} FAIL` : '\nall pass');
