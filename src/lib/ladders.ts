import { fits, getExercise } from './exercises';
import type { Equipment, Exercise } from './types';

/**
 * 2.4.0 movement ladders (program-design §8a; catalogV3). The plan is written at the top rung; each athlete gets the
 * highest rung at or below their level that fits the equipment (G8). Rungs: top → next → entry (L1) → home/bodyweight.
 * Within a rung, options are tried in order.
 */
export type Ladder = { slot: string; rungs: [string[], string[], string[], string[]]; olympic?: boolean };

export const LADDERS: Ladder[] = [
  { slot: 'Olympic: clean', olympic: true, rungs: [['hang-clean'], ['hang-high-pull', 'jump-shrug', 'kb-swing'], ['mb-scoop-toss'], ['squat-jump']] },
  { slot: 'Olympic: pull', olympic: true, rungs: [['clean-pull'], [], ['mb-scoop-toss'], ['broad-jump']] },
  { slot: 'Olympic: overhead', olympic: true, rungs: [['push-jerk'], ['push-press', 'db-push-press'], ['mb-step-overhead-throw'], ['squat-jump']] },
  { slot: 'Olympic: snatch', olympic: true, rungs: [['hang-power-snatch'], ['db-hang-snatch'], ['mb-backward-toss'], ['squat-jump']] },
  { slot: 'Reactive plyo', rungs: [['depth-jump'], ['depth-drop', 'hurdle-hop'], ['box-jump'], ['pogo']] },
  { slot: 'Lateral plyo', rungs: [['lateral-hurdle-hop'], ['lateral-bound'], ['skater-hop'], ['skater-hop']] },
  { slot: 'Single-leg plyo', rungs: [['single-leg-hop-stick'], ['single-leg-box-jump'], ['line-hops'], ['line-hops']] },
  { slot: 'Squat', rungs: [['front-squat', 'back-squat'], ['back-squat', 'ssb-squat', 'box-squat', 'pause-back-squat'], ['goblet-squat', 'heels-elevated-goblet'], ['bodyweight-squat']] },
  { slot: 'Hinge', rungs: [['trap-bar-deadlift', 'rdl'], [], ['db-rdl2', 'kb-deadlift'], ['glute-bridge']] },
  { slot: 'Unilateral squat', rungs: [['split-squat'], [], ['ffe-split-squat', 'reverse-lunge'], ['reverse-lunge']] },
  { slot: 'Lateral', rungs: [['lateral-squat'], [], ['lateral-lunge'], ['lateral-lunge']] },
  { slot: 'Unilateral hinge', rungs: [['db-rdl'], [], ['sl-hip-thrust', 'glute-bridge'], ['glute-bridge']] },
  { slot: 'Hamstring eccentric', rungs: [['nordic'], ['ghr'], ['slider-ham-curl'], ['slider-ham-curl']] },
  { slot: 'Horizontal press', rungs: [['bench'], [], ['db-bench', 'db-floor-press', 'pushup'], ['pushup', 'incline-pushup']] },
  { slot: 'Incline press', rungs: [['incline-bench'], [], ['db-incline-press'], ['pike-pushup', 'pushup']] },
  { slot: 'Vertical press', rungs: [['push-press', 'landmine-press'], [], ['db-shoulder-press'], ['pike-pushup', 'pushup']] },
  // Judgment call: Inverted Row (bar set in the rack) sits after the band pulldown, as in the §4b worked example's beginner pick.
  { slot: 'Vertical pull', rungs: [['weighted-pullup'], ['pullup', 'chin-up'], ['lat-pulldown', 'half-kneeling-pulldown', 'band-pulldown', 'inverted-row'], ['prone-pulldown']] },
  { slot: 'Horizontal pull', rungs: [['barbell-row'], [], ['db-row', 'chest-supported-row', 'ring-row', 'cable-row'], ['doorframe-row']] },
  { slot: 'Anti-extension', rungs: [['ab-rollout', 'body-saw'], [], ['dead-bug', 'plank'], ['dead-bug']] },
  { slot: 'Rotation / anti-rotation', rungs: [['landmine-rotation'], [], ['pallof', 'side-plank'], ['side-plank']] },
  { slot: 'Carry', rungs: [['overhead-carry'], [], ['suitcase-carry', 'farmer-carry'], ['backpack-carry']] },
  { slot: 'Adductor', rungs: [['copenhagen'], [], ['short-lever-copenhagen'], ['short-lever-copenhagen']] },
  { slot: 'Knee / tendon', rungs: [['reverse-nordic', 'spanish-squat'], [], ['peterson-step-up', 'iso-split-squat', 'wall-sit'], ['wall-sit']] },
];

/** The ladder an exercise belongs to, and its rung (the highest rung it appears on). */
export function ladderOf(id: string): { ladder: Ladder; rung: number } | null {
  let best: { ladder: Ladder; rung: number } | null = null;
  for (const ladder of LADDERS) {
    const rung = ladder.rungs.slice(0, 3).findIndex((r) => r.includes(id));
    if (rung >= 0 && (!best || rung < best.rung)) best = { ladder, rung };
  }
  return best;
}

/**
 * The athlete's rung for an exercise: itself when at or below their level; else the next rung down that fits; the
 * home/bodyweight rung last (or for home sessions). Olympic slots give a beginner the med-ball throw when a med ball fits,
 * else the level 1 jump (2.4.1 B2). Null = not in a ladder (caller falls back).
 */
export function ladderResolve(ex: Exercise, level: 1 | 2 | 3, equipment: Equipment[], pool: Exercise[], opts: { home?: boolean } = {}): Exercise | null | undefined {
  const found = ladderOf(ex.id);
  if (!found) return undefined;
  const ok = (id: string) => {
    const e = pool.find((x) => x.id === id) ?? (getExercise(id).howTo.steps.length ? getExercise(id) : undefined);
    return e && e.level <= level && fits(e, equipment) ? e : null;
  };
  const { ladder, rung } = found;
  const rungs = opts.home ? [ladder.rungs[3]] : ladder.rungs.slice(rung, 3).map((r, k) => (k === 0 ? r.slice(r.indexOf(ex.id)) : r));
  for (const r of rungs) {
    // 2.4.1 B2 (build answer 3; safety §2a step 5 of 11/19): a beginner's Olympic slot resolves to the entry rung, a med-ball
    // throw, when a med ball fits; otherwise down to the level 1 jump (home/bodyweight rung).
    for (const id of r) {
      const e = ok(id);
      if (e) return e;
    }
  }
  for (const id of ladder.rungs[3]) {
    const e = ok(id);
    if (e) return e;
  }
  return null;
}
