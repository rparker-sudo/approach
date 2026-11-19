import type { Program, Session, SessionSource } from './types';

/**
 * 2.4.0 · Legal ruling #1b (compliance § 2.4.0 build rulings, 11/19): `session.source` for a session saved before 2.4.0
 * (no `source` in the stored JSON).
 *
 *   coach-built → 'coach'; generated or personal → 'approach'; can't tell → 'approach' (generated limits apply).
 *
 * The 2.3.x builder left these traces of a coach's hand in the program JSON, and the 2.3.x generators (volleyball
 * `generateProgram`, trainer `starterSessions`) never write any of them. A legacy session counts as the coach's only
 * when at least one is present; everything else (including a posted, unedited generated program) is 'approach'.
 *   1. a row with `restSetByCoach: true` (the coach set the rest);
 *   2. a row grouped by hand: `autoGroup === false` (manual pair, circuit or ungroup), or a `group` letter without
 *      `autoGroup: true` (the generator's auto-pairing always sets `autoGroup: true`);
 *   3. a row using one of the program's custom exercises (2.3.1 custom exercises are coach-built content, D-058);
 *   4. a row note the generator never writes (the coach typed it);
 *   5. a stations session (`format: 'stations'`; the coach chose the format);
 *   6. a trainer session added with "Add session" (`Session N`, focus "Full body"; the starter templates never use it).
 * Edits that left no trace (sets, reps or effort typed over generator values) can't be told apart; per #1b they stay
 * 'approach', the safer direction. Personal programs (not posted, not a trainer program) are always 'approach'.
 * Recorded in build-snapshot.md §8 "2.4.0".
 */

/** The only notes the 2.3.x generator writes (generator.ts `buildSession`). Checked against the generator in v240-legal-check. */
export const GENERATOR_NOTES = new Set([
  'Clear space, no low ceilings, sneakers on. Up to 20 contacts.',
  'Only with coaching. Swap for a jump otherwise.',
  'Keep it crisp. Never grind a rep in-season.',
]);

type ProgramPart = Pick<Program, 'teamId' | 'general' | 'postedAt' | 'customExercises'>;

/** Which of the six coach traces (above) a legacy session carries; empty = none. */
export function coachTraces(program: ProgramPart, session: Session): string[] {
  const out = new Set<string>();
  const custom = new Set((program.customExercises ?? []).map((e) => e.id));
  for (const pe of session.exercises ?? []) {
    if (pe.restSetByCoach) out.add('rest');
    if (pe.autoGroup === false || (pe.group && pe.autoGroup !== true)) out.add('group');
    if (custom.has(pe.exerciseId)) out.add('custom');
    if (pe.notes && pe.notes.trim() && !GENERATOR_NOTES.has(pe.notes.trim())) out.add('notes');
  }
  if (session.format === 'stations') out.add('stations');
  if (program.general && /^Session \d+$/.test(session.name ?? '') && session.focus === 'Full body') out.add('added');
  return [...out];
}

/** `session.source` for a stored session (ruling #1b for legacy sessions; #1a edits set it to 'coach' in the editor). */
export function sourceOf(program: ProgramPart, session: Session): SessionSource {
  if (session.source) return session.source;
  const posted = !!(program.teamId || program.general || program.postedAt);
  if (!posted) return 'approach';
  return coachTraces(program, session).length ? 'coach' : 'approach';
}
