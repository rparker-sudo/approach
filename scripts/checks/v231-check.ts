// 2.3.1 custom exercises: safety tags (tier, level, movement), resolution, rest floors, pairing, effort clamps, isolation from the library.
import { EXERCISES, GENERAL_POOL, getExercise, registerCustomExercises } from '../../src/lib/exercises';
import { customProblem, makeCustom, movementsFor } from '../../src/lib/customExercise';
import { levelTable, resolveSession } from '../../src/lib/resolve';
import * as GEN from '../../src/lib/general';
import * as RES from '../../src/lib/resolve';
import { REST_FLOOR, tierOf } from '../../src/lib/rest';
import { groupRows } from '../../src/lib/groups';
import { generateProgram } from '../../src/lib/generator';
import { encodeProgram, decodeProgram } from '../../src/lib/store';
import type { Program, Session } from '../../src/lib/types';

let f = 0;
const ok = (c: boolean, m: string) => {
  console.log(c ? 'pass' : 'FAIL', m);
  if (!c) f++;
};

const heavy = makeCustom({ name: 'Safety Bar Squat', cue: 'Brace, sit down, stand tall.', type: 'A', pattern: 'squat', level: 3, equipment: ['barbell'], weighted: true, steps: ['Set up', '', 'Squat'] });
const acc = makeCustom({ name: 'Band Walk', cue: '', type: 'C', pattern: 'core-ext', level: 1, equipment: ['bands'], weighted: false, steps: [] });
const jump = makeCustom({ name: 'Seated Box Jump', cue: '', type: 'P', pattern: 'jump', level: 2, equipment: ['box'], weighted: true, steps: [] });
ok(heavy.id.startsWith('custom-') && heavy.custom === true && heavy.tier === 'A' && heavy.category === 'lower' && heavy.level === 3, 'custom exercise carries id, type (tier), category and level');
ok(heavy.howTo.steps.length === 2 && JSON.stringify(heavy.equipment) === '[["barbell"]]', 'blank steps dropped; equipment is one setup');
ok(jump.category === 'power' && acc.category === 'core', 'power and core categories from type and movement');
ok(customProblem({ name: '', cue: '', type: 'B', pattern: 'squat', level: 1, equipment: [], weighted: true, steps: [] }, false) === 'Give it a name.', 'name required');
ok(customProblem({ name: 'X', cue: '', type: 'P', pattern: 'squat', level: 1, equipment: [], weighted: true, steps: [] }, false) !== null, 'movement must fit the type');
ok(!movementsFor('C', false).some((m) => m.id === 'arm-flex') && movementsFor('C', true).some((m) => m.id === 'arm-flex'), 'arm/shoulder-raise movements only in trainer teams');
ok(!movementsFor('A', true).some((m) => m.id === 'cardio' || m.id === 'olympic'), 'no cardio or Olympic custom exercises');

registerCustomExercises([heavy, acc, jump]);
ok(getExercise(heavy.id).name === 'Safety Bar Squat', 'registered custom exercises resolve by id');
ok(!EXERCISES.some((e) => e.custom) && !GENERAL_POOL.some((e) => e.custom), 'never added to the library or the general pool');
ok(tierOf(heavy) === 'A' && tierOf(jump) === 'P', 'tier from the chosen type');

// Volleyball program with the custom exercises
const vb = generateProgram({ position: 'All positions', phase: 'off', experience: 'advanced', volleyballWeek: ['practice', 'off', 'practice', 'off', 'practice', 'off', 'off'], liftDaysPerWeek: 2 });
const ses: Session = { id: 'c', name: 'c', focus: '', exercises: [
  { exerciseId: heavy.id, sets: 3, reps: '5', effort: 'RPE 9', role: 'main', restSec: 30, restSetByCoach: true },
  { exerciseId: acc.id, sets: 2, reps: '10', effort: 'Controlled', role: 'core' },
] };
const prog: Program = { ...vb, sessions: [...vb.sessions, ses], customExercises: [heavy, acc, jump], teamId: 't' };
ok(!generateProgram({ position: 'All positions', phase: 'off', experience: 'advanced', volleyballWeek: vb.volleyballWeek, liftDaysPerWeek: 3 }).sessions.some((s) => s.exercises.some((e) => e.exerciseId.startsWith('custom-'))), 'generator never picks custom exercises');
const d = new Date('2026-11-23T12:00:00');
const adv = resolveSession(prog, ses, { level: 3, logs: [] }, d);
ok(adv.exercises[0].exerciseId === heavy.id, 'at or above its level: the athlete gets the custom exercise');
// CLAUDE.md known conflict 2: the builder limits 2.3.1 applied through the type are builder blocks and come out for
// coach-built sessions → SUPERSEDED (§0.3). The type still drives resolution, the level toggle, warm-ups and auto rest.
const sup = (c: boolean, m: string) => ok(c, `SUPERSEDED (§0.3) → ${m}`);
sup(adv.exercises[0].restSecResolved === 30, `heavy custom rest floor: the coach's 0:30 resolves as typed (${adv.exercises[0].restSecResolved}s)`);
sup(adv.exercises[0].effort === 'RPE 9', `effort ceiling on custom strength work: coach-built keeps RPE 9 as written (${adv.exercises[0].effort})`);
const sesA = { ...ses, source: 'approach' as const };
const advA = resolveSession({ ...prog, sessions: [...vb.sessions, sesA] }, sesA, { level: 3, logs: [] }, d);
ok(advA.exercises[0].restSecResolved >= (REST_FLOOR.A ?? 120) && /RPE [78]/.test(advA.exercises[0].effort), `2.4.0: in an Approach-generated session the type still drives the floor and ceiling (${advA.exercises[0].restSecResolved}s, ${advA.exercises[0].effort})`);
const beg = resolveSession(prog, ses, { level: 1, logs: [] }, d);
const sub = getExercise(beg.exercises[0].exerciseId);
ok(!sub.custom && sub.pattern === 'squat' && sub.level === 1, `below its level: the closest library exercise of the same movement (${sub.id})`);
sup(!('effortProblem' in RES), 'minors: RPE 9 on a custom strength row saves (no builder block exists)');
sup(!('generalEffortProblem' in GEN), 'trainer teams: AMRAP on a heavy custom row saves (no builder block exists)');
sup(groupRows([ses.exercises[0], { exerciseId: 'db-row', sets: 3, reps: '8', effort: 'RPE 7' }], [0, 1]).list.filter((e) => e.group).length === 2, 'pairing rules: a heavy custom lift can be paired (volleyball)');
const lt = levelTable([prog]);
ok(Object.keys(lt).some((k) => k.startsWith(heavy.id)), 'level table covers custom exercises (coach adjustments)');
// round trip through a shared program code keeps them
const back = decodeProgram(encodeProgram(prog));
ok(!!back && back.customExercises?.length === 3, 'custom exercises travel with the program (posted JSON / program code)');

console.log(f ? `\n${f} FAIL` : '\nall pass');
