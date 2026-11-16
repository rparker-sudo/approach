// 2.3.0 logic checks: general library (§8, taxonomy C1), goals (adult-goals §6), adult rules (§10), combined caps,
// cardio, resolveSession (general branch), no AI, "Return to training", and volleyball unchanged.
/* eslint-disable @typescript-eslint/no-require-imports */
declare const require: (m: string) => unknown;
declare const __dirname: string;
type Dirent = { name: string; isDirectory: () => boolean };
const fs = require('fs') as { readdirSync: (d: string, o: { withFileTypes: true }) => Dirent[]; readFileSync: (p: string, e: 'utf8') => string };
const path = require('path') as { join: (...p: string[]) => string; resolve: (...p: string[]) => string; relative: (a: string, b: string) => string };
import { EXERCISES, GENERAL_POOL, exercisePool, getExercise, whyFor, equipmentLabel, fits } from '../../src/lib/exercises';
import { GENERAL_EQUIPMENT, GENERAL_EXERCISES, WARMUPS, WHY_GENERAL } from '../../src/lib/generalLibrary';
import {
  ADULT_GOAL_RX, BACK_AFTER_BREAK_RAMP, adultWave, cardioProblems, clampCardio, countsTowardCap, defaultWeeks, generalEffortProblem,
  GOALS, HEAD_INJURY_TRAINER, LEGAL, PAIN_TRAINER, postChecks, programChecks, shiftBeginner, STRENGTH_CAP, terms,
} from '../../src/lib/general';
import { newGeneralProgram } from '../../src/lib/starter';
import { resolveExercise, resolveSession } from '../../src/lib/resolve';
import { tierOf } from '../../src/lib/rest';
import type { Program, Session } from '../../src/lib/types';

let f = 0;
const ok = (c: boolean, m: string) => {
  console.log(c ? 'pass' : 'FAIL', m);
  if (!c) f++;
};
const root = path.resolve(__dirname, '../..');
const walk = (d: string, out: string[] = []): string[] => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|json)$/.test(e.name)) out.push(p);
  }
  return out;
};

/* ---------- general-library.md §8, taxonomy C1 ---------- */
const doc = fs.readFileSync(path.join(root, 'docs/content/general-library.md'), 'utf8');
const table = [...doc.matchAll(/^\| `([a-z0-9-]+)` \| ([^|]+)\| (\w+) \| ([\w-]+) \| (\d) \| ([PABCD]) \|/gm)];
ok(GENERAL_EXERCISES.length === 39 && table.length === 39, `39 general exercises (${GENERAL_EXERCISES.length}; doc table ${table.length})`);
for (const m of table) {
  const ex = GENERAL_EXERCISES.find((e) => e.id === m[1]);
  const good = !!ex && ex.name === m[2].trim() && ex.category === m[3] && ex.pattern === m[4] && ex.level === Number(m[5]) && ex.tier === m[6] && tierOf(ex) === m[6];
  if (!good) ok(false, `tags match §4a for ${m[1]}`);
}
ok(true, 'tags (name, category, pattern, level, tier) match §4a for all 39');
ok(GENERAL_EXERCISES.every((e) => e.cue && e.howTo.why && e.howTo.steps.length && e.howTo.cues.length && e.howTo.mistakes.length), 'every new exercise has a cue and how-to');
const cardio = GENERAL_EXERCISES.filter((e) => e.category === 'cardio');
ok(cardio.length === 7 && cardio.every((e) => e.scope === 'general' && e.durationOnly), '7 cardio exercises: scope general, duration only');
ok(GENERAL_EXERCISES.filter((e) => e.category !== 'cardio').every((e) => e.scope === 'all'), 'the other 32 are scope all');
ok(GENERAL_EQUIPMENT.length === 13 && equipmentLabel('cable', true) === 'Cable station' && equipmentLabel('cable', false) === 'Cable / machines', '13 equipment items; cable reads "Cable station" only in general teams');
ok(Object.keys(WHY_GENERAL).length === 27 && Object.keys(WHY_GENERAL).every((id) => EXERCISES.some((e) => e.id === id)), 'whyGeneral for 27 existing exercises');
ok(whyFor(getExercise('kb-swing'), true) === 'Teaches a fast, powerful hip snap.' && whyFor(getExercise('kb-swing'), false) === getExercise('kb-swing').howTo.why, 'whyGeneral in general teams; volleyball keeps why');
ok(WARMUPS.map((w) => w.id).join() === 'W1,W2,W3', 'warm-ups W1–W3');
// C1: 0 exercises hidden; the picker shows all 74 existing + 39.
ok(EXERCISES.length === 74 && GENERAL_POOL.length === 113, `general picker: 74 existing + 39 general (${EXERCISES.length} + ${GENERAL_POOL.length - EXERCISES.length})`);
ok(!EXERCISES.some((e) => e.scope === 'general'), 'volleyball library never contains scope general (cardio)');
// claim words and volleyball words in text shown in general teams
const CLAIMS = /\b(prevent\w*|injury[- ]proof|injury prevention|safe for|guarantee\w*|proven|science-backed|clinically|#1|rehab\w*|treat\w*|cure\w*|heal\w*|weight loss|fat loss|burn fat|calorie\w*|tone|toning|durability|shin splints|strains|jammed|easy on the joints|joint[- ]friendly)\b/i;
const textOf = (e: (typeof GENERAL_POOL)[number]) => [e.name, e.cue, whyFor(e, true), ...e.howTo.steps, ...e.howTo.cues, ...e.howTo.mistakes].join(' \n ');
const claimHits = GENERAL_EXERCISES.flatMap((e) => (CLAIMS.test(textOf(e)) ? [e.id] : []));
ok(claimHits.length === 0, `claim-word search clean on the 39 new exercises (${claimHits.join(', ')})`);
const goalText = GOALS.map((g) => `${g.label} ${g.who}`).join(' ');
ok(!CLAIMS.test(goalText) && !CLAIMS.test(WARMUPS.flatMap((w) => w.blocks.map((b) => b.label)).join(' ')), 'claim-word search clean on goals and warm-ups');
const VB = /\b(approach|block\w*|hit\w*|serv\w*|attack\w*|setting|setter|defense|volleyball|spike\w*|dig)\b/i;
// Ordinary-English uses that aren't volleyball: "the bar hits the floor" (rdl), "the whole block" (jump rope).
const vbHits = GENERAL_POOL.filter((e) => VB.test(textOf(e).replace(/bar hits the floor|the whole block/g, '')));
ok(vbHits.length === 0, `no volleyball words in exercise text shown in general teams (${vbHits.map((e) => e.id).join(', ')})`);

/* ---------- adult-goals.md §6 ---------- */
ok(GOALS.map((g) => g.label).join('|') === 'Strength|Muscle|General fitness|Back after a break', 'exactly four goals');
ok(GOALS[3].who.includes('Clients returning from an injury or medical condition should be cleared by a qualified professional first.'), 'Back after a break clearance line');
ok(JSON.stringify(ADULT_GOAL_RX.strength.main) === JSON.stringify({ sets: 4, reps: '4–6', effort: 'RPE 7–8' }) && ADULT_GOAL_RX.muscle.power === null && (ADULT_GOAL_RX.general.cardio as { minutes: number }).minutes === 15, 'goal defaults per §2');
ok(BACK_AFTER_BREAK_RAMP[1].maxLevel === 1 && BACK_AFTER_BREAK_RAMP[1].rpe === 6 && !BACK_AFTER_BREAK_RAMP[1].power && !BACK_AFTER_BREAK_RAMP[2].power && BACK_AFTER_BREAK_RAMP[3].power, 'ramp: week 1 level 1 at RPE 6; no power weeks 1–2');
ok(adultWave('strength', 4).deload && adultWave('strength', 4).rpe === 6 && adultWave('strength', 3).rpe === 8 && adultWave('general', 1).rpe === 6, 'wave: week 4 deload RPE 6; week 3 upper (≤ 8)');
const w8 = defaultWeeks('strength', 8);
ok(w8[3].deload === true && w8[7].deload === true && !w8[0].deload, '8-week Strength: deloads in weeks 4 and 8');

/* ---------- adult rules §10 ---------- */
const pe = (id: string, effort: string, reps = '6–8', role: 'main' | 'secondary' | 'accessory' | 'power' = 'main') => ({ exerciseId: id, effort, reps, role, sets: 3 });
ok(['RPE 9', 'RPE 10', 'to failure', 'failure', 'max'].every((e) => generalEffortProblem(pe('back-squat', e)) !== null), 'builder blocks RPE 9/10, failure, to failure, max in strength rows');
ok(generalEffortProblem(pe('back-squat', 'RPE 7', 'AMRAP')) !== null && generalEffortProblem(pe('db-row', 'RPE 7', 'for time', 'secondary')) !== null, 'AMRAP and "for time" blocked in tier A/B');
ok(generalEffortProblem(pe('plank', 'RPE 7', '30 s for time', 'accessory')) === null, 'timed work stays allowed on tier C/D');
ok(generalEffortProblem(pe('box-jump', 'Max effort', '3', 'power')) === null, 'power keeps "Max effort"');
ok(generalEffortProblem(pe('back-squat', 'RPE 8')) === null, 'RPE 8 allowed');
ok(shiftBeginner('RPE 7–8') === 'RPE 6–7' && shiftBeginner('RPE 7') === 'RPE 6', 'beginner defaults one RPE lower');
ok(JSON.stringify(clampCardio({ minutes: 90, intensity: 'moderate' })) === '{"minutes":60,"intensity":"moderate"}' && JSON.stringify(clampCardio({ minutes: 30, intensity: 'moderate' }, 'back_after_break')) === '{"minutes":15,"intensity":"easy"}' && clampCardio({ minutes: 2, intensity: 'easy' }).minutes === 5, 'cardio 5–60 min; Back after a break Easy ≤ 15');
const cs: Session = { id: 's', name: 's', focus: '', exercises: [{ exerciseId: 'bike', sets: 1, reps: '40 min', effort: 'Easy', cardio: { minutes: 40, intensity: 'easy' } }, { exerciseId: 'rower', sets: 1, reps: '30 min', effort: 'Easy', cardio: { minutes: 30, intensity: 'easy' } }] };
ok(cardioProblems(cs).includes('Keep cardio to 60 minutes or less per session.'), 'over 60 min cardio per session blocked');
ok(!countsTowardCap(cs) && !countsTowardCap({ id: 'm', name: 'm', focus: '', exercises: [{ exerciseId: 'arm-circles', sets: 1, reps: '10', effort: 'Easy' }] }), 'cardio-only and warm-up-only sessions do not count toward the cap');
ok(STRENGTH_CAP[1] === 4 && STRENGTH_CAP[2] === 5 && STRENGTH_CAP[3] === 6, 'caps 4 / 5 / 6');
// combined caps across programs posted to one client
const prog = (id: string, perWeek: number, goal: 'strength' | 'general' = 'strength'): Program =>
  ({ ...newGeneralProgram({ id, teamId: 't', teamName: 'T', groupKey: 'draft:x', goal, weeks: 4, perWeek, name: id, equipment: ['barbell', 'dumbbells', 'bench', 'cable', 'pullup-bar', 'bands', 'bike'] }), startDate: '2026-11-23', postedAt: 'x' });
const group = prog('group', 3);
const own = prog('own', 3);
const msg = postChecks(own, [{ userId: 'a', name: 'Alex Client', level: 2, existing: [{ label: 'Mon/Wed 6am class', program: group, sameTarget: false }] }]);
ok(msg.some((c) => c.kind === 'block' && c.message === "Alex already has 3 sessions a week from Mon/Wed 6am class. This program adds 3 (total 6, max 5 for Alex's level)."), 'combined over the cap → block with the combined-total message');
ok(postChecks(prog('two', 2, 'general'), [{ userId: 'a', name: 'Alex Client', level: 2, existing: [{ label: 'Mon/Wed 6am class', program: group, sameTarget: false }] }]).every((c) => c.kind !== 'block'), 'combined within the cap → no block');
const seven = { ...prog('seven', 6), liftSchedule: Array(7).fill(null) } as Program;
seven.liftSchedule = [0, 1, 2, 3, 4, 5, 6].map((i) => seven.sessions[i % seven.sessions.length].id);
ok(programChecks(seven, 3).some((c) => c.kind === 'block' && /day off/.test(c.message)), 'no rest day → block');
ok(programChecks(prog('long', 3), 1).every((c) => c.kind !== 'block'), '3 strength sessions OK for a beginner');
const longNoDeload = { ...prog('ln', 3), weeks: Array.from({ length: 8 }, () => ({ rpe: 7 })) };
ok(programChecks(longNoDeload, 2).some((c) => c.kind === 'warn' && c.message === 'No deload in 7+ weeks. Most programs take one every 4–6 weeks.'), '7+ weeks without a deload → warning');

/* ---------- resolveSession, general branch ---------- */
const base = prog('r', 3);
const ses: Session = { id: 'x', name: 'x', focus: '', exercises: [
  { exerciseId: 'back-squat', sets: 4, reps: '4–6', effort: 'RPE 9', role: 'main' },
  { exerciseId: 'box-jump', sets: 3, reps: '3', effort: 'Max effort', role: 'power' },
  { exerciseId: 'bike', sets: 1, reps: '10 min', effort: 'Easy', cardio: { minutes: 10, intensity: 'easy' } },
] };
const day = (k: string) => new Date(`${k}T12:00:00`);
const adv = resolveSession({ ...base, sessions: [ses] }, ses, { level: 3, logs: [] }, day('2026-11-23'));
ok(adv.exercises[0].effort === 'RPE 7' && adv.exercises[0].exerciseId === 'back-squat', 'week 1 effort from the wave; strength capped (RPE 9 → week RPE ≤ 8)');
const rp = { ...base, sessions: [ses], weeks: base.weeks!.map((w) => ({ ...w, rpe: 10 })) };
ok(resolveSession(rp, ses, { level: 3, logs: [] }, day('2026-11-30')).exercises[0].effort === 'RPE 8', 'resolveSession caps strength at RPE 8 even if a week says more');
const beg = resolveSession({ ...base, sessions: [ses] }, ses, { level: 1, logs: [] }, day('2026-11-23'));
ok(beg.exercises[0].exerciseId !== 'back-squat' && getExercise(beg.exercises[0].exerciseId).level === 1, `beginner in a class built at intermediate gets level 1 (${beg.exercises[0].exerciseId})`);
ok(beg.exercises.find((e) => e.cardio)?.cardio?.minutes === 10 && beg.exercises.find((e) => e.cardio)?.sets === 1, 'cardio rows stay duration only');
const dl = resolveSession({ ...base, sessions: [ses] }, ses, { level: 3, logs: [] }, day('2026-12-14'));
ok(dl.block.deload && dl.exercises[0].sets === 2 && dl.exercises[0].effort === 'RPE 6', 'deload week: about −40% sets, RPE 6');
const bb: Program = { ...prog('bb', 2), goal: 'back_after_break', weeks: defaultWeeks('back_after_break', 4), sessions: [ses] };
const w1 = resolveSession(bb, ses, { level: 3, logs: [] }, day('2026-11-23'));
ok(!w1.exercises.some((e) => e.role === 'power') && getExercise(w1.exercises[0].exerciseId).level === 1 && w1.exercises[0].effort === 'RPE 6', 'Back after a break week 1: level 1 only, RPE 6, no power');
const w3 = resolveSession(bb, ses, { level: 3, logs: [] }, day('2026-12-07'));
ok(w3.exercises.some((e) => e.role === 'power'), 'Back after a break week 3: power allowed again');
// gym profile limits resolution (F40): no barbell → back squat resolves to a version the gym has
const noBar = resolveSession({ ...base, equipment: ['dumbbells', 'bench', 'leg-press'], sessions: [ses] }, ses, { level: 3, logs: [] }, day('2026-11-23'));
ok(fits(getExercise(noBar.exercises[0].exerciseId), ['dumbbells', 'bench', 'leg-press']), `gym profile limits resolution (${noBar.exercises[0].exerciseId})`);
ok(resolveExercise(getExercise('pullup'), 1, ['pullup-bar', 'bands', 'assisted-pullup-machine'], GENERAL_POOL)?.id === 'assisted-pullup', 'general: pull-up → assisted pull-up when it fits');

/* ---------- Volleyball unchanged ---------- */
ok(exercisePool(false) === EXERCISES, 'volleyball teams use the 2.2.1 library');
ok(resolveExercise(getExercise('pullup'), 1, ['pullup-bar', 'bands']) === resolveExercise(getExercise('pullup'), 1, ['pullup-bar', 'bands'], EXERCISES), 'volleyball resolution unchanged (default pool)');
ok(terms('volleyball').leader === 'coach' && terms('general').leader === 'trainer' && terms('general').Board === 'Class board', 'word set: volleyball coach, general trainer');

/* ---------- Legal lines, pending-Legal constants, strings ---------- */
const comp = fs.readFileSync(path.join(root, 'docs/compliance.md'), 'utf8');
for (const k of ['confirmAdults', 'confirmNoCobranding', 'notOpenTrainer', 'notOpenJoin', 'adultsOnly', 'shareLine', 'groupHelper', 'notesHelper'] as const) {
  ok(comp.includes(LEGAL[k]), `Legal line matches compliance.md: ${k}`);
}
const design = fs.readFileSync(path.join(root, 'docs/design/trainer-mode.md'), 'utf8');
ok(design.includes(PAIN_TRAINER) && design.includes(HEAD_INJURY_TRAINER), 'G3/G4 trainer constants are the §S1b text (pending Legal)');
const src = walk(path.join(root, 'src')).map((p) => ({ p, s: fs.readFileSync(p, 'utf8') }));
ok(src.filter((x) => x.s.includes(PAIN_TRAINER)).length === 1 && src.filter((x) => x.s.includes(HEAD_INJURY_TRAINER)).length === 1, 'G3/G4 trainer text lives in one constant each');
ok(!src.some((x) => /Return to training/i.test(x.s)), '"Return to training" appears nowhere in src');

/* ---------- No AI (compliance T7) ---------- */
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
const AI = /openai|anthropic|@google\/generative|google-genai|@ai-sdk|^ai$|langchain|cohere|mistral|ollama|replicate|huggingface|groq/i;
ok(!deps.some((d) => AI.test(d)), `no AI-provider packages (${deps.filter((d) => AI.test(d)).join(', ')})`);
const aiCode = src.filter((x) => /api\.openai|api\.anthropic|generativelanguage|ai_assisted|\bAI\b|\bLLM\b/.test(x.s));
ok(aiCode.length === 0, `no AI calls, labels or ai_assisted in src (${aiCode.map((x) => path.relative(root, x.p)).join(', ')})`);
const sql = ['supabase/schema.sql', 'supabase/migrations/009_trainer_a.sql', 'supabase/migrations/010_trainer_b.sql'].map((p) => fs.readFileSync(path.join(root, p), 'utf8')).join('\n');
ok(!/ai_assisted|openai|anthropic/i.test(sql), 'no ai_assisted column or AI calls in SQL');

console.log(f ? `\n${f} FAIL` : '\nall pass');
