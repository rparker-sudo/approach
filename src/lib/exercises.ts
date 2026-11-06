import type { Exercise, ExerciseCategory } from './types';

/**
 * Weight-room library. No on-court volleyball drills on purpose:
 * this app covers lifting, power work and injury prevention that
 * supports the volleyball training athletes already get at practice.
 */
export const EXERCISES: Exercise[] = [
  // Lower body
  { id: 'back-squat', name: 'Back Squat', category: 'lower', weighted: true, cue: 'Brace, sit between the hips, drive the floor away.' },
  { id: 'front-squat', name: 'Front Squat', category: 'lower', weighted: true, cue: 'Elbows high, chest tall, knees track over toes.' },
  { id: 'goblet-squat', name: 'Goblet Squat', category: 'lower', weighted: true, cue: 'Hold the weight at the chest, sit down tall.' },
  { id: 'trap-bar-deadlift', name: 'Trap Bar Deadlift', category: 'lower', weighted: true, cue: 'Push the floor away, stand tall, no lower-back rounding.' },
  { id: 'rdl', name: 'Romanian Deadlift', category: 'lower', weighted: true, cue: 'Soft knees, hips back, feel the hamstrings.' },
  { id: 'db-rdl', name: 'Single-Leg DB RDL', category: 'lower', weighted: true, cue: 'Square hips, reach back with the free leg.' },
  { id: 'split-squat', name: 'Rear-Foot Elevated Split Squat', category: 'lower', weighted: true, cue: 'Front shin vertical-ish, drop the back knee straight down.' },
  { id: 'step-up', name: 'DB Step-Up', category: 'lower', weighted: true, cue: 'Drive through the top foot, no push from the bottom leg.' },
  { id: 'lateral-lunge', name: 'Lateral Lunge', category: 'lower', weighted: true, cue: 'Sit into one hip, keep the other leg straight.' },
  { id: 'hip-thrust', name: 'Hip Thrust', category: 'lower', weighted: true, cue: 'Chin tucked, ribs down, squeeze glutes at the top.' },
  { id: 'nordic', name: 'Nordic Hamstring Curl', category: 'lower', weighted: false, cue: 'Lower as slowly as you can, catch yourself, repeat.' },
  { id: 'calf-raise', name: 'Single-Leg Calf Raise', category: 'lower', weighted: true, cue: 'Full stretch at the bottom, pause at the top.' },

  // Upper body
  { id: 'db-bench', name: 'DB Bench Press', category: 'upper', weighted: true, cue: 'Shoulder blades pinned back, elbows about 45°.' },
  { id: 'bench', name: 'Bench Press', category: 'upper', weighted: true, cue: 'Feet planted, bar to lower chest, press up and back.' },
  { id: 'pushup', name: 'Push-Up', category: 'upper', weighted: false, cue: 'Body in one straight line, chest to the floor.' },
  { id: 'landmine-press', name: 'Half-Kneeling Landmine Press', category: 'upper', weighted: true, cue: 'Squeeze the down-knee glute, press up and forward.' },
  { id: 'db-row', name: 'One-Arm DB Row', category: 'upper', weighted: true, cue: 'Pull the elbow to the hip, no torso twist.' },
  { id: 'pullup', name: 'Pull-Up / Chin-Up', category: 'upper', weighted: false, cue: 'Full hang to chin over the bar. Use a band if needed.' },
  { id: 'lat-pulldown', name: 'Lat Pulldown', category: 'upper', weighted: true, cue: 'Pull to the upper chest, shoulders down.' },
  { id: 'inverted-row', name: 'Inverted Row', category: 'upper', weighted: false, cue: 'Body stiff like a plank, chest to the bar.' },

  // Power (weight-room power work, not volleyball drills)
  { id: 'box-jump', name: 'Box Jump', category: 'power', weighted: false, cue: 'Max-effort jump, land soft and quiet. Step down.' },
  { id: 'trap-bar-jump', name: 'Trap Bar Jump', category: 'power', weighted: true, cue: 'Light load (about 20% of deadlift). Jump fast.' },
  { id: 'mb-slam', name: 'Med Ball Slam', category: 'power', weighted: true, cue: 'Reach tall, slam with the whole body.' },
  { id: 'mb-rotational', name: 'Med Ball Rotational Throw', category: 'power', weighted: true, cue: 'Load the back hip, throw through the front side.' },
  { id: 'mb-overhead', name: 'Med Ball Overhead Throw', category: 'power', weighted: true, cue: 'Soccer-throw style, full-body extension.' },
  { id: 'hang-clean', name: 'Hang Power Clean', category: 'power', weighted: true, cue: 'Jump and shrug, fast elbows. Only with coaching.' },
  { id: 'pogo', name: 'Pogo Hops', category: 'power', weighted: false, cue: 'Stiff ankles, quick ground contacts.' },

  // Core
  { id: 'dead-bug', name: 'Dead Bug', category: 'core', weighted: false, cue: 'Low back pressed down, move slowly.' },
  { id: 'pallof', name: 'Pallof Press', category: 'core', weighted: true, cue: 'Resist the twist, press straight out.' },
  { id: 'side-plank', name: 'Side Plank', category: 'core', weighted: false, cue: 'Straight line from head to feet, hips high.' },
  { id: 'suitcase-carry', name: 'Suitcase Carry', category: 'core', weighted: true, cue: 'Heavy in one hand, walk tall without leaning.' },
  { id: 'ab-rollout', name: 'Ab Wheel Rollout', category: 'core', weighted: false, cue: 'Ribs down, only go as far as you can control.' },

  // Prehab / injury prevention
  { id: 'band-er', name: 'Band External Rotation', category: 'prehab', weighted: false, cue: 'Elbow pinned to side, rotate out slowly.' },
  { id: 'ytw', name: 'Prone Y-T-W Raises', category: 'prehab', weighted: true, cue: 'Light plates, squeeze the shoulder blades.' },
  { id: 'face-pull', name: 'Face Pull', category: 'prehab', weighted: true, cue: 'Pull to the eyes, thumbs point back.' },
  { id: 'copenhagen', name: 'Copenhagen Plank', category: 'prehab', weighted: false, cue: 'Top leg on the bench, lift the hips. Inner thighs.' },
  { id: 'tib-raise', name: 'Tibialis Raise', category: 'prehab', weighted: false, cue: 'Back to the wall, lift toes up high.' },
  { id: 'spanish-squat', name: 'Spanish Squat Hold', category: 'prehab', weighted: false, cue: 'Band behind the knees, sit back. Good for knees (jumper\'s knee).' },
  { id: 'wrist-roller', name: 'Wrist & Finger Strength', category: 'prehab', weighted: true, cue: 'Wrist curls, extensions and rice-bucket grips.' },
  { id: 'ankle-balance', name: 'Single-Leg Balance Reach', category: 'prehab', weighted: false, cue: 'Reach the free foot in 3 directions. Ankle stability.' },
];

const BY_ID = new Map(EXERCISES.map((e) => [e.id, e]));

export function getExercise(id: string): Exercise {
  return (
    BY_ID.get(id) ?? { id, name: id, category: 'core', weighted: true, cue: '' }
  );
}

export const CATEGORY_LABEL: Record<ExerciseCategory, string> = {
  power: 'Power',
  lower: 'Lower body',
  upper: 'Upper body',
  core: 'Core',
  prehab: 'Injury prevention',
};
