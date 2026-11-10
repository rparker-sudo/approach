import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Program, TestBattery, WorkoutLog } from '../types';
import { uid } from '../util';
import {
  Account,
  Attendance,
  Backend,
  BackendError,
  boardName,
  canAttend,
  canBoard,
  canLog,
  canShareCheckIns,
  canTest,
  DEFAULT_TEAM_SETTINGS,
  e1rm,
  EffortInput,
  Group,
  LiveProgress,
  makeJoinCode,
  Member,
  normalizeCode,
  setsDone,
  SignUpInput,
  normalizePerms,
  NO_PERMS,
  Perms,
  permsFromStatus,
  Readiness,
  Team,
  TeamCalendar,
  TeamLog,
  TeamProgram,
  TestResult,
  TestSession,
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
    perms?: Perms;
    consentVersion?: number | null;
    consentRecordedAt?: string | null;
    consentRecordedBy?: string | null;
    /** Pass 1 data (migrated to perms on load). */
    consentStatus?: string;
  }[];
  programs: TeamProgram[];
  logs: TeamLog[];
  groups: Group[];
  calendars: TeamCalendar[];
  readiness: Readiness[];
  live: LiveProgress[];
  attendance: Attendance[];
  testSessions: TestSession[];
  tests: TestResult[];
  sessionUserId: string | null;
};

const EMPTY: DB = {
  users: [],
  teams: [],
  members: [],
  programs: [],
  logs: [],
  groups: [],
  calendars: [],
  readiness: [],
  live: [],
  attendance: [],
  testSessions: [],
  tests: [],
  sessionUserId: null,
};

async function load(): Promise<DB> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return { ...EMPTY };
    const db = { ...EMPTY, ...(JSON.parse(raw) as DB) };
    db.programs = db.programs.map((p) => ({ ...p, groupKey: p.groupKey ?? 'all' })); // 1.0 data
    // 2.0 data: no pain notes (2.1), and memberships start with a consent status like the server's.
    db.readiness = db.readiness.map(({ painNote: _n, ...r }: Readiness & { painNote?: string }) => r);
    // Pass 1 data: one consent status → six permissions (same mapping as migration 004).
    db.members = db.members.map(({ consentStatus, ...m }) => {
      if (m.perms) return m;
      const isMinor = db.users.find((u) => u.id === m.userId)?.isMinor;
      return { ...m, perms: permsFromStatus(consentStatus, isMinor), consentVersion: consentStatus === 'training_only' || consentStatus === 'full' ? 1 : null };
    });
    db.teams = db.teams.map((t) => ({ ...t, settings: { ...DEFAULT_TEAM_SETTINGS, ...(t.settings ?? {}) } }));
    // Live progress older than 24 hours is deleted.
    const cutoff = Date.now() - 864e5;
    db.live = db.live.filter((l) => new Date(l.updatedAt).getTime() >= cutoff);
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

function permsOf(db: DB, teamId: string, userId: string): Perms | undefined {
  return db.members.find((m) => m.teamId === teamId && m.userId === userId)?.perms;
}

function isCoach(db: DB, teamId: string, userId: string | null) {
  return db.teams.some((t) => t.id === teamId && t.coachId === userId);
}

/** On boards: boards permission and not hidden (same as the server's on_boards). */
function onBoards(db: DB, teamId: string, userId: string) {
  const u = db.users.find((x) => x.id === userId);
  return canBoard(permsOf(db, teamId, userId)) && (u?.boardNameMode ?? 'short') !== 'hidden';
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
      db.members = db.members.map((m) =>
        m.userId === user.id && !m.perms?.participation ? { ...m, perms: { ...(m.perms ?? NO_PERMS), participation: true } } : m,
      );
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
    db.live = db.live.filter((r) => !gone(r.teamId, r.userId));
    db.attendance = db.attendance.filter((r) => !gone(r.teamId, r.userId));
    db.testSessions = db.testSessions.filter((r) => !owned.has(r.teamId));
    db.tests = db.tests.filter((r) => !gone(r.teamId, r.userId));
    db.sessionUserId = null;
    await save(db);
  },

  async setBoardNameMode(mode) {
    const { db, user } = await me();
    user.boardNameMode = mode;
    await save(db);
    return publicAccount(user);
  },

  async setMyChoices(p) {
    const { db, user } = await me();
    if (user.isMinor !== false) throw new BackendError("Your coach records these from your parent's form.");
    const perms = normalizePerms({ ...p, participation: true });
    db.members = db.members.map((m) =>
      m.userId === user.id ? { ...m, perms, consentVersion: 2, consentRecordedAt: new Date().toISOString(), consentRecordedBy: user.id } : m,
    );
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
        myPerms: user.role === 'coach' ? undefined : permsOf(db, t.id, user.id),
        myConsentVersion: user.role === 'coach' ? undefined : db.members.find((m) => m.teamId === t.id && m.userId === user.id)?.consentVersion ?? null,
      }));
  },

  async createTeam(name) {
    const { db, user } = await me();
    if (user.role !== 'coach') throw new BackendError('Only coaches can create teams.');
    let code = makeJoinCode();
    while (db.teams.some((t) => t.joinCode === code)) code = makeJoinCode();
    const team: Team = {
      id: uid(),
      name: name.trim(),
      joinCode: code,
      coachId: user.id,
      coachName: user.name,
      createdAt: new Date().toISOString(),
      settings: { ...DEFAULT_TEAM_SETTINGS },
    };
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
    db.live = db.live.filter((r) => r.teamId !== teamId);
    db.attendance = db.attendance.filter((r) => r.teamId !== teamId);
    db.testSessions = db.testSessions.filter((r) => r.teamId !== teamId);
    db.tests = db.tests.filter((r) => r.teamId !== teamId);
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
          perms: m.perms ?? { ...NO_PERMS },
          consentVersion: m.consentVersion ?? null,
        };
      });
  },

  async removeMember(teamId, userId) {
    const { db, user } = await me();
    coachOf(db, teamId, user.id);
    db.members = db.members.filter((m) => !(m.teamId === teamId && m.userId === userId));
    await save(db);
  },

  async recordConsent(teamId, userId, perms) {
    const { db, user } = await me();
    if (!isCoach(db, teamId, user.id)) throw new BackendError('Only the team coach can record consent.');
    if (db.users.find((u) => u.id === userId)?.isMinor === false) throw new BackendError('Adults choose these themselves.');
    const m = db.members.find((x) => x.teamId === teamId && x.userId === userId);
    if (!m) throw new BackendError("That athlete isn't on the team.");
    const p = normalizePerms(perms);
    m.perms = p;
    m.consentVersion = p.participation ? 2 : null;
    m.consentRecordedAt = p.participation ? new Date().toISOString() : null;
    m.consentRecordedBy = p.participation ? user.id : null;
    await save(db);
  },

  async updateTeamSettings(teamId, patch) {
    const { db, user } = await me();
    const t = coachOf(db, teamId, user.id);
    t.settings = { ...DEFAULT_TEAM_SETTINGS, ...t.settings, ...patch };
    await save(db);
  },

  async boardMembers(teamId) {
    const db = await load();
    const viewer = db.sessionUserId;
    if (!isCoach(db, teamId, viewer) && !db.members.some((m) => m.teamId === teamId && m.userId === viewer)) return [];
    return db.members
      .filter((m) => m.teamId === teamId && onBoards(db, teamId, m.userId))
      .map((m) => {
        const u = db.users.find((x) => x.id === m.userId);
        return { userId: m.userId, boardName: boardName(u?.name ?? '', u?.boardNameMode ?? 'short') ?? 'Athlete', groupId: m.groupId ?? null };
      });
  },

  async shareLiveProgress(p) {
    const { db, user } = await me();
    if (!canBoard(permsOf(db, p.teamId, user.id))) throw new BackendError('Boards are off for you on this team.');
    const row: LiveProgress = { ...p, userId: user.id, updatedAt: new Date().toISOString() };
    db.live = [...db.live.filter((l) => !(l.teamId === p.teamId && l.userId === user.id && l.day === p.day)), row];
    await save(db);
  },

  async listLiveProgress(teamId, day) {
    const db = await load();
    const viewer = db.sessionUserId;
    return db.live.filter(
      (l) => l.teamId === teamId && l.day === day && (l.userId === viewer || (isCoach(db, teamId, viewer) && onBoards(db, teamId, l.userId))),
    );
  },

  async bestsSince(teamId, sinceIso) {
    const db = await load();
    const out: Record<string, number> = {};
    for (const l of db.logs) {
      if (l.teamId === teamId && l.date >= sinceIso && (l.prCount ?? 0) > 0 && visibleTo(db, db.sessionUserId, teamId, l.userId)) {
        out[l.userId] = (out[l.userId] ?? 0) + (l.prCount ?? 0);
      }
    }
    return out;
  },

  async teamEffort(teamId, since) {
    const db = await load();
    const viewer = db.sessionUserId;
    const coach = isCoach(db, teamId, viewer);
    const team = db.teams.find((t) => t.id === teamId);
    if (!coach && !(db.members.some((m) => m.teamId === teamId && m.userId === viewer) && (team?.settings?.effortBoard ?? true))) return [];
    return db.members
      .filter((m) => m.teamId === teamId && (onBoards(db, teamId, m.userId) || m.userId === viewer))
      .map((m): EffortInput => {
        const u = db.users.find((x) => x.id === m.userId);
        const me = m.userId === viewer;
        const mode = me && u?.boardNameMode === 'hidden' ? 'short' : u?.boardNameMode ?? 'short';
        const perms = m.perms;
        const sinceMs = new Date(`${since}T00:00:00`).getTime() - 864e5;
        // % gain in jump tests (touch, broad): latest vs first since the start date, averaged.
        let improvement: number | null = null;
        if (canTest(perms)) {
          const gains: number[] = [];
          for (const id of ['touch', 'broad'] as const) {
            const list = db.tests.filter((x) => x.teamId === teamId && x.userId === m.userId && x.testId === id && !x.voided && x.day >= since).sort((a, b) => a.day.localeCompare(b.day));
            if (list.length >= 2) gains.push(((list[list.length - 1].value - list[0].value) / list[0].value) * 100);
          }
          if (gains.length) improvement = Math.round((gains.reduce((a, b) => a + b, 0) / gains.length) * 10) / 10;
        }
        return {
          userId: m.userId,
          boardName: boardName(u?.name ?? '', mode) ?? 'Athlete',
          groupId: m.groupId ?? null,
          isMe: me,
          logs: db.logs
            .filter((l) => l.teamId === teamId && l.userId === m.userId && new Date(l.date).getTime() >= sinceMs)
            .map((l) => ({ at: l.date, session: l.sessionName, minutes: l.durationMin ?? null })),
          attendance: canAttend(perms)
            ? db.attendance.filter((a) => a.teamId === teamId && a.userId === m.userId && a.day >= since && a.minutes > 0).map((a) => ({ day: a.day, kind: a.kind, minutes: a.minutes }))
            : null,
          improvement,
        };
      });
  },

  subscribeBoard(_teamId, onChange, onStatus) {
    listeners.add(onChange);
    onStatus?.(true);
    return () => listeners.delete(onChange);
  },

  async markAttendance(a) {
    const { db, user } = await me();
    const coach = isCoach(db, a.teamId, user.id);
    if (!coach && a.userId !== user.id) throw new BackendError('Only the team coach can do that.');
    if (!canAttend(permsOf(db, a.teamId, a.userId))) throw new BackendError('Attendance is off for this athlete.');
    const key = (x: Attendance) => x.teamId === a.teamId && x.userId === a.userId && x.day === a.day && x.kind === a.kind;
    const existing = db.attendance.find(key);
    // The coach's entry wins: athletes can't change a row the coach marked.
    if (!coach && existing && existing.markedBy !== user.id) throw new BackendError('Your coach already marked this one.');
    db.attendance = db.attendance.filter((x) => !key(x));
    if (a.minutes != null || coach) {
      db.attendance.push({ teamId: a.teamId, userId: a.userId, day: a.day, kind: a.kind, minutes: a.minutes ?? 0, markedBy: user.id });
    }
    await save(db);
  },

  async listAttendance(teamId, since) {
    const db = await load();
    return db.attendance.filter((x) => x.teamId === teamId && x.day >= since && visibleTo(db, db.sessionUserId, teamId, x.userId));
  },

  async confirmSupervision(teamId, day, battery: TestBattery) {
    const { db, user } = await me();
    coachOf(db, teamId, user.id);
    const existing = db.testSessions.find((x) => x.teamId === teamId && x.day === day && x.groupKey === 'all');
    if (existing) return existing;
    const row: TestSession = { teamId, groupKey: 'all', day, coachId: user.id, confirmedAt: new Date().toISOString(), battery };
    db.testSessions.push(row);
    await save(db);
    return row;
  },

  async getTestSessions(teamIds, day) {
    const db = await load();
    return db.testSessions.filter((x) => teamIds.includes(x.teamId) && x.day === day);
  },

  async addTestResult(t) {
    const { db, user } = await me();
    const coach = isCoach(db, t.teamId, user.id);
    if (!coach && t.userId !== user.id) throw new BackendError('Only the team coach can do that.');
    if (!canTest(permsOf(db, t.teamId, t.userId))) throw new BackendError("Testing isn't turned on for you on this team.");
    if (t.reps != null && !db.testSessions.some((x) => x.teamId === t.teamId && x.day === t.day && x.battery !== 'jump')) {
      throw new BackendError("Strength checks open when your coach confirms they're supervising.");
    }
    const row: TestResult = { ...t, id: uid(), e1rm: t.unit === 'lb' && t.reps != null ? e1rm(t.value, t.reps) : null, voided: false };
    db.tests.push(row);
    await save(db);
    return row;
  },

  async listTestResults(teamId, forUser) {
    const db = await load();
    return db.tests
      .filter((x) => x.teamId === teamId && (!forUser || x.userId === forUser) && visibleTo(db, db.sessionUserId, teamId, x.userId))
      .sort((a, b) => a.day.localeCompare(b.day));
  },

  async updateTestResult(id, patch) {
    const { db, user } = await me();
    const row = db.tests.find((x) => x.id === id);
    if (!row) return;
    coachOf(db, row.teamId, user.id);
    Object.assign(row, patch);
    if (row.unit === 'lb' && row.reps != null) row.e1rm = e1rm(row.value, row.reps);
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
      // Minors join with nothing on (coach records the form); adults with participation only.
      db.members.push({
        teamId: team.id,
        userId: user.id,
        joinedAt: new Date().toISOString(),
        perms: { ...NO_PERMS, participation: user.isMinor === false },
        consentVersion: null,
      });
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
    if (!canShareCheckIns(permsOf(db, r.teamId, user.id))) throw new BackendError('Check-ins need parent consent.');
    db.readiness = [...db.readiness.filter((x) => !(x.teamId === r.teamId && x.userId === user.id && x.day === r.day)), { ...r, userId: user.id }];
    await save(db);
  },

  async listReadiness(teamId, day) {
    const db = await load();
    return db.readiness
      .filter(
        (r) =>
          r.teamId === teamId &&
          r.day === day &&
          (r.userId === db.sessionUserId || (visibleTo(db, db.sessionUserId, teamId, r.userId) && canShareCheckIns(permsOf(db, teamId, r.userId)))),
      )
      .map((r) => ({ ...r, userName: db.users.find((u) => u.id === r.userId)?.name ?? 'Athlete' }));
  },

  async addLog(log: WorkoutLog, teamId) {
    const { db, user } = await me();
    if (db.logs.some((l) => l.id === log.id)) return;
    if (!canLog(permsOf(db, teamId, user.id))) throw new BackendError('Logging needs parent consent.');
    db.logs.push({
      id: log.id,
      teamId,
      userId: user.id,
      userName: user.name,
      sessionName: log.sessionName,
      date: log.date,
      setsDone: setsDone(log),
      note: log.note,
      prCount: log.prCount ?? 0,
      durationMin: log.durationMin ?? null,
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
