import type { Team, TeamKind } from './backend/types';
import { getExercise } from './exercises';
import type { CardioRx, Goal, Program, ProgramExercise, Session, SlotRole } from './types';

/**
 * 2.3.0 trainer mode (general teams). One place for: the team-kind check, the Trainer/Client word set (design §S1),
 * the Legal-owned lines (compliance T1–T5, quoted exactly), goals (adult-goals.md) and the adult rules
 * (adult-training-rules.md). Volleyball teams never read anything here except `terms('volleyball')`, which is the
 * 2.2.1 wording.
 */

export const isGeneral = (t: Pick<Team, 'kind'> | TeamKind | null | undefined): boolean =>
  (typeof t === 'string' ? t : t?.kind) === 'general';

/* ---------- §S1 word set ---------- */
export type Terms = {
  leader: string;
  Leader: string;
  leaders: string;
  member: string;
  Member: string;
  members: string;
  Members: string;
  peers: string;
  Peers: string;
  roster: string;
  teamTab: string;
  board: string;
  Board: string;
  codeOwner: string;
};

const VOLLEYBALL: Terms = {
  leader: 'coach',
  Leader: 'Coach',
  leaders: 'coaches',
  member: 'athlete',
  Member: 'Athlete',
  members: 'athletes',
  Members: 'Athletes',
  peers: 'teammates',
  Peers: 'Teammates',
  roster: 'Roster',
  teamTab: 'Team',
  board: 'coach board',
  Board: 'Coach board',
  codeOwner: 'your coach',
};

const GENERAL: Terms = {
  leader: 'trainer',
  Leader: 'Trainer',
  leaders: 'trainers',
  member: 'client',
  Member: 'Client',
  members: 'clients',
  Members: 'Clients',
  peers: 'other clients',
  Peers: 'Other clients',
  roster: 'Clients',
  teamTab: 'Clients',
  board: 'class board',
  Board: 'Class board',
  codeOwner: 'your trainer',
};

/** §S0.1: the word set for the team in view. */
export const terms = (kind: TeamKind | null | undefined): Terms => (kind === 'general' ? GENERAL : VOLLEYBALL);

/* ---------- Legal lines (compliance T1–T5; quoted exactly, never edited) ---------- */
export const LEGAL = {
  /** T2 confirmation 1 (the Trainer Terms link is the bold part). */
  confirmTermsBefore: "I've read and accept the ",
  confirmTermsLink: 'Trainer Terms',
  confirmTermsAfter: ' (Terms §4T).',
  /** T2 confirmation 2. */
  confirmAdults: "My clients are adults (18+), and I'm responsible for the programs I give them, including screening clients before they train.",
  /** T2 confirmation 3. */
  confirmNoCobranding: "I won't put the Approach Strength name on anything my gym prints, posts, or shares.",
  /** T3.4 */
  notOpenTrainer: 'Your team opens once Ryan confirms your details by email.',
  notOpenJoin: "This trainer's team isn't open yet.",
  /** T1 */
  adultsOnly: 'This team is for adults 18 and older.',
  /** T5 sharing row */
  shareRow: 'Share my check-ins with my trainer',
  shareLine: 'Your trainer will see your sleep, soreness, energy, and whether you reported pain. Other clients never will.',
  /** T4 groups */
  groupHelper: "Use a class time or first name. Don't include health details.",
  /** T5 notes */
  notesHelper: "Your trainer sees your notes. Don't include health or injury details.",
  /** F39d (Legal T4) */
  templateLine: "Templates keep the plan only, never a client's logs.",
} as const;

/**
 * G3 pain card and G4 head-injury line for general teams (design §S1b). PENDING LEGAL: Legal hasn't approved the trainer
 * versions yet (CLAUDE.md known conflict 5). Each is a single constant so approved text replaces it in one place.
 * Don't deploy until Ryan confirms Legal's wording.
 */
export const PAIN_TRAINER = "Don't train through pain. Talk to your trainer or a health professional before you train today.";
export const HEAD_INJURY_TRAINER =
  'If you hit your head or have any signs of a concussion, stop training and tell your trainer. Only a licensed health care provider can clear you to return.';

/** F32 (UX wording). */
export const GATE = {
  notOpenTitle: "Your team isn't open yet",
  emailLine:
    'Email ryan@approachstrength.com with your certification (name and issuing body), your professional liability insurance (insurer and expiry date), and that you train clients through your own business.',
  emailHref: 'mailto:ryan@approachstrength.com',
  codeDimmed: "Clients can't join until your team is open.",
  cantPost: 'You can post once your team is open.',
  opened: 'Your team is open. Share your code with clients.',
  pausedTitle: 'Your team is paused',
  pausedBody: "New clients can't join, and you can't post new programs. Email Ryan to renew your details.",
  termsChanged: 'The Trainer Terms changed. Review and accept them to keep posting programs.',
} as const;

export type GateState = 'open' | 'not_open' | 'paused' | 'terms';

/** Trainer's gate state from my_team_status. "Paused" = verified before on this device and now cleared (T3.6). */
export function gateState(status: { verifiedAt: string | null; termsVersion: string | null; currentTerms: string } | null | undefined, seenOpen: boolean): GateState {
  if (!status) return 'not_open';
  if (!status.verifiedAt) return seenOpen ? 'paused' : 'not_open';
  if (status.termsVersion !== status.currentTerms) return 'terms';
  return 'open';
}

/* ---------- Goals (adult-goals.md) ---------- */
export const GOALS: { id: Goal; label: string; who: string; suggested: number; range: [number, number] }[] = [
  { id: 'strength', label: 'Strength', who: 'Clients who want to get stronger on the main lifts.', suggested: 3, range: [2, 4] },
  { id: 'muscle', label: 'Muscle', who: 'Clients who want to build muscle.', suggested: 3, range: [2, 5] },
  { id: 'general', label: 'General fitness', who: 'Clients who want to feel fit and capable: strength, movement, and some cardio.', suggested: 3, range: [2, 4] },
  {
    id: 'back_after_break',
    label: 'Back after a break',
    who: 'For clients coming back after time off. Clients returning from an injury or medical condition should be cleared by a qualified professional first.',
    suggested: 2,
    range: [2, 3],
  },
];
export const goalLabel = (g?: Goal) => GOALS.find((x) => x.id === g)?.label ?? 'Program';

export type Rx = { sets: number; reps: string; effort: string } | null;

/** ADULT_GOAL_RX[goal][role] (adult-goals.md §2). Ranges of sets use the upper value; the trainer edits anything. */
export const ADULT_GOAL_RX: Record<Exclude<Goal, 'back_after_break'>, Record<SlotRole | 'cardio', Rx | CardioRx>> = {
  strength: {
    power: { sets: 3, reps: '3', effort: 'Fast, full rest' },
    main: { sets: 4, reps: '4–6', effort: 'RPE 7–8' },
    secondary: { sets: 3, reps: '6–8', effort: 'RPE 7' },
    accessory: { sets: 3, reps: '8–12', effort: 'RPE 7' },
    core: { sets: 3, reps: '8–10', effort: 'Controlled' },
    care: { sets: 2, reps: '12–15', effort: 'Light' },
    mobility: { sets: 2, reps: '5 each', effort: 'Easy' },
    cardio: { minutes: 10, intensity: 'easy' },
  },
  muscle: {
    power: null,
    main: { sets: 4, reps: '6–10', effort: 'RPE 7–8' },
    secondary: { sets: 3, reps: '8–12', effort: 'RPE 7–8' },
    accessory: { sets: 3, reps: '10–15', effort: 'RPE 7–8' },
    core: { sets: 3, reps: '10–12', effort: 'Controlled' },
    care: { sets: 2, reps: '12–15', effort: 'Light' },
    mobility: { sets: 2, reps: '5 each', effort: 'Easy' },
    cardio: { minutes: 10, intensity: 'easy' },
  },
  general: {
    power: { sets: 2, reps: '5', effort: 'Fast, land soft' },
    main: { sets: 3, reps: '8–10', effort: 'RPE 6–7' },
    secondary: { sets: 3, reps: '10–12', effort: 'RPE 6–7' },
    accessory: { sets: 2, reps: '12–15', effort: 'RPE 6–7' },
    core: { sets: 3, reps: '10', effort: 'Controlled' },
    care: { sets: 2, reps: '12–15', effort: 'Light' },
    mobility: { sets: 2, reps: '5 each', effort: 'Easy' },
    cardio: { minutes: 15, intensity: 'easy' },
  },
};

/** BACK_AFTER_BREAK_RAMP[week 1–4] (adult-goals.md §2). maxLevel null = up to the client's level. */
export const BACK_AFTER_BREAK_RAMP: Record<1 | 2 | 3 | 4, { mainSets: number; otherSets: number; reps: string; effort: string; rpe: number; maxLevel: 1 | 2 | null; power: boolean }> = {
  1: { mainSets: 2, otherSets: 2, reps: '10–12', effort: 'RPE 6', rpe: 6, maxLevel: 1, power: false },
  2: { mainSets: 3, otherSets: 2, reps: '8–12', effort: 'RPE 6', rpe: 6, maxLevel: 2, power: false },
  3: { mainSets: 3, otherSets: 2, reps: '8–10', effort: 'RPE 6–7', rpe: 7, maxLevel: null, power: true },
  4: { mainSets: 3, otherSets: 3, reps: '8–10', effort: 'RPE 7', rpe: 7, maxLevel: null, power: true },
};
export const BACK_AFTER_BREAK_CARDIO: CardioRx = { minutes: 10, intensity: 'easy' };

/** The goal's lower and upper RPE on main/secondary (for the wave). */
const GOAL_RPE: Record<Exclude<Goal, 'back_after_break'>, [number, number]> = { strength: [7, 8], muscle: [7, 8], general: [6, 7] };

/** ADULT_WAVE[weekInWave 1–4] (adult-goals.md §4): weeks 1–2 lower RPE, week 3 upper, week 4 deload (RPE 6, about −40% sets). */
export function adultWave(goal: Goal, weekInWave: number): { rpe: number; deload: boolean } {
  if (goal === 'back_after_break') return { rpe: 6, deload: false };
  const [lo, hi] = GOAL_RPE[goal];
  if (weekInWave === 4) return { rpe: 6, deload: true };
  return { rpe: weekInWave === 3 ? Math.min(8, hi) : lo, deload: false };
}

/** Default week plans for a new program: the 4-week wave repeated; Back after a break follows the ramp (no deload). */
export function defaultWeeks(goal: Goal, count: number) {
  return Array.from({ length: count }, (_, i) => {
    if (goal === 'back_after_break') {
      const r = BACK_AFTER_BREAK_RAMP[Math.min(4, i + 1) as 1 | 2 | 3 | 4];
      return { rpe: r.rpe };
    }
    const w = adultWave(goal, (i % 4) + 1);
    // A deload only once a full wave fits (a 1–3 week program has none).
    return w.deload && count >= 4 ? { rpe: 6, deload: true } : { rpe: w.deload ? GOAL_RPE[goal][0] : w.rpe };
  });
}

/* ---------- Adult rules (adult-training-rules.md) ---------- */
export const RPE_CEILING = 8;
export const EFFORT_BLOCK = 'Strength work stays at RPE 8 or below. Stop with about 2 reps left.';
export const CIRCUIT_LINE = 'Strength work in a circuit keeps its reps. No racing the clock.';
export const CARDIO_SESSION_MAX = 60;
export const CARDIO_SESSION_BLOCK = 'Keep cardio to 60 minutes or less per session.';
export const CARDIO_BREAK_LINE = 'Easy only, up to 15 min, while easing back.';
export const TALK_TEST: Record<CardioRx['intensity'], string> = {
  easy: 'You can hold a full conversation.',
  moderate: 'You can talk in short sentences, but not sing.',
};
export const INTENSITY_LABEL: Record<CardioRx['intensity'], string> = { easy: 'Easy', moderate: 'Moderate' };

/** A1/A3: in tier A/B rows, RPE 9–10, failure, to failure, max, AMRAP and "for time" are blocked. Power keeps "Max effort". */
export function generalEffortProblem(pe: Pick<ProgramExercise, 'exerciseId' | 'effort' | 'reps' | 'role'>): string | null {
  const ex = getExercise(pe.exerciseId);
  if (ex.durationOnly) return null;
  const tier = ex.tier;
  if (pe.role === 'power' || tier === 'P') return null;
  const nums = (pe.effort.match(/RPE\s*(\d+)(?:\s*[–-]\s*(\d+))?/i) ?? []).slice(1).filter(Boolean).map(Number);
  const text = `${pe.effort} ${pe.reps}`;
  const strength = tier === 'A' || tier === 'B' || pe.role === 'main' || pe.role === 'secondary' || pe.role === 'accessory';
  if (!strength) return null;
  if (nums.some((n) => n > RPE_CEILING) || /fail|\bmax\b/i.test(pe.effort)) return EFFORT_BLOCK;
  if ((tier === 'A' || tier === 'B') && /amrap|as many|for time/i.test(text)) return EFFORT_BLOCK;
  return null;
}

/** Beginners (adult rules §3): goal defaults shift down one RPE. A default, not a cap. */
export function shiftBeginner(effort: string): string {
  return effort.replace(/RPE\s*(\d+)(?:(\s*[–-]\s*)(\d+))?/i, (_m, a: string, sep?: string, b?: string) =>
    b ? `RPE ${Math.max(5, Number(a) - 1)}${sep}${Math.max(5, Number(b) - 1)}` : `RPE ${Math.max(5, Number(a) - 1)}`,
  );
}

/** Week effort: replaces the RPE on main/secondary with the week's value (capped at 8). */
export function withWeekRpe(effort: string, rpe: number): string {
  const r = Math.min(RPE_CEILING, rpe);
  return /RPE/i.test(effort) ? effort.replace(/RPE\s*\d+(?:\s*[–-]\s*\d+)?/i, `RPE ${r}`) : effort;
}

/** Weekly strength-session caps by level (adult rules §4). */
export const STRENGTH_CAP: Record<1 | 2 | 3, number> = { 1: 4, 2: 5, 3: 6 };
export const LEVEL_WORD: Record<1 | 2 | 3, string> = { 1: 'beginner', 2: 'intermediate', 3: 'advanced' };

/** Counts toward the cap: any session with tier A or B strength work (gym or home). Cardio-only and warm-up-only don't. */
export function countsTowardCap(session: Session | undefined): boolean {
  return !!session?.exercises.some((pe) => {
    const ex = getExercise(pe.exerciseId);
    return !ex.durationOnly && !pe.cardio && (ex.tier === 'A' || ex.tier === 'B');
  });
}

/** Moderate cardio counts as training on the rest day. */
const hasModerate = (s: Session | undefined) => !!s?.exercises.some((pe) => pe.cardio?.intensity === 'moderate');

const LEG_PATTERNS = new Set(['squat', 'hinge', 'single-leg', 'knee-ext', 'knee-flex']);
/** Lower-body heavy: two or more tier A/B lower-body slots. */
export function legHeavy(session: Session | undefined): boolean {
  return (session?.exercises.filter((pe) => {
    const ex = getExercise(pe.exerciseId);
    return LEG_PATTERNS.has(ex.pattern) && (ex.tier === 'A' || ex.tier === 'B');
  }).length ?? 0) >= 2;
}

/* ---------- Weeks and dates ---------- */
const DAY = 864e5;
const fromKey = (k: string) => {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const keyOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Next Monday (F36 default start date). */
export function nextMonday(from: Date = new Date()): string {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const dow = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() + (7 - dow));
  return keyOf(d);
}

export const programWeeks = (p: Program) => Math.max(1, p.weeks?.length ?? 1);

/** 0-based week of a general program on a date; null before the start or after the last week. */
export function weekIndex(p: Program, date: Date): number | null {
  const start = p.startDate ?? p.createdAt.slice(0, 10);
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = Math.floor((day.getTime() - fromKey(start).getTime()) / DAY);
  if (diff < 0) return null;
  const w = Math.floor(diff / 7);
  return w < programWeeks(p) ? w : null;
}

/** Last day of the program (YYYY-MM-DD). */
export function endDate(p: Program): string {
  const start = fromKey(p.startDate ?? p.createdAt.slice(0, 10));
  return keyOf(new Date(start.getTime() + (programWeeks(p) * 7 - 1) * DAY + 3_600_000));
}

/** "Program ends in 2 weeks": within 14 days of the start of the last week, and not finished. */
export function endsSoon(p: Program, date: Date = new Date()): boolean {
  const start = fromKey(p.startDate ?? p.createdAt.slice(0, 10));
  const lastWeek = new Date(start.getTime() + (programWeeks(p) - 1) * 7 * DAY);
  const today = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const days = (lastWeek.getTime() - today.getTime()) / DAY;
  return days <= 14 && today.getTime() <= fromKey(endDate(p)).getTime();
}

/** The weekday schedule (Monday first) for a week of the program. */
export function scheduleFor(p: Program, week: number): (string | null)[] {
  return p.weeks?.[week]?.schedule ?? p.liftSchedule;
}

/** Sessions of a program on each weekday of one typical week (week index w, default 0). */
export function weekSessions(p: Program, w = 0): (Session | undefined)[] {
  return scheduleFor(p, w).map((id) => p.sessions.find((s) => s.id === id));
}

/* ---------- Weekly checks: one program (F39b) or everything posted to a client (F36, adult rules §4 MUST) ---------- */
export type Check = { kind: 'block' | 'warn' | 'ok'; message: string; who?: string };

/** Combined Monday-first days: the sessions each day across several programs (same week index for each). */
function combinedDays(programs: Program[], w = 0): (Session | undefined)[][] {
  return Array.from({ length: 7 }, (_, d) => programs.map((p) => weekSessions(p, Math.min(w, programWeeks(p) - 1))[d]).filter(Boolean));
}

/** Strength sessions per week across programs (max over each program's weeks). */
function strengthCount(programs: Program[]): number {
  const most = Math.max(1, ...programs.map(programWeeks));
  let max = 0;
  for (let w = 0; w < most; w++) max = Math.max(max, combinedDays(programs, w).flat().filter(countsTowardCap).length);
  return max;
}

function restProblem(days: (Session | undefined)[][]): boolean {
  // At least one day with no strength training and no Moderate cardio.
  return !days.some((list) => !list.some((s) => countsTowardCap(s) || hasModerate(s)));
}

function legPairs(days: (Session | undefined)[][]): [number, number] | null {
  for (let i = 0; i < 7; i++) {
    const j = (i + 1) % 7;
    if (days[i].some(legHeavy) && days[j].some(legHeavy)) return [i, j];
  }
  return null;
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;

/** F39b: one program, against the lowest level among its targets. */
export function programChecks(p: Program, lowestLevel: 1 | 2 | 3): Check[] {
  const out: Check[] = [];
  const cap = STRENGTH_CAP[lowestLevel];
  const count = strengthCount([p]);
  if (count > cap) out.push({ kind: 'block', message: `${plural(count, 'strength session')} a week. Max ${cap} for ${LEVEL_WORD[lowestLevel]} clients.` });
  const most = programWeeks(p);
  for (let w = 0; w < most; w++) {
    const days = combinedDays([p], w);
    if (restProblem(days)) {
      out.push({ kind: 'block', message: 'Keep at least one day off each week.' });
      break;
    }
  }
  const legs = legPairs(combinedDays([p]));
  if (legs) out.push({ kind: 'warn', message: `Leg-heavy sessions ${DAY_NAMES[legs[0]]} and ${DAY_NAMES[legs[1]]}. Try an upper-body or full-body session here.` });
  if (programWeeks(p) >= 7 && p.goal !== 'back_after_break' && !p.weeks?.some((w) => w.deload)) {
    out.push({ kind: 'warn', message: 'No deload in 7+ weeks. Most programs take one every 4–6 weeks.' });
  }
  return out;
}

export type ClientForCheck = { userId: string; name: string; level: 1 | 2 | 3; existing: { label: string; program: Program; sameTarget: boolean }[] };

/** F36 step 3: per affected client, combined with everything else posted to them. Blocks first. */
export function postChecks(newProgram: Program, clients: ClientForCheck[]): Check[] {
  const blocks: Check[] = [];
  const warns: Check[] = [];
  for (const c of clients) {
    const first = c.name.split(' ')[0] || c.name;
    const others = c.existing.filter((e) => !e.sameTarget);
    const replaced = c.existing.find((e) => e.sameTarget);
    const all = [...others.map((e) => e.program), newProgram];
    const cap = STRENGTH_CAP[c.level];
    const before = others.length ? strengthCount(others.map((e) => e.program)) : 0;
    const adds = strengthCount([newProgram]);
    const total = strengthCount(all);
    if (total > cap) {
      const from = others.length ? ` from ${others.map((e) => e.label).join(' and ')}` : '';
      blocks.push({
        kind: 'block',
        who: c.userId,
        message: others.length
          ? `${first} already has ${plural(before, 'session')} a week${from}. This program adds ${adds} (total ${total}, max ${cap} for ${first}'s level).`
          : `This program has ${plural(adds, 'strength session')} a week (max ${cap} for ${first}'s level).`,
      });
    }
    const most = Math.max(...all.map(programWeeks));
    for (let w = 0; w < most; w++) {
      if (restProblem(combinedDays(all, w))) {
        blocks.push({ kind: 'block', who: c.userId, message: `${first} would train 7 days in a row. Keep at least one day off.` });
        break;
      }
    }
    if (others.length) {
      const legs = legPairs(combinedDays(all));
      if (legs) warns.push({ kind: 'warn', who: c.userId, message: `${first} has leg-heavy sessions ${DAY_NAMES[legs[0]]} and ${DAY_NAMES[legs[1]]}. Try an upper-body or full-body session here.` });
    }
    if (replaced) warns.push({ kind: 'warn', who: c.userId, message: `This replaces ${replaced.label} for ${first}.` });
  }
  return [...blocks, ...warns];
}

/** "Strength · week 3 of 8" (F37/F42). */
export function programLine(p: Program, date: Date = new Date(), withTotal = true): string {
  const w = weekIndex(p, date);
  const goal = goalLabel(p.goal);
  if (w == null) {
    const start = p.startDate ?? p.createdAt.slice(0, 10);
    return keyOf(date) < start ? `${goal} · starts ${start}` : `${goal} · finished`;
  }
  return withTotal ? `${goal} · week ${w + 1} of ${programWeeks(p)}` : `${goal} · week ${w + 1}`;
}

/** Cardio checks for one session (F41). */
export function cardioProblems(session: Session, goal?: Goal): string[] {
  const out: string[] = [];
  const total = session.exercises.reduce((n, pe) => n + (pe.cardio?.minutes ?? 0), 0);
  if (total > CARDIO_SESSION_MAX) out.push(CARDIO_SESSION_BLOCK);
  if (goal === 'back_after_break' && session.exercises.some((pe) => pe.cardio && (pe.cardio.intensity !== 'easy' || pe.cardio.minutes > 15))) {
    out.push(CARDIO_BREAK_LINE);
  }
  return out;
}

/** Clamp a cardio prescription to the adult rules (5–60 min; Back after a break: Easy, ≤ 15). */
export function clampCardio(rx: CardioRx, goal?: Goal): CardioRx {
  const max = goal === 'back_after_break' ? 15 : 60;
  return { minutes: Math.min(max, Math.max(5, Math.round(rx.minutes))), intensity: goal === 'back_after_break' ? 'easy' : rx.intensity };
}

/** The gym's equipment for building and resolving (F40). Not set yet: the standard 10 items (no machines or cardio). */
export function gymOf(team: { gymEquipment?: import('./types').Equipment[] | null } | undefined): import('./types').Equipment[] {
  return team?.gymEquipment?.length ? team.gymEquipment : ['barbell', 'trap-bar', 'dumbbells', 'kettlebells', 'bench', 'cable', 'pullup-bar', 'box', 'med-ball', 'bands'];
}
