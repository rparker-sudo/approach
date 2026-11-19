import type { StationRun } from '../stations';
import type { CalendarEvent, Position, Program, Role, TestBattery, WorkoutLog } from '../types';

/**
 * Team sync backend. Two implementations:
 *  - supabase.ts: live sync through a Supabase project (real accounts, many devices)
 *  - local.ts:    demo mode, everything stored on this device (used when Supabase isn't configured)
 */

export type Account = {
  id: string;
  email: string;
  name: string;
  role: Role;
  position?: Position | null;
  /** Birth year only (never a full date). Null for accounts made before 2.1 until they answer once. */
  birthYear?: number | null;
  /** Under 18 when they signed up. */
  isMinor?: boolean | null;
  /** How they appear on team boards (P2). */
  boardNameMode?: BoardNameMode;
  /** Coach accounts: accepted the current Coach Terms (2.2.1 §8). Until then, recording consent and starting a strength
   *  check are blocked. */
  coachTermsAccepted?: boolean;
};

export type BoardNameMode = 'short' | 'initials' | 'hidden';

/**
 * The six permissions from parent consent form v2 (adults choose 2–6 themselves).
 * 1 participation · 2 check-ins · 3 share check-ins · 4 boards · 5 attendance · 6 testing.
 */
export type Perms = {
  participation: boolean;
  checkins: boolean;
  shareCheckins: boolean;
  boards: boolean;
  attendance: boolean;
  testing: boolean;
};
export const PERM_KEYS: (keyof Perms)[] = ['participation', 'checkins', 'shareCheckins', 'boards', 'attendance', 'testing'];
export const NO_PERMS: Perms = { participation: false, checkins: false, shareCheckins: false, boards: false, attendance: false, testing: false };
/** Box 3 needs box 2; boxes 2–6 need box 1 (same rule as the database). */
export function normalizePerms(p: Perms): Perms {
  if (!p.participation) return { ...NO_PERMS };
  return { ...p, shareCheckins: p.checkins && p.shareCheckins };
}
/** Pass 1 status → permissions (used when the database hasn't had migration 004 yet). */
export function permsFromStatus(status: string | null | undefined, isMinor: boolean | null | undefined): Perms {
  const s = status ?? (isMinor === false ? 'not_required' : 'pending');
  const base = s === 'training_only' || s === 'full' || s === 'not_required';
  const ci = s === 'full' || s === 'not_required';
  return { ...NO_PERMS, participation: base, checkins: ci, shareCheckins: ci };
}

export const canLog = (p: Perms | undefined) => !!p?.participation;
/** Check-ins can be logged (box 2). */
export const canCheckIn = (p: Perms | undefined) => !!p?.participation && !!p.checkins;
/** Check-ins go to the coach (boxes 2 and 3). */
export const canShareCheckIns = (p: Perms | undefined) => canCheckIn(p) && !!p?.shareCheckins;
export const canBoard = (p: Perms | undefined) => !!p?.participation && !!p.boards;
export const canAttend = (p: Perms | undefined) => !!p?.participation && !!p.attendance;
export const canTest = (p: Perms | undefined) => !!p?.participation && !!p.testing;

/** Coach-set team options (P3–P6). */
export type TeamSettings = {
  practiceMin: number;
  matchMin: number;
  tournamentMin: number;
  effortBoard: boolean;
  boardEffortPanel: boolean;
  /** Season target of team sessions; null = suggested default. */
  teamGoal: number | null;
  medBallLb: number;
  /** v2.2 board accent color (#RRGGBB); null = the default (Silver). The coach's original choice (adjusted at render time). */
  accentColor: string | null;
  /** 2.4.0 F50 (migration 011): team default warm-up. */
  defaultWarmup: 'approach' | 'template' | 'none';
  defaultWarmupTemplateId: string | null;
  /** 2.4.0 F50: "Limited space": in-place Raise drills. */
  limitedSpace: boolean;
};
export const DEFAULT_TEAM_SETTINGS: TeamSettings = {
  practiceMin: 120,
  matchMin: 120,
  tournamentMin: 240,
  effortBoard: true,
  boardEffortPanel: true,
  teamGoal: null,
  medBallLb: 6,
  accentColor: null,
  defaultWarmup: 'approach',
  defaultWarmupTemplateId: null,
  limitedSpace: false,
};

/** 2.4.0 F49 (migration 011 `warmup_templates`): a coach's saved warm-up. Coach-private; no athlete data. */
export type WarmupTemplate = {
  id: string;
  teamId: string;
  name: string;
  items: Pick<import('../types').SessionWarmup, 'raise' | 'activate' | 'potentiate'>;
  createdAt: string;
};

export type Team = {
  id: string;
  name: string;
  joinCode: string;
  coachId: string;
  coachName?: string;
  createdAt: string;
  /** Athletes only: the group they're in on this team (null = whole team). */
  myGroupId?: string | null;
  /** Athletes only: their permissions on this team. */
  myPerms?: Perms;
  /** Athletes only: consent form version on file (adults: 2 once they've saved "Your choices"; null = not yet). */
  myConsentVersion?: number | null;
  /** Athletes only (v2.2): their level on this team (1–3) and whether this team's coach confirmed it. */
  myLevel?: number | null;
  myLevelConfirmed?: boolean;
  /** Athletes only (v2.2): this is the team whose lift program they follow. */
  isLiftProgram?: boolean;
  settings: TeamSettings;
  /** 2.3.0: 'volleyball' (every team before 2.3.0) or 'general' (a trainer's adult clients). Can't change once a team has members. */
  kind: TeamKind;
  /** 2.3.0 general teams: the gym equipment profile (F40, migration 010 `teams.gym_equipment`). Null/missing = not set yet. */
  gymEquipment?: import('../types').Equipment[] | null;
};

export type TeamKind = 'volleyball' | 'general';

/** 2.3.0 (compliance T2/T3): the trainer's own view of her general team. Only the team's trainer can read it. */
export type TrainerStatus = {
  /** Set only by Approach Strength (service role) after the TM-19 email. Null = not open (or paused). */
  verifiedAt: string | null;
  termsVersion: string | null;
  currentTerms: string;
};

/** The three separate confirmations at general-team creation (F31, compliance T2), each with the time it was ticked. */
export type TrainerConfirmations = { terms: string; adults_responsible: string; no_cobranding: string };

/** Group key for a program posted to one client (2.3.0 A4): `client:<user id>`. */
export const clientKey = (userId: string) => `client:${userId}`;
export const clientOf = (groupKey: string) => (groupKey.startsWith('client:') ? groupKey.slice(7) : null);

/** A position group inside a team. 'all' (Whole team) is implicit and not stored. */
export type Group = {
  id: string;
  teamId: string;
  name: string;
  /** Positions this group is for, comma-separated (used by auto-assign). */
  positionHint?: string | null;
};

/** Shared team calendar: dated events and coach-lightened days. */
export type TeamCalendar = {
  teamId: string;
  events: CalendarEvent[];
  /** groupKey ('all' or a group id) → dates (YYYY-MM-DD) the coach lightened. */
  lightDates: Record<string, string[]>;
  updatedAt: string;
};

export type Readiness = {
  teamId: string;
  userId: string;
  userName?: string;
  day: string; // YYYY-MM-DD
  sleep: number; // 1–5, 5 = great
  soreness: number; // 1–5, 5 = very sore
  energy: number; // 1–5, 5 = great
  pain: boolean;
};

export type Member = {
  userId: string;
  name: string;
  position?: Position | null;
  joinedAt: string;
  groupId?: string | null;
  isMinor?: boolean | null;
  perms: Perms;
  /** Form version recorded (1 = pass 1 form, 2 = six boxes); null = none. */
  consentVersion: number | null;
  /** v2.2: level on this team (1–3; null = unknown), confirmed by this team's coach or self-reported. */
  level?: number | null;
  levelConfirmed?: boolean;
  levelSetAt?: string | null;
};

/** Coach view of an athlete's levels (v2.2). resolveLevel can be lower than teamLevel because of another team; never named. */
export type MemberLevel = {
  userId: string;
  teamLevel: number | null;
  confirmed: boolean;
  setAt: string | null;
  /** 2.2.1 J1: exercises this athlete gets instead (key from the coach app's table → exercise id, null = left out),
   *  only where they differ from this team's level. No level, team or reason. */
  adjusted: Record<string, string | null>;
};
/** The coach app's resolution table for member_levels: key → [exercise at level 1, 2, 3] (null = left out). */
export type LevelTable = Record<string, [string | null, string | null, string | null]>;

export type TeamProgram = {
  teamId: string;
  /** 'all' = Whole team, a group id, or `client:<user id>` for one client (general teams, 2.3.0). */
  groupKey: string;
  program: Program;
  updatedAt: string;
};

/** A workout an athlete logged, as the coach sees it. */
export type TeamLog = {
  id: string;
  teamId: string;
  userId: string;
  userName: string;
  sessionName: string;
  date: string;
  setsDone: number;
  note?: string;
  prCount?: number;
  durationMin?: number | null;
  /** v2.2: extra recovery sessions don't count as prescribed sessions. */
  kind?: LogKind;
};

export type LogKind = 'lift' | 'extra_recovery';
export type { StationRun };

/** A teammate on the boards (only members with boards permission who aren't hidden). */
export type BoardMember = { userId: string; boardName: string; groupId: string | null };

export type LiveStatus = 'not_started' | 'in_progress' | 'done';
/** Live progress for the coach board (sets only; never weights). */
export type LiveProgress = {
  teamId: string;
  userId: string;
  day: string;
  sessionId: string | null;
  setsDone: number;
  setsTotal: number;
  status: LiveStatus;
  updatedAt: string;
  /** v2.2 live board (P3.3). The resolved exercise name; never loads or RPE. */
  state?: LiveState;
  exerciseName?: string | null;
  setIndex?: number | null;
  setCount?: number | null;
  lastReps?: number | null;
  restEndsAt?: string | null;
  prToday?: number;
  finishedAt?: string | null;
  /** Pass 3: "A1 DB Bench · A2 One-Arm Row · Round 2 of 3"; station and shared rotation time. */
  groupLabel?: string | null;
  stationId?: string | null;
  rotateAt?: string | null;
  /** 2.4.0 rack rotation (migration 012): current position (0-based). Never a load or level. */
  positionIndex?: number | null;
};
export type LiveState = 'idle' | 'warming_up' | 'lifting' | 'resting' | 'done';

/** Testing-day board mode (P3.6, P6.10): jump changes only (null delta = first result), strength check done or not. */
export type BoardTest = {
  userId: string;
  jumpsDone: number;
  strengthDone: boolean;
  changes: { test: 'touch' | 'broad' | 'throw'; delta: number | null; unit: string }[];
};

/** Rack groups (D-026). */
export type Rack = { id: string; name: string; sortOrder: number; userIds: string[] };
/** The athlete's own rack. partnerNames is null until the names flag is on (count only). */
/** myIndex (2.4.0 rack rotation): the athlete's order in the rack group (by user id), for the start position. */
export type MyRack = { groupId: string; rackName: string; partners: number; partnerNames: string[] | null; others: number | null; myIndex?: number };

/** Effort-board inputs for one member (no weights, results, check-ins or nutrition). */
export type EffortInput = {
  userId: string;
  boardName: string;
  groupId: string | null;
  isMe: boolean;
  /** v2.2 (D-027): follows this team's lift program. Otherwise left off Overall, Sessions, Extra recovery, Consistency, Streak.
   *  2.2.1 J3: the server doesn't send this. Teammates only receive ranked athletes; the app works it out for the coach
   *  (members_following_other) and for the viewer's own row (their lift program). */
  ranked: boolean;
  logs: { at: string; session: string; minutes: number | null; kind?: LogKind }[];
  /** Null when the member hasn't allowed attendance. */
  attendance: { day: string; kind: AttendanceKind; minutes: number }[] | null;
  /** Inches gained in touch + broad jump since the athlete's first test in the range (FA-4: never %); null without
   *  testing permission or 2 tests. */
  jumpGain: number | null;
};

export type AttendanceKind = 'practice' | 'match' | 'tournament';
export type Attendance = { teamId: string; userId: string; day: string; kind: AttendanceKind; minutes: number; markedBy: string | null };

export type TestSession = { teamId: string; groupKey: string; day: string; coachId: string; confirmedAt: string; battery: TestBattery };

export type JumpTestId = 'touch' | 'broad' | 'throw';
export type LoadTestId = 'trap-bar-deadlift' | 'back-squat' | 'bench' | 'goblet-squat' | 'db-bench';
export type TestId = JumpTestId | LoadTestId;
export type TestResult = {
  id: string;
  teamId: string;
  userId: string;
  day: string;
  testId: TestId;
  value: number;
  unit: 'in' | 'ft' | 'lb';
  reps: number | null;
  /** Estimated strength (weight × (1 + reps/30)); load tests only. */
  e1rm: number | null;
  voided: boolean;
};

export type SignUpInput = {
  email: string;
  password: string;
  name: string;
  role: Role;
  position?: Position | null;
  birthYear: number;
  isMinor: boolean;
  /** Coach sign-up only: the Coach Terms version the coach ticked (2.2.1 §8). */
  coachTermsVersion?: string;
};

export interface Backend {
  mode: 'supabase' | 'local';
  /** Supabase only: the database is missing the 2.0 tables (migration not run yet). */
  needsUpdate?: () => boolean;

  getAccount(): Promise<Account | null>;
  signUp(input: SignUpInput): Promise<Account>;
  signIn(email: string, password: string): Promise<Account>;
  /** Log in: "Forgot password?" sends a reset link to app.approachstrength.com/reset-password (2.2.1 §1, §9). */
  requestPasswordReset(email: string): Promise<void>;
  /** Web: signs in from an email link (password reset or sign-up confirmation) in the address bar. Null when none. */
  consumeAuthLink(): Promise<{ type: string } | null>;
  /** After a reset link: set a new password for the signed-in account. */
  updatePassword(password: string): Promise<void>;
  /** Accept the current Coach Terms (coach accounts; own account only). */
  acceptCoachTerms(): Promise<Account>;
  signOut(): Promise<void>;
  updateAccount(patch: Partial<Pick<Account, 'name' | 'position'>>): Promise<Account>;
  /** Accounts from before 2.1 answer the age question once. Throws BackendError('Not eligible.') under 13. */
  setBirthYear(year: number, isMinor: boolean): Promise<Account>;
  /** Deletes the signed-in account and everything it owns (teams, memberships, logs, check-ins). */
  deleteMyAccount(): Promise<void>;
  /** P2: how the signed-in athlete appears on boards. */
  setBoardNameMode(mode: BoardNameMode): Promise<Account>;
  /** P1.4: adults choose boxes 2–6 for themselves (applies to every team they're on). */
  setMyChoices(p: Omit<Perms, 'participation'>): Promise<void>;

  /** Coaches: teams they own. Athletes: teams they've joined. */
  listMyTeams(): Promise<Team[]>;
  createTeam(name: string): Promise<Team>;
  /** 2.3.0 F31: a general team, with the three Trainer confirmations (compliance T2). */
  createGeneralTeam(name: string, confirmations: TrainerConfirmations): Promise<Team>;
  /** 2.3.0: the trainer's view of her team's gate and Terms version (null for volleyball teams or non-owners). */
  trainerStatus(teamId: string): Promise<TrainerStatus | null>;
  /** 2.3.0 F31: accept changed Trainer Terms. */
  acceptTrainerTerms(teamId: string): Promise<void>;
  /** 2.3.0 F40 (migration 010): the trainer saves the gym equipment profile. */
  setGymEquipment(teamId: string, equipment: import('../types').Equipment[]): Promise<void>;
  /** 2.4.0 F49/F50: the team coach's warm-up templates (coach only). */
  listWarmupTemplates(teamId: string): Promise<WarmupTemplate[]>;
  saveWarmupTemplate(teamId: string, name: string, items: WarmupTemplate['items']): Promise<WarmupTemplate>;
  deleteWarmupTemplate(id: string): Promise<void>;
  /** 2.3.0 F43 / compliance T5: the client deletes all their check-ins (server and this device). Returns rows deleted. */
  deleteMyCheckins(): Promise<number>;
  /** 2.3.0 F38: one client's recent logs with entries (sets, reps, weights, notes, cardio minutes). Trainer only (RLS). */
  clientLogs(teamId: string, userId: string, sinceIso: string): Promise<(TeamLog & { entries: import('../types').WorkoutLog['entries'] })[]>;
  /** 2.3.0 F38: one client's check-ins since a day. RLS returns rows only while the client shares (T5). */
  clientCheckins(teamId: string, userId: string, sinceDay: string): Promise<Readiness[]>;
  renameTeam(teamId: string, name: string): Promise<void>;
  deleteTeam(teamId: string): Promise<void>;
  listMembers(teamId: string): Promise<Member[]>;
  removeMember(teamId: string, userId: string): Promise<void>;
  /** v2.2 level (compliance § Level): the athlete fills in their self-reported level once; the coach sets or confirms it. */
  setMySelfLevel(teamId: string, level: number): Promise<void>;
  setMemberLevel(teamId: string, userId: string, level: number): Promise<void>;
  memberLevels(teamId: string, table?: LevelTable): Promise<MemberLevel[]>;
  /** v2.2 multiple teams: follow one team's lift program (null = personal program). */
  setLiftProgram(teamId: string | null): Promise<void>;
  /** Coach: members who follow another team's lift program (no team named). */
  membersFollowingOther(teamId: string): Promise<string[]>;
  /** Coach: members returning from a break this week (G9). */
  membersReturning(teamId: string): Promise<string[]>;
  /** Coach: who can do strength checks that day (yes/no, no reason). */
  testingEligibility(teamId: string, day: string): Promise<Record<string, boolean>>;
  /** Coach records a minor's form-v2 boxes (participation false clears them all). */
  recordConsent(teamId: string, userId: string, perms: Perms): Promise<void>;
  updateTeamSettings(teamId: string, patch: Partial<TeamSettings>): Promise<void>;

  /** Boards (P3/P4): members on boards, live progress, today's bests, effort inputs. */
  boardMembers(teamId: string): Promise<BoardMember[]>;
  shareLiveProgress(p: Omit<LiveProgress, 'userId' | 'updatedAt'>): Promise<void>;
  listLiveProgress(teamId: string, day: string): Promise<LiveProgress[]>;
  /** Members (on boards) with a personal best logged since the given time: userId → count. */
  bestsSince(teamId: string, sinceIso: string): Promise<Record<string, number>>;
  teamEffort(teamId: string, since: string): Promise<EffortInput[]>;
  /** v2.2 testing-day board chips (coach board only). */
  boardTests(teamId: string, day: string): Promise<BoardTest[]>;
  /** v2.2 rack groups (D-026): coach reads/saves all racks; athletes read their own. */
  listRacks(teamId: string): Promise<Rack[]>;
  saveRacks(teamId: string, racks: { name: string; userIds: string[] }[]): Promise<void>;
  myRack(teamId: string): Promise<MyRack | null>;
  /** v2.2 pass 3 station rotation: the shared timer for a team session (coach writes, members read). */
  getStationRun(teamId: string, day: string): Promise<StationRun | null>;
  saveStationRun(run: StationRun): Promise<void>;
  /** Live updates for the coach board. onStatus reports connection drops. */
  subscribeBoard(teamId: string, onChange: () => void, onStatus?: (connected: boolean) => void): () => void;

  /** Attendance (P5). minutes null removes the athlete's own mark (coach: marks "not there"). */
  markAttendance(a: { teamId: string; userId: string; day: string; kind: AttendanceKind; minutes: number | null }): Promise<void>;
  listAttendance(teamId: string, since: string): Promise<Attendance[]>;

  /** Testing days (P6). */
  confirmSupervision(teamId: string, day: string, battery: TestBattery): Promise<TestSession>;
  getTestSessions(teamIds: string[], day: string): Promise<TestSession[]>;
  addTestResult(r: Omit<TestResult, 'id' | 'e1rm' | 'voided'>): Promise<TestResult>;
  /** Athlete: their own results. Coach: everyone current on the team. */
  listTestResults(teamId: string, userId?: string): Promise<TestResult[]>;
  updateTestResult(id: string, patch: Partial<Pick<TestResult, 'value' | 'reps' | 'voided'>>): Promise<void>;

  postProgram(teamId: string, groupKey: string, program: Program): Promise<TeamProgram>;
  getPrograms(teamIds: string[]): Promise<TeamProgram[]>;

  listGroups(teamId: string): Promise<Group[]>;
  createGroup(teamId: string, name: string, positionHint?: string | null): Promise<Group>;
  renameGroup(groupId: string, name: string): Promise<void>;
  deleteGroup(groupId: string): Promise<void>;
  /** Coach puts an athlete in a group (null = whole team). */
  assignGroup(teamId: string, userId: string, groupId: string | null): Promise<void>;

  getCalendars(teamIds: string[]): Promise<TeamCalendar[]>;
  postCalendar(cal: Omit<TeamCalendar, 'updatedAt'>): Promise<TeamCalendar>;

  /** Athlete's daily check-in (one per team per day; re-submitting replaces it). */
  submitReadiness(r: Omit<Readiness, 'userId' | 'userName'>): Promise<void>;
  listReadiness(teamId: string, day: string): Promise<Readiness[]>;

  joinTeam(code: string): Promise<Team>;
  leaveTeam(teamId: string): Promise<void>;

  addLog(log: WorkoutLog, teamId: string): Promise<void>;
  listTeamLogs(teamId: string, sinceIso: string): Promise<TeamLog[]>;

  /** Calls onChange when a team's posted workout or roster changes. Returns an unsubscribe function. */
  subscribe(teamIds: string[], onChange: () => void): () => void;
}

/** Readable error for the UI. */
export class BackendError extends Error {}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I
export function makeJoinCode(): string {
  let s = '';
  for (let i = 0; i < 6; i++) s += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  return s;
}

export function normalizeCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** Estimated strength: weight × (1 + reps / 30), to one decimal (same as the database). */
export function e1rm(weight: number, reps: number): number {
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

/** "Jordan Miller" → "Jordan M." (short) / "J.M." (initials); one word stays; hidden → null. Never a full last name. */
export function boardName(fullName: string, mode: BoardNameMode = 'short'): string | null {
  if (mode === 'hidden') return null;
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'Athlete';
  const first = parts[0];
  const last = parts.length > 1 ? parts[parts.length - 1] : '';
  if (mode === 'initials') return `${first[0].toUpperCase()}.${last ? `${last[0].toUpperCase()}.` : ''}`;
  return last ? `${first} ${last[0].toUpperCase()}.` : first;
}

export function setsDone(log: WorkoutLog): number {
  // 2.4.0: ramp-up sets (warmup: true) never count as work sets.
  return log.entries.reduce((n, e) => n + e.sets.filter((s) => s.done && !s.warmup).length, 0);
}
