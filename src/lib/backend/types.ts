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
};
export const DEFAULT_TEAM_SETTINGS: TeamSettings = {
  practiceMin: 120,
  matchMin: 120,
  tournamentMin: 240,
  effortBoard: true,
  boardEffortPanel: true,
  teamGoal: null,
  medBallLb: 6,
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
  settings: TeamSettings;
};

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
};

export type TeamProgram = {
  teamId: string;
  /** 'all' = Whole team, otherwise a group id. */
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
};

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
};

/** Effort-board inputs for one member (no weights, results, check-ins or nutrition). */
export type EffortInput = {
  userId: string;
  boardName: string;
  groupId: string | null;
  isMe: boolean;
  logs: { at: string; session: string; minutes: number | null }[];
  /** Null when the member hasn't allowed attendance. */
  attendance: { day: string; kind: AttendanceKind; minutes: number }[] | null;
  /** % gain in jump tests (touch, broad) since the start date; null without testing permission or 2 tests. */
  improvement: number | null;
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
};

export interface Backend {
  mode: 'supabase' | 'local';
  /** Supabase only: the database is missing the 2.0 tables (migration not run yet). */
  needsUpdate?: () => boolean;

  getAccount(): Promise<Account | null>;
  signUp(input: SignUpInput): Promise<Account>;
  signIn(email: string, password: string): Promise<Account>;
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
  renameTeam(teamId: string, name: string): Promise<void>;
  deleteTeam(teamId: string): Promise<void>;
  listMembers(teamId: string): Promise<Member[]>;
  removeMember(teamId: string, userId: string): Promise<void>;
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
  return log.entries.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0);
}
