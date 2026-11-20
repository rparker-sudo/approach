import { getExercise } from './exercises';
import type { ProgramExercise, Session, SlotRole } from './types';

/**
 * 2.4.2 Part D · Coaching layer and cooldown (program-planner-v3.md §3; spec D1–D4; UX F61, F62). Pure functions; no React.
 * Strings are exactly as written in planner §3 (Legal's claim check covered them). Nothing here ever reaches a board (G-4):
 * `SessionSummary` and `CoachingNote` are not board-safe.
 */

/** §3c intent cue library (generated rows), exactly as written. */
export const INTENT_CUES: Record<string, string> = {
  'hang-clean': 'Bar speed is the priority. End the set if the bar slows.',
  'power-clean': 'Bar speed is the priority. End the set if the bar slows.',
  'hang-high-pull': 'Jump first, then pull. Fast every rep.',
  'jump-shrug': 'Jump and shrug, arms long. Land soft.',
  'clean-pull': 'Drive the floor away fast. Finish tall.',
  'push-press': 'Short dip, fast drive. Lock out over your head.',
  'push-jerk': 'Drive, then punch under. Stand to finish.',
  'db-push-press': 'Short dip, fast drive.',
  'db-hang-snatch': 'Jump and punch it straight up.',
  'box-jump': 'Full arm swing, land soft, step down.',
  'depth-drop': 'Step off, land quiet, hold 2 seconds.',
  'depth-jump': 'Off the ground fast. Full rest between reps.',
  'hurdle-hop': 'Quick off the ground, knees up.',
  'lateral-bound': 'Stick each landing for 2 seconds.',
  'lateral-hurdle-hop': 'Quick contacts, knees over toes.',
  'single-leg-hop-stick': 'Stick every landing for 2 seconds.',
  'mb-overhead': 'Throw hard every rep.',
  'mb-rotational': 'Load the back hip, throw through.',
  'mb-chest-pass': 'Fast hands, throw hard.',
  'mb-scoop-toss': 'Hips drive the throw.',
  'back-squat': 'Same depth every rep. Stop with about 2 reps left.',
  'front-squat': 'Elbows up, same depth every rep.',
  'trap-bar-deadlift': 'Push the floor away. Stand tall, no rounding.',
  rdl: 'Hips back, bar close. Feel the hamstrings.',
  bench: 'Spotter on every set. Control down, press up.',
  'incline-bench': 'Spotter on every set.',
  'split-squat': 'Back knee straight down. Control the lowering.',
  'lateral-squat': 'Sit deep into the hip, whole foot down.',
  'db-rdl': 'Square hips, reach back long.',
  'db-row': 'Heavy, no twist. Elbow to hip.',
  'chest-supported-row': 'Chest stays on the pad.',
  'weighted-pullup': 'Strict reps, full hang.',
  pullup: 'Full hang every rep. Add a dumbbell if 8+ is easy.',
  'chin-up': 'Full hang every rep.',
  'landmine-press': 'Squeeze the down-knee glute, press up and forward.',
  nordic: 'Lower as slowly as you can.',
  ghr: 'Hips straight, slow down.',
  copenhagen: 'Hips high, straight line.',
  pallof: 'Resist the twist. Press straight out.',
  'face-pull': 'Pull to your eyes, thumbs back.',
  'spanish-squat': 'Steady hold, about 70% effort.',
  'er-90-90-iso': 'Elbow at shoulder height. Steady hold.',
};
export const ROLE_CUES: Record<SlotRole, string> = {
  power: 'Every rep fast. Full rest.',
  main: 'Stop with about 2 reps left.',
  secondary: 'Smooth, controlled reps.',
  accessory: 'Controlled reps.',
  core: 'Slow and controlled.',
  care: 'Light and controlled.',
  mobility: 'Easy breathing.',
};

/** §3c week notes (exact wording; numbers filled in). */
export const WEEK_NOTE = {
  pct: (week: number, pct: number, prev: number | null) => (prev != null && prev !== pct ? `Week ${week}: ${pct}% (${pct > prev ? 'up' : 'down'} from ${prev}%).` : `Week ${week}: ${pct}%.`),
  deload: 'Deload: 60–65%. Easy and fast.',
  rpe: (week: number) => (week > 1 ? `Week ${week}: a little heavier than week ${week - 1} if every rep moved well.` : null),
  topSet: (rpe: string, backoffs: number) => `Top set at ${rpe}, then ${backoffs} set${backoffs === 1 ? '' : 's'} at −10%.`,
  downgrade: 'Straight sets today (your version).',
  buildUp: 'Round 1 is your build-up set (about 60%).',
};

/** The intent cue for a row: by exercise, else by role (§3c). Spot positions have none. */
export function cueFor(exerciseId: string, role: SlotRole | undefined): string {
  return INTENT_CUES[exerciseId] ?? ROLE_CUES[role ?? 'accessory'];
}

/** Every cue and note string the generator can write (claim-word search; tests). */
export const ALL_COACHING_STRINGS = [...Object.values(INTENT_CUES), ...Object.values(ROLE_CUES), WEEK_NOTE.deload, WEEK_NOTE.downgrade, WEEK_NOTE.buildUp, WEEK_NOTE.pct(2, 80, 75), WEEK_NOTE.rpe(2)!, WEEK_NOTE.topSet('RPE 8', 2)];

/** Notes as lines (F61c: one line per line of text). */
export const noteLines = (notes: string | undefined | null) => (notes ?? '').split('\n').map((l) => l.trim()).filter(Boolean);

const CUE_SET = new Set([...Object.values(INTENT_CUES), ...Object.values(ROLE_CUES)]);
const WEEK_NOTE_RE = /^(Week \d+: |Deload: 60–65%\. Easy and fast\.$|Top set at |Straight sets today \(your version\)\.$|Round 1 is your build-up set)/;
/** A generated cue or week-note line (so the athlete's week note can replace the stored week-1 one). */
export const isGeneratedLine = (l: string) => CUE_SET.has(l) || WEEK_NOTE_RE.test(l);

/** §3c: the cue as the first line of a generated row's notes, keeping any note the generator already wrote. */
export function withCue(pe: ProgramExercise): ProgramExercise {
  const cue = cueFor(pe.exerciseId, pe.role);
  const rest = noteLines(pe.notes).filter((l) => l !== cue && !isGeneratedLine(l));
  return { ...pe, notes: [cue, ...rest].join('\n') };
}

/**
 * The week note for a loaded main lift (§3c table): the R-2 downgrade first, then the deload, then the tested lift's % (with
 * last week's), the top set + back-offs, or the RPE line.
 */
export function weekNoteFor(rx: { pct?: number; method?: string; sets: number; effort: string }, ctx: { week: number; deload: boolean; downgraded: boolean; prevPct: number | null }): string | null {
  if (ctx.downgraded) return WEEK_NOTE.downgrade;
  if (ctx.deload) return WEEK_NOTE.deload;
  if (rx.pct != null) return WEEK_NOTE.pct(ctx.week, rx.pct, ctx.prevPct);
  if (rx.method === 'top_backoff') return WEEK_NOTE.topSet(rx.effort.match(/RPE\s*[\d–-]+/)?.[0] ?? rx.effort, Math.max(1, rx.sets - 1));
  return WEEK_NOTE.rpe(ctx.week);
}

/** Replace the week-note line of a row's notes (cue first, week note second, other notes after). */
export function setWeekNote(notes: string | undefined, cue: string | null, note: string | null, extra: string[] = []): string {
  const others = noteLines(notes).filter((l) => !isGeneratedLine(l));
  return [cue, note, ...extra, ...others].filter(Boolean).join('\n');
}

/* ---------- §3d cooldown ---------- */
export type CooldownType = 'Lower-heavy' | 'Upper' | 'Total';
const CD: Record<CooldownType, [string, string][]> = {
  'Lower-heavy': [['hip-flexor-stretch', '30s each'], ['band-hamstring', '30s each'], ['crocodile-breathing', '3']],
  Upper: [['lat-reach', '20s each'], ['thoracic-rotation', '5 each'], ['crocodile-breathing', '3']],
  Total: [['hip-flexor-stretch', '30s each'], ['lat-reach', '20s each'], ['crocodile-breathing', '3']],
};
/** §3d session type: in-season and "Total" days use Total; a squat/hinge B-block is lower-heavy; else upper. */
export function cooldownType(session: Pick<Session, 'name' | 'exercises'>, inSeason: boolean): CooldownType {
  if (inSeason || /Total|Full body|Heavy|Fast/.test(session.name)) return 'Total';
  const mains = session.exercises.filter((e) => e.role === 'main').map((e) => getExercise(e.exerciseId));
  if (!mains.length) return 'Total';
  return mains.some((m) => m.category !== 'upper') ? 'Lower-heavy' : 'Upper';
}
/** §3d rows: role 'mobility', group 'CD' (existing keys). */
export function cooldownRows(type: CooldownType): ProgramExercise[] {
  return CD[type].map(([id, reps]) => ({ exerciseId: id, sets: 1, reps, effort: 'Easy', role: 'mobility' as const, group: 'CD', notes: ROLE_CUES.mobility }));
}
export const isCooldown = (pe: Pick<ProgramExercise, 'group'>) => pe.group === 'CD';
/** Cooldown minutes (2–3), from the rows' work time (holds and breaths, no rest between). */
export function cooldownMinutes(rows: ProgramExercise[]): number {
  const sec = rows.reduce((n, r) => {
    const hold = r.reps.match(/(\d+)\s*s/);
    const reps = Number(r.reps.match(/\d+/)?.[0] ?? 0);
    return n + r.sets * (hold ? Number(hold[1]) * (/each/.test(r.reps) ? 2 : 1) : reps * 3 * (/each/.test(r.reps) ? 2 : 1));
  }, 0);
  return Math.max(2, Math.min(3, Math.ceil(sec / 60)));
}
export const cooldownTypeOf = (session: Pick<Session, 'exercises'>): CooldownType | null => {
  const ids = session.exercises.filter(isCooldown).map((e) => e.exerciseId);
  if (!ids.length) return null;
  return ids.includes('band-hamstring') ? 'Lower-heavy' : ids.includes('thoracic-rotation') ? 'Upper' : 'Total';
};

/* ---------- §3a block headers ---------- */
export const BLOCK_WORD: Record<string, string> = { A: 'Power', B: 'Strength', C: 'Secondary', D: 'Accessory', E: 'Care' };
const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
/** F61d rotation time: seconds under 2 minutes ("75 s rotations"), m:ss from 2:00. */
export const rotationWord = (sec: number) => (sec < 120 ? `${sec} s rotations` : `${mmss(sec)} rotations`);
/** §3a: "B · Strength · 75 s rotations · 4 rounds · about 20 min". */
export const rotationHeader = (letter: string, rotationSec: number, rounds: number, minutes: number) =>
  `${letter} · ${BLOCK_WORD[letter] ?? 'Block'} · ${rotationWord(rotationSec)} · ${rounds} round${rounds === 1 ? '' : 's'} · about ${Math.max(1, Math.round(minutes))} min`;
/** §3a: "B · Strength · 5 sets · rest 3:00 · about 18 min". */
export const standardHeader = (letter: string, sets: number, restSec: number, minutes: number) =>
  `${letter} · ${BLOCK_WORD[letter] ?? 'Block'} · ${sets} set${sets === 1 ? '' : 's'} · rest ${mmss(restSec)} · about ${Math.max(1, Math.round(minutes))} min`;
