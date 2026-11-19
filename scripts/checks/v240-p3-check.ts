// 2.4.0 Training v3 Part 3 (spec §3.1 and the Part 3 criteria; program-design §1–§9). Runs generator v3 with its flag on.
import { FLAGS } from '../../src/lib/flags';
import { generateProgram, liftDayCap } from '../../src/lib/generator';
import { generateProgramV3, planWeek, templateFor, placeDays, BLOCK_LABEL, contactsOf, PLYO_CAP, verticalFactor, isVertical } from '../../src/lib/generatorV3';
import { resolveSession, resolveExercise, type AthleteContext } from '../../src/lib/resolve';
import { ALL_EQUIPMENT, getExercise } from '../../src/lib/exercises';
import { LADDERS } from '../../src/lib/ladders';
import { REST_FLOOR, tierOf } from '../../src/lib/rest';
import { restSecFor } from '../../src/lib/generator';
import { weekPlan, mondayOf, addDays, dateKey } from '../../src/lib/calendar';
import { newGeneralProgram } from '../../src/lib/starter';
import type { DayType, Program, ProgramPosition, Session } from '../../src/lib/types';

let f = 0;
const ok = (c: boolean, m: string) => {
  console.log(c ? 'pass' : 'FAIL', m);
  if (!c) f++;
};
const off: DayType[] = ['practice', 'practice', 'practice', 'practice', 'practice', 'off', 'off'];
const start = new Date('2026-11-23T12:00:00'); // Monday
const at = (weeks: number, day = 0) => addDays(start, weeks * 7 + day);
const make = (over: Partial<Parameters<typeof generateProgramV3>[0]> = {}) => {
  const p = generateProgramV3({ position: 'Outside Hitter', phase: 'off', experience: 'advanced', volleyballWeek: off, liftDaysPerWeek: 4, ...over });
  // A long session target so Fit to time (Part 1) doesn't trim slots while prescriptions are checked.
  return { ...p, blockStart: dateKey(start), createdAt: start.toISOString(), sessionMinutes: 120 } as Program;
};
const ath = (level: 1 | 2 | 3, extra: Partial<AthleteContext> = {}): AthleteContext => ({ level, logs: [], levelConfirmed: true, minor: true, ...extra });
const main = (r: ReturnType<typeof resolveSession>) => r.exercises.find((e) => e.role === 'main')!;

/* ---------- Plan and blocks ---------- */
const p12 = make();
const seq = [0, 4, 8].map((w) => planWeek(p12, at(w)).block);
ok(seq.join() === 'accumulation,strength,strength_power', `12-week off-season: ${seq.map((b) => BLOCK_LABEL[b]).join(' → ')}`);
ok([3, 7, 11].every((w) => planWeek(p12, at(w)).deload) && [0, 1, 2].every((w) => !planWeek(p12, at(w)).deload), 'each block: 3 loading weeks + a deload (week 4)');
const d1 = p12.sessions[0];
const wk = (w: number) => main(resolveSession(p12, d1, ath(3), at(w)));
ok(wk(4).pct === 75 && wk(5).pct === 80 && wk(6).pct === 82.5, `Strength block weeks 1–3: ${wk(4).pct} → ${wk(5).pct} → ${wk(6).pct}% (rising per §3)`);
const w1 = wk(4), w4 = wk(7);
ok(w4.effort === 'RPE 6' && w4.pct === 75 && w4.sets === Math.round(w1.sets * 0.6) && w4.restSecResolved === w1.restSecResolved, `deload: about week-1 intensity (${w4.pct}%), RPE 6, −40% sets (${w1.sets} → ${w4.sets}), same rest (${w4.restSecResolved}s)`);
const jumpsC = (r: ReturnType<typeof resolveSession>) => r.exercises.filter((e) => getExercise(e.exerciseId).pattern === 'jump' && !getExercise(e.exerciseId).weighted).reduce((n, e) => n + contactsOf(e.sets, e.reps), 0);
const c1 = jumpsC(resolveSession(p12, d1, ath(3), at(4))), c4 = jumpsC(resolveSession(p12, d1, ath(3), at(7)));
ok(c4 <= Math.ceil(c1 * 0.5) + 2, `deload plyo contacts about −50% (${c1} → ${c4})`);
const club = generateProgram((() => { FLAGS.generatorV3 = true; return { position: 'Setter', phase: 'off', experience: 'intermediate', volleyballWeek: off, liftDaysPerWeek: 3, events: [0, 3, 7, 10].map((d) => ({ date: dateKey(addDays(new Date(), d)), type: 'game', teamName: 'Club 16s' })) } as Parameters<typeof generateProgram>[0]; })());
ok(club.block === 'maintain' && club.sessions[0].name.startsWith('Day 1 Heavy'), `club matches during the school off-season → Maintain template (${club.block}, ${club.sessions.map((s) => s.name).join(' / ')})`);
const brk = { ...p12, events: [{ date: dateKey(at(5)), endDate: dateKey(at(7, 2)), type: 'break' as const }] };
const after = planWeek(brk, at(7, 3));
ok(after.week === 1 && after.block === 'strength', `after a coach break of 14+ days the block restarts at week 1 (${BLOCK_LABEL[after.block]} week ${after.week})`);

/* ---------- Sessions and templates ---------- */
const ORDER: Record<string, number> = { power: 0, main: 1, secondary: 2, accessory: 3, core: 3, care: 4 };
const ordered = (s: Session) => s.exercises.every((e, i) => i === 0 || ORDER[e.role ?? 'accessory'] >= ORDER[s.exercises[i - 1].role ?? 'accessory']);
const all = [2, 3, 4].flatMap((n) => make({ liftDaysPerWeek: n }).sessions).concat(make({ phase: 'pre', liftDaysPerWeek: 3 }).sessions, make({ phase: 'in', liftDaysPerWeek: 2 }).sessions, make({ phase: 'post', liftDaysPerWeek: 3 }).sessions);
ok(all.every(ordered), 'every generated session runs warm-up → A → B → C → D → E');
const wantMain: Record<string, string[]> = { '2': ['back-squat', 'trap-bar-deadlift'], '3': ['back-squat', 'bench', 'trap-bar-deadlift'], '4': ['back-squat', 'bench', 'trap-bar-deadlift', 'weighted-pullup'] };
const tplOk = Object.entries(wantMain).every(([n, ids]) => templateFor('off', Number(n), 'advanced').map((d) => d.slots.find((s) => s.role === 'main')!.id).join() === ids.join());
const t4 = templateFor('off', 4, 'advanced');
const d1slots = t4[0].slots.map((s) => s.id).join();
ok(tplOk && d1slots.startsWith('hang-clean,depth-drop,box-jump,back-squat,split-squat,copenhagen,ghr,pallof'), `templates match §7 slot for slot at the top rung (4-day Day 1: ${d1slots})`);
ok(templateFor('off', 5, 'advanced').length === 5 && templateFor('off', 5, 'intermediate').length === 4, 'the 5-day template is offered only to advanced athletes');
ok(templateFor('pre', 3, 'advanced').map((d) => d.slots.find((s) => s.role === 'main')!.id).join() === 'back-squat,bench,trap-bar-deadlift' && templateFor('in', 2, 'advanced').map((d) => d.name).join() === 'Day 1 Heavy,Day 2 Fast' && templateFor('post', 2, 'advanced')[0].slots.find((s) => s.role === 'main')!.method === 'tempo', 'preseason 3-day, in-season Heavy/Fast, post-season Restore (tempo main lifts)');
const inWeeks: DayType[][] = [['off', 'practice', 'game', 'practice', 'practice', 'game', 'off'], ['practice', 'game', 'off', 'practice', 'practice', 'off', 'tournament'], ['game', 'off', 'off', 'practice', 'game', 'off', 'off']];
const placeOk = inWeeks.every((w) => {
  const [a, b] = placeDays(w, templateFor('in', 2, 'advanced'), 'in', false);
  const m = (i: number) => w[i] === 'game' || w[i] === 'tournament';
  return a != null && b != null && !m(a) && !m(b) && !m((a + 1) % 7) && !m((a + 2) % 7) && !m((b + 1) % 7);
});
ok(placeOk, 'in-season: Day 1 never within 2 days before a match; Day 2 never the day before; no lifting on match days');
ok(templateFor('in', 3, 'advanced').length === 3, 'bye week: Day 3 added');

/* ---------- Prescriptions and methods ---------- */
const b = (w: number, lv: 1 | 2 | 3 = 3, extra: Partial<AthleteContext> = {}) => main(resolveSession(p12, d1, ath(lv, extra), at(w)));
ok(`${b(0).sets}×${b(0).reps}@${b(0).pct}` === '4×6–8@65' && `${b(4).sets}×${b(4).reps}` === '5×5' && `${b(5).sets}×${b(5).reps}` === '5×4' && `${b(6).sets}×${b(6).reps}` === '4×3' && b(8).pct === 80 && b(10).pct === 85, `B-block per §5b (Acc 4×6–8 @65%; Str 5×5 → 5×4 → 4×3; S-P 80 → 85%)`);
ok(b(10, 3, { minor: true }).pct! <= 85 && b(10, 3, { minor: false }).pct! <= 90, 'tested % never above 85% for minors or 90% for adults');
const untested = resolveSession(p12, p12.sessions[3], ath(3), at(0)).exercises.find((e) => e.role === 'main')!;
ok(untested.pct == null && /RPE/.test(untested.effort), `untested main lift (${untested.exerciseId}) uses RPE, no %`);
const r0 = resolveSession(p12, d1, ath(3), at(4));
const oly = r0.exercises.find((e) => getExercise(e.exerciseId).pattern === 'olympic');
const sec = r0.exercises.find((e) => e.role === 'secondary');
const acc = r0.exercises.find((e) => e.role === 'accessory');
const care = r0.exercises.find((e) => e.role === 'care');
ok(!!oly && `${oly.sets}×${oly.reps}` === '5×2' && !!sec && sec.sets === 4 && /5–6/.test(sec.reps) && !!acc && `${acc.sets}×${acc.reps}` === '3×8–10' && !!care, `A/C/D/E per §5 (Strength: Olympic 5×2, C 4×5–6, D 3×8–10, E circuit)`);
ok(r0.exercises.every((e) => e.restSecResolved >= (REST_FLOOR[tierOf(getExercise(e.exerciseId))] ?? 0)) && main(r0).restSecResolved >= 180, 'rest per block table and never below the tier floors');
const sp = (lv: 1 | 2 | 3, extra: Partial<AthleteContext>) => resolveSession(p12, d1, ath(lv, extra), at(8));
ok(main(sp(3, { levelConfirmed: true })).method === 'contrast' && main(sp(3, { levelConfirmed: false })).method !== 'contrast', 'contrast pairs only for advanced athletes with a coach-confirmed level');
const pre = make({ phase: 'pre', liftDaysPerWeek: 3 });
const preA = (lv: 1 | 2 | 3, confirmed: boolean) => resolveSession(pre, pre.sessions[0], ath(lv, { levelConfirmed: confirmed }), at(1));
const cl = preA(3, true).exercises.find((e) => e.exerciseId === 'hang-clean');
ok(cl?.method === 'cluster' && preA(3, false).exercises.every((e) => e.method !== 'cluster') && main(preA(3, false)).method !== 'cluster', 'clusters only for advanced + coach-confirmed');
const dj = preA(3, true).exercises.find((e) => e.exerciseId === 'depth-jump');
ok(!!dj && contactsOf(dj.sets, dj.reps) <= 20 && /18 in/.test(dj.notes ?? ''), `depth jumps: advanced + confirmed only, ≤ 20 contacts (${dj ? contactsOf(dj.sets, dj.reps) : '-'}), box ≤ 18 in note`);
ok(!preA(3, false).exercises.some((e) => e.exerciseId === 'depth-jump'), 'a self-reported advanced minor never gets depth jumps (or contrast, cluster, wave)');
const beg = resolveSession(p12, d1, ath(1), at(4));
ok(beg.exercises.every((e) => !e.method || ['straight', 'tempo', 'iso'].includes(e.method)) && main(beg).effort === 'RPE 6–7', `beginners: straight or tempo sets only, effort one RPE lower (${main(beg).effort})`);

/* ---------- Ladders and position ---------- */
const gym = ALL_EQUIPMENT;
const ladderMiss: string[] = [];
for (const L of LADDERS) {
  const top = L.rungs[0][0];
  const ex = getExercise(top);
  // Expected: the first option at or below the level that fits, scanning top → next → entry (Olympic slots skip the entry
  // throw for beginners, §2a) → home.
  const fitsGym = (id: string) => getExercise(id).equipment.some((st) => st.every((i) => gym.includes(i)));
  const want = (lv: 1 | 2 | 3) => {
    if (ex.level <= lv) return top;
    // 2.4.1 B2: Olympic slots give beginners the entry throw when a med ball fits (no longer skipped).
    const rungs = [L.rungs[0].slice(1), L.rungs[1], L.rungs[2], L.rungs[3]];
    for (const r of rungs) for (const id of r) if (getExercise(id).level <= lv && fitsGym(id)) return id;
    return null;
  };
  for (const lv of [3, 2, 1] as const) {
    const got = resolveExercise(ex, lv, gym)?.id;
    if (got !== want(lv)) ladderMiss.push(`${L.slot} L${lv}: ${got} (want ${want(lv)})`);
  }
}
ok(!ladderMiss.length, `each §8a ladder: advanced / intermediate / beginner get the expected rung in a full weight room (${ladderMiss.join('; ') || `${LADDERS.length} ladders`})`);
const home = { ...p12, sessions: p12.sessions.map((s) => ({ ...s, location: 'home' as const })) };
const hr = resolveSession(home, home.sessions[0], ath(1, { homeEquipment: [] }), at(0));
ok(hr.exercises.every((e) => getExercise(e.exerciseId).equipment.some((s) => s.length === 0) || getExercise(e.exerciseId).equipment.length === 0 || e.exerciseId === 'glute-bridge'), `home: the Home/bodyweight rung (${hr.exercises.map((e) => e.exerciseId).join(', ')})`);
ok(['hang-clean', 'push-jerk', 'hang-power-snatch'].every((id) => getExercise(resolveExercise(getExercise(id), 2, gym)!.id).level === 2), 'a level 2 athlete gets L2 Olympic derivatives (Hang High Pull, Push Press, DB Hang Snatch), never L3');
const posP = (pos: ProgramPosition) => make({ position: pos });
const vert = (pos: ProgramPosition) => {
  const p = posP(pos);
  return p.sessions.reduce((n, s) => n + resolveSession(p, s, ath(3), at(0)).exercises.filter((e) => isVertical(e.exerciseId) && !getExercise(e.exerciseId).weighted).reduce((k, e) => k + contactsOf(e.sets, e.reps), 0), 0);
};
const care4 = (pos: ProgramPosition) => posP(pos).sessions[0].exercises.filter((e) => e.role === 'care').map((e) => e.exerciseId);
ok(care4('Middle Blocker').includes('spanish-squat') && care4('Middle Blocker').includes('soleus-calf-raise') && posP('Middle Blocker').sessions[0].exercises.some((e) => /lateral/.test(e.exerciseId) && e.role === 'power'), 'MB: knee/ankle durability and an extra lateral plyo');
ok(care4('Outside Hitter').filter((id) => ['band-er', 'er-90-90-iso'].includes(id)).length === 2 && posP('Outside Hitter').sessions.some((s) => s.exercises.some((e) => /Extra throw set/.test(e.notes ?? ''))), 'OH/OPP: 2 shoulder exercises and an extra throw set');
ok(care4('Setter').includes('wrist-roller') && Math.abs(vert('Setter') / vert('Opposite') - 0.8) <= 0.08, `setter: hand/wrist durability; vertical contacts about −20% (${vert('Setter')} vs ${vert('Opposite')})`);
const lib = posP('Libero / DS');
ok(lib.sessions[0].exercises.some((e) => e.exerciseId === 'copenhagen') && care4('Libero / DS').includes('soleus-calf-raise') && lib.sessions[0].exercises.find((e) => e.role === 'secondary')?.exerciseId === 'lateral-squat' && Math.abs(vert('Libero / DS') / vert('Opposite') - 0.7) <= 0.08, `libero/DS: adductor + ankle, Lateral Squat as the C-block lift, vertical contacts about −30% (${vert('Libero / DS')} vs ${vert('Opposite')})`);
ok(verticalFactor('Setter') === 0.8 && verticalFactor('Libero / DS') === 0.7, 'vertical-contact factors: setter 0.8, libero/DS 0.7');

/* ---------- Limits ---------- */
const capOk = (['off', 'pre', 'in'] as const).every((phase) => {
  const p = make({ phase, liftDaysPerWeek: phase === 'in' ? 2 : 3 });
  return p.sessions.every((s) => [0, 1, 2, 3].every((w) => jumpsC(resolveSession(p, s, ath(3), at(w))) <= PLYO_CAP[phase]));
});
ok(capOk, 'plyo contacts per session never exceed the §9 caps (off 70, pre 40, in 25)');
const begP = generateProgram({ position: 'Setter', phase: 'off', experience: 'beginner', volleyballWeek: off, liftDaysPerWeek: 7 });
const lifts = Math.max(begP.liftSchedule.filter(Boolean).length, weekPlan(begP, mondayOf(start)).filter((d) => d.sessionId).length);
ok(lifts <= liftDayCap('beginner', 'off'), `generated minors' weeks never exceed R6 lift days (beginner ${lifts} ≤ ${liftDayCap('beginner', 'off')})`);
const rpeMax = (lv: 1 | 2 | 3) => Math.max(...p12.sessions.flatMap((s) => [0, 4, 8].flatMap((w) => resolveSession(p12, s, ath(lv), at(w)).exercises.filter((e) => ['main', 'secondary', 'accessory'].includes(e.role ?? '')).map((e) => Number(e.effort.match(/RPE\s*\d+(?:\s*[–-]\s*(\d+))?/)?.[1] ?? e.effort.match(/RPE\s*(\d+)/)?.[1] ?? 0)))));
ok(rpeMax(3) <= 8 && rpeMax(1) <= 7, `strength RPE ≤ 8 (beginners ≤ 7): ${rpeMax(3)} / ${rpeMax(1)}`);
const tg = newGeneralProgram({ id: 'tg', teamId: 'g', teamName: 'G', groupKey: 'all', goal: 'strength', weeks: 4, perWeek: 3, name: 'tg', equipment: ALL_EQUIPMENT });
ok(tg.sessions.every((s) => resolveSession(tg, s, ath(3), new Date(`${tg.startDate}T12:00:00`)).exercises.every((e) => !/RPE (9|10)/.test(e.effort))), 'trainer goal defaults never exceed RPE 8');
const fs = resolveExercise(getExercise('front-squat'), 1, gym)?.id;
const hpc = resolveExercise(getExercise('hang-clean'), 1, gym);
ok(fs === 'goblet-squat' && hpc?.pattern === 'throw' && hpc.level === 1, 'SUPERSEDED (§0, B2) → safety §2a (11/19): Front Squat → Goblet Squat; Hang Power Clean → a med-ball throw (beginner, med ball fits)');
ok(p12.sessions.every((s) => resolveSession(p12, s, ath(1), at(0)).exercises.every((e) => getExercise(e.exerciseId).level <= 1)), 'safety §2a: a beginner never sees a level 2–3 exercise in a generated session');
ok(p12.sessions.every((s) => resolveSession(p12, s, ath(3), at(0)).exercises.every((e) => e.restSecResolved >= (REST_FLOOR[tierOf(getExercise(e.exerciseId))] ?? 0) && restSecFor(e, {}) >= 0)), 'v2.2 pass 1 resolution: floors and ceilings hold on generated sessions');

/* ---------- General ---------- */
FLAGS.generatorV3 = false;
const legacy = generateProgram({ position: 'Setter', phase: 'off', experience: 'advanced', volleyballWeek: off, liftDaysPerWeek: 4 });
ok(!legacy.block && legacy.sessions.every((s) => s.exercises.every((e) => !e.method && e.pct == null)), 'generatorV3 off: the 2.3.0 generator (no block, method or %)');
console.log(f ? `\n${f} FAIL` : '\nall pass');
