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

/** 2.3.0: 'cardio' (general teams only; duration-only). */
export type ExerciseCategory = 'lower' | 'upper' | 'core' | 'power' | 'prehab' | 'cardio';

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
  | 'bands'
  /* 2.3.0 general teams' gym equipment profile only (general-library.md §2). */
  | 'leg-press'
  | 'leg-curl-machine'
  | 'leg-extension-machine'
  | 'chest-press-machine'
  | 'shoulder-press-machine'
  | 'assisted-pullup-machine'
  | 'sled'
  | 'bike'
  | 'rower'
  | 'treadmill'
  | 'elliptical'
  | 'stair-climber'
  | 'jump-rope'
  /* 2.4.0 catalog v3 §2 (all teams) */
  | 'ssb'
  | 'ghd'
  | 'suspension'
  | 'sliders'
  | 'hurdles';

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
  | 'mobility'
  /* 2.3.0 (general-library.md §3) */
  | 'knee-ext'
  | 'knee-flex'
  | 'shoulder-iso'
  | 'arm-flex'
  | 'arm-ext'
  | 'cardio';

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
  /** Demand tier (rest-and-supersets §2, §7): P power, A heavy compound, B compound, C accessory, D care/mobility. */
  tier: 'P' | 'A' | 'B' | 'C' | 'D';
  /** 2.3.0 (taxonomy C1): 'general' = general teams only; 'volleyball' = volleyball teams only. Missing = 'all'. */
  scope?: 'all' | 'general' | 'volleyball';
  /** 2.3.0: sport-neutral "why" shown in general teams (general-library.md §5). */
  whyGeneral?: string;
  /** 2.3.0: cardio, logged by minutes only (adult rules §6). */
  durationOnly?: boolean;
  /** 2.3.1: written by the coach or trainer for one program (`custom-…` id). Never in the library, generator or pools. */
  custom?: boolean;
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
  /** v2.2: the coach set restSec in the builder (distinguishes it from a stored pre-v2.2 default). */
  restSetByCoach?: boolean;
  /** v2.2 pass 3: block letter. Same letter = superset (2) or circuit (3–4), in list order (A1, A2…). One = straight sets
   *  (used to place a single exercise in a station). Absent = straight sets. */
  group?: string;
  /** Tier D drill done during the previous exercise's rest (no extra rest). */
  filler?: boolean;
  /** Built by auto-pairing ("Auto" tag); any manual change clears it. */
  autoGroup?: boolean;
  /** 2.3.0 general teams: a cardio block, duration only (adult rules §6). sets/reps are unused. */
  cardio?: CardioRx;
  /** 2.4.0 warm-up items only: a coach's own item with no library exercise (name shown, no how-to link). */
  customName?: string;
};

/** Cardio prescription: minutes + Easy or Moderate (2.4.0: 5–180 in the builder, F41). Nothing else exists (no HR, pace, distance, calories). */
export type CardioRx = { minutes: number; intensity: 'easy' | 'moderate' };

/** 2.3.0 program goals (adult-goals.md §1). */
export type Goal = 'strength' | 'muscle' | 'general' | 'back_after_break';

/** 2.3.0 general warm-ups (general-library.md §6). 2.4.0: replaced by generated warm-ups; stored values read as "generate". */
export type WarmupId = 'W1' | 'W2' | 'W3';

/** 2.4.0 (warmups.md §7): a session's warm-up. Generated unless `edited`; `template` names the coach template it came from. */
export type SessionWarmup = {
  raise: ProgramExercise[];
  activate: ProgramExercise[];
  potentiate: ProgramExercise[];
  /** The coach changed it: it stops regenerating (F49). */
  edited?: boolean;
  /** Template name when it came from "Use a template" (F49 tag "Template: name"). */
  template?: string;
  /** Limited space for this session (in-place Raise drills). Missing = the team setting stamped at post. */
  limitedSpace?: boolean;
  /** Fit to time compacted it (program-design §4a step 4). */
  compact?: boolean;
  /** Stamped from the team default at post (F50); replaced when the team default changes. */
  teamDefault?: boolean;
};

/** 2.4.0 rack rotation (program-design §4b). A position is an exercise in the block (by id) or the spotter ("Spot"). */
export type RotationPosition = { kind: 'exercise' | 'spot'; exerciseId?: string; reps: string; usesRack: boolean };
export type RotationBlock = { group: string; positions: RotationPosition[]; rotationSec: number; rounds: number; buildUpRound: boolean };

/** 2.4.0 (D-045): who wrote the session. */
export type SessionSource = 'approach' | 'coach';

/** 2.3.0: one week of a multi-week program (B2). */
export type ProgramWeekPlan = {
  /** Effort on main/secondary for the week (≤ 8). Missing = the goal's wave default. */
  rpe?: number;
  /** Deload: about −40% sets, RPE 6, same rest. */
  deload?: boolean;
  /** Session id per weekday for this week. Missing = the program's liftSchedule. */
  schedule?: (string | null)[];
};

/** v2.2 pass 3 station rotation (circuits-and-stations.md Part 2). */
export type Station = { id: string; name: string; groups: string[]; minutes: number; autoMinutes?: boolean };

export type Session = {
  id: string;
  name: string;
  focus: string;
  exercises: ProgramExercise[];
  /** Mobility/recovery only (doesn't count toward the lift-day cap). */
  mobility?: boolean;
  /** v2.2 pass 3 (home-workouts.md): where the session happens. Missing = weight room. */
  location?: 'school' | 'home';
  /** Light home day (H2): bodyweight only, RPE ≤ 6, no jumps, no weight suggestions. Only given beyond the cap. */
  light?: boolean;
  /** Stations format (D-030 part 2). 2.4.0: 'rack_rotation' (program-design §4b). Missing = standard. */
  format?: 'standard' | 'stations' | 'rack_rotation';
  /** 2.4.0 rack rotation blocks (one per block letter). */
  rotation?: RotationBlock[];
  stations?: Station[];
  stationTransitionSec?: number;
  /** 2.4.0 (warmups.md §7): the warm-up. Missing (or a 2.3.0 W1–W3 id) = generated from the session; null = removed by the coach. */
  warmup?: SessionWarmup | WarmupId | null;
  /** 2.4.0 (§0.1): 'approach' = generated; 'coach' = built or edited by a coach. Missing = migrated (see `sourceOf`). */
  source?: SessionSource;
  /** 2.4.0 (§1.2): session override of "Adjust exercises to each athlete's level". Missing = the program setting. */
  levelAdjust?: boolean;
  /** 2.4.0 (§1.4): the target the session was last fitted or estimated against (minutes). */
  targetMinutes?: number;
  /** 2.4.0 (§1.4): Fit to time lines. Generated sessions: `undo:<step>` marks a trim the coach undid. */
  fitLog?: string[];
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
  /** 'all' = whole team, otherwise a position group id. */
  groupKey?: string;
  groupName?: string;
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
  /** v2.2 pass 3: weekdays (Monday = 0) the school weight room is available. Set = school + home week. */
  weightRoomDays?: number[];
  /** H7: level 1 jumps at home (off/pre-season only). */
  homeJumps?: boolean;
  /** "Save time with supersets" (§4d). Missing = default for the phase. */
  supersets?: boolean;
  /** Start of the current training block (YYYY-MM-DD). Missing = createdAt. */
  blockStart?: string;
  /** Weeks per block; the last week is a deload. Default 4. */
  blockWeeks?: number;
  /** Dates the coach lightened (readiness). */
  lightDates?: string[];
  /** 2.3.0: built for a general (trainer) team. Turns on the adult rules in resolveSession and the builder. */
  general?: boolean;
  /** 2.3.0 general: the program's goal (adult-goals.md). */
  goal?: Goal;
  /** 2.3.0 general: 1–16 weeks (B2). */
  weeks?: ProgramWeekPlan[];
  /** 2.3.0 general: first day of week 1 (YYYY-MM-DD, a Monday by default). */
  startDate?: string;
  /** 2.3.0 general: the template this program was started from (name only). */
  templateOf?: string;
  /** 2.3.1: the coach's own exercises for this program (posted inside the program JSON; no new table). */
  customExercises?: Exercise[];
  /** 2.4.0 (§1.2): "Adjust exercises to each athlete's level". Missing = on. */
  levelAdjust?: boolean;
  /** 2.4.0 (§1.2): athletes (user ids) who get exactly what the coach wrote in this program. */
  levelAdjustOffFor?: string[];
  /** 2.4.0 (§1.4): session length, minutes (20–120). Missing = the phase target. */
  sessionMinutes?: number;
  /** 2.4.0 (§1.4): per-weekday length, Monday first; null = program default. */
  minutesByWeekday?: (number | null)[];
  /** 2.3.0 trainer device only: a duplicate's intended client (`client:<uid>`), preselected at Post. Never posted. */
  draftTarget?: string;
};

/** A dated volleyball event. date is local 'YYYY-MM-DD'. */
/** Testing-day battery (P6): full = jumps + strength checks; jump = jumps only; mid = jumps + trap bar. */
export type TestBattery = 'full' | 'jump' | 'mid';
/** A dated calendar entry. A testing day keeps its underlying day type and adds `test`. */
/** v2.2: `break` (coach-set break, TM-3) runs from `date` to `endDate` (inclusive). `teamName` labels another team's events on the athlete's combined schedule (never stored). */
/** 2.4.0: `roomMinutes` = weight room time on that date (§1.4); only the team's own coach and members see it. */
export type CalendarEvent = { date: string; type: DayType | 'break'; label?: string; test?: TestBattery; endDate?: string; teamName?: string; roomMinutes?: number };

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
  /** Birth year only (never a full date); set by the age question. */
  birthYear?: number;
  /** Under 18 when they answered the age question. */
  isMinor?: boolean;
  /** This device has been signed in to an account (2.2.1 §9: an expired session goes straight to Log in). */
  hasAccount?: boolean;
};

/** 2.4.0: `warmup` = a ramp-up set (warmups.md §4): never a work set, never used for suggestions or bests. */
export type LoggedSet = { weight: string; reps: string; done: boolean; warmup?: boolean };

export type WorkoutLog = {
  id: string;
  date: string; // ISO
  programId: string;
  sessionId: string;
  sessionName: string;
  /** stationId: the station the exercise was done at (stations format; progression ignores order). */
  /** minutesDone: 2.3.0 cardio blocks log minutes only (adult rules A4). */
  /** warmupSets: 2.4.0 ramp-up sets (each `warmup: true`), kept apart from the work sets so they never count (warmups §4). */
  entries: { exerciseId: string; sets: LoggedSet[]; stationId?: string; minutesDone?: number; warmupSets?: LoggedSet[] }[];
  note?: string;
  /** Team this workout counts for (sent to the coach). */
  teamId?: string;
  /** True once the coach's server has it. */
  synced?: boolean;
  /** New bests in this workout (from the finish summary). */
  prCount?: number;
  /** Start to finish, capped at 120 minutes. */
  durationMin?: number;
  /** v2.2 pass 3: where it was done (home sessions record 'home'). */
  location?: 'school' | 'home';
  /** 2.4.0 (F47): warm-up parts the athlete checked Done. Never counts toward sets, sessions or points. */
  warmupDone?: ('raise' | 'activate' | 'potentiate')[];
  /** v2.2: 'extra_recovery' sessions (T4) never count as prescribed sessions or feed weight suggestions. */
  kind?: 'lift' | 'extra_recovery';
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
  /** Account ids already shown the one-time Coach Terms sheet on this device (2.2.1 §8). */
  coachTermsPrompted?: string[];
  /** Approach touch measurements, newest last. Inches. */
  touchLogs?: TouchLog[];
  /** Net height used for "Above the net", in inches. */
  netHeightIn?: number;
  /** Coach: local copy of each team's shared calendar (events + lightened days). */
  teamCalendars?: Record<string, LocalTeamCalendar>;
  /** Athlete: daily readiness check-ins. */
  readinessLog?: ReadinessEntry[];
  /** Athletes: last known permissions per team (so logging works offline). */
  teamConsent?: Record<string, import('./backend/types').Perms>;
  /** Athletes: latest estimated strength per tested lift (exercise id → lb, test day), from testing days. */
  strengthEstimates?: Record<string, { e1rm: number; day: string }>;
  /** Solo athletes: jump tests kept on this phone (P6.8). */
  jumpTests?: { day: string; testId: 'touch' | 'broad' | 'throw'; value: number }[];
  /** The athlete has seen "Your coach sees your check-ins" once. */
  checkinNoticeSeen?: boolean;
  /** v2.2 athletes: last known level per team (offline copy of team_members.level). */
  teamLevels?: Record<string, { level: number | null; confirmed: boolean; teamName: string }>;
  /** v2.2 athletes: the team whose lifting program they follow (null = personal program). */
  liftTeamId?: string | null;
  /** v2.2 athletes: one-time notice after leaving the program team (F15c). */
  leaveNotice?: string | null;
  /** v2.2 pass 3 athletes: home equipment, on this device only (G-3). Missing = bodyweight. */
  homeEquipment?: Equipment[];
  /** The athlete answered the home-equipment sheet (or skipped it). */
  homeEquipmentAsked?: boolean;
  /** Harder-version answers (home bodyweight progression): exercise id → harder id accepted, or null for "Not yet". */
  harderPicks?: Record<string, string | null>;
  /** The first-home-day line was shown. */
  homeHintSeen?: boolean;
  /** v2.2 athletes: last rack name seen per team, for the one-time "Moved to Rack 3" note. */
  lastRack?: Record<string, string>;
  /** v2.2 coaches: teams whose testing-day checklist was read on this device (F25a). */
  checklistRead?: string[];
  /** 2.3.0 trainers: program templates, on this device only (F39d; plan only, never a client's logs). */
  templates?: Program[];
  /** 2.3.0 trainers: general teams already shown "Your team is open" (F32b). */
  openSeen?: string[];
  /** 2.3.1: every custom exercise this device has seen, so history keeps its name after a program changes (device only). */
  customSeen?: Record<string, Exercise>;
};

export type LocalTeamCalendar = {
  events: CalendarEvent[];
  /** groupKey → dates lightened. */
  lightDates: Record<string, string[]>;
  unposted?: boolean;
};

export type ReadinessEntry = {
  day: string; // YYYY-MM-DD
  sleep: number;
  soreness: number;
  energy: number;
  pain: boolean;
  /** Teams this check-in has been sent to. */
  sentTo: string[];
};

export type TouchLog = { date: string; inches: number };
