import type { Equipment, Exercise, ExerciseCategory, Pattern, SlotRole } from './types';
import { uid } from './util';

/**
 * 2.3.1 custom exercises (owner decision, Nov 16, 2026): a coach or trainer writes their own exercise inside a program.
 * Safety comes from the same tags library exercises carry:
 *  - type → demand tier (rest floors, pairing rules, effort clamps for minors, adult RPE 8 cap);
 *  - movement → pattern (athletes below the level get the easiest library exercise of the same movement, G8);
 *  - level 1–3 (never above the athlete's level).
 * Cardio isn't offered (duration-only cardio stays with the library); neither are Olympic lifts.
 */
export type CustomType = 'P' | 'A' | 'B' | 'C' | 'D';

export const CUSTOM_TYPES: { id: CustomType; label: string; line: string }[] = [
  { id: 'P', label: 'Power', line: 'Jumps and throws. Done fresh, full rest.' },
  { id: 'A', label: 'Heavy', line: 'Heavy compound lifts. At least 2:00 rest.' },
  { id: 'B', label: 'Compound', line: 'Multi-joint strength work.' },
  { id: 'C', label: 'Accessory', line: 'Single-joint and core work.' },
  { id: 'D', label: 'Care / mobility', line: 'Light prep, care and mobility drills.' },
];

const MOVEMENTS: { id: Pattern; label: string; types: CustomType[] }[] = [
  { id: 'jump', label: 'Jump', types: ['P'] },
  { id: 'throw', label: 'Throw', types: ['P'] },
  { id: 'squat', label: 'Squat', types: ['A', 'B', 'C'] },
  { id: 'hinge', label: 'Hinge', types: ['A', 'B', 'C'] },
  { id: 'single-leg', label: 'Single leg', types: ['A', 'B', 'C'] },
  { id: 'h-push', label: 'Push (horizontal)', types: ['A', 'B', 'C'] },
  { id: 'v-push', label: 'Push (overhead)', types: ['A', 'B', 'C'] },
  { id: 'h-pull', label: 'Pull (horizontal)', types: ['A', 'B', 'C'] },
  { id: 'v-pull', label: 'Pull (vertical)', types: ['A', 'B', 'C'] },
  { id: 'carry', label: 'Carry', types: ['B', 'C'] },
  { id: 'knee-ext', label: 'Knee extension', types: ['C'] },
  { id: 'knee-flex', label: 'Knee flexion', types: ['C'] },
  { id: 'shoulder-iso', label: 'Shoulder raise', types: ['C'] },
  { id: 'arm-flex', label: 'Arm curl', types: ['C'] },
  { id: 'arm-ext', label: 'Arm extension', types: ['C'] },
  { id: 'core-ext', label: 'Core (bracing)', types: ['C'] },
  { id: 'core-rot', label: 'Core (rotation)', types: ['C'] },
  { id: 'shoulder-care', label: 'Shoulder care', types: ['D'] },
  { id: 'knee-care', label: 'Knee care', types: ['D'] },
  { id: 'ankle-care', label: 'Ankle care', types: ['D'] },
  { id: 'hand-care', label: 'Hand and wrist care', types: ['D'] },
  { id: 'mobility', label: 'Mobility', types: ['D'] },
];

/** Movements offered for a type. Arm and shoulder-raise patterns exist only in the general library (trainer teams). */
export function movementsFor(type: CustomType, general: boolean) {
  const generalOnly = new Set<Pattern>(['knee-ext', 'knee-flex', 'shoulder-iso', 'arm-flex', 'arm-ext']);
  return MOVEMENTS.filter((m) => m.types.includes(type) && (general || !generalOnly.has(m.id)));
}

const LOWER = new Set<Pattern>(['squat', 'hinge', 'single-leg', 'knee-ext', 'knee-flex']);
const UPPER = new Set<Pattern>(['h-push', 'v-push', 'h-pull', 'v-pull', 'shoulder-iso', 'arm-flex', 'arm-ext']);

function categoryOf(type: CustomType, pattern: Pattern): ExerciseCategory {
  if (type === 'P') return 'power';
  if (type === 'D') return 'prehab';
  if (LOWER.has(pattern)) return 'lower';
  if (UPPER.has(pattern)) return 'upper';
  return 'core';
}

/** Slot role from the type (sets the goal/default prescription when it's added). */
export function roleOf(type: CustomType, pattern: Pattern): SlotRole {
  if (type === 'P') return 'power';
  if (type === 'A') return 'main';
  if (type === 'B') return 'secondary';
  if (type === 'D') return pattern === 'mobility' ? 'mobility' : 'care';
  return pattern.startsWith('core') ? 'core' : 'accessory';
}

export type CustomInput = {
  id?: string;
  name: string;
  cue: string;
  type: CustomType;
  pattern: Pattern;
  level: 1 | 2 | 3;
  equipment: Equipment[];
  weighted: boolean;
  steps: string[];
};

export const LIMITS = { name: 40, cue: 100, step: 160, steps: 8 } as const;

/** Why the form can't be saved yet, or null. */
export function customProblem(c: CustomInput, general: boolean): string | null {
  if (!c.name.trim()) return 'Give it a name.';
  if (c.name.trim().length > LIMITS.name) return `Names are up to ${LIMITS.name} characters.`;
  if (c.cue.trim().length > LIMITS.cue) return `The cue is up to ${LIMITS.cue} characters.`;
  if (!movementsFor(c.type, general).some((m) => m.id === c.pattern)) return 'Pick a movement for this type.';
  if (c.steps.filter((x) => x.trim()).length > LIMITS.steps) return `Up to ${LIMITS.steps} steps.`;
  if (c.steps.some((x) => x.trim().length > LIMITS.step)) return `Each step is up to ${LIMITS.step} characters.`;
  return null;
}

export function makeCustom(c: CustomInput): Exercise {
  return {
    id: c.id ?? `custom-${uid()}`,
    name: c.name.trim(),
    category: categoryOf(c.type, c.pattern),
    pattern: c.pattern,
    weighted: c.type === 'D' ? false : c.weighted,
    level: c.level,
    // One setup: everything ticked is needed. Nothing ticked = no equipment.
    equipment: [[...new Set(c.equipment)]],
    cue: c.cue.trim(),
    howTo: { why: '', steps: c.steps.map((x) => x.trim()).filter(Boolean), cues: [], mistakes: [] },
    tier: c.type,
    custom: true,
  };
}

export function inputOf(ex: Exercise): CustomInput {
  return {
    id: ex.id,
    name: ex.name,
    cue: ex.cue,
    type: ex.tier,
    pattern: ex.pattern,
    level: ex.level,
    equipment: ex.equipment[0] ?? [],
    weighted: ex.weighted,
    steps: ex.howTo.steps,
  };
}
