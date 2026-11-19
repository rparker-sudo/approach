// 2.4.0 · Legal rulings of 11/19 (docs/compliance.md § 2.4.0 build rulings): F1 (#1b legacy session.source), F2 (#2 keyed
// level-adjust keys, client side), F3 (#3 my_rack own index, schema side), F4 (#7 Terms versions). Logic and source checks;
// the server behaviour is in supabase/tests/rls-2.4.0-legal.sql.
/* eslint-disable @typescript-eslint/no-require-imports */
declare const require: (m: string) => unknown;
declare const __dirname: string;
const fs = require('fs') as { readFileSync: (p: string, e: 'utf8') => string; readdirSync: (p: string) => string[] };
const path = require('path') as { join: (...p: string[]) => string };
import { FLAGS } from '../../src/lib/flags';
import { generateProgram } from '../../src/lib/generator';
import { newGeneralProgram } from '../../src/lib/starter';
import { coachEdit, levelAdjustFor, levelOffKey, resolveSession, sourceOf } from '../../src/lib/resolve';
import { coachTraces, GENERATOR_NOTES } from '../../src/lib/source';
import { generatedWeek } from '../../src/lib/calendar';
import { clearLevelOffKeys, setLevelOffKeys } from '../../src/lib/levelKeys';
import { COACH_TERMS_VERSION } from '../../src/lib/coachTerms';
import { TRAINER_TERMS_VERSION } from '../../src/lib/trainerTerms';
import { ALL_EQUIPMENT } from '../../src/lib/exercises';
import { POSITIONS } from '../../src/lib/types';
import type { Goal, Phase, Program, ProgramPosition, Session } from '../../src/lib/types';

let f = 0;
const ok = (c: boolean, m: string) => {
  console.log(c ? 'pass' : 'FAIL', m);
  if (!c) f++;
};
const read = (p: string) => fs.readFileSync(path.join(__dirname, '../..', p), 'utf8');
const d = new Date('2026-11-24T12:00:00');
const wk = ['practice', 'off', 'practice', 'off', 'match', 'off', 'off'] as Program['volleyballWeek'];

/** A program as 2.3.x saved it: no `source` on any session. */
const legacy = (p: Program): Program => ({ ...p, sessions: p.sessions.map(({ source: _s, ...s }) => s as Session) });
const setSes = (p: Program, i: number, s: Session): Program => ({ ...p, sessions: p.sessions.map((x, k) => (k === i ? s : x)) });

/* ================= F1 · ruling #1b: legacy session.source ================= */
ok(FLAGS.generatorV3 === true && FLAGS.catalogV3 === true && FLAGS.rackRotation === true, '2.4.1 flags: generatorV3 on by default (D-059), catalogV3 and rackRotation on');
// Ruling #1b is about sessions saved by the 2.3.x generators: simulate them with the 2.3.0 generator (generatorV3 off).
FLAGS.generatorV3 = false;

// Every 2.3.x generator output (the live generator, flag off) carries none of the coach traces.
const positions: ProgramPosition[] = [...POSITIONS, 'All positions'];
const phases: Phase[] = ['off', 'pre', 'in', 'post'];
const exps = ['beginner', 'intermediate', 'advanced'] as const;
let combos = 0;
let traced = 0;
for (const position of positions)
  for (const phase of phases)
    for (const experience of exps)
      for (const school of [undefined, [0, 2], [0, 2, 4]]) {
        const p = legacy({ ...generateProgram({ position, phase, experience, volleyballWeek: wk, liftDaysPerWeek: 4, weightRoomDays: school, homeJumps: phase !== 'in' }), teamId: 't', postedAt: 'x' });
        combos++;
        if (p.sessions.some((s) => coachTraces(p, s).length) || p.sessions.some((s) => sourceOf(p, s) !== 'approach')) traced++;
      }
ok(traced === 0, `posted, unedited 2.3.x generator output reads as 'approach' (${combos} programs: positions × phases × levels × gym/school+home)`);
const goals: Goal[] = ['strength', 'muscle', 'general', 'back_after_break'];
let tTraced = 0;
for (const goal of goals)
  for (const perWeek of [2, 3, 4]) {
    const tp = legacy({ ...newGeneralProgram({ id: 'g', teamId: 'gt', teamName: 'G', groupKey: 'all', goal, weeks: 4, perWeek, name: 'g', equipment: ALL_EQUIPMENT }), postedAt: 'x' });
    if (tp.sessions.some((s) => sourceOf(tp, s) !== 'approach')) tTraced++;
  }
ok(tTraced === 0, "trainer starter programs (goal defaults) saved before 2.4.0 read as 'approach' (generated)");

const base = legacy({ ...generateProgram({ position: 'Outside Hitter', phase: 'off', experience: 'advanced', volleyballWeek: wk, liftDaysPerWeek: 3 }), teamId: 't', postedAt: 'x' });
const s0 = base.sessions[0];
const e0 = s0.exercises[0];
ok(generatedWeek(base), 'a posted, unedited generated team program is a generated week (R6 cap applies)');
const trace = (label: string, s: Session, p: Program = base) => {
  const prog = setSes(p, 0, s);
  ok(sourceOf(prog, s) === 'coach' && !generatedWeek(prog), `legacy trace → 'coach': ${label}`);
};
trace('the coach set the rest', { ...s0, exercises: [{ ...e0, restSec: 45, restSetByCoach: true }, ...s0.exercises.slice(1)] });
trace('a manual pair (autoGroup false)', { ...s0, exercises: [{ ...e0, group: 'A', autoGroup: false }, { ...s0.exercises[1], group: 'A', autoGroup: false }, ...s0.exercises.slice(2)] });
trace('a group letter without the generator’s autoGroup', { ...s0, exercises: [{ ...e0, group: 'B' }, ...s0.exercises.slice(1)] });
trace('a typed note', { ...s0, exercises: [{ ...e0, notes: 'Pause at the bottom.' }, ...s0.exercises.slice(1)] });
trace('a stations session', { ...s0, format: 'stations', stations: [] });
const custom = { ...base, customExercises: [{ id: 'custom-sled-drag', name: 'Sled drag', category: 'strength', pattern: 'carry', level: 1, equipment: [], weighted: true, custom: true } as unknown as NonNullable<Program['customExercises']>[number]] };
trace('a 2.3.1 custom exercise', { ...s0, exercises: [...s0.exercises, { exerciseId: 'custom-sled-drag', sets: 3, reps: '20 yd', effort: 'RPE 7', role: 'accessory' }] }, custom);
const gen = legacy({ ...newGeneralProgram({ id: 'g2', teamId: 'gt', teamName: 'G', groupKey: 'all', goal: 'strength', weeks: 4, perWeek: 3, name: 'g', equipment: ALL_EQUIPMENT }), postedAt: 'x' });
const added: Session = { id: 'n', name: 'Session 4', focus: 'Full body', exercises: [{ exerciseId: 'goblet-squat', sets: 3, reps: '8', effort: 'RPE 7', role: 'main' }], warmup: 'W1' };
ok(sourceOf(gen, added) === 'coach', "legacy trace → 'coach': a trainer session added with Add session");

const autoPaired = { ...s0, exercises: [{ ...e0, group: 'A', autoGroup: true }, { ...s0.exercises[1], group: 'A', autoGroup: true }, ...s0.exercises.slice(2)] };
ok(sourceOf(base, autoPaired) === 'approach', "the generator's own auto-pairing is not a coach trace ('approach')");
const genNote = { ...s0, exercises: [{ ...e0, notes: 'Keep it crisp. Never grind a rep in-season.' }, ...s0.exercises.slice(1)] };
ok(sourceOf(base, genNote) === 'approach', "a note the generator writes is not a coach trace ('approach')");
const silent = { ...s0, exercises: [{ ...e0, effort: 'RPE 9', sets: 6 }, ...s0.exercises.slice(1)] };
ok(sourceOf(base, silent) === 'approach', "can't tell (sets/effort typed over generator values, no trace) → 'approach' (the safer direction)");
const personal = legacy({ ...generateProgram({ position: 'Setter', phase: 'pre', experience: 'beginner', volleyballWeek: wk, liftDaysPerWeek: 3 }) });
const pTr = { ...personal.sessions[0], exercises: [{ ...personal.sessions[0].exercises[0], restSec: 30, restSetByCoach: true }, ...personal.sessions[0].exercises.slice(1)] };
ok(sourceOf(personal, pTr) === 'approach', "personal programs are always 'approach'");
ok(sourceOf(base, { ...s0, source: 'coach' }) === 'coach' && sourceOf(base, { ...s0, source: 'approach', exercises: [{ ...e0, restSetByCoach: true }] }) === 'approach', 'a stored source always wins (2.4.0 sessions)');
ok(sourceOf(base, coachEdit(s0)) === 'coach', "#1a kept: any coach edit (coachEdit) sets 'coach'");

// Generated limits apply to an unknown legacy session, not to a traced one.
const bp = legacy({ ...generateProgram({ position: 'Outside Hitter', phase: 'off', experience: 'beginner', volleyballWeek: wk, liftDaysPerWeek: 3 }), teamId: 't', postedAt: 'x' });
const bs = bp.sessions.find((s) => s.exercises.some((e) => e.role === 'main'))!;
const hot = { ...bs, exercises: bs.exercises.map((e) => (e.role === 'main' ? { ...e, effort: 'RPE 9' } : e)) };
const capped = resolveSession(setSes(bp, bp.sessions.indexOf(bs), hot), hot, { level: 1, logs: [] }, d).exercises.find((e) => e.role === 'main');
ok(!!capped && capped.effort !== 'RPE 9', `unknown legacy session gets the generated limits (RPE 9 → ${capped?.effort})`);
const hotTraced = { ...hot, exercises: hot.exercises.map((e) => (e.role === 'main' ? { ...e, restSec: 200, restSetByCoach: true } : e)) };
const asWritten = resolveSession(setSes(bp, bp.sessions.indexOf(bs), hotTraced), hotTraced, { level: 1, logs: [] }, d).exercises.find((e) => e.role === 'main');
ok(!!asWritten && asWritten.effort === 'RPE 9', 'a traced (coach-built) legacy session is resolved as written');

// GENERATOR_NOTES is exactly what the 2.3.x generator writes.
const genSrc = read('src/lib/generator.ts');
ok(genSrc.includes("'Only with coaching. Swap for a jump otherwise.'") && genSrc.includes("'Keep it crisp. Never grind a rep in-season.'") && genSrc.includes("HOME_JUMP_CUE = 'Clear space, no low ceilings, sneakers on.'") && genSrc.includes('`${HOME_JUMP_CUE} Up to 20 contacts.`') && GENERATOR_NOTES.size === 3, 'the generator-note list matches generator.ts');
ok(read('src/lib/calendar.ts').includes('sourceOf(program, x)') && !/x\.source \?\?/.test(read('src/lib/calendar.ts')), 'generatedWeek uses the same rule (no second copy)');
ok(/#1b|ruling #1b/.test(read('build-snapshot.md')), 'build-snapshot.md documents the legacy rule');
// #1c: never on boards.
const boardFiles = ['src/app/board/[teamId].tsx', 'src/components/RotationRing.tsx'].map(read).join('\n');
ok(!/\.source\b|sourceOf/.test(boardFiles), '#1c: session.source is not shown on boards');

FLAGS.generatorV3 = true;

/* ================= F2 · ruling #2: keyed level-adjust keys ================= */
clearLevelOffKeys();
const tp: Program = { ...base, levelAdjustOffFor: ['k0123456789abcdef0123456789abcdef'] };
ok(levelOffKey('t', 'u1') === null, 'no key until the server gives one (the app never computes keys)');
setLevelOffKeys(['t'], [{ teamId: 't', userId: 'me', key: 'k0123456789abcdef0123456789abcdef' }]);
ok(levelAdjustFor(tp, null, 'me') === false, 'the athlete with their own server key sees their adjustment off');
ok(levelAdjustFor(tp, null, 'teammate') === true, "a teammate (no key for 'me') can't match the listed key");
setLevelOffKeys(['t'], []);
ok(levelOffKey('t', 'me') === null, 'a refresh replaces the keys for those teams');
const resolveSrc = read('src/lib/resolve.ts');
const keysSrc = read('src/lib/levelKeys.ts');
ok(!/0x811c9dc5|level-adjust-off|Math\.imul/.test(resolveSrc + keysSrc), 'the plain client hash is gone from resolve.ts / levelKeys.ts');
const sb = read('src/lib/backend/supabase.ts');
ok(/rpc\('level_off_keys', \{ team_ids: teamIds \}\)/.test(sb) && /setLevelOffKeys\(/.test(sb), 'supabase.ts loads the keys with the programs (level_off_keys RPC)');
const local = read('src/lib/backend/local.ts');
ok(/m\.userId === viewer \|\| isCoach\(db, m\.teamId, viewer\)/.test(local) && /setLevelOffKeys\(teamIds, rows\)/.test(local), 'local.ts (demo) mirrors it: coach all members, athlete own key only');
const m011 = read('supabase/migrations/011_training_v3_p1.sql');
const schema = read('supabase/schema.sql');
const block = m011.slice(m011.indexOf('-- ---------- Legal ruling #7'));
ok(block.length > 500 && schema.includes(block.trim()), 'migration 011 rulings block is folded into schema.sql verbatim');
ok(/vault\.create_secret\(encode\(extensions\.gen_random_bytes\(32\), 'hex'\), 'level_adjust_key'/.test(m011) && /if not exists \(select 1 from vault\.secrets where name = 'level_adjust_key'\)/.test(m011), 'secret: random 32 bytes in Vault (level_adjust_key), created once (safe to re-run)');
ok(/extensions\.hmac\(t::text \|\| ':' \|\| u::text,[\s\S]{0,140}'sha256'\)/.test(m011), 'key = HMAC-SHA256(secret, team id : user id)');
ok(/revoke execute on function public\.level_off_key\(uuid, uuid\) from public, anon, authenticated/.test(m011) && /revoke execute on function public\.level_off_keys\(uuid\[\]\) from public, anon/.test(m011), 'only level_off_keys is callable, and only by signed-in users');
ok(/t\.coach_id = auth\.uid\(\)[\s\S]{0,200}union[\s\S]{0,200}m\.user_id = auth\.uid\(\)/.test(m011), 'level_off_keys: coach → every member, member → own key only');
const migs = fs.readdirSync(path.join(__dirname, '../../supabase/migrations'));
ok(!migs.some((m) => m.startsWith('014')), 'no migration 014');
ok(!/create table|add column/i.test(block), 'the 11/19 block adds no table or column (G-5)');

/* ================= F3 · ruling #3: my_rack own index only ================= */
const m012 = read('supabase/migrations/012_training_v3_p2.sql');
const myRack = m012.slice(m012.indexOf('create function public.my_rack'));
ok(/returns table \(group_id uuid, rack_name text, partners int, partner_names text\[\], others int, my_index int\)/.test(myRack), 'my_rack returns one my_index column (no partner indexes)');
ok(/my_index[\s\S]*o\.user_id::text < auth\.uid\(\)::text\)[\s\S]*where me\.team_id = t and me\.user_id = auth\.uid\(\)/.test(myRack), "my_index is the caller's own (auth.uid()), one row per caller");

/* ================= F4 · ruling #7: Terms 2026-11-19 ================= */
ok(COACH_TERMS_VERSION === '2026-11-19' && TRAINER_TERMS_VERSION === '2026-11-19', 'app: Coach and Trainer Terms versions are 2026-11-19');
ok(block.includes("create or replace function public.current_coach_terms() returns text\nlanguage sql immutable as $$ select '2026-11-19'::text $$;") && block.includes("create or replace function public.current_trainer_terms() returns text\nlanguage sql immutable as $$ select '2026-11-19'::text $$;"), 'server: migration 011 sets current_coach_terms() and current_trainer_terms() to 2026-11-19');
const lastDef = (fn: string) => {
  const all = [...schema.matchAll(new RegExp(`function public\\.${fn}\\(\\) returns text\\nlanguage sql immutable as \\$\\$ select '([0-9-]+)'`, 'g'))];
  return all[all.length - 1]?.[1];
};
ok(lastDef('current_coach_terms') === '2026-11-19' && lastDef('current_trainer_terms') === '2026-11-19', 'schema.sql: the last definition of both is 2026-11-19');
const tsx = read('src/components/AccountForm.tsx') + read('src/lib/backend/supabase.ts');
ok(/COACH_TERMS_VERSION/.test(tsx) && /TRAINER_TERMS_VERSION/.test(sb), 'sign-up and re-accept send the constants (no literal versions)');

console.log(f ? `\n${f} FAIL` : '\nall pass');
