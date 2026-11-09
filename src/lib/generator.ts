import type {
  DayType,
  Experience,
  Phase,
  Position,
  Program,
  ProgramPosition,
  ProgramExercise,
  Session,
} from './types';
import { PHASES } from './types';
import { uid } from './util';

export type GeneratorInput = {
  name?: string;
  forName?: string;
  author?: string;
  position: ProgramPosition;
  phase: Phase;
  experience: Experience;
  volleyballWeek: DayType[];
  liftDaysPerWeek: number;
};

const isMatch = (d: DayType) => d === 'game' || d === 'tournament';

/**
 * Pick which weekdays to lift on, working around the volleyball week:
 * never on match days, avoid the day before a match, prefer days
 * with no volleyball, and spread sessions out.
 */
export function pickLiftDays(week: DayType[], count: number): number[] {
  const score = week.map((d, i) => {
    if (isMatch(d)) return -1000;
    let s = d === 'off' ? 10 : 6;
    if (isMatch(week[(i + 1) % 7])) s -= 25; // day before a match
    if (isMatch(week[(i + 6) % 7])) s -= 4; // day after a match: recovery
    return s;
  });
  const chosen: number[] = [];
  const available = score.filter((s) => s > -1000).length;
  const n = Math.min(count, available);
  while (chosen.length < n) {
    let best = -1;
    let bestScore = -Infinity;
    for (let i = 0; i < 7; i++) {
      if (chosen.includes(i) || score[i] <= -1000) continue;
      let s = score[i];
      // Spread sessions: penalize days next to another lift day.
      if (chosen.includes((i + 1) % 7) || chosen.includes((i + 6) % 7)) s -= 8;
      if (s > bestScore) {
        bestScore = s;
        best = i;
      }
    }
    if (best < 0) break;
    chosen.push(best);
  }
  return chosen.sort((a, b) => a - b);
}

type Template = { name: string; focus: string; lowerHeavy: boolean; exercises: ProgramExercise[] };

const ex = (exerciseId: string, sets: number, reps: string, effort: string, notes?: string): ProgramExercise => ({
  exerciseId,
  sets,
  reps,
  effort,
  notes,
});

function phaseTemplates(phase: Phase): Template[] {
  switch (phase) {
    case 'off':
      return [
        {
          name: 'Lower Strength',
          focus: 'Squat strength, single-leg strength, hamstrings',
          lowerHeavy: true,
          exercises: [
            ex('box-jump', 3, '3', 'Max effort', 'Full rest between jumps'),
            ex('back-squat', 4, '5', 'RPE 7–8'),
            ex('rdl', 3, '8', 'RPE 7'),
            ex('split-squat', 3, '8 each', 'RPE 7'),
            ex('nordic', 3, '4', 'Slow lowering'),
            ex('dead-bug', 3, '8 each', 'Controlled'),
          ],
        },
        {
          name: 'Upper Strength',
          focus: 'Push, pull, shoulder health',
          lowerHeavy: false,
          exercises: [
            ex('mb-overhead', 3, '5', 'Max effort'),
            ex('db-bench', 4, '6–8', 'RPE 7–8'),
            ex('db-row', 4, '8–10 each', 'RPE 7–8'),
            ex('landmine-press', 3, '8 each', 'RPE 7'),
            ex('pullup', 3, '5–8', 'Leave 2 in the tank'),
            ex('face-pull', 3, '15', 'Light'),
            ex('side-plank', 3, '30s each', 'Steady'),
          ],
        },
        {
          name: 'Total Body Power',
          focus: 'Hinge strength, power, glutes',
          lowerHeavy: true,
          exercises: [
            ex('trap-bar-jump', 3, '4', 'Light & fast'),
            ex('trap-bar-deadlift', 4, '5', 'RPE 7–8'),
            ex('step-up', 3, '8 each', 'RPE 7'),
            ex('hip-thrust', 3, '10', 'RPE 7'),
            ex('lat-pulldown', 3, '10', 'RPE 7'),
            ex('copenhagen', 2, '20s each', 'Steady'),
          ],
        },
        {
          name: 'Upper Volume + Core',
          focus: 'Muscle building and core',
          lowerHeavy: false,
          exercises: [
            ex('bench', 3, '8', 'RPE 7'),
            ex('inverted-row', 3, '10', 'Bodyweight'),
            ex('pushup', 2, 'Max', 'Stop 2 short of failure'),
            ex('ytw', 2, '8 each', 'Light'),
            ex('ab-rollout', 3, '8', 'Controlled'),
            ex('suitcase-carry', 3, '30 yd each', 'Heavy'),
          ],
        },
      ];
    case 'pre':
      return [
        {
          name: 'Lower Power',
          focus: 'Jump power and strength',
          lowerHeavy: true,
          exercises: [
            ex('box-jump', 4, '3', 'Max effort'),
            ex('hang-clean', 4, '3', 'RPE 7', 'Only with coaching. Swap for trap bar jump otherwise.'),
            ex('front-squat', 4, '3–4', 'RPE 7–8'),
            ex('db-rdl', 3, '6 each', 'RPE 7'),
            ex('nordic', 2, '4', 'Slow lowering'),
            ex('pallof', 3, '10 each', 'Steady'),
          ],
        },
        {
          name: 'Upper Power',
          focus: 'Throwing power, upper strength, shoulders',
          lowerHeavy: false,
          exercises: [
            ex('mb-rotational', 3, '5 each', 'Max effort'),
            ex('mb-overhead', 3, '5', 'Max effort'),
            ex('db-bench', 3, '5', 'RPE 7–8'),
            ex('pullup', 3, '5', 'Leave 2 in the tank'),
            ex('band-er', 3, '15 each', 'Light'),
            ex('side-plank', 2, '30s each', 'Steady'),
          ],
        },
        {
          name: 'Total Body Strength',
          focus: 'Strength you keep into the season',
          lowerHeavy: true,
          exercises: [
            ex('trap-bar-jump', 3, '3', 'Light & fast'),
            ex('trap-bar-deadlift', 3, '4', 'RPE 7–8'),
            ex('lateral-lunge', 3, '6 each', 'RPE 7'),
            ex('db-row', 3, '8 each', 'RPE 7'),
            ex('landmine-press', 3, '6 each', 'RPE 7'),
            ex('copenhagen', 2, '20s each', 'Steady'),
          ],
        },
        {
          name: 'Recovery + Prehab',
          focus: 'Shoulders, knees, ankles, core',
          lowerHeavy: false,
          exercises: [
            ex('face-pull', 3, '15', 'Light'),
            ex('spanish-squat', 3, '30s', 'Steady'),
            ex('tib-raise', 2, '15', 'Bodyweight'),
            ex('ankle-balance', 2, '6 each', 'Bodyweight'),
            ex('dead-bug', 3, '8 each', 'Controlled'),
          ],
        },
      ];
    case 'in':
      return [
        {
          name: 'In-Season A',
          focus: 'Short full-body strength (35–40 min)',
          lowerHeavy: true,
          exercises: [
            ex('mb-overhead', 2, '4', 'Max effort'),
            ex('trap-bar-deadlift', 3, '3', 'RPE 6–7', 'Keep it crisp. Never grind a rep in-season.'),
            ex('split-squat', 2, '6 each', 'RPE 6'),
            ex('db-bench', 3, '5', 'RPE 7'),
            ex('db-row', 3, '8 each', 'RPE 7'),
            ex('band-er', 2, '15 each', 'Light'),
          ],
        },
        {
          name: 'In-Season B',
          focus: 'Short full-body strength + prehab (30–35 min)',
          lowerHeavy: false,
          exercises: [
            ex('mb-rotational', 2, '4 each', 'Max effort'),
            ex('goblet-squat', 2, '6', 'RPE 6'),
            ex('hip-thrust', 2, '8', 'RPE 6–7'),
            ex('pullup', 3, '4–6', 'Leave 2 in the tank'),
            ex('landmine-press', 2, '6 each', 'RPE 7'),
            ex('copenhagen', 2, '15s each', 'Steady'),
            ex('pallof', 2, '10 each', 'Steady'),
          ],
        },
        {
          name: 'In-Season Upper + Prehab',
          focus: 'Upper body and recovery. OK the day before a match.',
          lowerHeavy: false,
          exercises: [
            ex('db-bench', 2, '6', 'RPE 6'),
            ex('inverted-row', 2, '10', 'Bodyweight'),
            ex('face-pull', 2, '15', 'Light'),
            ex('spanish-squat', 2, '30s', 'Steady'),
            ex('dead-bug', 2, '8 each', 'Controlled'),
          ],
        },
        {
          name: 'In-Season Recovery',
          focus: 'Light movement and mobility',
          lowerHeavy: false,
          exercises: [
            ex('ankle-balance', 2, '6 each', 'Bodyweight'),
            ex('tib-raise', 2, '15', 'Bodyweight'),
            ex('ytw', 2, '8 each', 'Light'),
            ex('side-plank', 2, '20s each', 'Steady'),
          ],
        },
      ];
    case 'post':
      return [
        {
          name: 'General Strength A',
          focus: 'Rebuild after the season, fix weak spots',
          lowerHeavy: true,
          exercises: [
            ex('goblet-squat', 3, '10', 'RPE 6'),
            ex('db-rdl', 3, '10 each', 'RPE 6'),
            ex('db-bench', 3, '10', 'RPE 6'),
            ex('db-row', 3, '12 each', 'RPE 6'),
            ex('spanish-squat', 3, '30s', 'Steady'),
            ex('dead-bug', 3, '8 each', 'Controlled'),
          ],
        },
        {
          name: 'General Strength B',
          focus: 'Single-leg work, shoulders, core',
          lowerHeavy: false,
          exercises: [
            ex('step-up', 3, '10 each', 'RPE 6'),
            ex('hip-thrust', 3, '12', 'RPE 6'),
            ex('lat-pulldown', 3, '12', 'RPE 6'),
            ex('pushup', 3, '10–15', 'Bodyweight'),
            ex('band-er', 3, '15 each', 'Light'),
            ex('copenhagen', 2, '20s each', 'Steady'),
          ],
        },
        {
          name: 'General Strength C',
          focus: 'Ankles, hamstrings, carries',
          lowerHeavy: true,
          exercises: [
            ex('lateral-lunge', 3, '8 each', 'RPE 6'),
            ex('nordic', 2, '4', 'Slow lowering'),
            ex('calf-raise', 3, '12 each', 'RPE 6'),
            ex('tib-raise', 2, '15', 'Bodyweight'),
            ex('suitcase-carry', 3, '30 yd each', 'Moderate'),
          ],
        },
        {
          name: 'Mobility + Prehab',
          focus: 'Light day',
          lowerHeavy: false,
          exercises: [
            ex('ytw', 2, '8 each', 'Light'),
            ex('ankle-balance', 2, '6 each', 'Bodyweight'),
            ex('side-plank', 2, '30s each', 'Steady'),
            ex('dead-bug', 2, '8 each', 'Controlled'),
          ],
        },
      ];
  }
}

/** Safer swaps for athletes new to lifting. */
const BEGINNER_SWAPS: Record<string, string> = {
  'back-squat': 'goblet-squat',
  'front-squat': 'goblet-squat',
  bench: 'db-bench',
  'hang-clean': 'mb-slam',
  'trap-bar-jump': 'box-jump',
  'ab-rollout': 'dead-bug',
  rdl: 'db-rdl',
};

const BEGINNER_EFFORT: Record<string, string> = {
  'RPE 7–8': 'RPE 6–7',
  'RPE 7': 'RPE 6',
};

/** Extra injury-prevention work by position, added to the end of a session. */
const POSITION_EXTRAS: Record<ProgramPosition, ProgramExercise[]> = {
  'All positions': [ex('band-er', 2, '15 each', 'Light', 'Shoulder health for everyone who hits and serves'), ex('spanish-squat', 2, '30s', 'Steady', 'Knee health for jumpers'), ex('ankle-balance', 2, '6 each', 'Bodyweight', 'Ankle stability')],
  'Outside Hitter': [ex('band-er', 2, '15 each', 'Light', 'Hitting shoulder health'), ex('spanish-squat', 2, '30s', 'Steady', 'Knee health for jumpers')],
  Opposite: [ex('band-er', 2, '15 each', 'Light', 'Hitting shoulder health'), ex('spanish-squat', 2, '30s', 'Steady', 'Knee health for jumpers')],
  'Middle Blocker': [ex('spanish-squat', 2, '30s', 'Steady', 'Knee health for jumpers'), ex('calf-raise', 2, '12 each', 'RPE 6', 'Landing strength')],
  Setter: [ex('wrist-roller', 2, '15', 'Light', 'Hand and finger strength for setting'), ex('band-er', 2, '15 each', 'Light')],
  'Libero / DS': [ex('lateral-lunge', 2, '6 each', 'RPE 6', 'Low, wide defensive positions'), ex('ankle-balance', 2, '6 each', 'Bodyweight', 'Ankle stability for quick moves')],
};

export function generateProgram(input: GeneratorInput): Program {
  const days = pickLiftDays(input.volleyballWeek, input.liftDaysPerWeek);
  const templates = phaseTemplates(input.phase).slice(0, Math.max(days.length, 1));

  const sessions: Session[] = templates.map((t) => {
    let exercises = t.exercises.map((e) => ({ ...e }));
    if (input.experience === 'beginner') {
      exercises = exercises.map((e) => ({
        ...e,
        exerciseId: BEGINNER_SWAPS[e.exerciseId] ?? e.exerciseId,
        effort: BEGINNER_EFFORT[e.effort] ?? e.effort,
        notes: e.exerciseId === 'hang-clean' ? undefined : e.notes,
      }));
    }
    if (input.experience === 'advanced' && input.phase === 'off') {
      exercises = exercises.map((e, i) => (i === 1 ? { ...e, sets: e.sets + 1 } : e));
    }
    const ids = new Set(exercises.map((e) => e.exerciseId));
    for (const extra of POSITION_EXTRAS[input.position]) {
      if (!ids.has(extra.exerciseId)) {
        exercises.push({ ...extra });
        ids.add(extra.exerciseId);
        break; // one position extra per session keeps sessions short
      }
    }
    return { id: uid(), name: t.name, focus: t.focus, exercises };
  });

  // Put the heavy-leg sessions on days that are not right before a match.
  const liftSchedule: (string | null)[] = Array(7).fill(null);
  const remaining = sessions.map((s, i) => ({ s, heavy: templates[i].lowerHeavy }));
  for (const d of days) {
    const beforeMatch = isMatch(input.volleyballWeek[(d + 1) % 7]);
    let idx = beforeMatch ? remaining.findIndex((r) => !r.heavy) : 0;
    if (idx < 0) idx = 0;
    const [pick] = remaining.splice(idx, 1);
    if (pick) liftSchedule[d] = pick.s.id;
  }

  const phaseLabel = PHASES.find((p) => p.id === input.phase)?.label ?? '';
  return {
    id: uid(),
    name: input.name?.trim() || `${phaseLabel} – ${input.position}`,
    forName: input.forName,
    author: input.author,
    position: input.position,
    phase: input.phase,
    experience: input.experience,
    volleyballWeek: [...input.volleyballWeek],
    liftSchedule,
    sessions,
    createdAt: new Date().toISOString(),
  };
}

/** Short reasons shown under each day, so athletes understand the plan. */
export function dayAdvice(week: DayType[], i: number, liftsToday: boolean, heavyLower: boolean): string | null {
  const today = week[i];
  const tomorrow = week[(i + 1) % 7];
  const yesterday = week[(i + 6) % 7];
  if (isMatch(today)) return 'Match day. No lifting. Eat early, sip water all day.';
  if (isMatch(tomorrow) && liftsToday && heavyLower) return 'Match tomorrow. Keep the legs light today.';
  if (isMatch(tomorrow)) return 'Match tomorrow. Rest the legs. Carbs and water tonight.';
  if (isMatch(yesterday) && !liftsToday) return 'Day after a match. Recover, stretch, sleep.';
  if (today === 'practice' && liftsToday) return 'Lift after practice, not before.';
  return null;
}

/** One short line for the top of the Load screen, in the brand voice. */
export function captainLine(program: Program, i: number): string {
  const week = program.volleyballWeek;
  const session = program.sessions.find((s) => s.id === program.liftSchedule[i]);
  if (isMatch(week[i])) return week[i] === 'tournament' ? 'Tournament day. Fuel early, fuel often.' : 'Match day. Trust the work.';
  if (session) {
    const legs = session.exercises.some((e) => ['back-squat', 'front-squat', 'goblet-squat', 'trap-bar-deadlift', 'split-squat', 'rdl', 'db-rdl', 'step-up', 'hip-thrust'].includes(e.exerciseId));
    const sets = session.exercises[0] ? session.exercises.find((e) => e.sets >= 3)?.sets ?? session.exercises[0].sets : 3;
    return legs ? `Legs today. ${sets} sets, you've got this.` : `Upper body today. ${sets} sets, stay sharp.`;
  }
  for (let d = 1; d <= 2; d++) {
    if (isMatch(week[(i + d) % 7])) return d === 1 ? 'Match tomorrow. Carbs tonight.' : 'Match in 2 days. Carbs tonight.';
  }
  return 'Recovery day. Sleep is training too.';
}
