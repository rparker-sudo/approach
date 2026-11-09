import type { Position, Program, Role, WorkoutLog } from '../types';

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
};

export type Team = {
  id: string;
  name: string;
  joinCode: string;
  coachId: string;
  coachName?: string;
  createdAt: string;
};

export type Member = {
  userId: string;
  name: string;
  position?: Position | null;
  joinedAt: string;
};

export type TeamProgram = {
  teamId: string;
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
};

export interface Backend {
  mode: 'supabase' | 'local';

  getAccount(): Promise<Account | null>;
  signUp(input: SignUpInput): Promise<Account>;
  signIn(email: string, password: string): Promise<Account>;
  signOut(): Promise<void>;
  updateAccount(patch: Partial<Pick<Account, 'name' | 'position'>>): Promise<Account>;

  /** Coaches: teams they own. Athletes: teams they've joined. */
  listMyTeams(): Promise<Team[]>;
  createTeam(name: string): Promise<Team>;
  renameTeam(teamId: string, name: string): Promise<void>;
  deleteTeam(teamId: string): Promise<void>;
  listMembers(teamId: string): Promise<Member[]>;
  removeMember(teamId: string, userId: string): Promise<void>;

  postProgram(teamId: string, program: Program): Promise<TeamProgram>;
  getPrograms(teamIds: string[]): Promise<TeamProgram[]>;

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
