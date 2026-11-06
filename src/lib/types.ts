export type Role = 'athlete' | 'coach';

export type Position =
  | 'Outside Hitter'
  | 'Opposite'
  | 'Middle Blocker'
  | 'Setter'
  | 'Libero / DS';

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

export type Exercise = {
  id: string;
  name: string;
  category: ExerciseCategory;
  /** True when the movement is loaded (weight is logged). */
  weighted: boolean;
  cue: string;
};

export type ProgramExercise = {
  exerciseId: string;
  sets: number;
  reps: string;
  /** e.g. "RPE 7", "Light", "Bodyweight" */
  effort: string;
  notes?: string;
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
  position: Position;
  phase: Phase;
  experience: Experience;
  /** Volleyball schedule, Monday first. */
  volleyballWeek: DayType[];
  /** Session id for each weekday, Monday first. null = no lifting. */
  liftSchedule: (string | null)[];
  sessions: Session[];
  createdAt: string;
};

export type Profile = {
  name: string;
  role: Role;
  position: Position;
  experience: Experience;
  phase: Phase;
  bodyWeightLb: number | null;
  liftDaysPerWeek: number;
  volleyballWeek: DayType[];
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
