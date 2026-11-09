export type Role = 'athlete' | 'coach';

export type Position =
  | 'Outside Hitter'
  | 'Opposite'
  | 'Middle Blocker'
  | 'Setter'
  | 'Libero / DS';

/** Team workouts can cover every position. */
export type ProgramPosition = Position | 'All positions';

export const POSITIONS: Position[] = [
  'Outside Hitter',
  'Opposite',
  'Middle Blocker',
  'Setter',
  'Libero / DS',
];

export type Phase = 'off' | 'pre' | 'in' | 'post';

export const PHASES: { id: Phase; label: string; blurb: string }[] = [
  { id: 'off', label: 'Off-season', blurb: 'Build strength and muscle. Highest lifting volume.' },
  { id: 'pre', label: 'Preseason', blurb: 'Turn strength into power. Volume comes down.' },
  { id: 'in', label: 'In-season', blurb: 'Keep strength, stay fresh for games. Short sessions.' },
  { id: 'post', label: 'Post-season', blurb: 'Recover and fix weak spots. Light and varied.' },
];

export type Experience = 'beginner' | 'intermediate' | 'advanced';

export const EXPERIENCE: { id: Experience; label: string; blurb: string }[] = [
  { id: 'beginner', label: 'New to lifting', blurb: 'Less than 6 months of regular lifting' },
  { id: 'intermediate', label: 'Some experience', blurb: '6 months to 2 years' },
  { id: 'advanced', label: 'Experienced', blurb: '2+ years, comfortable with barbell lifts' },
];

/** What the athlete's volleyball schedule looks like on a given day. */
export type DayType = 'practice' | 'game' | 'tournament' | 'off';

export const DAY_TYPES: { id: DayType; label: string; short: string }[] = [
  { id: 'off', label: 'No volleyball', short: 'Off' },
  { id: 'practice', label: 'Practice', short: 'Prac' },
  { id: 'game', label: 'Match', short: 'Match' },
  { id: 'tournament', label: 'Tournament', short: 'Tourn' },
];

/** Monday first. */
export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export type ExerciseCategory = 'lower' | 'upper' | 'core' | 'power' | 'prehab';

export type Equipment =
  | 'barbell'
  | 'trap-bar'
  | 'dumbbells'
  | 'kettlebells'
  | 'bench'
  | 'cable'
  | 'pullup-bar'
  | 'box'
  | 'med-ball'
  | 'bands';

/** Movement families. The generator fills session slots by pattern. */
export type Pattern =
  | 'squat'
  | 'hinge'
  | 'single-leg'
  | 'h-push'
  | 'v-push'
  | 'h-pull'
  | 'v-pull'
  | 'jump'
  | 'olympic'
  | 'throw'
  | 'core-ext'
  | 'core-rot'
  | 'carry'
  | 'shoulder-care'
  | 'knee-care'
  | 'ankle-care'
  | 'hand-care'
  | 'mobility';

export type HowTo = {
  /** Why it matters for volleyball, one sentence. */
  why: string;
  steps: string[];
  cues: string[];
  mistakes: string[];
};

export type Exercise = {
  id: string;
  name: string;
  category: ExerciseCategory;
  pattern: Pattern;
  /** True when the movement is loaded (weight is logged). */
  weighted: boolean;
  /** 1 = beginner-friendly, 2 = some experience, 3 = experienced lifters. */
  level: 1 | 2 | 3;
  /** Ways to set it up: the exercise fits when ANY one list is fully available. [] = no equipment. */
  equipment: Equipment[][];
  /** One-line cue shown in lists. */
  cue: string;
  easier?: string;
  harder?: string;
  howTo: HowTo;
};

/** What an exercise does in a session. Sets the prescription and default rest. */
export type SlotRole = 'power' | 'main' | 'secondary' | 'accessory' | 'core' | 'care' | 'mobility';

export type ProgramExercise = {
  exerciseId: string;
  sets: number;
  reps: string;
  /** e.g. "RPE 7", "Light", "Bodyweight" */
  effort: string;
  notes?: string;
  role?: SlotRole;
  /** Rest between sets, seconds. 0 = no timer. */
  restSec?: number;
};

export type Session = {
  id: string;
  name: string;
  focus: string;
  exercises: ProgramExercise[];
};

export type Program = {
  id: string;
  name: string;
  /** Name of the athlete or group this program is for (coach programs). */
  forName?: string;
  author?: string;
  position: ProgramPosition;
  phase: Phase;
  experience: Experience;
  /** Volleyball schedule, Monday first. */
  volleyballWeek: DayType[];
  /** Session id for each weekday, Monday first. null = no lifting. */
  liftSchedule: (string | null)[];
  sessions: Session[];
  createdAt: string;
  /** Set when this is a team's posted workout. */
  teamId?: string;
  teamName?: string;
  /** When the coach last posted it. */
  postedAt?: string;
  /** Coach only: edited since the last post. */
  unposted?: boolean;
  /** Real dates (matches, tournaments, days off) that override the default week. */
  events?: CalendarEvent[];
  /** Per-date lift choice: session id, or null for rest. Wins over the automatic plan. */
  overrides?: Record<string, string | null>;
  /** What the gym has. Missing = full weight room (programs from 1.0). */
  equipment?: Equipment[];
  /** Start of the current training block (YYYY-MM-DD). Missing = createdAt. */
  blockStart?: string;
  /** Weeks per block; the last week is a deload. Default 4. */
  blockWeeks?: number;
  /** Dates the coach lightened (readiness). */
  lightDates?: string[];
};

/** A dated volleyball event. date is local 'YYYY-MM-DD'. */
export type CalendarEvent = { date: string; type: DayType; label?: string };

export type Profile = {
  name: string;
  role: Role;
  position: Position;
  experience: Experience;
  phase: Phase;
  bodyWeightLb: number | null;
  liftDaysPerWeek: number;
  volleyballWeek: DayType[];
  /** Weekdays (Monday = 0) the user chose to lift on. */
  liftDays?: number[];
  /** Default gym equipment for new programs. */
  equipment?: Equipment[];
};

export type LoggedSet = { weight: string; reps: string; done: boolean };

export type WorkoutLog = {
  id: string;
  date: string; // ISO
  programId: string;
  sessionId: string;
  sessionName: string;
  entries: { exerciseId: string; sets: LoggedSet[] }[];
  note?: string;
  /** Team this workout counts for (sent to the coach). */
  teamId?: string;
  /** True once the coach's server has it. */
  synced?: boolean;
};

export type BodyLog = { date: string; weightLb: number };

export type Athlete = {
  id: string;
  name: string;
  position: Position;
  programId: string | null;
};

export type AppData = {
  version: 1;
  profile: Profile | null;
  programs: Program[];
  activeProgramId: string | null;
  logs: WorkoutLog[];
  bodyLogs: BodyLog[];
  athletes: Athlete[];
  /** Appearance. Dark is the brand default. */
  theme?: 'dark' | 'light';
  /** Approach touch measurements, newest last. Inches. */
  touchLogs?: TouchLog[];
  /** Net height used for "Above the net", in inches. */
  netHeightIn?: number;
};

export type TouchLog = { date: string; inches: number };
