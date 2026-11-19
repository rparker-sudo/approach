// 2.4.0: with catalogV3 and rackRotation off, Part 2 disappears cleanly (spec Part 2 "General"); generatorV3 off keeps the
// 2.3.0 generator. Flags are set before the modules that read them load.
import { FLAGS } from '../../src/lib/flags';
let f = 0;
const ok = (c: boolean, m: string) => {
  console.log(c ? 'pass' : 'FAIL', m);
  if (!c) f++;
};
FLAGS.catalogV3 = false;
FLAGS.rackRotation = false;
(async () => {
  const ex = await import('../../src/lib/exercises');
  const res = await import('../../src/lib/resolve');
  const gen = await import('../../src/lib/generator');
  ok(ex.EXERCISES.length === 74 + 15 && ex.exercisePool(false) === ex.EXERCISES, `catalogV3 off: library is 2.3.1 + the 15 Part 1 drills (${ex.EXERCISES.length})`);
  ok(!ex.EQUIPMENT.some((e) => ['ssb', 'ghd', 'suspension', 'sliders', 'hurdles'].includes(e.id)), 'catalogV3 off: no new equipment items');
  ok(ex.getExercise('hang-clean').easier === 'kb-swing', 'catalogV3 off: existing links unchanged');
  ok(res.resolveExercise(ex.getExercise('hang-clean'), 2, ex.ALL_EQUIPMENT)?.pattern === 'jump', 'catalogV3 off: Olympic lifts resolve to a jump below advanced (2.2.1 rule)');
  ok(gen.pickExercise(['olympic'], 'power', { equipment: ex.ALL_EQUIPMENT, maxLevel: 2, usedWeek: new Set(), usedSession: new Set() }) === undefined, 'catalogV3 off: no Olympic pick below level 3');
  ok(ex.getExercise('ssb-squat').name === 'Safety Bar Squat', 'catalogV3 off: catalog ids still resolve by id (old logs and programs open)');
  const fs = (require as (m: string) => { readFileSync: (p: string, e: string) => string })('fs');
  const path = (require as (m: string) => { join: (...p: string[]) => string })('path');
  const src = (p: string) => fs.readFileSync(path.join(__dirname, '../../src', p), 'utf8');
  ok(/FLAGS\.rackRotation \? <Chip label="Rack rotation"/.test(src('components/StationsEditor.tsx')) && /FLAGS\.rackRotation &&/.test(src('components/StationControls.tsx')) && /FLAGS\.rackRotation \?/.test(src('app/board/[teamId].tsx')) && /FLAGS\.rackRotation &&/.test(src('components/RotationAthlete.tsx')), 'rackRotation off: the format chip, coach controls, board ring and athlete views are hidden');
  console.log(f ? `\n${f} FAIL` : '\nall pass');
})();
declare const require: unknown;
declare const __dirname: string;
