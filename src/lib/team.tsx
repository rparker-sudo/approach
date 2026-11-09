import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { Account, backend, BackendError, Member, SignUpInput, Team, TeamLog, TeamProgram } from './backend';
import { useStore } from './store';
import type { AppData, Program } from './types';

/**
 * Team sync: keeps this device in step with the server.
 *  - Athletes: each joined team's posted workout is mirrored into their programs
 *    (id "team-<teamId>") and becomes their active plan. Logged workouts are sent up.
 *  - Coaches: teams, rosters, posted workouts and recent athlete logs.
 */

export const teamProgramId = (teamId: string) => `team-${teamId}`;

type TeamState = {
  account: Account | null;
  checked: boolean;
  teams: Team[];
  members: Record<string, Member[]>;
  logs: Record<string, TeamLog[]>;
  posted: Record<string, TeamProgram>;
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
  /** Coach: send the local copy of a team workout to every athlete on the roster. */
  postTeamProgram: (teamId: string) => Promise<void>;
};

const Ctx = createContext<TeamState | null>(null);

const LOG_WINDOW_DAYS = 28;

function message(e: unknown) {
  return e instanceof BackendError || e instanceof Error ? e.message : 'Something went wrong.';
}

/** Mirror posted team workouts into local programs. */
function applyPosted(d: AppData, role: 'coach' | 'athlete', teams: Team[], posted: TeamProgram[]): AppData {
  const teamIds = new Set(teams.map((t) => t.id));
  let programs = d.programs.filter((p) => !p.teamId || teamIds.has(p.teamId)); // drop teams you left / deleted
  for (const tp of posted) {
    const team = teams.find((t) => t.id === tp.teamId);
    const id = teamProgramId(tp.teamId);
    const local = programs.find((p) => p.id === id);
    if (role === 'coach' && local?.unposted) continue; // keep the coach's unposted edits
    if (local?.postedAt === tp.updatedAt && !local.unposted) continue;
    const mirrored: Program = {
      ...tp.program,
      id,
      teamId: tp.teamId,
      teamName: team?.name,
      author: team?.coachName ?? tp.program.author,
      postedAt: tp.updatedAt,
      unposted: false,
    };
    programs = local ? programs.map((p) => (p.id === id ? mirrored : p)) : [mirrored, ...programs];
  }
  let activeProgramId = d.activeProgramId;
  if (!programs.some((p) => p.id === activeProgramId)) activeProgramId = null;
  if (role === 'athlete') {
    const firstTeamProgram = programs.find((p) => p.teamId);
    // A team workout takes over as the plan unless the athlete already follows another team's plan.
    const active = programs.find((p) => p.id === activeProgramId);
    if (firstTeamProgram && !active?.teamId) activeProgramId = firstTeamProgram.id;
  }
  return { ...d, programs, activeProgramId };
}

export function TeamProvider({ children }: { children: ReactNode }) {
  const store = useStore();
  const { mutate, data } = store;
  const [account, setAccount] = useState<Account | null>(null);
  const [checked, setChecked] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [members, setMembers] = useState<Record<string, Member[]>>({});
  const [logs, setLogs] = useState<Record<string, TeamLog[]>>({});
  const [posted, setPosted] = useState<Record<string, TeamProgram>>({});
  const [syncing, setSyncing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const accountRef = useRef<Account | null>(null);
  accountRef.current = account;
  const dataRef = useRef(data);
  dataRef.current = data;

  const flushLogs = useCallback(async () => {
    const pending = dataRef.current.logs.filter((l) => l.teamId && !l.synced);
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

  const refresh = useCallback(async () => {
    const acct = accountRef.current;
    if (!acct) return;
    setSyncing(true);
    try {
      const t = await backend.listMyTeams();
      const tps = await backend.getPrograms(t.map((x) => x.id));
      setTeams(t);
      setPosted(Object.fromEntries(tps.map((p) => [p.teamId, p])));
      mutate((d) => applyPosted(d, acct.role, t, tps));
      if (acct.role === 'coach') {
        const since = new Date(Date.now() - LOG_WINDOW_DAYS * 864e5).toISOString();
        const [m, l] = await Promise.all([
          Promise.all(t.map((x) => backend.listMembers(x.id))),
          Promise.all(t.map((x) => backend.listTeamLogs(x.id, since))),
        ]);
        setMembers(Object.fromEntries(t.map((x, i) => [x.id, m[i]])));
        setLogs(Object.fromEntries(t.map((x, i) => [x.id, l[i]])));
      } else {
        await flushLogs();
      }
      setLastError(null);
    } catch (e) {
      setLastError(message(e));
    } finally {
      setSyncing(false);
    }
  }, [mutate, flushLogs]);

  // Restore the signed-in account on launch.
  useEffect(() => {
    backend
      .getAccount()
      .then((a) => setAccount(a))
      .catch(() => setAccount(null))
      .finally(() => setChecked(true));
  }, []);

  // The signed-in account decides coach vs athlete mode on this device.
  useEffect(() => {
    if (!account) return;
    mutate((d) =>
      d.profile && (d.profile.role !== account.role || (account.name && d.profile.name !== account.name))
        ? { ...d, profile: { ...d.profile, role: account.role, name: account.name || d.profile.name } }
        : d,
    );
  }, [account, mutate]);

  // Refresh when the account changes and whenever the app comes back to the foreground.
  useEffect(() => {
    if (!account) return;
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

  // Send newly logged team workouts right away.
  const pendingCount = data.logs.filter((l) => l.teamId && !l.synced).length;
  useEffect(() => {
    if (account?.role === 'athlete' && pendingCount > 0) flushLogs();
  }, [account, pendingCount, flushLogs]);

  const value = useMemo<TeamState>(
    () => ({
      account,
      checked,
      teams,
      members,
      logs,
      posted,
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
        setAccount(null);
        setTeams([]);
        setMembers({});
        setLogs({});
        setPosted({});
        mutate((d) => {
          const programs = d.programs.filter((p) => !p.teamId);
          return {
            ...d,
            programs,
            activeProgramId: programs.some((p) => p.id === d.activeProgramId) ? d.activeProgramId : null,
          };
        });
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
      async postTeamProgram(teamId) {
        const local = dataRef.current.programs.find((p) => p.id === teamProgramId(teamId));
        if (!local) throw new BackendError('Build a workout for this team first.');
        const team = teams.find((t) => t.id === teamId);
        const { unposted: _u, postedAt: _p, ...program } = local;
        const tp = await backend.postProgram(teamId, { ...program, author: account?.name, forName: team?.name });
        mutate((d) => ({
          ...d,
          programs: d.programs.map((p) => (p.id === local.id ? { ...p, unposted: false, postedAt: tp.updatedAt } : p)),
        }));
        setPosted((s) => ({ ...s, [teamId]: tp }));
      },
    }),
    [account, checked, teams, members, logs, posted, syncing, lastError, refresh, mutate],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTeams(): TeamState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useTeams must be used inside TeamProvider');
  return v;
}
