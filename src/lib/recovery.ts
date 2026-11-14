import type { Program, ProgramExercise, Session } from './types';

/**
 * Extra recovery sessions ER1–ER5 (Training Content, `programs/extra-recovery-sessions.md`; spec 2.2, P4.8).
 * Prehab and mobility only, no equipment, always easy. Logged as kind 'extra_recovery': counts toward Hours and Overall
 * (max 2 a week), never toward Sessions, Consistency or Streak, and never feeds weight suggestions.
 * Rest values come from Training's data (0 = move straight on), kept as coach-set so auto rest doesn't replace them.
 */
export type RecoverySession = Session & { kind: 'extra_recovery'; estMinutes: number };

export const EXTRA_RECOVERY_SESSIONS: RecoverySession[] = [
  {
    "id": "er1-full-body-reset",
    "name": "Full-Body Reset",
    "focus": "Whole-body mobility and breathing",
    "kind": "extra_recovery" as const,
    "estMinutes": 13,
    "exercises": [
      {
        "exerciseId": "crocodile-breathing",
        "sets": 1,
        "reps": "5 breaths",
        "effort": "Easy",
        "role": "mobility",
        "restSec": 0,
        "restSetByCoach": true
      },
      {
        "exerciseId": "cat-camel",
        "sets": 1,
        "reps": "8",
        "effort": "Easy",
        "role": "mobility",
        "restSec": 0,
        "restSetByCoach": true
      },
      {
        "exerciseId": "worlds-greatest",
        "sets": 2,
        "reps": "3 each",
        "effort": "Easy",
        "role": "mobility",
        "restSec": 0,
        "restSetByCoach": true
      },
      {
        "exerciseId": "hip-90-90",
        "sets": 2,
        "reps": "5 each",
        "effort": "Easy",
        "role": "mobility",
        "restSec": 0,
        "restSetByCoach": true
      },
      {
        "exerciseId": "thoracic-rotation",
        "sets": 2,
        "reps": "5 each",
        "effort": "Easy",
        "role": "mobility",
        "restSec": 0,
        "restSetByCoach": true
      },
      {
        "exerciseId": "ankle-rock",
        "sets": 2,
        "reps": "10 each",
        "effort": "Easy",
        "role": "mobility",
        "restSec": 0,
        "restSetByCoach": true
      },
      {
        "exerciseId": "lat-reach",
        "sets": 1,
        "reps": "20s each",
        "effort": "Easy",
        "role": "mobility",
        "restSec": 0,
        "restSetByCoach": true
      }
    ]
  },
  {
    "id": "er2-legs-after-matches",
    "name": "Legs After Matches",
    "focus": "Hips, hamstrings and ankles after a lot of jumping",
    "kind": "extra_recovery" as const,
    "estMinutes": 13,
    "exercises": [
      {
        "exerciseId": "crocodile-breathing",
        "sets": 1,
        "reps": "5 breaths",
        "effort": "Easy",
        "role": "mobility",
        "restSec": 0,
        "restSetByCoach": true
      },
      {
        "exerciseId": "hip-flexor-stretch",
        "sets": 2,
        "reps": "30s each",
        "effort": "Easy",
        "role": "mobility",
        "restSec": 0,
        "restSetByCoach": true
      },
      {
        "exerciseId": "band-hamstring",
        "sets": 2,
        "reps": "30s each",
        "effort": "Easy",
        "role": "mobility",
        "restSec": 0,
        "restSetByCoach": true
      },
      {
        "exerciseId": "hip-90-90",
        "sets": 2,
        "reps": "5 each",
        "effort": "Easy",
        "role": "mobility",
        "restSec": 0,
        "restSetByCoach": true
      },
      {
        "exerciseId": "ankle-rock",
        "sets": 2,
        "reps": "10 each",
        "effort": "Easy",
        "role": "mobility",
        "restSec": 0,
        "restSetByCoach": true
      },
      {
        "exerciseId": "tib-raise",
        "sets": 1,
        "reps": "15",
        "effort": "Easy",
        "role": "care",
        "restSec": 0,
        "restSetByCoach": true
      }
    ]
  },
  {
    "id": "er3-shoulders-upper-back",
    "name": "Shoulders & Upper Back",
    "focus": "Upper back and shoulder blades after hitting and pressing",
    "kind": "extra_recovery" as const,
    "estMinutes": 12,
    "exercises": [
      {
        "exerciseId": "cat-camel",
        "sets": 1,
        "reps": "8",
        "effort": "Easy",
        "role": "mobility",
        "restSec": 0,
        "restSetByCoach": true
      },
      {
        "exerciseId": "thoracic-rotation",
        "sets": 2,
        "reps": "5 each",
        "effort": "Easy",
        "role": "mobility",
        "restSec": 0,
        "restSetByCoach": true
      },
      {
        "exerciseId": "lat-reach",
        "sets": 2,
        "reps": "20s each",
        "effort": "Easy",
        "role": "mobility",
        "restSec": 0,
        "restSetByCoach": true
      },
      {
        "exerciseId": "scap-pushup",
        "sets": 2,
        "reps": "10",
        "effort": "Easy",
        "role": "care",
        "restSec": 30,
        "restSetByCoach": true
      },
      {
        "exerciseId": "ytw",
        "sets": 2,
        "reps": "6 each letter",
        "effort": "Easy",
        "role": "care",
        "restSec": 0,
        "notes": "No weight today. Have a band? Swap in Band Pull-Apart, 2 × 15.",
        "restSetByCoach": true
      },
      {
        "exerciseId": "crocodile-breathing",
        "sets": 1,
        "reps": "5 breaths",
        "effort": "Easy",
        "role": "mobility",
        "restSec": 0,
        "restSetByCoach": true
      }
    ]
  },
  {
    "id": "er4-ankles-knees",
    "name": "Ankles & Knees",
    "focus": "Ankle range, balance and easy knee work",
    "kind": "extra_recovery" as const,
    "estMinutes": 12,
    "exercises": [
      {
        "exerciseId": "ankle-rock",
        "sets": 2,
        "reps": "10 each",
        "effort": "Easy",
        "role": "mobility",
        "restSec": 0,
        "restSetByCoach": true
      },
      {
        "exerciseId": "ankle-balance",
        "sets": 2,
        "reps": "6 each",
        "effort": "Easy",
        "role": "care",
        "restSec": 0,
        "restSetByCoach": true
      },
      {
        "exerciseId": "tib-raise",
        "sets": 2,
        "reps": "15",
        "effort": "Easy",
        "role": "care",
        "restSec": 0,
        "restSetByCoach": true
      },
      {
        "exerciseId": "wall-sit",
        "sets": 2,
        "reps": "20s",
        "effort": "Easy",
        "role": "care",
        "restSec": 30,
        "notes": "Easy depth, not parallel.",
        "restSetByCoach": true
      },
      {
        "exerciseId": "hip-flexor-stretch",
        "sets": 1,
        "reps": "30s each",
        "effort": "Easy",
        "role": "mobility",
        "restSec": 0,
        "restSetByCoach": true
      },
      {
        "exerciseId": "band-hamstring",
        "sets": 1,
        "reps": "30s each",
        "effort": "Easy",
        "role": "mobility",
        "restSec": 0,
        "restSetByCoach": true
      }
    ]
  },
  {
    "id": "er5-quick-10",
    "name": "Quick 10",
    "focus": "Stay loose in a match week",
    "kind": "extra_recovery" as const,
    "estMinutes": 10,
    "exercises": [
      {
        "exerciseId": "crocodile-breathing",
        "sets": 1,
        "reps": "5 breaths",
        "effort": "Easy",
        "role": "mobility",
        "restSec": 0,
        "restSetByCoach": true
      },
      {
        "exerciseId": "worlds-greatest",
        "sets": 1,
        "reps": "3 each",
        "effort": "Easy",
        "role": "mobility",
        "restSec": 0,
        "restSetByCoach": true
      },
      {
        "exerciseId": "hip-flexor-stretch",
        "sets": 1,
        "reps": "30s each",
        "effort": "Easy",
        "role": "mobility",
        "restSec": 0,
        "restSetByCoach": true
      },
      {
        "exerciseId": "thoracic-rotation",
        "sets": 1,
        "reps": "5 each",
        "effort": "Easy",
        "role": "mobility",
        "restSec": 0,
        "restSetByCoach": true
      },
      {
        "exerciseId": "ankle-rock",
        "sets": 1,
        "reps": "10 each",
        "effort": "Easy",
        "role": "mobility",
        "restSec": 0,
        "restSetByCoach": true
      },
      {
        "exerciseId": "cat-camel",
        "sets": 1,
        "reps": "8",
        "effort": "Easy",
        "role": "mobility",
        "restSec": 0,
        "restSetByCoach": true
      }
    ]
  }
] as RecoverySession[];

export const RECOVERY_NOTE = 'Easy and pain-free. If anything hurts, stop.';

export type RecoveryContext = {
  /** Yesterday was a match or tournament. */
  dayAfterMatch: boolean;
  /** A match or tournament in the next 2 days. */
  matchWeek: boolean;
  /** Today is an upper-body lift day. */
  upperDay: boolean;
  position?: string;
};

/** Which session shows first (suggestion only; the athlete can pick any). */
export function suggestedRecovery(ctx: RecoveryContext): string {
  if (ctx.dayAfterMatch) return 'er2-legs-after-matches';
  if (ctx.upperDay || ctx.position === 'Setter' || ctx.position === 'Outside Hitter' || ctx.position === 'Opposite') return 'er3-shoulders-upper-back';
  if (ctx.position === 'Middle Blocker' || ctx.position === 'Libero / DS') return 'er4-ankles-knees';
  if (ctx.matchWeek) return 'er5-quick-10';
  return 'er1-full-body-reset';
}

/** ER1–ER5 in order, the suggested one first. */
export function recoveryList(ctx: RecoveryContext): RecoverySession[] {
  const first = suggestedRecovery(ctx);
  return [...EXTRA_RECOVERY_SESSIONS].sort((a, b) => Number(b.id === first) - Number(a.id === first));
}

/** A one-session program wrapper so the session goes through resolveSession like every other (G-1). */
export function recoveryProgram(session: RecoverySession, phase: Program['phase']): Program {
  return {
    id: `recovery-${session.id}`,
    name: session.name,
    position: 'All positions',
    phase,
    experience: 'beginner',
    volleyballWeek: ['off', 'off', 'off', 'off', 'off', 'off', 'off'],
    liftSchedule: [null, null, null, null, null, null, null],
    sessions: [session],
    createdAt: new Date().toISOString(),
    equipment: [],
  } as Program;
}

export const isRecoveryExercise = (pe: ProgramExercise) => pe.role === 'mobility' || pe.role === 'care';
