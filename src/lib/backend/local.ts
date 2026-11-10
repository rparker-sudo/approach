import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Program, WorkoutLog } from '../types';
import { uid } from '../util';
import {
  Account,
  Backend,
  BackendError,
  canCheckIn,
  canLog,
  ConsentStatus,
  Group,
  initialConsent,
  makeJoinCode,
  Member,
  normalizeCode,
  setsDone,
  SignUpInput,
  Readiness,
  Team,
  TeamCalendar,
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
  members: {
    teamId: string;
    userId: string;
    joinedAt: string;
    groupId?: string | null;
    consentStatus?: ConsentStatus;
    consentRecordedAt?: string | null;
    consentRecordedBy?: string | null;
  }[];
  programs: TeamProgram[];
  logs: TeamLog[];
  groups: Group[];
  calendars: TeamCalendar[];
  readiness: Readiness[];
  sessionUserId: string | null;
};

const EMPTY: DB = { users: [], teams: [], members: [], programs: [], logs: [], groups: [], calendars: [], readiness: [], sessionUserId: null };

async function load(): Promise<DB> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return { ...EMPTY };
    const db = { ...EMPTY, ...(JSON.parse(raw) as DB) };
    db.programs = db.programs.map((p) => ({ ...p, groupKey: p.groupKey ?? 'all' })); // 1.0 data
    // 2.0 data: no pain notes (2.1), and memberships start with a consent status like the server's.
    db.readiness = db.readiness.map(({ painNote: _n, ...r }: Readiness & { painNote?: string }) => r);
    db.members = db.members.map((m) => ({
      ...m,
      consentStatus: m.consentStatus ?? initialConsent(db.users.find((u) => u.id === m.userId)?.isMinor),
    }));
    return db;
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

const thisYear = () => new Date().getFullYear();

/** Same rule as the server's minor_from(): the year decides unless it's the one ambiguous year. */
function minorFrom(year: number, clientMinor: boolean) {
  const age = thisYear() - year;
  if (age < 18) return true;
  if (age > 18) return false;
  return clientMinor;
}

function consentOf(db: DB, teamId: string, userId: string): ConsentStatus | undefined {
  return db.members.find((m) => m.teamId === teamId && m.userId === userId)?.consentStatus;
}

/** Coaches see rows only for current members (2.1); everyone sees their own. */
function visibleTo(db: DB, viewerId: string | null, teamId: string, rowUserId: string) {
  if (rowUserId === viewerId) return true;
  const t = db.teams.find((x) => x.id === teamId);
  return !!t && t.coachId === viewerId && db.members.some((m) => m.teamId === teamId && m.userId === rowUserId);
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
    if (thisYear() - input.birthYear < 13) throw new BackendError('Not eligible.');
    const isMinor = minorFrom(input.birthYear, input.isMinor);
    const user = {
      id: uid(),
      email,
      name: input.name.trim(),
      // Coach accounts are for adults 18 and older.
      role: input.role === 'coach' && !isMinor ? input.role : ('athlete' as const),
      position: input.position ?? null,
      birthYear: input.birthYear,
      isMinor,
      password: input.password,
    };
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

  async setBirthYear(year, clientMinor) {
    const { db, user } = await me();
    if (thisYear() - year < 13) throw new BackendError('Not eligible.');
    if (user.birthYear == null) {
      user.birthYear = year;
      user.isMinor = minorFrom(year, clientMinor);
    }
    if (user.isMinor === false) {
      db.members = db.members.map((m) => (m.userId === user.id && m.consentStatus === 'pending' ? { ...m, consentStatus: 'not_required' } : m));
    }
    await save(db);
    return publicAccount(user);
  },

  async deleteMyAccount() {
    const { db, user } = await me();
    const owned = new Set(db.teams.filter((t) => t.coachId === user.id).map((t) => t.id));
    const gone = (teamId: string, userId?: string) => owned.has(teamId) || userId === user.id;
    db.users = db.users.filter((u) => u.id !== user.id);
    db.teams = db.teams.filter((t) => !owned.has(t.id));
    db.members = db.members
      .filter((m) => !gone(m.teamId, m.userId))
      .map((m) => (m.consentRecordedBy === user.id ? { ...m, consentRecordedBy: null } : m));
    db.programs = db.programs.filter((p) => !owned.has(p.teamId));
    db.logs = db.logs.filter((l) => !gone(l.teamId, l.userId));
    db.groups = db.groups.filter((g) => !owned.has(g.teamId));
    db.calendars = db.calendars.filter((c) => !owned.has(c.teamId));
    db.readiness = db.readiness.filter((r) => !gone(r.teamId, r.userId));
    db.sessionUserId = null;
    await save(db);
  },

  async listMyTeams() {
    const { db, user } = await me();
    const ids =
      user.role === 'coach'
        ? db.teams.filter((t) => t.coachId === user.id).map((t) => t.id)
        : db.members.filter((m) => m.userId === user.id).map((m) => m.teamId);
    return db.teams
      .filter((t) => ids.includes(t.id))
      .map((t) => ({
        ...t,
        coachName: db.users.find((u) => u.id === t.coachId)?.name,
        myGroupId: user.role === 'coach' ? undefined : db.members.find((m) => m.teamId === t.id && m.userId === user.id)?.groupId ?? null,
        myConsent: user.role === 'coach' ? undefined : consentOf(db, t.id, user.id),
      }));
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
    db.groups = db.groups.filter((g) => g.teamId !== teamId);
    db.calendars = db.calendars.filter((c) => c.teamId !== teamId);
    db.readiness = db.readiness.filter((r) => r.teamId !== teamId);
    await save(db);
  },

  async listMembers(teamId) {
    const { db } = await me();
    return db.members
      .filter((m) => m.teamId === teamId)
      .map((m): Member => {
        const u = db.users.find((x) => x.id === m.userId);
        return {
          userId: m.userId,
          name: u?.name ?? 'Athlete',
          position: u?.position ?? null,
          joinedAt: m.joinedAt,
          groupId: m.groupId ?? null,
          isMinor: u?.isMinor ?? null,
          consentStatus: m.consentStatus ?? initialConsent(u?.isMinor),
        };
      });
  },

  async removeMember(teamId, userId) {
    const { db, user } = await me();
    coachOf(db, teamId, user.id);
    db.members = db.members.filter((m) => !(m.teamId === teamId && m.userId === userId));
    await save(db);
  },

  async recordConsent(teamId, userId, status) {
    const { db, user } = await me();
    if (!db.teams.some((t) => t.id === teamId && t.coachId === user.id)) throw new BackendError('Only the team coach can record consent.');
    const m = db.members.find((x) => x.teamId === teamId && x.userId === userId && x.consentStatus !== 'not_required');
    if (!m) throw new BackendError("That athlete isn't on the team or doesn't need consent.");
    m.consentStatus = status;
    m.consentRecordedAt = status === 'pending' ? null : new Date().toISOString();
    m.consentRecordedBy = status === 'pending' ? null : user.id;
    await save(db);
  },

  async postProgram(teamId, groupKey, program: Program) {
    const { db, user } = await me();
    coachOf(db, teamId, user.id);
    const tp: TeamProgram = { teamId, groupKey, program, updatedAt: new Date().toISOString() };
    db.programs = [...db.programs.filter((p) => !(p.teamId === teamId && p.groupKey === groupKey)), tp];
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
      db.members.push({ teamId: team.id, userId: user.id, joinedAt: new Date().toISOString(), consentStatus: initialConsent(user.isMinor) });
      await save(db);
    }
    return { ...team, coachName: db.users.find((u) => u.id === team.coachId)?.name };
  },

  async leaveTeam(teamId) {
    const { db, user } = await me();
    db.members = db.members.filter((m) => !(m.teamId === teamId && m.userId === user.id));
    await save(db);
  },

  async listGroups(teamId) {
    const db = await load();
    return db.groups.filter((g) => g.teamId === teamId);
  },

  async createGroup(teamId, name, positionHint) {
    const { db, user } = await me();
    coachOf(db, teamId, user.id);
    const g: Group = { id: uid(), teamId, name: name.trim(), positionHint: positionHint ?? null };
    db.groups.push(g);
    await save(db);
    return g;
  },

  async renameGroup(groupId, name) {
    const { db, user } = await me();
    const g = db.groups.find((x) => x.id === groupId);
    if (!g) throw new BackendError("That group doesn't exist anymore.");
    coachOf(db, g.teamId, user.id);
    g.name = name.trim();
    await save(db);
  },

  async deleteGroup(groupId) {
    const { db, user } = await me();
    const g = db.groups.find((x) => x.id === groupId);
    if (!g) return;
    coachOf(db, g.teamId, user.id);
    db.groups = db.groups.filter((x) => x.id !== groupId);
    db.members = db.members.map((m) => (m.groupId === groupId ? { ...m, groupId: null } : m));
    db.programs = db.programs.filter((p) => !(p.teamId === g.teamId && p.groupKey === groupId));
    await save(db);
  },

  async assignGroup(teamId, userId, groupId) {
    const { db, user } = await me();
    coachOf(db, teamId, user.id);
    db.members = db.members.map((m) => (m.teamId === teamId && m.userId === userId ? { ...m, groupId } : m));
    await save(db);
  },

  async getCalendars(teamIds) {
    const db = await load();
    return db.calendars.filter((c) => teamIds.includes(c.teamId));
  },

  async postCalendar(cal) {
    const { db, user } = await me();
    coachOf(db, cal.teamId, user.id);
    const c: TeamCalendar = { ...cal, updatedAt: new Date().toISOString() };
    db.calendars = [...db.calendars.filter((x) => x.teamId !== cal.teamId), c];
    await save(db);
    return c;
  },

  async submitReadiness(r) {
    const { db, user } = await me();
    if (!db.members.some((m) => m.teamId === r.teamId && m.userId === user.id)) throw new BackendError("You're not on that team.");
    if (!canCheckIn(consentOf(db, r.teamId, user.id))) throw new BackendError('Check-ins need parent consent.');
    db.readiness = [...db.readiness.filter((x) => !(x.teamId === r.teamId && x.userId === user.id && x.day === r.day)), { ...r, userId: user.id }];
    await save(db);
  },

  async listReadiness(teamId, day) {
    const db = await load();
    return db.readiness
      .filter((r) => r.teamId === teamId && r.day === day && visibleTo(db, db.sessionUserId, teamId, r.userId))
      .map((r) => ({ ...r, userName: db.users.find((u) => u.id === r.userId)?.name ?? 'Athlete' }));
  },

  async addLog(log: WorkoutLog, teamId) {
    const { db, user } = await me();
    if (db.logs.some((l) => l.id === log.id)) return;
    if (!canLog(consentOf(db, teamId, user.id))) throw new BackendError('Logging needs parent consent.');
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
      .filter((l) => l.teamId === teamId && l.date >= sinceIso && visibleTo(db, db.sessionUserId, teamId, l.userId))
      .sort((a, b) => b.date.localeCompare(a.date));
  },

  subscribe(_teamIds, onChange) {
    listeners.add(onChange);
    return () => listeners.delete(onChange);
  },
};
