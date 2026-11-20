import { fromKey } from './calendar';
import type { GeneratorInput } from './generator';
import { homeTypeOf } from './homeV3';
import { planTimeline, rowFor, liftDaysOf } from './planner';
import type { Program, Session } from './types';
import { withWeek1 } from './weekV3';
import { FLAGS } from './flags';
import { ALL_EQUIPMENT } from './exercises';
import { compileDay } from './rackCompile';
import { defaultStations } from './stations';
import { PHASE_RANGE } from './fit';
import { prescribe, rowOf } from './generatorV3';
import { buildWarmup, warmupMinutes } from './warmup';
import { layoutSize } from './room';
import { cooldownMinutes, cooldownRows, cooldownType, cueFor, setWeekNote, WEEK_NOTE, weekNoteFor, withCue } from './coaching';

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
  // Part C (spec C1–C4): the style shapes every generated weight-room session; home and mobility days are always Standard.
  if (FLAGS.rackRotation && p.generatedFormat === 'rack_rotation') p = withRotations(p, input);
  if (p.generatedFormat === 'stations') p = withStations(p, input);
  // Part D (spec D1–D4): cues and week notes on every generated row; the §3d cooldown on every weight-room session.
  p = withCoaching(p);
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

/** A generated weight-room session (not home, mobility, light or a coach's session). */
export const isRoomSession = (s: Session) => !s.mobility && !s.light && s.location !== 'home' && s.source !== 'coach';

/** Part C: compile each weight-room day into rack rotations (§2b), sized for the rack group (§2d). */
function withRotations(p: Program, input: GeneratorInput): Program {
  const equipment = p.equipment?.length ? p.equipment : ALL_EQUIPMENT;
  const level = (p.experience === 'beginner' ? 1 : p.experience === 'intermediate' ? 2 : 3) as 1 | 2 | 3;
  const groupSize = (input.groupSize === 3 || input.groupSize === 5 ? input.groupSize : layoutSize(input.groupSize ?? null)) as 3 | 4 | 5;
  const sessions = p.sessions.map((s) => {
    if (!isRoomSession(s)) return s;
    const day = p.liftSchedule.findIndex((x) => x === s.id);
    const target = (day >= 0 ? input.minutesByWeekday?.[day] : null) ?? input.sessionMinutes ?? PHASE_RANGE[p.phase][1];
    const warm = warmupMinutes(buildWarmup(s, { phase: p.phase, position: p.position, equipment, rotation: Math.max(0, day) }), { phase: p.phase, home: false });
    const c = compileDay(s, {
      equipment,
      groupSize,
      targetMinutes: target,
      otherMinutes: warm + cooldownMinutes(cooldownRows(cooldownType(s, p.phase === 'in'))),
      rowFor: (id, role, reps) => withWeek1([{ ...rowOf({ id, role: role ?? 'care' }), ...(reps ? { reps } : {}) }], p.block ?? 'accumulation', p.phase, p.position, level)[0],
    });
    const rest = s.exercises.filter((r) => r.group === 'CD');
    return { ...s, format: 'rack_rotation' as const, rotation: c.rotation, exercises: [...c.exercises, ...rest], targetMinutes: target, ...(c.fitLog.length ? { fitLog: c.fitLog } : { fitLog: undefined }) };
  });
  return { ...p, sessions };
}

/** Part C (C4): Stations uses the existing stations format and auto-build, Part 1 together (circuits-and-stations Part 2). */
function withStations(p: Program, input: GeneratorInput): Program {
  const count = Math.max(2, Math.min(6, input.racks || 3));
  const sessions = p.sessions.map((s) => {
    if (!isRoomSession(s)) return s;
    const st = defaultStations(s, count, p.equipment);
    return { ...s, format: 'stations' as const, exercises: st.exercises, stations: st.stations };
  });
  return { ...p, sessions };
}

/**
 * Part D: one intent cue per generated row (§3c, by exercise else by role; stored in `ProgramExercise.notes`), the week-1 week
 * note on loaded main lifts (resolveSession writes each athlete's week), the build-up note on a rotation's rack lift, and the
 * §3d cooldown rows (`role: 'mobility'`, `group: 'CD'`) at the end of every generated weight-room session.
 */
function withCoaching(p: Program): Program {
  if (!p.block) return p;
  const level = (p.experience === 'beginner' ? 1 : p.experience === 'intermediate' ? 2 : 3) as 1 | 2 | 3;
  const sessions = p.sessions.map((s) => {
    if (s.source === 'coach') return s;
    const room = isRoomSession(s);
    const lead = new Set((s.rotation ?? []).filter((b) => b.buildUpRound && b.positions[0]?.kind === 'exercise').map((b) => `${b.group}|${b.positions[0].exerciseId}`));
    const exercises = s.exercises.map((r) => {
      if (r.group === 'CD') return r;
      const c = withCue(r);
      if (!room) return c;
      const extra = lead.has(`${r.group}|${r.exerciseId}`) ? [WEEK_NOTE.buildUp] : [];
      if (r.role !== 'main') return extra.length ? { ...c, notes: setWeekNote(c.notes, cueFor(r.exerciseId, r.role), null, extra) } : c;
      const rx = prescribe(r, r.exerciseId, p.block!, 1, { level, confirmed: false, minor: true, phase: p.phase, position: p.position, dayIndex: 0 });
      const note = weekNoteFor(rx, { week: 1, deload: false, downgraded: false, prevPct: null });
      return { ...c, notes: setWeekNote(c.notes, cueFor(r.exerciseId, r.role), note, extra) };
    });
    const cd = room && !s.exercises.some((r) => r.group === 'CD') ? cooldownRows(cooldownType(s, p.phase === 'in')) : [];
    return { ...s, exercises: [...exercises, ...cd] };
  });
  return { ...p, sessions };
}
