import type { CalendarEvent, Position, Program, Role, WorkoutLog } from '../types';

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
};

/**
 * Parent consent on a team (coached minors). Text values so more options can be added later.
 *  - not_required: adult  - pending: minor, no form recorded yet
 *  - training_only: may log workouts, no check-ins  - full: workouts and check-ins shared with the coach
 */
export type ConsentStatus = 'not_required' | 'pending' | 'training_only' | 'full';
/** What a coach can record. */
export type RecordableConsent = 'pending' | 'training_only' | 'full';

export const canLog = (c: ConsentStatus | undefined) => c === 'training_only' || c === 'full' || c === 'not_required';
export const canCheckIn = (c: ConsentStatus | undefined) => c === 'full' || c === 'not_required';
/** Starting status when someone joins (unknown age counts as a minor until they answer). */
export const initialConsent = (isMinor: boolean | null | undefined): ConsentStatus => (isMinor === false ? 'not_required' : 'pending');

export type Team = {
  id: string;
  name: string;
  joinCode: string;
  coachId: string;
  coachName?: string;
  createdAt: string;
  /** Athletes only: the group they're in on this team (null = whole team). */
  myGroupId?: string | null;
  /** Athletes only: their parent-consent status on this team. */
  myConsent?: ConsentStatus;
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
  consentStatus: ConsentStatus;
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

  /** Coaches: teams they own. Athletes: teams they've joined. */
  listMyTeams(): Promise<Team[]>;
  createTeam(name: string): Promise<Team>;
  renameTeam(teamId: string, name: string): Promise<void>;
  deleteTeam(teamId: string): Promise<void>;
  listMembers(teamId: string): Promise<Member[]>;
  removeMember(teamId: string, userId: string): Promise<void>;
  /** Coach records (or clears, with 'pending') a minor's parent consent. */
  recordConsent(teamId: string, userId: string, status: RecordableConsent): Promise<void>;

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

export function setsDone(log: WorkoutLog): number {
  return log.entries.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0);
}
