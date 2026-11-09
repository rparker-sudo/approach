import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Program, WorkoutLog } from '../types';
import { uid } from '../util';
import {
  Account,
  Backend,
  BackendError,
  makeJoinCode,
  Member,
  normalizeCode,
  setsDone,
  SignUpInput,
  Team,
  TeamLog,
  TeamProgram,
} from './types';

/**
 * Demo mode: a pretend server stored on this device. Several accounts can
 * exist on one phone, so a coach and an athlete can try the full team flow
 * by signing out and back in. Nothing leaves the device.
 */

const KEY = 'load-and-launch/demo-server/v1';

type DB = {
  users: (Account & { password: string })[];
  teams: Team[];
  members: { teamId: string; userId: string; joinedAt: string }[];
  programs: TeamProgram[];
  logs: TeamLog[];
  sessionUserId: string | null;
};

const EMPTY: DB = { users: [], teams: [], members: [], programs: [], logs: [], sessionUserId: null };

async function load(): Promise<DB> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? { ...EMPTY, ...(JSON.parse(raw) as DB) } : { ...EMPTY };
  } catch {
    return { ...EMPTY };
  }
}

async function save(db: DB) {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(db));
  } catch {
    /* storage unavailable: demo data lasts until reload */
  }
  listeners.forEach((l) => l());
}

const listeners = new Set<() => void>();

function publicAccount(u: DB['users'][number]): Account {
  const { password: _pw, ...rest } = u;
  return rest;
}

async function me(db?: DB) {
  const d = db ?? (await load());
  const u = d.users.find((x) => x.id === d.sessionUserId);
  if (!u) throw new BackendError('Sign in first.');
  return { db: d, user: u };
}

function coachOf(db: DB, teamId: string, userId: string) {
  const t = db.teams.find((x) => x.id === teamId);
  if (!t) throw new BackendError("That team doesn't exist anymore.");
  if (t.coachId !== userId) throw new BackendError('Only the team coach can do that.');
  return t;
}

export const localBackend: Backend = {
  mode: 'local',

  async getAccount() {
    const db = await load();
    const u = db.users.find((x) => x.id === db.sessionUserId);
    return u ? publicAccount(u) : null;
  },

  async signUp(input: SignUpInput) {
    const db = await load();
    const email = input.email.trim().toLowerCase();
    if (!email.includes('@')) throw new BackendError('Enter a valid email address.');
    if (input.password.length < 6) throw new BackendError('Use a password with at least 6 characters.');
    if (db.users.some((u) => u.email === email)) throw new BackendError('That email already has an account. Sign in instead.');
    const user = { id: uid(), email, name: input.name.trim(), role: input.role, position: input.position ?? null, password: input.password };
    db.users.push(user);
    db.sessionUserId = user.id;
    await save(db);
    return publicAccount(user);
  },

  async signIn(email, password) {
    const db = await load();
    const u = db.users.find((x) => x.email === email.trim().toLowerCase());
    if (!u || u.password !== password) throw new BackendError("Email or password doesn't match.");
    db.sessionUserId = u.id;
    await save(db);
    return publicAccount(u);
  },

  async signOut() {
    const db = await load();
    db.sessionUserId = null;
    await save(db);
  },

  async updateAccount(patch) {
    const { db, user } = await me();
    Object.assign(user, patch);
    await save(db);
    return publicAccount(user);
  },

  async listMyTeams() {
    const { db, user } = await me();
    const ids =
      user.role === 'coach'
        ? db.teams.filter((t) => t.coachId === user.id).map((t) => t.id)
        : db.members.filter((m) => m.userId === user.id).map((m) => m.teamId);
    return db.teams
      .filter((t) => ids.includes(t.id))
      .map((t) => ({ ...t, coachName: db.users.find((u) => u.id === t.coachId)?.name }));
  },

  async createTeam(name) {
    const { db, user } = await me();
    if (user.role !== 'coach') throw new BackendError('Only coaches can create teams.');
    let code = makeJoinCode();
    while (db.teams.some((t) => t.joinCode === code)) code = makeJoinCode();
    const team: Team = { id: uid(), name: name.trim(), joinCode: code, coachId: user.id, coachName: user.name, createdAt: new Date().toISOString() };
    db.teams.push(team);
    await save(db);
    return team;
  },

  async renameTeam(teamId, name) {
    const { db, user } = await me();
    coachOf(db, teamId, user.id).name = name.trim();
    await save(db);
  },

  async deleteTeam(teamId) {
    const { db, user } = await me();
    coachOf(db, teamId, user.id);
    db.teams = db.teams.filter((t) => t.id !== teamId);
    db.members = db.members.filter((m) => m.teamId !== teamId);
    db.programs = db.programs.filter((p) => p.teamId !== teamId);
    db.logs = db.logs.filter((l) => l.teamId !== teamId);
    await save(db);
  },

  async listMembers(teamId) {
    const { db } = await me();
    return db.members
      .filter((m) => m.teamId === teamId)
      .map((m): Member => {
        const u = db.users.find((x) => x.id === m.userId);
        return { userId: m.userId, name: u?.name ?? 'Athlete', position: u?.position ?? null, joinedAt: m.joinedAt };
      });
  },

  async removeMember(teamId, userId) {
    const { db, user } = await me();
    coachOf(db, teamId, user.id);
    db.members = db.members.filter((m) => !(m.teamId === teamId && m.userId === userId));
    await save(db);
  },

  async postProgram(teamId, program: Program) {
    const { db, user } = await me();
    coachOf(db, teamId, user.id);
    const tp: TeamProgram = { teamId, program, updatedAt: new Date().toISOString() };
    db.programs = [...db.programs.filter((p) => p.teamId !== teamId), tp];
    await save(db);
    return tp;
  },

  async getPrograms(teamIds) {
    const db = await load();
    return db.programs.filter((p) => teamIds.includes(p.teamId));
  },

  async joinTeam(code) {
    const { db, user } = await me();
    const team = db.teams.find((t) => t.joinCode === normalizeCode(code));
    if (!team) {
      throw new BackendError(
        "Teams aren't shared between phones yet: this app is in demo mode. Ask your coach to connect team sync (Supabase), then try the code again.",
      );
    }
    if (!db.members.some((m) => m.teamId === team.id && m.userId === user.id)) {
      db.members.push({ teamId: team.id, userId: user.id, joinedAt: new Date().toISOString() });
      await save(db);
    }
    return { ...team, coachName: db.users.find((u) => u.id === team.coachId)?.name };
  },

  async leaveTeam(teamId) {
    const { db, user } = await me();
    db.members = db.members.filter((m) => !(m.teamId === teamId && m.userId === user.id));
    await save(db);
  },

  async addLog(log: WorkoutLog, teamId) {
    const { db, user } = await me();
    if (db.logs.some((l) => l.id === log.id)) return;
    db.logs.push({
      id: log.id,
      teamId,
      userId: user.id,
      userName: user.name,
      sessionName: log.sessionName,
      date: log.date,
      setsDone: setsDone(log),
      note: log.note,
    });
    await save(db);
  },

  async listTeamLogs(teamId, sinceIso) {
    const db = await load();
    return db.logs
      .filter((l) => l.teamId === teamId && l.date >= sinceIso)
      .sort((a, b) => b.date.localeCompare(a.date));
  },

  subscribe(_teamIds, onChange) {
    listeners.add(onChange);
    return () => listeners.delete(onChange);
  },
};
