import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import type { CalendarEvent, Position, Program, Role, WorkoutLog } from '../types';
import {
  Account,
  Backend,
  Attendance,
  BackendError,
  BoardMember,
  DEFAULT_TEAM_SETTINGS,
  EffortInput,
  Group,
  LiveProgress,
  NO_PERMS,
  normalizePerms,
  Perms,
  permsFromStatus,
  TeamSettings,
  TestResult,
  TestSession,
  makeJoinCode,
  Member,
  normalizeCode,
  setsDone,
  Readiness,
  Team,
  TeamCalendar,
  TeamLog,
  TeamProgram,
} from './types';

if (Platform.OS !== 'web') {
  // Supabase needs a full URL implementation on iOS/Android (loaded only off the web).
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('react-native-url-polyfill/auto');
}

type ProfileRow = {
  id: string;
  name: string;
  role: Role;
  position: string | null;
  birth_year?: number | null;
  is_minor?: boolean | null;
  board_name_mode?: 'short' | 'initials' | 'hidden';
};
type TeamRow = {
  id: string;
  name: string;
  join_code: string;
  coach_id: string;
  created_at: string;
  coach?: { name: string } | null;
  practice_min?: number;
  match_min?: number;
  tournament_min?: number;
  effort_board?: boolean;
  board_effort_panel?: boolean;
  team_goal?: number | null;
  med_ball_lb?: number | string;
};

/** team_members permission columns (migration 004). */
type PermRow = {
  c_participation?: boolean;
  c_checkins?: boolean;
  c_share_checkins?: boolean;
  c_boards?: boolean;
  c_attendance?: boolean;
  c_testing?: boolean;
  consent_version?: number | null;
  consent_status?: string;
};
const PERM_COLS = 'c_participation,c_checkins,c_share_checkins,c_boards,c_attendance,c_testing,consent_version';
function permsOf(r: PermRow, isMinor: boolean | null | undefined): { perms: Perms; version: number | null } {
  if (r.c_participation !== undefined) {
    return {
      perms: {
        participation: !!r.c_participation,
        checkins: !!r.c_checkins,
        shareCheckins: !!r.c_share_checkins,
        boards: !!r.c_boards,
        attendance: !!r.c_attendance,
        testing: !!r.c_testing,
      },
      version: r.consent_version ?? null,
    };
  }
  // Database without migration 004: map pass 1's status (or, before 003, treat everyone as waiting).
  const perms = permsFromStatus(r.consent_status, r.consent_status === undefined ? true : isMinor);
  return { perms, version: r.consent_status === 'training_only' || r.consent_status === 'full' ? 1 : null };
}

/** True after any call hit a table/column/function that only exists once the 2.0 or 2.1 migration has run. */
let missingUpdate = false;
const MISSING = /does not exist|could not find the (table|column)|schema cache/i;
function isMissing(error: { message: string } | null | undefined) {
  if (error && MISSING.test(error.message)) {
    missingUpdate = true;
    return true;
  }
  return false;
}

function fail(error: { message: string } | null, fallback?: string): never {
  const msg = error?.message ?? fallback ?? 'Something went wrong.';
  if (MISSING.test(msg)) {
    missingUpdate = true;
    throw new BackendError(
      'Your database needs the 2.1 update. In Supabase, run the files in supabase/migrations you haven\'t run yet (see "Upgrading" in the README).',
    );
  }
  if (/invalid login credentials/i.test(msg)) throw new BackendError("Email or password doesn't match.");
  if (/already registered/i.test(msg)) throw new BackendError('That email already has an account. Sign in instead.');
  if (/email not confirmed/i.test(msg)) throw new BackendError('Check your email and tap the confirm link, then sign in.');
  if (/invalid path specified/i.test(msg)) {
    throw new BackendError(
      "The app's server address is set up wrong. In Supabase, copy the Project URL (just https://….supabase.co) and update it in GitHub secrets and .env.",
    );
  }
  if (/invalid api key|no api key/i.test(msg)) {
    throw new BackendError("The app's Supabase key is wrong. Copy the anon (or Publishable) key again and update it in GitHub secrets and .env.");
  }
  if (/failed to fetch|network/i.test(msg)) throw new BackendError("Couldn't reach the server. Check your connection and try again.");
  throw new BackendError(msg);
}

function toTeam(r: TeamRow): Team {
  const d = DEFAULT_TEAM_SETTINGS;
  const settings: TeamSettings = {
    practiceMin: r.practice_min ?? d.practiceMin,
    matchMin: r.match_min ?? d.matchMin,
    tournamentMin: r.tournament_min ?? d.tournamentMin,
    effortBoard: r.effort_board ?? d.effortBoard,
    boardEffortPanel: r.board_effort_panel ?? d.boardEffortPanel,
    teamGoal: r.team_goal ?? d.teamGoal,
    medBallLb: r.med_ball_lb != null ? Number(r.med_ball_lb) : d.medBallLb,
  };
  return { id: r.id, name: r.name, joinCode: r.join_code, coachId: r.coach_id, coachName: r.coach?.name, createdAt: r.created_at, settings };
}

const SETTINGS_COLS: Record<keyof TeamSettings, string> = {
  practiceMin: 'practice_min',
  matchMin: 'match_min',
  tournamentMin: 'tournament_min',
  effortBoard: 'effort_board',
  boardEffortPanel: 'board_effort_panel',
  teamGoal: 'team_goal',
  medBallLb: 'med_ball_lb',
};

type TestRow = {
  id: string;
  team_id: string;
  user_id: string;
  day: string;
  test_id: TestResult['testId'];
  value: number | string;
  unit: TestResult['unit'];
  reps: number | null;
  e1rm: number | string | null;
  voided: boolean;
};
const TEST_COLS = 'id,team_id,user_id,day,test_id,value,unit,reps,e1rm,voided';
function toTest(r: TestRow): TestResult {
  return {
    id: r.id,
    teamId: r.team_id,
    userId: r.user_id,
    day: r.day,
    testId: r.test_id,
    value: Number(r.value),
    unit: r.unit,
    reps: r.reps,
    e1rm: r.e1rm != null ? Number(r.e1rm) : null,
    voided: r.voided,
  };
}

export function createSupabaseBackend(url: string, anonKey: string): Backend {
  const sb: SupabaseClient = createClient(url, anonKey, {
    auth: {
      storage: AsyncStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });

  async function userId(): Promise<string> {
    const { data } = await sb.auth.getSession();
    const id = data.session?.user.id;
    if (!id) throw new BackendError('Sign in first.');
    return id;
  }

  async function profile(id: string): Promise<ProfileRow> {
    let { data, error } = await sb.from('profiles').select('id,name,role,position,birth_year,is_minor,board_name_mode').eq('id', id).single<ProfileRow>();
    if (isMissing(error)) ({ data, error } = await sb.from('profiles').select('id,name,role,position,birth_year,is_minor').eq('id', id).single<ProfileRow>());
    if (isMissing(error)) ({ data, error } = await sb.from('profiles').select('id,name,role,position').eq('id', id).single<ProfileRow>());
    if (error || !data) fail(error, 'Your profile was not found.');
    return data;
  }

  async function account(id: string, email: string): Promise<Account> {
    const data = await profile(id);
    return {
      id,
      email,
      name: data.name,
      role: data.role,
      position: (data.position as Position) ?? null,
      birthYear: data.birth_year ?? null,
      isMinor: data.is_minor ?? null,
      boardNameMode: data.board_name_mode ?? 'short',
    };
  }

  // teams↔profiles has several links (coach, roster, workout logs); name the coach one explicitly.
  const TEAM_BASE = 'id,name,join_code,coach_id,created_at,coach:profiles!teams_coach_id_fkey(name)';
  const TEAM_P2 = `${TEAM_BASE},practice_min,match_min,tournament_min,effort_board,board_effort_panel,team_goal,med_ball_lb`;
  // Falls back to the 2.1 columns until migration 004 has run.
  let TEAM_SELECT = TEAM_P2;
  async function withTeamCols<T extends { error: { message: string } | null }>(run: (cols: string) => PromiseLike<T>): Promise<T> {
    const res = await run(TEAM_SELECT);
    if (TEAM_SELECT === TEAM_P2 && isMissing(res.error)) {
      TEAM_SELECT = TEAM_BASE;
      return run(TEAM_SELECT);
    }
    return res;
  }

  return {
    mode: 'supabase',
    needsUpdate: () => missingUpdate,

    async getAccount() {
      const { data } = await sb.auth.getSession();
      const u = data.session?.user;
      if (!u) return null;
      try {
        return await account(u.id, u.email ?? '');
      } catch {
        return null;
      }
    },

    async signUp({ email, password, name, role, position, birthYear, isMinor }) {
      const { data, error } = await sb.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        // Birth year and under-18 only (never a full date); handle_new_user copies them to profiles.
        options: { data: { name: name.trim(), role, position: position ?? null, birth_year: birthYear, is_minor: isMinor } },
      });
      if (error) fail(error);
      if (!data.session || !data.user) {
        throw new BackendError('Check your email and tap the confirm link, then sign in.');
      }
      return account(data.user.id, data.user.email ?? email);
    },

    async signIn(email, password) {
      const { data, error } = await sb.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      if (error || !data.user) fail(error);
      return account(data.user.id, data.user.email ?? email);
    },

    async signOut() {
      await sb.auth.signOut();
    },

    async updateAccount(patch) {
      const id = await userId();
      const { error } = await sb.from('profiles').update(patch).eq('id', id);
      if (error) fail(error);
      const { data } = await sb.auth.getSession();
      return account(id, data.session?.user.email ?? '');
    },

    async setBirthYear(year, isMinor) {
      const id = await userId();
      const { error } = await sb.rpc('set_my_birth_year', { y: year, client_minor: isMinor });
      if (error) fail(error);
      const { data } = await sb.auth.getSession();
      return account(id, data.session?.user.email ?? '');
    },

    async deleteMyAccount() {
      await userId();
      const { error } = await sb.rpc('delete_my_account');
      if (error) fail(error);
      // The login no longer exists on the server; just forget the session on this device.
      await sb.auth.signOut({ scope: 'local' }).catch(() => {});
    },

    async listMyTeams() {
      const id = await userId();
      const me = await profile(id);
      if (me.role === 'coach') {
        const { data, error } = await withTeamCols((cols) => sb.from('teams').select(cols).eq('coach_id', id).order('created_at'));
        if (error) fail(error);
        return (data as unknown as TeamRow[]).map(toTeam);
      }
      // team_members has one link to teams (team_id), so this embed is unambiguous.
      type Res = { data: unknown; error: { message: string } | null };
      const embed = (cols: string) => `team:teams!team_members_team_id_fkey(${cols})`;
      let { data, error }: Res = await withTeamCols((cols) => sb.from('team_members').select(`group_id,${PERM_COLS},${embed(cols)}`).eq('user_id', id));
      if (isMissing(error)) ({ data, error } = (await sb.from('team_members').select(`group_id,consent_status,${embed(TEAM_SELECT)}`).eq('user_id', id)) as Res);
      if (isMissing(error)) ({ data, error } = (await sb.from('team_members').select(`group_id,${embed(TEAM_SELECT)}`).eq('user_id', id)) as Res);
      if (isMissing(error)) ({ data, error } = (await sb.from('team_members').select(embed(TEAM_SELECT)).eq('user_id', id)) as Res);
      if (error) fail(error);
      // Without the consent columns (older database) a minor or unknown age stays read-only.
      return (data as unknown as (PermRow & { group_id?: string | null; team: TeamRow | null })[])
        .filter((r) => r.team)
        .map((r) => {
          const { perms, version } = permsOf(r, me.is_minor);
          return { ...toTeam(r.team!), myGroupId: r.group_id ?? null, myPerms: perms, myConsentVersion: version };
        });
    },

    async createTeam(name) {
      const id = await userId();
      for (let attempt = 0; attempt < 5; attempt++) {
        const { data, error } = await withTeamCols((cols) =>
          sb.from('teams').insert({ name: name.trim(), join_code: makeJoinCode(), coach_id: id }).select(cols).single(),
        );
        if (!error) return toTeam(data as unknown as TeamRow);
        if (!/duplicate key/i.test(error.message)) fail(error); // retry only on a join-code clash
      }
      throw new BackendError("Couldn't create a unique team code. Try again.");
    },

    async renameTeam(teamId, name) {
      const { error } = await sb.from('teams').update({ name: name.trim() }).eq('id', teamId);
      if (error) fail(error);
    },

    async deleteTeam(teamId) {
      const { error } = await sb.from('teams').delete().eq('id', teamId);
      if (error) fail(error);
    },

    async listMembers(teamId) {
      type Row = {
        user_id: string;
        joined_at: string;
        group_id: string | null;
        profile: { name: string; position: string | null; is_minor?: boolean | null } | null;
      } & PermRow;
      type Res = { data: unknown; error: { message: string } | null };
      let { data, error }: Res = await sb
        .from('team_members')
        .select(`user_id,joined_at,group_id,${PERM_COLS},profile:profiles!team_members_user_id_fkey(name,position,is_minor)`)
        .eq('team_id', teamId)
        .order('joined_at');
      if (isMissing(error)) {
        ({ data, error } = (await sb
          .from('team_members')
          .select('user_id,joined_at,group_id,consent_status,profile:profiles!team_members_user_id_fkey(name,position,is_minor)')
          .eq('team_id', teamId)
          .order('joined_at')) as Res);
      }
      if (isMissing(error)) {
        ({ data, error } = (await sb
          .from('team_members')
          .select('user_id,joined_at,group_id,profile:profiles!team_members_user_id_fkey(name,position)')
          .eq('team_id', teamId)
          .order('joined_at')) as Res);
      }
      if (isMissing(error)) {
        const old = await sb.from('team_members').select('user_id,joined_at,profile:profiles!team_members_user_id_fkey(name,position)').eq('team_id', teamId).order('joined_at');
        if (old.error) fail(old.error);
        return (old.data as unknown as { user_id: string; joined_at: string; profile: { name: string; position: string | null } | null }[]).map(
          (r): Member => ({
            userId: r.user_id,
            name: r.profile?.name || 'Athlete',
            position: (r.profile?.position as Position) ?? null,
            joinedAt: r.joined_at,
            groupId: null,
            isMinor: null,
            perms: { ...NO_PERMS },
            consentVersion: null,
          }),
        );
      }
      if (error) fail(error);
      return (data as unknown as Row[]).map(
        (r): Member => ({
          userId: r.user_id,
          name: r.profile?.name || 'Athlete',
          position: (r.profile?.position as Position) ?? null,
          joinedAt: r.joined_at,
          groupId: r.group_id,
          isMinor: r.profile?.is_minor ?? null,
          ...(() => {
            const { perms, version } = permsOf(r, r.profile?.is_minor);
            return { perms, consentVersion: version };
          })(),
        }),
      );
    },

    async recordConsent(teamId, memberId, perms) {
      const p = normalizePerms(perms);
      const { error } = await sb.rpc('record_consent', {
        t: teamId,
        athlete: memberId,
        participation: p.participation,
        checkins: p.checkins,
        share_checkins: p.shareCheckins,
        boards: p.boards,
        attendance: p.attendance,
        testing: p.testing,
      });
      if (error) fail(error);
    },

    async setMyChoices(p) {
      const { error } = await sb.rpc('set_my_choices', {
        checkins: p.checkins,
        share_checkins: p.checkins && p.shareCheckins,
        boards: p.boards,
        attendance: p.attendance,
        testing: p.testing,
      });
      if (error) fail(error);
    },

    async setBoardNameMode(mode) {
      const id = await userId();
      const { error } = await sb.from('profiles').update({ board_name_mode: mode }).eq('id', id);
      if (error) fail(error);
      const { data } = await sb.auth.getSession();
      return account(id, data.session?.user.email ?? '');
    },

    async updateTeamSettings(teamId, patch) {
      const row = Object.fromEntries(Object.entries(patch).map(([k, v]) => [SETTINGS_COLS[k as keyof TeamSettings], v]));
      const { error } = await sb.from('teams').update(row).eq('id', teamId);
      if (error) fail(error);
    },

    async boardMembers(teamId) {
      const { data, error } = await sb.rpc('board_members', { t: teamId });
      if (isMissing(error)) return [];
      if (error) fail(error);
      return (data as { user_id: string; board_name: string; group_id: string | null }[]).map(
        (r): BoardMember => ({ userId: r.user_id, boardName: r.board_name, groupId: r.group_id }),
      );
    },

    async shareLiveProgress(p) {
      const { error } = await sb.from('live_progress').upsert(
        {
          team_id: p.teamId,
          day: p.day,
          session_id: p.sessionId,
          sets_done: p.setsDone,
          sets_total: p.setsTotal,
          status: p.status,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'team_id,user_id,day' },
      );
      if (isMissing(error)) return;
      if (error) fail(error);
    },

    async listLiveProgress(teamId, day) {
      // Sets only. Never weights.
      const { data, error } = await sb
        .from('live_progress')
        .select('team_id,user_id,day,session_id,sets_done,sets_total,status,updated_at')
        .eq('team_id', teamId)
        .eq('day', day);
      if (isMissing(error)) return [];
      if (error) fail(error);
      return (
        data as { team_id: string; user_id: string; day: string; session_id: string | null; sets_done: number; sets_total: number; status: LiveProgress['status']; updated_at: string }[]
      ).map((r) => ({
        teamId: r.team_id,
        userId: r.user_id,
        day: r.day,
        sessionId: r.session_id,
        setsDone: r.sets_done,
        setsTotal: r.sets_total,
        status: r.status,
        updatedAt: r.updated_at,
      }));
    },

    async bestsSince(teamId, sinceIso) {
      // Only who hit a best, never what weight.
      const { data, error } = await sb.from('workout_logs').select('user_id,pr_count').eq('team_id', teamId).gte('logged_at', sinceIso).gt('pr_count', 0);
      if (isMissing(error)) return {};
      if (error) fail(error);
      const out: Record<string, number> = {};
      for (const r of data as { user_id: string; pr_count: number }[]) out[r.user_id] = (out[r.user_id] ?? 0) + r.pr_count;
      return out;
    },

    async teamEffort(teamId, since) {
      const { data, error } = await sb.rpc('team_effort', { t: teamId, since });
      if (isMissing(error)) return [];
      if (error) fail(error);
      return (
        data as {
          user_id: string;
          board_name: string;
          group_id: string | null;
          is_me: boolean;
          logs: EffortInput['logs'] | null;
          attendance: EffortInput['attendance'];
          improvement: number | string | null;
        }[]
      ).map((r) => ({
        userId: r.user_id,
        boardName: r.board_name,
        groupId: r.group_id,
        isMe: r.is_me,
        logs: r.logs ?? [],
        attendance: r.attendance,
        improvement: r.improvement != null ? Number(r.improvement) : null,
      }));
    },

    subscribeBoard(teamId, onChange, onStatus) {
      const channel = sb
        .channel(`board-${teamId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'live_progress', filter: `team_id=eq.${teamId}` }, onChange)
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') onStatus?.(true);
          else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') onStatus?.(false);
        });
      return () => {
        sb.removeChannel(channel);
      };
    },

    async markAttendance(a) {
      const me = await userId();
      if (a.minutes == null && a.userId === me) {
        const { error } = await sb.from('attendance').delete().eq('team_id', a.teamId).eq('user_id', a.userId).eq('day', a.day).eq('kind', a.kind);
        if (error) fail(error);
        return;
      }
      const { error } = await sb.from('attendance').upsert(
        { team_id: a.teamId, user_id: a.userId, day: a.day, kind: a.kind, minutes: a.minutes ?? 0, marked_by: me },
        { onConflict: 'team_id,user_id,day,kind' },
      );
      if (error) fail(error);
    },

    async listAttendance(teamId, since) {
      const { data, error } = await sb.from('attendance').select('team_id,user_id,day,kind,minutes,marked_by').eq('team_id', teamId).gte('day', since);
      if (isMissing(error)) return [];
      if (error) fail(error);
      return (data as { team_id: string; user_id: string; day: string; kind: Attendance['kind']; minutes: number; marked_by: string | null }[]).map((r) => ({
        teamId: r.team_id,
        userId: r.user_id,
        day: r.day,
        kind: r.kind,
        minutes: r.minutes,
        markedBy: r.marked_by,
      }));
    },

    async confirmSupervision(teamId, day, battery) {
      const coachId = await userId();
      const { data, error } = await sb
        .from('test_sessions')
        .upsert({ team_id: teamId, group_key: 'all', day, coach_id: coachId, battery }, { onConflict: 'team_id,group_key,day', ignoreDuplicates: true })
        .select('team_id,group_key,day,coach_id,confirmed_at,battery');
      if (error) fail(error);
      const row = (data as { team_id: string; group_key: string; day: string; coach_id: string; confirmed_at: string; battery: TestSession['battery'] }[])[0];
      if (row) return { teamId: row.team_id, groupKey: row.group_key, day: row.day, coachId: row.coach_id, confirmedAt: row.confirmed_at, battery: row.battery };
      return (await this.getTestSessions([teamId], day))[0];
    },

    async getTestSessions(teamIds, day) {
      if (!teamIds.length) return [];
      const { data, error } = await sb.from('test_sessions').select('team_id,group_key,day,coach_id,confirmed_at,battery').in('team_id', teamIds).eq('day', day);
      if (isMissing(error)) return [];
      if (error) fail(error);
      return (data as { team_id: string; group_key: string; day: string; coach_id: string; confirmed_at: string; battery: TestSession['battery'] }[]).map((r) => ({
        teamId: r.team_id,
        groupKey: r.group_key,
        day: r.day,
        coachId: r.coach_id,
        confirmedAt: r.confirmed_at,
        battery: r.battery,
      }));
    },

    async addTestResult(t) {
      const { data, error } = await sb
        .from('test_results')
        .insert({ team_id: t.teamId, user_id: t.userId, day: t.day, test_id: t.testId, value: t.value, unit: t.unit, reps: t.reps })
        .select(TEST_COLS)
        .single();
      if (error) {
        if (/row-level security/i.test(error.message)) {
          throw new BackendError(t.reps != null ? 'Strength checks open when your coach confirms they\'re supervising.' : 'Testing isn\'t turned on for you on this team.');
        }
        fail(error);
      }
      return toTest(data as TestRow);
    },

    async listTestResults(teamId, forUser) {
      let q = sb.from('test_results').select(TEST_COLS).eq('team_id', teamId).order('day');
      if (forUser) q = q.eq('user_id', forUser);
      const { data, error } = await q;
      if (isMissing(error)) return [];
      if (error) fail(error);
      return (data as TestRow[]).map(toTest);
    },

    async updateTestResult(id, patch) {
      const { error } = await sb.from('test_results').update(patch).eq('id', id);
      if (error) fail(error);
    },

    async removeMember(teamId, memberId) {
      const { error } = await sb.from('team_members').delete().eq('team_id', teamId).eq('user_id', memberId);
      if (error) fail(error);
    },

    async postProgram(teamId, groupKey, program: Program) {
      const updatedAt = new Date().toISOString();
      const { error } = await sb
        .from('team_programs')
        .upsert({ team_id: teamId, group_key: groupKey, program, updated_at: updatedAt }, { onConflict: 'team_id,group_key' });
      if (isMissing(error) && groupKey === 'all') {
        const old = await sb.from('team_programs').upsert({ team_id: teamId, program, updated_at: updatedAt });
        if (old.error) fail(old.error);
        return { teamId, groupKey, program, updatedAt };
      }
      if (error) fail(error);
      return { teamId, groupKey, program, updatedAt };
    },

    async getPrograms(teamIds) {
      if (!teamIds.length) return [];
      type Res = { data: unknown; error: { message: string } | null };
      let { data, error }: Res = await sb.from('team_programs').select('team_id,group_key,program,updated_at').in('team_id', teamIds);
      if (isMissing(error)) ({ data, error } = (await sb.from('team_programs').select('team_id,program,updated_at').in('team_id', teamIds)) as Res);
      if (error) fail(error);
      return (data as { team_id: string; group_key: string | null; program: Program; updated_at: string }[]).map(
        (r): TeamProgram => ({ teamId: r.team_id, groupKey: r.group_key ?? 'all', program: r.program, updatedAt: r.updated_at }),
      );
    },

    async listGroups(teamId) {
      const { data, error } = await sb.from('team_groups').select('id,team_id,name,position_hint').eq('team_id', teamId).order('created_at');
      if (isMissing(error)) return [];
      if (error) fail(error);
      return (data as { id: string; team_id: string; name: string; position_hint: string | null }[]).map(
        (r): Group => ({ id: r.id, teamId: r.team_id, name: r.name, positionHint: r.position_hint }),
      );
    },

    async createGroup(teamId, name, positionHint) {
      const { data, error } = await sb
        .from('team_groups')
        .insert({ team_id: teamId, name: name.trim(), position_hint: positionHint ?? null })
        .select('id,team_id,name,position_hint')
        .single();
      if (error) fail(error);
      const r = data as { id: string; team_id: string; name: string; position_hint: string | null };
      return { id: r.id, teamId: r.team_id, name: r.name, positionHint: r.position_hint };
    },

    async renameGroup(groupId, name) {
      const { error } = await sb.from('team_groups').update({ name: name.trim() }).eq('id', groupId);
      if (error) fail(error);
    },

    async deleteGroup(groupId) {
      const { data: g } = await sb.from('team_groups').select('team_id').eq('id', groupId).maybeSingle();
      const { error } = await sb.from('team_groups').delete().eq('id', groupId);
      if (error) fail(error);
      if (g) await sb.from('team_programs').delete().eq('team_id', (g as { team_id: string }).team_id).eq('group_key', groupId);
    },

    async assignGroup(teamId, memberId, groupId) {
      const { error } = await sb.from('team_members').update({ group_id: groupId }).eq('team_id', teamId).eq('user_id', memberId);
      if (error) fail(error);
    },

    async getCalendars(teamIds) {
      if (!teamIds.length) return [];
      const { data, error } = await sb.from('team_calendars').select('team_id,events,light_dates,updated_at').in('team_id', teamIds);
      if (isMissing(error)) return [];
      if (error) fail(error);
      return (data as { team_id: string; events: CalendarEvent[] | null; light_dates: Record<string, string[]> | null; updated_at: string }[]).map(
        (r): TeamCalendar => ({ teamId: r.team_id, events: r.events ?? [], lightDates: r.light_dates ?? {}, updatedAt: r.updated_at }),
      );
    },

    async postCalendar(cal) {
      const updatedAt = new Date().toISOString();
      const { error } = await sb
        .from('team_calendars')
        .upsert({ team_id: cal.teamId, events: cal.events, light_dates: cal.lightDates, updated_at: updatedAt });
      if (error) fail(error);
      return { ...cal, updatedAt };
    },

    async submitReadiness(r) {
      const { error } = await sb.from('readiness').upsert(
        {
          team_id: r.teamId,
          day: r.day,
          sleep: r.sleep,
          soreness: r.soreness,
          energy: r.energy,
          pain: r.pain,
        },
        { onConflict: 'team_id,user_id,day' },
      );
      if (isMissing(error)) return; // coach hasn't run the database update yet; nothing to send to
      if (error) fail(error);
    },

    async listReadiness(teamId, day) {
      const { data, error } = await sb
        .from('readiness')
        .select('team_id,user_id,day,sleep,soreness,energy,pain,profile:profiles!readiness_user_id_fkey(name)')
        .eq('team_id', teamId)
        .eq('day', day);
      if (isMissing(error)) return [];
      if (error) fail(error);
      return (
        data as unknown as {
          team_id: string;
          user_id: string;
          day: string;
          sleep: number;
          soreness: number;
          energy: number;
          pain: boolean;
          profile: { name: string } | null;
        }[]
      ).map(
        (r): Readiness => ({
          teamId: r.team_id,
          userId: r.user_id,
          userName: r.profile?.name || 'Athlete',
          day: r.day,
          sleep: r.sleep,
          soreness: r.soreness,
          energy: r.energy,
          pain: r.pain,
        }),
      );
    },

    async joinTeam(code) {
      const { data, error } = await sb.rpc('join_team', { code: normalizeCode(code) });
      if (error) fail(error);
      const r = data as TeamRow & { coach_name: string };
      return { ...toTeam(r), coachName: r.coach_name };
    },

    async leaveTeam(teamId) {
      const id = await userId();
      const { error } = await sb.from('team_members').delete().eq('team_id', teamId).eq('user_id', id);
      if (error) fail(error);
    },

    async addLog(log: WorkoutLog, teamId) {
      const { error } = await sb.from('workout_logs').upsert(
        {
          id: log.id,
          team_id: teamId,
          session_name: log.sessionName,
          logged_at: log.date,
          sets_done: setsDone(log),
          note: log.note ?? null,
          entries: log.entries,
          pr_count: log.prCount ?? 0,
          duration_min: log.durationMin ?? null,
        },
        { onConflict: 'id', ignoreDuplicates: true },
      );
      if (isMissing(error)) {
        // Database without migration 004: send the log without the new columns.
        const old = await sb.from('workout_logs').upsert(
          { id: log.id, team_id: teamId, session_name: log.sessionName, logged_at: log.date, sets_done: setsDone(log), note: log.note ?? null, entries: log.entries },
          { onConflict: 'id', ignoreDuplicates: true },
        );
        if (old.error) fail(old.error);
        return;
      }
      if (error) fail(error);
    },

    async listTeamLogs(teamId, sinceIso) {
      const { data, error } = await sb
        .from('workout_logs')
        .select('id,team_id,user_id,session_name,logged_at,sets_done,note,profile:profiles!workout_logs_user_id_fkey(name)')
        .eq('team_id', teamId)
        .gte('logged_at', sinceIso)
        .order('logged_at', { ascending: false })
        .limit(200);
      if (error) fail(error);
      return (
        data as unknown as {
          id: string;
          team_id: string;
          user_id: string;
          session_name: string;
          logged_at: string;
          sets_done: number;
          note: string | null;
          profile: { name: string } | null;
        }[]
      ).map(
        (r): TeamLog => ({
          id: r.id,
          teamId: r.team_id,
          userId: r.user_id,
          userName: r.profile?.name || 'Athlete',
          sessionName: r.session_name,
          date: r.logged_at,
          setsDone: r.sets_done,
          note: r.note ?? undefined,
        }),
      );
    },

    subscribe(teamIds, onChange) {
      if (!teamIds.length) return () => {};
      const filter = `team_id=in.(${teamIds.join(',')})`;
      const channel = sb
        .channel(`teams-${teamIds.join('-').slice(0, 60)}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'team_programs', filter }, onChange)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'team_members', filter }, onChange)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'team_calendars', filter }, onChange)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'team_groups', filter }, onChange)
        .subscribe();
      return () => {
        sb.removeChannel(channel);
      };
    },
  };
}
