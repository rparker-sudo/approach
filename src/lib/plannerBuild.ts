import { fromKey } from './calendar';
import type { GeneratorInput } from './generator';
import { homeTypeOf } from './homeV3';
import { planTimeline, rowFor, liftDaysOf } from './planner';
import type { Program } from './types';
import { withWeek1 } from './weekV3';

/**
 * 2.4.2 program planner v3 pass over a freshly generated v3 program (spec Parts A–D; FLAGS.plannerV3). Approach-generated
 * programs only. Stores only the three approved program keys (`endDate`, `endType`, `generatedFormat`) plus existing keys.
 *  - Part A: the start (`blockStart`), end date and end type; the program's block and week-1 rows from the plan's first week.
 */
export function applyPlanner(program: Program, input: GeneratorInput): Program {
  let p = program;
  if (input.start && input.endDate) p = withPlan(p, input);
  // Part B (spec B3): the style is stored per program (team programs; personal programs are always Standard, no key).
  if (input.generatedFormat && p.weightRoomDays) p = { ...p, generatedFormat: input.generatedFormat };
  return p;
}

/** Part A: the plan's first block decides the stored block and the coach's week-1 numbers (resolveSession does the rest). */
function withPlan(p: Program, input: GeneratorInput): Program {
  const out: Program = { ...p, blockStart: input.start, endDate: input.endDate, endType: input.endType ?? 'none' };
  if (!p.block) return out;
  const plan = planTimeline({ start: input.start!, end: input.endDate!, endType: out.endType!, phase: p.phase, events: input.planEvents ?? [], liftDays: liftDaysOf(p) });
  const first = rowFor(plan, fromKey(input.start!));
  if (!first?.block || first.block === p.block) return out;
  const level = (p.experience === 'beginner' ? 1 : p.experience === 'intermediate' ? 2 : 3) as 1 | 2 | 3;
  const phase = first.phase;
  return {
    ...out,
    block: first.block,
    sessions: p.sessions.map((s) => (s.mobility || s.light || homeTypeOf(s) || s.location === 'home' ? s : { ...s, exercises: withWeek1(s.exercises, first.block!, phase, p.position, level) })),
  };
}
