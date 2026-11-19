import { FLAGS } from '../../src/lib/flags';
import { generateProgram, weekSummary, HOME_EXCLUDED } from '../../src/lib/generator';
import { weekPlan, mondayOf, addDays } from '../../src/lib/calendar';
import { resolveSession } from '../../src/lib/resolve';
import { getExercise, fits } from '../../src/lib/exercises';
import { pairReason, circuitReason, blockRests, autoGroup, sessionMinutes, groupRows, PAIR_REASONS, CIRCUIT_REASONS } from '../../src/lib/groups';
import { restFor } from '../../src/lib/rest';
let f = 0; const ok = (c: boolean, m: string) => { console.log(c ? 'pass' : 'FAIL', m); if (!c) f++; };
const g = getExercise;
// --- Home (§9 worked example): off-season, weight room Tue/Thu, total 4, practices Mon–Thu, Sat tournament
const wk: any = ['practice', 'practice', 'practice', 'practice', 'off', 'tournament', 'off'];
const p = { ...generateProgram({ position: 'Setter', phase: 'off', experience: 'intermediate', volleyballWeek: wk, liftDaysPerWeek: 4, weightRoomDays: [1, 3] }), teamId: 't' };
const mon = mondayOf(new Date(2026, 10, 16));
const plan = weekPlan(p, mon);
const name = (sid: string | null) => p.sessions.find((s) => s.id === sid);
console.log('week:', plan.map((d, i) => `${'MTWTFSS'[i]}:${name(d.sessionId)?.name ?? '-'}`).join(' '));
ok(name(plan[1].sessionId)?.location !== 'home' && name(plan[3].sessionId)?.location !== 'home', 'Tue/Thu are school sessions');
const homeDays = plan.filter((d) => name(d.sessionId)?.location === 'home');
ok(homeDays.length === 2, `2 home days (${homeDays.map((d) => name(d.sessionId)!.name)})`);
ok(!plan[5].sessionId && !(name(plan[4].sessionId)?.location === 'home' && name(plan[4].sessionId)!.name.includes('Lower')), 'no home on the tournament; Fri (day before) not leg-heavy');
ok(plan.some((d) => !d.sessionId), 'at least one day with no training (H3)');
ok(weekSummary(p).line === '2 weight-room days + 2 home days.', `summary: ${weekSummary(p).line} / ${weekSummary(p).beginners}`);
// Per athlete: beginner cap 3 + 1 light
const pb = weekPlan(p, mon, 'beginner');
const full = pb.filter((d) => d.sessionId && !name(d.sessionId)?.light).length;
const lights = pb.filter((d) => name(d.sessionId)?.light).length;
ok(full === 3 && lights === 1, `beginner: 3 full + 1 light (${full}+${lights})`);
// H6 pool
const homeEx = p.sessions.filter((s) => s.location === 'home').flatMap((s) => s.exercises.map((e) => g(e.exerciseId)));
// 2.4.1 (generator v3, home-and-mobility §3b): home defaults are bodyweight; a sturdy step (box) is allowed for the Copenhagen.
// 2.4.1 (generator v3, home-and-mobility §3b): what a bodyweight-only athlete gets at home is bodyweight (a sturdy step is
// allowed for the Copenhagen); care work moved from the weight room is resolved per athlete like any home item.
const homeGot = FLAGS.generatorV3
  ? p.sessions.filter((s) => s.location === 'home' && !s.light && !s.mobility).flatMap((s) => resolveSession(p, s, { level: 2, logs: [], homeEquipment: [] }, new Date(2026, 10, 17)).exercises.map((e) => g(e.exerciseId)))
  : homeEx;
ok(homeGot.every((e) => !HOME_EXCLUDED.has(e.id) && e.pattern !== 'olympic' && e.pattern !== 'jump' && (fits(e, []) || (FLAGS.generatorV3 && fits(e, ['box'])))), 'home defaults: bodyweight (v3: what a bodyweight athlete gets), no excluded/olympic/jumps');
// Two athletes, different equipment, same slot
const hs = p.sessions.find((s) => s.location === 'home' && !s.light)!;
const a1 = resolveSession(p, hs, { level: 2, logs: [], homeEquipment: [] });
const a2 = resolveSession(p, hs, { level: 2, logs: [], homeEquipment: ['dumbbells', 'bench', 'bands', 'pullup-bar'] });
ok(a1.exercises.some((e, i) => a2.exercises[i] && e.exerciseId !== a2.exercises[i].exerciseId), `different equipment → different exercises (${a1.exercises.map((e) => e.exerciseId).join(',')} vs ${a2.exercises.map((e) => e.exerciseId).join(',')})`);
// Compared slot by slot (the written exercise). v3 (R-2): an item one athlete already does in another slot isn't repeated.
const slot = (e: { teamExerciseId?: string; exerciseId: string }) => e.teamExerciseId ?? e.exerciseId;
ok(a2.exercises.every((e) => { const o = a1.exercises.find((x) => slot(x) === slot(e)); return !o || (e.sets === o.sets && e.reps === o.reps); }) && a1.exercises.every((e) => a2.exercises.some((x) => slot(x) === slot(e))), 'coach sets/reps unchanged');
const b = resolveSession(p, hs, { level: 1, logs: [], homeEquipment: ['dumbbells', 'kettlebells', 'bands', 'pullup-bar', 'bench', 'box'] });
ok(b.exercises.every((e) => g(e.exerciseId).level <= 1), 'beginner never gets level 2–3 at home');
const ls = p.sessions.find((s) => s.light)!;
const lr = resolveSession(p, ls, { level: 3, logs: [], homeEquipment: ['dumbbells'] });
ok(lr.lightHome && lr.exercises.every((e) => fits(g(e.exerciseId), []) && g(e.exerciseId).pattern !== 'jump') && lr.exercises.every((e) => !/RPE ([7-9]|10)/.test(e.effort)), `light day: bodyweight, no jumps, RPE ≤ 6 (${lr.estMinutes} min)`);
ok(lr.estMinutes >= 10 && lr.estMinutes <= 22, `light day about 15–20 min (${lr.estMinutes})`);
// Jumps at home: only when on, off/pre, level 1
const pj = generateProgram({ position: 'Setter', phase: 'off', experience: 'advanced', volleyballWeek: wk, liftDaysPerWeek: 4, weightRoomDays: [1], homeJumps: true });
const jumpsAtHome = pj.sessions.filter((s) => s.location === 'home').flatMap((s) => s.exercises.map((e) => g(e.exerciseId))).filter((e) => e.pattern === 'jump');
// 2.4.1 v3 programs: home-and-mobility §3b's level 1 list (Pogo Hops, Squat Jump, Line Hops, Skater Hop, CMJ); 2.3.0: home-workouts H7.
const homeJumpList = FLAGS.generatorV3 ? ['pogo', 'squat-jump', 'line-hops', 'skater-hop', 'cmj'] : ['pogo', 'squat-jump', 'broad-jump'];
ok(jumpsAtHome.length > 0 && jumpsAtHome.every((e) => homeJumpList.includes(e.id) && e.level === 1), `home jumps only level-1 list (${jumpsAtHome.map((e) => e.id)})`);
const pin = generateProgram({ position: 'Setter', phase: 'in', experience: 'advanced', volleyballWeek: wk, liftDaysPerWeek: 3, weightRoomDays: [1], homeJumps: true });
ok(!pin.sessions.flatMap((s) => s.exercises).some((e) => s(e)), 'no home jumps in-season');
function s(e: any) { return g(e.exerciseId).pattern === 'jump' && pin.sessions.find((x) => x.exercises.includes(e))!.location === 'home'; }
// --- Supersets
ok(pairReason(g('back-squat'), g('db-row')) === PAIR_REASONS.heavy, 'tier A never paired');
ok(pairReason(g('box-jump'), g('pallof')) === PAIR_REASONS.power, 'tier P never paired');
ok(pairReason(g('split-squat'), g('step-up')) === PAIR_REASONS.legs, 'two lower tier B blocked');
ok(pairReason(g('db-row'), g('farmer-carry')) === PAIR_REASONS.grip, 'two grip-heavy blocked');
ok(pairReason(g('cable-row'), g('db-bench')) === PAIR_REASONS.station, 'different stations blocked');
ok(pairReason(g('db-bench'), g('db-row')) === null, 'DB bench + DB row allowed');
const pr = blockRests([{ exerciseId: 'db-bench', sets: 3, reps: '8', effort: 'RPE 7', group: 'A' }, { exerciseId: 'db-row', sets: 3, reps: '8 each', effort: 'RPE 7', group: 'A' }] as any, [90, 90]);
ok(pr[0] === 15 && pr[1] === 75, `superset rest: 15 s then 75 s (${pr})`);
// Circuits
ok(circuitReason([g('db-bench'), g('db-row'), g('pallof')]) === null, 'DB bench + row + Pallof circuit allowed');
const cr = blockRests([{ exerciseId: 'db-bench', group: 'A' }, { exerciseId: 'db-row', group: 'A' }, { exerciseId: 'pallof', group: 'A' }] as any, [90, 90, 60]);
ok(cr[2] === 60 && cr[0] === 15, `circuit rest after round 60 s (${cr})`);
const cr2 = blockRests([{ exerciseId: 'side-plank', group: 'B' }, { exerciseId: 'band-er', group: 'B' }, { exerciseId: 'dead-bug', group: 'B' }] as any, [45, 30, 45]);
ok(cr2[2] === 45, `tier C/D circuit floor 45 s (${cr2[2]})`);
ok(circuitReason([g('back-squat'), g('db-row'), g('pallof')]) === CIRCUIT_REASONS.heavy, 'tier A in circuit blocked');
ok(circuitReason([g('split-squat'), g('step-up'), g('pallof')]) === CIRCUIT_REASONS.legs, 'two leg-heavy blocked');
ok(circuitReason([g('db-row'), g('farmer-carry'), g('pallof')]) === CIRCUIT_REASONS.grip, 'two grip blocked');
ok(circuitReason([g('pushup'), g('db-bench'), g('pallof')]) === CIRCUIT_REASONS.pattern, 'same pattern blocked');
ok(circuitReason([g('cable-row'), g('db-bench'), g('pallof')]) === CIRCUIT_REASONS.station, 'mixed stations blocked');
// Beginner circuit cap
// 2.4.0 (spec §0.1): C1 applies to Approach-generated sessions; this fixture is a generated session (source 'approach').
const circ = { id: 'c', name: 'C', focus: '', source: 'approach', exercises: [{ exerciseId: 'db-bench', sets: 3, reps: '8', effort: 'RPE 7', group: 'A' }, { exerciseId: 'db-row', sets: 3, reps: '8', effort: 'RPE 7', group: 'A' }, { exerciseId: 'pallof', sets: 3, reps: '8', effort: 'Controlled', group: 'A' }, { exerciseId: 'band-er', sets: 3, reps: '15', effort: 'Light', group: 'A' }] } as any;
const pc = { ...p, sessions: [circ] };
const rb = resolveSession(pc, circ, { level: 1, logs: [] });
ok(rb.exercises.filter((e) => e.group === 'A').length === 3 && !!rb.exercises[3].afterCircuit && !rb.exercises[3].group, 'beginner: circuit of 3, 4th after as straight sets');
// 2.4.0: a coach-built circuit of 4 stays as written for beginners (C1 builder rule superseded, §0.3).
const coachCirc = { ...circ, source: 'coach' };
const rc = resolveSession({ ...pc, sessions: [coachCirc] }, coachCirc, { level: 1, logs: [] });
ok(rc.exercises.filter((e) => e.group === 'A').length === 4, '2.4.0: coach-built circuit of 4 stays 4 for beginners');
const ra = resolveSession(pc, circ, { level: 2, logs: [] });
ok(ra.exercises.filter((e) => e.group === 'A').length === 4, 'intermediate: circuit of 4');
// Auto-pairing only until fits
const off = generateProgram({ position: 'Setter', phase: 'off', experience: 'advanced', volleyballWeek: ['off','off','off','off','off','off','off'] as any, liftDaysPerWeek: 3 });
const inS = generateProgram({ position: 'Setter', phase: 'in', experience: 'advanced', volleyballWeek: ['practice','practice','off','practice','game','off','off'] as any, liftDaysPerWeek: 3 });
const anyP = (pp: any) => pp.sessions.some((x: any) => x.exercises.some((e: any) => e.group));
const overTarget = (pp: any, t: number) => pp.sessions.filter((x: any) => !x.mobility).map((x: any) => sessionMinutes(x.exercises, { phase: pp.phase }));
console.log('off minutes', overTarget(off, 60), 'grouped', anyP(off), '| in minutes', overTarget(inS, 40), 'grouped', anyP(inS));
ok(off.sessions.every((x: any) => !x.exercises.some((e: any) => e.group) || sessionMinutes(x.exercises.map((e: any) => ({ ...e, group: undefined })), { phase: 'off' }) > 60), 'off-season school: straight sets unless over 60 min');
ok(inS.sessions.every((x: any) => x.exercises.every((e: any) => !e.group || !['P', 'A'].includes(g(e.exerciseId).tier))), 'auto-pairing never groups tier P/A');
const gr = groupRows(circ.exercises.map((e: any) => ({ ...e, group: undefined })), [0, 1]);
ok(!!gr.list && gr.list[0].group === gr.list[1].group, 'coach pairs rows');
console.log(f ? `${f} FAILED` : 'all passed');
