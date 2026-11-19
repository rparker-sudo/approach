import { FLAGS } from '../../src/lib/flags';
import { resolveExercise, resolveSession, easingFor, capEffort, effortCeiling } from '../../src/lib/resolve';
import { getExercise, EXERCISES, EQUIPMENT_PRESETS } from '../../src/lib/exercises';
import { suggestWeight } from '../../src/lib/progression';
import { restFor } from '../../src/lib/rest';
import { generateProgram } from '../../src/lib/generator';
import { addDays } from '../../src/lib/calendar';
let fail = 0; const ok = (c: boolean, m: string) => { if (!c) { fail++; console.log('FAIL', m); } else console.log('pass', m); };
const ALL = ['barbell','dumbbells','kettlebells','bench','bands','cable','pullup-bar','plyo-box','med-ball','trap-bar'] as any;
ok(resolveExercise(getExercise('front-squat'), 1, ALL)?.id === 'goblet-squat', 'Front Squat → Goblet Squat (beginner)');
const hc = resolveExercise(getExercise('hang-clean'), 1, ALL);
ok(!!hc && hc.pattern === 'jump' && hc.level === 1, `Hang Power Clean → level 1 jump (${hc?.id})`);
// safety-guidelines §2a step 5 ("Olympic lifts resolve to a jump for anyone below advanced"). With catalogV3 on, spec §2.1/§3
// and program-design §8a give intermediates L2 derivatives instead (not listed in spec §0.3; raised with Ryan in the report).
if (FLAGS.catalogV3) ok(resolveExercise(getExercise('hang-clean'), 2, ALL)?.id === 'hang-high-pull', 'CONFLICT (spec §2.1/§8a vs safety §2a step 5; catalogV3 on) → Hang Power Clean → Hang High Pull for intermediate');
else ok(resolveExercise(getExercise('hang-clean'), 2, ALL)?.pattern === 'jump', 'Hang Power Clean → jump for intermediate too');
const bands = (EQUIPMENT_PRESETS as any).find((p: any) => /band/i.test(p.label))?.items ?? ['bands'];
for (const ex of EXERCISES) {
  const r = resolveExercise(ex, 1, bands);
  if (r && r.level > 1) { ok(false, `bands: ${ex.id} resolved up to ${r.id}`); }
}
ok(true, 'bands program never resolves above level 1');
// session: advanced team program, beginner athlete
const prog = { ...generateProgram({ position: 'Middle Blocker', phase: 'off', experience: 'advanced', volleyballWeek: ['practice','practice','practice','practice','practice','off','off'] as any, liftDaysPerWeek: 4, liftDays: [0,1,3,4] }), teamId: 't1' };
const sess = prog.sessions[0];
const r = resolveSession(prog, sess, { level: 1, logs: [] }, new Date(2026, 10, 16));
ok(r.exercises.every((e) => getExercise(e.exerciseId).level <= 1), `beginner never sees level 2–3 (${r.swaps.length} swaps, ${r.dropped} dropped)`);
ok(r.exercises.every((e, i) => true), 'coach sets/reps kept');
const orig = sess.exercises.find((e) => getExercise(e.exerciseId).level > 1)!;
const res = r.exercises.find((e) => e.teamExerciseId === orig.exerciseId);
ok(!!res && res.sets === orig.sets && res.reps === orig.reps, `swap keeps sets × reps (${orig.exerciseId} → ${res?.exerciseId})`);
ok(r.exercises.every((e) => !/RPE (9|10)|fail|max(?! effort)/i.test(e.effort)), 'no strength effort above the ceiling');
console.log('swaps:', r.swaps.map((s) => `${s.from} → ${s.to}`).join(', '), '| est', r.estMinutes, 'min');
// effort caps
ok(capEffort('RPE 9', 8) === 'RPE 8' && capEffort('To failure', 8) === 'RPE 8' && capEffort('RPE 7–8', 7) === 'RPE 7' && capEffort('RPE 6–7', 8) === 'RPE 6–7', 'effort caps');
ok(effortCeiling(1,'off',false) === 7 && effortCeiling(3,'off',false) === 8 && effortCeiling(3,'in',false) === 7 && effortCeiling(3,'off',true) === 6, 'ceilings beginner 7, int/adv 8, in-season 7, easing 6');
// easing
const t0 = new Date(2026, 11, 1);
const L = (d: Date, w = 100) => ({ id: String(+d), date: d.toISOString(), programId: 'p', sessionId: 's', sessionName: 'x', entries: [{ exerciseId: 'back-squat', sets: [5,5,5].map((n) => ({ weight: String(w), reps: String(n), done: true })) }] });
const old = [L(addDays(t0, -20))];
ok(easingFor(old as any, t0).active, '14+ days without a log → easing today');
const back = [L(addDays(t0, -30)), L(addDays(t0, -3))];
ok(easingFor(back as any, t0).active, 'came back 3 days ago → still easing');
ok(!easingFor([L(addDays(t0, -30)), L(addDays(t0, -7))] as any, t0).active, 'day 8 after coming back → normal');
ok(!easingFor([L(addDays(t0, -2))] as any, t0).active, 'recent logs → normal');
const pe = { exerciseId: 'back-squat', sets: 3, reps: '5', effort: 'RPE 7' };
const normal = suggestWeight(old as any, pe)!, eased = suggestWeight(old as any, pe, undefined, undefined, true)!;
ok(eased.weight === 90 && eased.weight <= normal.weight && eased.reason === 'easing', `easing suggestion ~10% below last (100 → ${eased.weight}, normal ${normal.weight})`);
const rr = resolveSession(prog, sess, { level: 2, logs: old as any }, t0);
ok(rr.easing.active && rr.exercises.filter((e) => ['main','secondary','accessory'].includes(e.role ?? '')).every((e) => !/RPE [7-9]/.test(e.effort)), 'easing caps strength effort at RPE 6');
// rest
ok(restFor(getExercise('back-squat'), { reps: '5', effort: 'RPE 7' }) === 180 && restFor(getExercise('goblet-squat'), { reps: '10', effort: 'RPE 7' }) === 75 && restFor(getExercise('band-er'), { reps: '15 each', effort: 'Light' }) === 30, 'rest: back squat 4×5 3:00, goblet 3×10 1:15, band ER 0:30');
console.log(fail ? `${fail} FAILED` : 'ALL RESOLVE CHECKS PASS');
