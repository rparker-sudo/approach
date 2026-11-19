import { FLAGS } from '../../src/lib/flags';
import { generateProgram, liftDayCap, liftDayCount, pickExercise } from '../../src/lib/generator';
import { EXERCISES, getExercise, ALL_EQUIPMENT } from '../../src/lib/exercises';
import { suggestWeight, increaseFor } from '../../src/lib/progression';
import type { DayType, Equipment, Experience, Phase } from '../../src/lib/types';
let fail = 0;
const ok = (c: boolean, m: string) => { if (!c) { fail++; console.log('FAIL', m); } };
const week: DayType[] = ['practice','practice','practice','practice','game','off','off'];
const allDays = [0,1,2,3,4,5,6];
// G1: the 2.3.0 generator (generatorV3 off) keeps G1 as written. 2.4.1 spec §0: for v3 programs R-1 replaces it
// ("SUPERSEDED (§0) → R-1": the resolved session never exceeds the athlete's level; tested in v241-check.ts).
const v3was = FLAGS.generatorV3;
FLAGS.generatorV3 = false;
const levels: Record<Experience, number> = { beginner: 1, intermediate: 2, advanced: 3 };
const kits: Equipment[][] = [['pullup-bar'], [], ['bands'], ['dumbbells'], ALL_EQUIPMENT];
let skipped = 0;
for (const exp of ['beginner','intermediate','advanced'] as Experience[]) for (const phase of ['off','pre','in'] as Phase[]) for (const eq of kits) for (let d = 1; d <= 7; d++) {
  const p = generateProgram({ position: 'Middle Blocker', phase, experience: exp, volleyballWeek: week, liftDaysPerWeek: d, liftDays: allDays.slice(0, d), equipment: eq });
  for (const s of p.sessions) for (const e of s.exercises) ok(getExercise(e.exerciseId).level <= levels[exp], `G1 ${exp} ${eq} got ${e.exerciseId} L${getExercise(e.exerciseId).level}`);
  // G2
  const cap = liftDayCap(exp, phase);
  ok(liftDayCount(p) <= cap, `G2 cap ${exp} ${phase} d=${d}: ${liftDayCount(p)} > ${cap}`);
  ok(p.liftSchedule.some((x) => !x), `G2 rest day ${exp} ${phase} d=${d}`);
  const extra = p.liftSchedule.filter((sid) => sid && p.sessions.find((s) => s.id === sid)?.mobility);
  for (const sid of extra) { const s = p.sessions.find((x) => x.id === sid)!; ok(s.exercises.every((e) => ['mobility','care','core'].includes(e.role ?? '')), 'G2 extra day not mobility-only'); }
}
FLAGS.generatorV3 = v3was;
console.log('pass SUPERSEDED (§0) → G1 for v3 programs is R-1 (v241-check.ts)');
// beginner with only a pull-up bar: slot-level check
const pb = generateProgram({ position: 'Outside Hitter', phase: 'off', experience: 'beginner', volleyballWeek: week, liftDaysPerWeek: 3, liftDays: [0,2,5], equipment: ['pullup-bar'] });
console.log('beginner + pull-up bar sessions:', pb.sessions.map((s) => `${s.name}: ${s.exercises.map((e) => e.exerciseId + '(L' + getExercise(e.exerciseId).level + ')').join(', ')}`).join(' | '));
ok(pickExercise(['olympic'], 'power', { equipment: ['pullup-bar'], maxLevel: 1, usedWeek: new Set(), usedSession: new Set() }) === undefined, 'G1 olympic slot skipped for beginner');
console.log('caps: beg/off', liftDayCap('beginner','off'), 'int/off', liftDayCap('intermediate','off'), 'adv/off', liftDayCap('advanced','off'), 'adv/in', liftDayCap('advanced','in'), 'adv/pre', liftDayCap('advanced','pre'));
ok(liftDayCap('advanced','in') === 3 && liftDayCap('beginner','off') === 3 && liftDayCap('intermediate','pre') === 4 && liftDayCap('advanced','off') === 5, 'G2 caps');
// G5
const log = (id: string, w: number, reps: number[]) => ({ id: 'l', date: '2026-11-01T10:00:00Z', programId: 'p', sessionId: 's', sessionName: 'x', entries: [{ exerciseId: id, sets: reps.map((r) => ({ weight: String(w), reps: String(r), done: true })) }] });
const db = suggestWeight([log('db-bench', 10, [10,10,10])] as never, { exerciseId: 'db-bench', sets: 3, reps: '8–10', effort: '' }, ALL_EQUIPMENT);
console.log('10 lb dumbbell top of range →', db);
ok(!!db && db.weight <= 12.5 && db.delta !== 5, 'G5 10lb DB');
const bb = suggestWeight([log('back-squat', 225, [5,5,5,5])] as never, { exerciseId: 'back-squat', sets: 4, reps: '5', effort: '' }, ALL_EQUIPMENT);
const bb2 = suggestWeight([log('back-squat', 95, [5,5,5,5])] as never, { exerciseId: 'back-squat', sets: 4, reps: '5', effort: '' }, ALL_EQUIPMENT);
console.log('225 squat →', bb?.weight, ' 95 squat →', bb2?.weight, ' 40 lb DB step', increaseFor(40,'dumbbell'), ' 80 DB step', increaseFor(80, 'dumbbell'));
ok(bb!.delta === 10 && bb2!.delta === 7.5 && increaseFor(80,'dumbbell') === 5, 'G5 caps');
for (const id of ['band-row','band-pulldown','band-good-morning']) ok(suggestWeight([log(id, 20, [15,15,15])] as never, { exerciseId: id, sets: 3, reps: '12–15', effort: '' }, ALL_EQUIPMENT) === null, `G5 band ${id}`);
for (const id of ['pallof','face-pull']) {
  ok(suggestWeight([log(id, 20, [15,15,15])] as never, { exerciseId: id, sets: 3, reps: '12–15', effort: '' }, ['bands']) === null, `G5 band-only ${id}`);
  console.log(id, 'with cable →', suggestWeight([log(id, 20, [15,15,15])] as never, { exerciseId: id, sets: 3, reps: '12–15', effort: '' }, ['cable','bands'])?.weight);
}
const holds = EXERCISES.filter((e) => /hold/i.test(e.name) || e.id.includes('plank'));
for (const h of holds) ok(suggestWeight([log(h.id, 20, [30,30])] as never, { exerciseId: h.id, sets: 2, reps: '30s', effort: '' }) === null, `G5 hold ${h.id}`);
console.log(fail ? `${fail} FAILED` : 'ALL S11 CHECKS PASS');
