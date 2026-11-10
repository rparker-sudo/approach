import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import {
  Account,
  backend,
  Attendance,
  AttendanceKind,
  BackendError,
  BoardNameMode,
  canLog,
  canShareCheckIns,
  canTest,
  Group,
  NO_PERMS,
  LiveProgress,
  Member,
  Perms,
  Readiness,
  SignUpInput,
  Team,
  TeamCalendar,
  TeamLog,
  TeamProgram,
  TeamSettings,
  TestResult,
  TestSession,
} from './backend';
import { dateKey, today } from './calendar';
import { useStore } from './store';
import type { AppData, CalendarEvent, LocalTeamCalendar, Position, Program, ReadinessEntry, TestBattery } from './types';

/**
 * Team sync: keeps this device in step with the server.
 *  - Athletes: the posted workout for their group (or the whole team) is mirrored
 *    into their programs as "team-<teamId>" and becomes their plan. The team calendar
 *    (matches, lightened days) is merged in. Logged workouts and check-ins are sent up.
 *  - Coaches: teams, groups, rosters, one workout per group, the shared calendar,
 *    today's readiness and recent athlete logs.
 */

export const ALL = 'all';

/** Local program id for a team workout. Athletes always use the whole-team id. */
export const teamProgramId = (teamId: string, groupKey: string = ALL) =>
  groupKey === ALL ? `team-${teamId}` : `team-${teamId}-${groupKey}`;

const postedKey = (teamId: string, groupKey: string = ALL) => `${teamId}:${groupKey}`;

/** Position → suggested group (for "Auto-create by position"). */
export const POSITION_GROUPS: { name: string; positions: Position[] }[] = [
  { name: 'Hitters', positions: ['Outside Hitter', 'Opposite'] },
  { name: 'Middles', positions: ['Middle Blocker'] },
  { name: 'Setters', positions: ['Setter'] },
  { name: 'Liberos / DS', positions: ['Libero / DS'] },
];

export type ReadinessSummary = {
  checkedIn: number;
  roster: number;
  low: Readiness[];
  pain: Readiness[];
  /** Coach should consider lightening the day. */
  suggest: boolean;
};

/** A check-in counts as "run down" when the average of sleep, energy and (inverted) soreness is ≤ 2, or soreness is 4–5. */
export function isLow(r: Pick<Readiness, 'sleep' | 'energy' | 'soreness'>) {
  const avg = (r.sleep + r.energy + (6 - r.soreness)) / 3;
  return avg <= 2 || r.soreness >= 4;
}

/** Suggest lightening when ≥ 3 athletes, or ≥ 30% of those checked in, are run down. */
export function summarizeReadiness(list: Readiness[], roster: number): ReadinessSummary {
  const low = list.filter(isLow);
  const pain = list.filter((r) => r.pain);
  const suggest = low.length >= 3 || (list.length >= 2 && low.length / list.length >= 0.3);
  return { checkedIn: list.length, roster, low, pain, suggest };
}

type TeamState = {
  account: Account | null;
  checked: boolean;
  teams: Team[];
  members: Record<string, Member[]>;
  groups: Record<string, Group[]>;
  logs: Record<string, TeamLog[]>;
  /** Today's check-ins (coach). */
  readiness: Record<string, Readiness[]>;
  postedFor: (teamId: string, groupKey?: string) => TeamProgram | undefined;
  syncing: boolean;
  lastError: string | null;
  refresh: () => Promise<void>;
  signUp: (input: SignUpInput) => Promise<Account>;
  signIn: (email: string, password: string) => Promise<Account>;
  signOut: () => Promise<void>;
  createTeam: (name: string) => Promise<Team>;
  renameTeam: (teamId: string, name: string) => Promise<void>;
  deleteTeam: (teamId: string) => Promise<void>;
  removeMember: (teamId: string, userId: string) => Promise<void>;
  joinTeam: (code: string) => Promise<Team>;
  leaveTeam: (teamId: string) => Promise<void>;
  /** Coach: send one group's workout (and any calendar changes) to the athletes. */
  postTeamProgram: (teamId: string, groupKey?: string) => Promise<void>;
  /** Coach: send everything unposted for a team. */
  postTeam: (teamId: string) => Promise<void>;
  /** Does the team have changes the athletes haven't got yet? */
  hasUnposted: (teamId: string) => boolean;
  createGroup: (teamId: string, name: string, positionHint?: string | null) => Promise<Group>;
  renameGroup: (groupId: string, name: string) => Promise<void>;
  deleteGroup: (groupId: string) => Promise<void>;
  assignGroup: (teamId: string, userId: string, groupId: string | null) => Promise<void>;
  /** Create Hitters/Middles/Setters/Liberos and put athletes in by position. */
  autoGroupByPosition: (teamId: string) => Promise<void>;
  /** Coach edits the team calendar (shared by every group). Marked unposted. */
  setTeamEvents: (teamId: string, events: CalendarEvent[]) => void;
  /** Coach greenlights (or undoes) a lighter day for a group or the whole team. Posts right away. */
  setLightDay: (teamId: string, groupKey: string, day: string, light: boolean) => Promise<void>;
  /** Athlete daily check-in. */
  checkIn: (entry: Omit<ReadinessEntry, 'sentTo'>) => void;
  /** Athletes: this team's permissions (last known, so it works offline). */
  consentFor: (teamId: string | undefined) => Perms | undefined;
  /** Coach records a minor's form-v2 boxes. */
  recordConsent: (teamId: string, userId: string, perms: Perms) => Promise<void>;
  /** Adults: boxes 2–6 for themselves. */
  setMyChoices: (p: Omit<Perms, 'participation'>) => Promise<void>;
  setBoardNameMode: (mode: BoardNameMode) => Promise<void>;
  updateTeamSettings: (teamId: string, patch: Partial<TeamSettings>) => Promise<void>;
  /** Athlete: share sets done with the coach board (only with boards permission). */
  shareLiveProgress: (p: Omit<LiveProgress, 'userId' | 'updatedAt'>) => void;
  /** Recent attendance (coach: the roster's; athlete: their own), per team. */
  attendance: Record<string, Attendance[]>;
  markAttendance: (a: { teamId: string; userId: string; day: string; kind: AttendanceKind; minutes: number | null }) => Promise<void>;
  /** Today's supervision confirmations per team. */
  testSessions: Record<string, TestSession | undefined>;
  confirmSupervision: (teamId: string, day: string, battery: TestBattery) => Promise<void>;
  /** Test results (coach: the roster's; athlete: their own), per team. */
  testResults: Record<string, TestResult[]>;
  addTestResult: (r: Omit<TestResult, 'id' | 'e1rm' | 'voided'>) => Promise<TestResult>;
  updateTestResult: (teamId: string, id: string, patch: Partial<Pick<TestResult, 'value' | 'reps' | 'voided'>>) => Promise<void>;
  /** Deletes the account on the server; the caller then erases local data. */
  deleteAccount: () => Promise<void>;
};

const Ctx = createContext<TeamState | null>(null);

const LOG_WINDOW_DAYS = 28;

function message(e: unknown) {
  return e instanceof BackendError || e instanceof Error ? e.message : 'Something went wrong.';
}

/** Light dates that apply to a group: the whole team's plus the group's own. */
function lightFor(cal: { lightDates: Record<string, string[]> } | undefined, groupKey: string): string[] {
  if (!cal) return [];
  return [...new Set([...(cal.lightDates[ALL] ?? []), ...(groupKey === ALL ? [] : cal.lightDates[groupKey] ?? [])])];
}

type Snapshot = { teams: Team[]; posted: TeamProgram[]; calendars: TeamCalendar[]; groups: Record<string, Group[]> };

/** Mirror posted team workouts + team calendars into local programs. */
function applyPosted(d: AppData, role: 'coach' | 'athlete', snap: Snapshot): AppData {
  const teamIds = new Set(snap.teams.map((t) => t.id));
  let programs = d.programs.filter((p) => !p.teamId || teamIds.has(p.teamId)); // drop teams you left / deleted
  const teamCalendars = { ...(d.teamCalendars ?? {}) };

  if (role === 'coach') {
    for (const t of snap.teams) {
      const server = snap.calendars.find((c) => c.teamId === t.id);
      if (!teamCalendars[t.id]?.unposted) {
        // 1.0 kept the calendar inside the team workout; carry those dates over until a team calendar exists.
        const legacy =
          programs.find((p) => p.teamId === t.id && p.events?.length)?.events ??
          snap.posted.find((tp) => tp.teamId === t.id && tp.program.events?.length)?.program.events;
        teamCalendars[t.id] = {
          events: server?.events ?? teamCalendars[t.id]?.events ?? legacy ?? [],
          lightDates: server?.lightDates ?? teamCalendars[t.id]?.lightDates ?? {},
        };
      }
      // Group workouts whose group was deleted go away.
      const keys = new Set([ALL, ...(snap.groups[t.id] ?? []).map((g) => g.id)]);
      programs = programs.filter((p) => p.teamId !== t.id || keys.has(p.groupKey ?? ALL));
    }
    for (const tp of snap.posted) {
      const team = snap.teams.find((t) => t.id === tp.teamId);
      const id = teamProgramId(tp.teamId, tp.groupKey);
      const local = programs.find((p) => p.id === id);
      if (local?.unposted) continue; // keep the coach's unposted edits
      if (local?.postedAt === tp.updatedAt) continue;
      const group = (snap.groups[tp.teamId] ?? []).find((g) => g.id === tp.groupKey);
      const mirrored: Program = {
        ...tp.program,
        id,
        teamId: tp.teamId,
        teamName: team?.name,
        groupKey: tp.groupKey,
        groupName: group?.name,
        postedAt: tp.updatedAt,
        unposted: false,
      };
      programs = local ? programs.map((p) => (p.id === id ? mirrored : p)) : [mirrored, ...programs];
    }
    // Every team program shows the (local) team calendar.
    programs = programs.map((p) => {
      if (!p.teamId) return p;
      const cal = teamCalendars[p.teamId];
      const group = (snap.groups[p.teamId] ?? []).find((g) => g.id === p.groupKey);
      return { ...p, events: cal?.events ?? p.events, lightDates: lightFor(cal, p.groupKey ?? ALL), groupName: group?.name ?? p.groupName };
    });
  } else {
    for (const t of snap.teams) {
      const mine = t.myGroupId ? snap.posted.find((tp) => tp.teamId === t.id && tp.groupKey === t.myGroupId) : undefined;
      const tp = mine ?? snap.posted.find((x) => x.teamId === t.id && x.groupKey === ALL);
      const id = teamProgramId(t.id);
      if (!tp) {
        programs = programs.filter((p) => p.id !== id);
        continue;
      }
      const cal = snap.calendars.find((c) => c.teamId === t.id);
      const group = mine ? (snap.groups[t.id] ?? []).find((g) => g.id === mine.groupKey) : undefined;
      const local = programs.find((p) => p.id === id);
      const mirrored: Program = {
        ...tp.program,
        id,
        teamId: t.id,
        teamName: t.name,
        groupKey: tp.groupKey,
        groupName: group?.name,
        author: t.coachName ?? tp.program.author,
        postedAt: tp.updatedAt,
        unposted: false,
        events: cal?.events ?? tp.program.events ?? [],
        lightDates: lightFor(cal, tp.groupKey),
      };
      const same = local && JSON.stringify(local) === JSON.stringify(mirrored);
      if (!same) programs = local ? programs.map((p) => (p.id === id ? mirrored : p)) : [mirrored, ...programs];
    }
  }

  let activeProgramId = d.activeProgramId;
  if (!programs.some((p) => p.id === activeProgramId)) activeProgramId = null;
  if (role === 'athlete') {
    const firstTeamProgram = programs.find((p) => p.teamId);
    // A team workout takes over as the plan unless the athlete already follows another team's plan.
    const active = programs.find((p) => p.id === activeProgramId);
    if (firstTeamProgram && !active?.teamId) activeProgramId = firstTeamProgram.id;
  }
  return { ...d, programs, activeProgramId, teamCalendars };
}

export function TeamProvider({ children }: { children: ReactNode }) {
  const store = useStore();
  const { mutate, data } = store;
  const [account, setAccount] = useState<Account | null>(null);
  const [checked, setChecked] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [members, setMembers] = useState<Record<string, Member[]>>({});
  const [groups, setGroups] = useState<Record<string, Group[]>>({});
  const [logs, setLogs] = useState<Record<string, TeamLog[]>>({});
  const [readiness, setReadiness] = useState<Record<string, Readiness[]>>({});
  const [posted, setPosted] = useState<Record<string, TeamProgram>>({});
  const [attendance, setAttendance] = useState<Record<string, Attendance[]>>({});
  const [testSessions, setTestSessions] = useState<Record<string, TestSession | undefined>>({});
  const [testResults, setTestResults] = useState<Record<string, TestResult[]>>({});
  const [syncing, setSyncing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const accountRef = useRef<Account | null>(account);
  const dataRef = useRef(data);
  const teamsRef = useRef<Team[]>(teams);
  // Latest values for async callbacks. Declared before the other effects so it runs first.
  useEffect(() => {
    accountRef.current = account;
    dataRef.current = data;
    teamsRef.current = teams;
  });

  const flushLogs = useCallback(async () => {
    // Only teams where the athlete may log (parent consent on file, or an adult).
    const allowed = new Set(teamsRef.current.filter((t) => canLog(t.myPerms)).map((t) => t.id));
    const pending = dataRef.current.logs.filter((l) => l.teamId && !l.synced && allowed.has(l.teamId));
    const sent: string[] = [];
    for (const l of pending) {
      try {
        await backend.addLog(l, l.teamId!);
        sent.push(l.id);
      } catch {
        break; // offline: try again on the next refresh
      }
    }
    if (sent.length) {
      mutate((d) => ({ ...d, logs: d.logs.map((l) => (sent.includes(l.id) ? { ...l, synced: true } : l)) }));
    }
  }, [mutate]);

  /** Send today's check-in to every team that hasn't got it yet. */
  const flushReadiness = useCallback(async () => {
    const day = dateKey(today());
    const entry = (dataRef.current.readinessLog ?? []).find((r) => r.day === day);
    if (!entry) return;
    const sent: string[] = [];
    for (const t of teamsRef.current) {
      if (entry.sentTo.includes(t.id) || !canShareCheckIns(t.myPerms)) continue;
      try {
        await backend.submitReadiness({ teamId: t.id, day, sleep: entry.sleep, soreness: entry.soreness, energy: entry.energy, pain: entry.pain });
        sent.push(t.id);
      } catch {
        break;
      }
    }
    if (sent.length) {
      mutate((d) => ({
        ...d,
        readinessLog: (d.readinessLog ?? []).map((r) => (r.day === day ? { ...r, sentTo: [...new Set([...r.sentTo, ...sent])] } : r)),
      }));
    }
  }, [mutate]);

  const refresh = useCallback(async () => {
    const acct = accountRef.current;
    if (!acct) return;
    setSyncing(true);
    try {
      const t = await backend.listMyTeams();
      const ids = t.map((x) => x.id);
      const [tps, cals, grp] = await Promise.all([
        backend.getPrograms(ids),
        backend.getCalendars(ids),
        Promise.all(ids.map((id) => backend.listGroups(id))),
      ]);
      const groupMap = Object.fromEntries(ids.map((id, i) => [id, grp[i]]));
      setTeams(t);
      teamsRef.current = t;
      setGroups(groupMap);
      setPosted(Object.fromEntries(tps.map((p) => [postedKey(p.teamId, p.groupKey), p])));
      mutate((d) => ({
        ...applyPosted(d, acct.role, { teams: t, posted: tps, calendars: cals, groups: groupMap }),
        teamConsent: acct.role === 'athlete' ? Object.fromEntries(t.map((x) => [x.id, x.myPerms ?? { ...NO_PERMS }])) : {},
      }));
      const day = dateKey(today());
      const attSince = dateKey(new Date(Date.now() - 2 * 864e5));
      const [sessions, att] = await Promise.all([backend.getTestSessions(ids, day), Promise.all(ids.map((id) => backend.listAttendance(id, attSince)))]);
      setTestSessions(Object.fromEntries(ids.map((id) => [id, sessions.find((x) => x.teamId === id)])));
      setAttendance(Object.fromEntries(ids.map((id, i) => [id, att[i]])));
      if (acct.role === 'coach') {
        const since = new Date(Date.now() - LOG_WINDOW_DAYS * 864e5).toISOString();
        const [m, l, r, tr] = await Promise.all([
          Promise.all(ids.map((id) => backend.listMembers(id))),
          Promise.all(ids.map((id) => backend.listTeamLogs(id, since))),
          Promise.all(ids.map((id) => backend.listReadiness(id, day))),
          Promise.all(ids.map((id) => backend.listTestResults(id))),
        ]);
        setMembers(Object.fromEntries(ids.map((id, i) => [id, m[i]])));
        setLogs(Object.fromEntries(ids.map((id, i) => [id, l[i]])));
        setReadiness(Object.fromEntries(ids.map((id, i) => [id, r[i]])));
        setTestResults(Object.fromEntries(ids.map((id, i) => [id, tr[i]])));
      } else {
        const tr = await Promise.all(t.map((x) => (canTest(x.myPerms) ? backend.listTestResults(x.id, acct.id) : Promise.resolve([] as TestResult[]))));
        setTestResults(Object.fromEntries(ids.map((id, i) => [id, tr[i]])));
        // P6.7: the latest strength check per lift sets starting weights (even if it's lower).
        mutate((d) => ({ ...d, strengthEstimates: latestEstimates(tr.flat()) }));
        await flushLogs();
        await flushReadiness();
      }
      setLastError(null);
    } catch (e) {
      setLastError(message(e));
    } finally {
      setSyncing(false);
    }
  }, [mutate, flushLogs, flushReadiness]);

  // Restore the signed-in account on launch.
  useEffect(() => {
    backend
      .getAccount()
      .then((a) => setAccount(a))
      .catch(() => setAccount(null))
      .finally(() => setChecked(true));
  }, []);

  // The signed-in account decides coach vs athlete mode (and age) on this device.
  useEffect(() => {
    if (!account) return;
    const age = account.birthYear != null ? { birthYear: account.birthYear, isMinor: account.isMinor ?? true } : {};
    mutate((d) =>
      d.profile &&
      (d.profile.role !== account.role ||
        (account.name && d.profile.name !== account.name) ||
        (account.birthYear != null && (d.profile.birthYear !== account.birthYear || d.profile.isMinor !== (account.isMinor ?? true))))
        ? { ...d, profile: { ...d.profile, role: account.role, name: account.name || d.profile.name, ...age } }
        : d,
    );
    // Accounts from before 2.1: send the age answered on this device once.
    const p = dataRef.current.profile;
    if (account.birthYear == null && p?.birthYear != null) {
      backend
        .setBirthYear(p.birthYear, p.isMinor ?? true)
        .then((a) => setAccount(a))
        .catch(() => {});
    }
  }, [account, mutate]);

  // Refresh when the account changes and whenever the app comes back to the foreground.
  useEffect(() => {
    if (!account) return;
    // Fetching from the server is syncing with an external system.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') refresh();
    });
    return () => sub.remove();
  }, [account, refresh]);

  // Live updates while the app is open.
  const teamKey = teams.map((t) => t.id).join(',');
  useEffect(() => {
    if (!account || !teamKey) return;
    return backend.subscribe(teamKey.split(','), () => refresh());
  }, [account, teamKey, refresh]);

  // Send newly logged team workouts and check-ins right away.
  const pendingCount = data.logs.filter((l) => l.teamId && !l.synced).length;
  useEffect(() => {
    if (account?.role === 'athlete' && pendingCount > 0) flushLogs();
  }, [account, pendingCount, flushLogs]);
  const todayEntry = (data.readinessLog ?? []).find((r) => r.day === dateKey(today()));
  const readinessPending = !!todayEntry && teams.some((t) => canShareCheckIns(t.myPerms) && !todayEntry.sentTo.includes(t.id));
  useEffect(() => {
    if (account?.role === 'athlete' && readinessPending) flushReadiness();
  }, [account, readinessPending, flushReadiness]);

  const postCalendarIfNeeded = useCallback(
    async (teamId: string, force = false) => {
      const cal = dataRef.current.teamCalendars?.[teamId];
      if (!cal || (!cal.unposted && !force)) return;
      await backend.postCalendar({ teamId, events: cal.events, lightDates: cal.lightDates });
      mutate((d) => ({ ...d, teamCalendars: { ...(d.teamCalendars ?? {}), [teamId]: { ...cal, unposted: false } } }));
    },
    [mutate],
  );

  const postProgram = useCallback(
    async (teamId: string, groupKey: string) => {
      const local = dataRef.current.programs.find((p) => p.id === teamProgramId(teamId, groupKey));
      if (!local) throw new BackendError('Build a workout for this group first.');
      const team = teamsRef.current.find((t) => t.id === teamId);
      // The calendar travels separately (team_calendars); per-date lift choices stay with the program.
      const { unposted: _u, postedAt: _p, lightDates: _l, ...program } = local;
      const tp = await backend.postProgram(teamId, groupKey, { ...program, author: accountRef.current?.name, forName: team?.name });
      mutate((d) => ({
        ...d,
        programs: d.programs.map((p) => (p.id === local.id ? { ...p, unposted: false, postedAt: tp.updatedAt } : p)),
      }));
      setPosted((s) => ({ ...s, [postedKey(teamId, groupKey)]: tp }));
    },
    [mutate],
  );

  /** Update the coach's local team calendar and copy it onto every program of that team. */
  const writeCalendar = useCallback(
    (teamId: string, fn: (c: LocalTeamCalendar) => LocalTeamCalendar, unposted: boolean) => {
      mutate((d) => {
        const cur = d.teamCalendars?.[teamId] ?? { events: [], lightDates: {} };
        const next = { ...fn(cur), unposted };
        return {
          ...d,
          teamCalendars: { ...(d.teamCalendars ?? {}), [teamId]: next },
          programs: d.programs.map((p) => (p.teamId === teamId ? { ...p, events: next.events, lightDates: lightFor(next, p.groupKey ?? ALL) } : p)),
        };
      });
    },
    [mutate],
  );

  /** Forget the account's team data on this device (sign out / account deleted). */
  const clearTeamState = useCallback(() => {
    setAccount(null);
    setTeams([]);
    setMembers({});
    setGroups({});
    setLogs({});
    setReadiness({});
    setPosted({});
    setAttendance({});
    setTestSessions({});
    setTestResults({});
    mutate((d) => {
      const programs = d.programs.filter((p) => !p.teamId);
      return {
        ...d,
        programs,
        teamCalendars: {},
        teamConsent: {},
        activeProgramId: programs.some((p) => p.id === d.activeProgramId) ? d.activeProgramId : null,
      };
    });
  }, [mutate]);

  const value = useMemo<TeamState>(
    () => ({
      account,
      checked,
      teams,
      members,
      groups,
      logs,
      readiness,
      postedFor: (teamId, groupKey = ALL) => posted[postedKey(teamId, groupKey)],
      syncing,
      lastError,
      refresh,
      async signUp(input) {
        const a = await backend.signUp(input);
        setAccount(a);
        return a;
      },
      async signIn(email, password) {
        const a = await backend.signIn(email, password);
        setAccount(a);
        return a;
      },
      async signOut() {
        await backend.signOut();
        clearTeamState();
      },
      async deleteAccount() {
        await backend.deleteMyAccount();
        clearTeamState();
      },
      consentFor(teamId) {
        if (!teamId) return undefined;
        return teams.find((t) => t.id === teamId)?.myPerms ?? data.teamConsent?.[teamId];
      },
      async recordConsent(teamId, userId, perms) {
        await backend.recordConsent(teamId, userId, perms);
        await refresh();
      },
      async setMyChoices(p) {
        await backend.setMyChoices(p);
        await refresh();
      },
      async setBoardNameMode(mode) {
        const a = await backend.setBoardNameMode(mode);
        setAccount(a);
      },
      async updateTeamSettings(teamId, patch) {
        await backend.updateTeamSettings(teamId, patch);
        await refresh();
      },
      shareLiveProgress(p) {
        const team = teams.find((x) => x.id === p.teamId);
        if (!team?.myPerms?.boards) return;
        backend.shareLiveProgress(p).catch(() => {}); // the board is best-effort
      },
      attendance,
      async markAttendance(a) {
        await backend.markAttendance(a);
        const list = await backend.listAttendance(a.teamId, dateKey(new Date(Date.now() - 2 * 864e5)));
        setAttendance((s) => ({ ...s, [a.teamId]: list }));
      },
      testSessions,
      async confirmSupervision(teamId, day, battery) {
        const ts = await backend.confirmSupervision(teamId, day, battery);
        setTestSessions((s) => ({ ...s, [teamId]: ts }));
      },
      testResults,
      async addTestResult(r) {
        const saved = await backend.addTestResult(r);
        setTestResults((s) => {
          const next = { ...s, [r.teamId]: [...(s[r.teamId] ?? []), saved] };
          if (accountRef.current?.role === 'athlete') mutate((d) => ({ ...d, strengthEstimates: latestEstimates(Object.values(next).flat()) }));
          return next;
        });
        return saved;
      },
      async updateTestResult(teamId, id, patch) {
        await backend.updateTestResult(id, patch);
        const list = await backend.listTestResults(teamId);
        setTestResults((s) => ({ ...s, [teamId]: list }));
      },
      async createTeam(name) {
        const t = await backend.createTeam(name);
        await refresh();
        return t;
      },
      async renameTeam(teamId, name) {
        await backend.renameTeam(teamId, name);
        await refresh();
      },
      async deleteTeam(teamId) {
        await backend.deleteTeam(teamId);
        await refresh();
      },
      async removeMember(teamId, userId) {
        await backend.removeMember(teamId, userId);
        await refresh();
      },
      async joinTeam(code) {
        const t = await backend.joinTeam(code);
        await refresh();
        return t;
      },
      async leaveTeam(teamId) {
        await backend.leaveTeam(teamId);
        await refresh();
      },
      async postTeamProgram(teamId, groupKey = ALL) {
        await postCalendarIfNeeded(teamId);
        await postProgram(teamId, groupKey);
      },
      async postTeam(teamId) {
        await postCalendarIfNeeded(teamId);
        const unposted = dataRef.current.programs.filter((p) => p.teamId === teamId && (p.unposted || !posted[postedKey(teamId, p.groupKey ?? ALL)]));
        for (const p of unposted) await postProgram(teamId, p.groupKey ?? ALL);
      },
      hasUnposted(teamId) {
        if (data.teamCalendars?.[teamId]?.unposted) return true;
        return data.programs.some((p) => p.teamId === teamId && (p.unposted || !posted[postedKey(teamId, p.groupKey ?? ALL)]));
      },
      async createGroup(teamId, name, positionHint) {
        const g = await backend.createGroup(teamId, name, positionHint);
        await refresh();
        return g;
      },
      async renameGroup(groupId, name) {
        await backend.renameGroup(groupId, name);
        await refresh();
      },
      async deleteGroup(groupId) {
        await backend.deleteGroup(groupId);
        await refresh();
      },
      async assignGroup(teamId, userId, groupId) {
        await backend.assignGroup(teamId, userId, groupId);
        await refresh();
      },
      async autoGroupByPosition(teamId) {
        const existing = await backend.listGroups(teamId);
        const roster = await backend.listMembers(teamId);
        for (const pg of POSITION_GROUPS) {
          let g = existing.find((x) => x.name === pg.name);
          if (!g) g = await backend.createGroup(teamId, pg.name, pg.positions.join(','));
          for (const m of roster) {
            if (!m.groupId && m.position && pg.positions.includes(m.position)) await backend.assignGroup(teamId, m.userId, g.id);
          }
        }
        await refresh();
      },
      setTeamEvents(teamId, events) {
        writeCalendar(teamId, (c) => ({ ...c, events }), true);
      },
      async setLightDay(teamId, groupKey, day, light) {
        const cur = dataRef.current.teamCalendars?.[teamId] ?? { events: [], lightDates: {} };
        const list = new Set(cur.lightDates[groupKey] ?? []);
        if (light) list.add(day);
        else list.delete(day);
        const next: LocalTeamCalendar = { events: cur.events, lightDates: { ...cur.lightDates, [groupKey]: [...list].sort() } };
        writeCalendar(teamId, () => next, true);
        // The coach's decision goes out right away.
        await backend.postCalendar({ teamId, events: next.events, lightDates: next.lightDates });
        writeCalendar(teamId, () => next, false);
      },
      checkIn(entry) {
        mutate((d) => ({
          ...d,
          readinessLog: [...(d.readinessLog ?? []).filter((r) => r.day !== entry.day), { ...entry, sentTo: [] }].slice(-60),
        }));
      },
    }),
    [account, checked, teams, members, groups, logs, readiness, posted, attendance, testSessions, testResults, syncing, lastError, refresh, mutate, data, postCalendarIfNeeded, postProgram, writeCalendar, clearTeamState],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Latest non-voided estimate per tested lift (exercise id → e1RM). Later tests replace earlier ones. */
export function latestEstimates(results: TestResult[]): Record<string, { e1rm: number; day: string }> {
  const out: Record<string, { e1rm: number; day: string }> = {};
  for (const r of [...results].sort((a, b) => a.day.localeCompare(b.day))) {
    if (r.voided || r.e1rm == null) continue;
    out[r.testId] = { e1rm: r.e1rm, day: r.day };
  }
  return out;
}

export function useTeams(): TeamState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useTeams must be used inside TeamProvider');
  return v;
}
