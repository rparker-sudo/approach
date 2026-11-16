import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { COACH_TERMS_VERSION } from '../coachTerms';
import { APP_URL } from '../links';
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
  BoardTest,
  TeamCalendar,
  TeamLog,
  TeamProgram,
  TeamKind,
  clientOf,
} from './types';
import { TRAINER_TERMS_VERSION } from '../trainerTerms';

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
  accent_color?: string | null;
  kind?: TeamKind | null;
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
  // v2.2 (migration 005)
  level?: number | null;
  level_set_by?: string | null;
  level_set_at?: string | null;
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
  if (/invalid login credentials/i.test(msg)) throw new BackendError("That email and password don't match. Try again.");
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
    accentColor: r.accent_color ?? d.accentColor,
  };
  return { id: r.id, name: r.name, joinCode: r.join_code, coachId: r.coach_id, coachName: r.coach?.name, createdAt: r.created_at, settings, kind: r.kind ?? 'volleyball' };
}

const SETTINGS_COLS: Record<keyof TeamSettings, string> = {
  practiceMin: 'practice_min',
  matchMin: 'match_min',
  tournamentMin: 'tournament_min',
  effortBoard: 'effort_board',
  boardEffortPanel: 'board_effort_panel',
  teamGoal: 'team_goal',
  medBallLb: 'med_ball_lb',
  accentColor: 'accent_color',
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

  /** Coach accounts: whether the current Coach Terms are accepted (2.2.1 §8). Other users can't read these columns. */
  async function coachTermsAccepted(): Promise<boolean> {
    const { data, error } = await sb.rpc('my_coach_terms');
    if (isMissing(error)) {
      missingUpdate = true;
      return false;
    }
    if (error) return false;
    const row = (Array.isArray(data) ? data[0] : data) as { version: string | null; accepted_at: string | null; current_version: string } | undefined;
    return !!row && !!row.accepted_at && row.version === row.current_version;
  }

  async function account(id: string, email: string): Promise<Account> {
    const data = await profile(id);
    const terms = data.role === 'coach' ? await coachTermsAccepted() : undefined;
    return {
      id,
      email,
      name: data.name,
      role: data.role,
      position: (data.position as Position) ?? null,
      birthYear: data.birth_year ?? null,
      isMinor: data.is_minor ?? null,
      boardNameMode: data.board_name_mode ?? 'short',
      ...(terms === undefined ? {} : { coachTermsAccepted: terms }),
    };
  }

  // teams↔profiles has several links (coach, roster, workout logs); name the coach one explicitly.
  const TEAM_BASE = 'id,name,join_code,coach_id,created_at,coach:profiles!teams_coach_id_fkey(name)';
  const TEAM_P2 = `${TEAM_BASE},practice_min,match_min,tournament_min,effort_board,board_effort_panel,team_goal,med_ball_lb`;
  const TEAM_P3 = `${TEAM_P2},accent_color`;
  const TEAM_P4 = `${TEAM_P3},kind`;
  // Falls back to older columns until migrations 009 / 006 / 004 have run.
  let TEAM_SELECT = TEAM_P4;
  async function withTeamCols<T extends { error: { message: string } | null }>(run: (cols: string) => PromiseLike<T>): Promise<T> {
    let res = await run(TEAM_SELECT);
    if (TEAM_SELECT === TEAM_P4 && isMissing(res.error)) {
      TEAM_SELECT = TEAM_P3;
      res = await run(TEAM_SELECT);
    }
    if (TEAM_SELECT === TEAM_P3 && isMissing(res.error)) {
      TEAM_SELECT = TEAM_P2;
      res = await run(TEAM_SELECT);
    }
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
      const { data, error } = await sb.auth.getSession();
      const u = data.session?.user;
      // Offline (the token couldn't refresh): unknown, not signed out, so the app doesn't send them to Log in.
      if (!u && error && (error.name === 'AuthRetryableFetchError' || (error as { status?: number }).status === 0)) {
        throw new BackendError("Can't reach the team server.");
      }
      if (!u) return null;
      return account(u.id, u.email ?? '');
    },

    async signUp({ email, password, name, role, position, birthYear, isMinor, coachTermsVersion }) {
      const { data, error } = await sb.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        // Birth year and under-18 only (never a full date); handle_new_user copies them to profiles.
        // Coach sign-up: the Coach Terms version the coach ticked; handle_new_user records it with the time (2.2.1 §8).
        options: {
          ...(APP_URL ? { emailRedirectTo: APP_URL } : {}),
          data: {
            name: name.trim(),
            role,
            position: position ?? null,
            birth_year: birthYear,
            is_minor: isMinor,
            ...(role === 'coach' && coachTermsVersion ? { coach_terms_version: coachTermsVersion } : {}),
          },
        },
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

    async requestPasswordReset(email) {
      if (!APP_URL) throw new BackendError('Set EXPO_PUBLIC_APP_URL (see the README) so reset links open the app.');
      const { error } = await sb.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: `${APP_URL}/reset-password` });
      if (error) fail(error);
    },

    async consumeAuthLink() {
      if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const query = new URLSearchParams(window.location.search);
      const clear = () => window.history.replaceState(null, '', window.location.pathname);
      const err = hash.get('error_description') ?? query.get('error_description');
      if (err) {
        clear();
        throw new BackendError('That link has expired or was already used. Ask for a new one.');
      }
      const access = hash.get('access_token');
      const refresh = hash.get('refresh_token');
      if (!access || !refresh) return null;
      clear();
      const { error } = await sb.auth.setSession({ access_token: access, refresh_token: refresh });
      if (error) fail(error);
      return { type: hash.get('type') ?? 'signup' };
    },

    async updatePassword(password) {
      if (password.length < 6) throw new BackendError('Use a password with at least 6 characters.');
      const { error } = await sb.auth.updateUser({ password });
      if (error) fail(error);
    },

    async acceptCoachTerms() {
      const id = await userId();
      const { error } = await sb.rpc('accept_coach_terms', { v: COACH_TERMS_VERSION });
      if (isMissing(error)) throw new BackendError('The team database needs the 2.2.1 update first (README: Upgrading from 2.2.0).');
      if (error) fail(error);
      const { data } = await sb.auth.getSession();
      return account(id, data.session?.user.email ?? '');
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
      let { data, error }: Res = await withTeamCols((cols) =>
        sb.from('team_members').select(`group_id,${PERM_COLS},level,level_set_by,joined_at,${embed(cols)}`).eq('user_id', id),
      );
      if (isMissing(error)) ({ data, error } = (await sb.from('team_members').select(`group_id,${PERM_COLS},joined_at,${embed(TEAM_SELECT)}`).eq('user_id', id)) as Res);
      if (isMissing(error)) ({ data, error } = (await sb.from('team_members').select(`group_id,consent_status,${embed(TEAM_SELECT)}`).eq('user_id', id)) as Res);
      if (isMissing(error)) ({ data, error } = (await sb.from('team_members').select(`group_id,${embed(TEAM_SELECT)}`).eq('user_id', id)) as Res);
      if (isMissing(error)) ({ data, error } = (await sb.from('team_members').select(embed(TEAM_SELECT)).eq('user_id', id)) as Res);
      if (error) fail(error);
      // v2.2: which team's lift program the athlete follows (falls back to the first-joined team before migration 005).
      const rows = (data as unknown as (PermRow & { group_id?: string | null; joined_at?: string; team: TeamRow | null })[])
        .filter((r) => r.team)
        .sort((a, b) => (a.joined_at ?? '').localeCompare(b.joined_at ?? ''));
      const lp = await sb.rpc('my_lift_program');
      if (lp.error && !isMissing(lp.error)) fail(lp.error);
      const liftTeam = (lp.data as string | null) ?? rows[0]?.team?.id ?? null;
      // Without the consent columns (older database) a minor or unknown age stays read-only.
      return rows.map((r) => {
        const { perms, version } = permsOf(r, me.is_minor);
        return {
          ...toTeam(r.team!),
          myGroupId: r.group_id ?? null,
          myPerms: perms,
          myConsentVersion: version,
          myLevel: r.level ?? null,
          myLevelConfirmed: !!r.level_set_by,
          isLiftProgram: r.team!.id === liftTeam,
        };
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

    async createGeneralTeam(name, confirmations) {
      await userId();
      for (let attempt = 0; attempt < 5; attempt++) {
        const { data, error } = await sb.rpc('create_general_team', {
          team_name: name.trim(),
          join_code: makeJoinCode(),
          terms_version: TRAINER_TERMS_VERSION,
          confirmations,
        });
        if (!error) {
          const r = data as TeamRow;
          return toTeam({ ...r, kind: 'general' });
        }
        if (isMissing(error)) throw new BackendError('The team database needs the 2.3.0 update first (README: Upgrading from 2.2.1).');
        if (!/duplicate key/i.test(error.message)) fail(error);
      }
      throw new BackendError("Couldn't create a unique team code. Try again.");
    },

    async trainerStatus(teamId) {
      const { data, error } = await sb.rpc('my_team_status', { t: teamId });
      if (isMissing(error)) return null;
      if (error) fail(error);
      const row = (Array.isArray(data) ? data[0] : data) as { kind: TeamKind; verified_at: string | null; terms_version: string | null; current_terms: string } | undefined;
      if (!row || row.kind !== 'general') return null;
      return { verifiedAt: row.verified_at, termsVersion: row.terms_version, currentTerms: row.current_terms };
    },

    async acceptTrainerTerms(teamId) {
      const { error } = await sb.rpc('accept_trainer_terms', { t: teamId, terms_version: TRAINER_TERMS_VERSION });
      if (error) fail(error);
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
        .select(`user_id,joined_at,group_id,${PERM_COLS},level,level_set_by,level_set_at,profile:profiles!team_members_user_id_fkey(name,position,is_minor)`)
        .eq('team_id', teamId)
        .order('joined_at');
      if (isMissing(error)) {
        ({ data, error } = (await sb
          .from('team_members')
          .select(`user_id,joined_at,group_id,${PERM_COLS},profile:profiles!team_members_user_id_fkey(name,position,is_minor)`)
          .eq('team_id', teamId)
          .order('joined_at')) as Res);
      }
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
          level: r.level ?? null,
          levelConfirmed: !!r.level_set_by,
          levelSetAt: r.level_set_at ?? null,
        }),
      );
    },

    async setMySelfLevel(teamId, level) {
      const { error } = await sb.rpc('set_my_self_level', { t: teamId, lvl: level });
      if (error && !isMissing(error)) fail(error);
    },

    async setMemberLevel(teamId, memberId, level) {
      const { error } = await sb.rpc('set_member_level', { t: teamId, athlete: memberId, lvl: level });
      if (error) fail(error);
    },

    async memberLevels(teamId, table = {}) {
      // 2.2.1 J1: the server returns only the adjusted exercises from this table, never another team's level.
      const { data, error } = await sb.rpc('member_levels', { t: teamId, ex: table });
      if (isMissing(error)) return [];
      if (error) fail(error);
      return (data as { user_id: string; team_level: number | null; confirmed: boolean; set_at: string | null; adjusted: Record<string, string | null> | null }[]).map((r) => ({
        userId: r.user_id,
        teamLevel: r.team_level,
        confirmed: r.confirmed,
        setAt: r.set_at,
        adjusted: r.adjusted ?? {},
      }));
    },

    async setLiftProgram(teamId) {
      const { error } = await sb.rpc('set_lift_program', { t: teamId });
      if (error) fail(error);
    },

    async membersFollowingOther(teamId) {
      const { data, error } = await sb.rpc('members_following_other', { t: teamId });
      if (isMissing(error)) return [];
      if (error) fail(error);
      return (data as (string | { members_following_other: string })[]).map((x) => (typeof x === 'string' ? x : x.members_following_other));
    },

    async membersReturning(teamId) {
      const { data, error } = await sb.rpc('members_returning', { t: teamId });
      if (isMissing(error)) return [];
      if (error) fail(error);
      return (data as (string | { members_returning: string })[]).map((x) => (typeof x === 'string' ? x : x.members_returning));
    },

    async testingEligibility(teamId, day) {
      const { data, error } = await sb.rpc('testing_eligibility', { t: teamId, d: day });
      if (isMissing(error)) return {};
      if (error) fail(error);
      return Object.fromEntries((data as { user_id: string; eligible: boolean }[]).map((r) => [r.user_id, r.eligible]));
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
      const base = {
        team_id: p.teamId,
        day: p.day,
        session_id: p.sessionId,
        sets_done: p.setsDone,
        sets_total: p.setsTotal,
        status: p.status,
        updated_at: new Date().toISOString(),
      };
      // v2.2 live fields (migration 006). Never loads or RPE.
      const live = {
        state: p.state ?? (p.status === 'done' ? 'done' : 'lifting'),
        exercise_name: p.exerciseName?.slice(0, 60) ?? null,
        set_index: p.setIndex ?? null,
        set_count: p.setCount ?? null,
        last_reps: p.lastReps ?? null,
        rest_ends_at: p.restEndsAt ?? null,
        pr_today: p.prToday ?? 0,
        finished_at: p.finishedAt ?? null,
      };
      const p3 = { group_label: p.groupLabel?.slice(0, 120) ?? null, station_id: p.stationId ?? null, rotate_at: p.rotateAt ?? null };
      let { error } = await sb.from('live_progress').upsert({ ...base, ...live, ...p3 }, { onConflict: 'team_id,user_id,day' });
      if (isMissing(error)) ({ error } = await sb.from('live_progress').upsert({ ...base, ...live }, { onConflict: 'team_id,user_id,day' }));
      if (isMissing(error)) ({ error } = await sb.from('live_progress').upsert(base, { onConflict: 'team_id,user_id,day' }));
      if (isMissing(error)) return;
      if (error) fail(error);
    },

    async listLiveProgress(teamId, day) {
      // Sets, the exercise name and rest timing only. Never weights or RPE.
      type Res = { data: unknown; error: { message: string } | null };
      const BASE = 'team_id,user_id,day,session_id,sets_done,sets_total,status,updated_at';
      let { data, error }: Res = await sb
        .from('live_progress')
        .select(`${BASE},state,exercise_name,set_index,set_count,last_reps,rest_ends_at,pr_today,finished_at,group_label,station_id,rotate_at`)
        .eq('team_id', teamId)
        .eq('day', day);
      if (isMissing(error))
        ({ data, error } = (await sb
          .from('live_progress')
          .select(`${BASE},state,exercise_name,set_index,set_count,last_reps,rest_ends_at,pr_today,finished_at`)
          .eq('team_id', teamId)
          .eq('day', day)) as Res);
      if (isMissing(error)) ({ data, error } = (await sb.from('live_progress').select(BASE).eq('team_id', teamId).eq('day', day)) as Res);
      if (isMissing(error)) return [];
      if (error) fail(error);
      return (
        data as {
          team_id: string;
          user_id: string;
          day: string;
          session_id: string | null;
          sets_done: number;
          sets_total: number;
          status: LiveProgress['status'];
          updated_at: string;
          state?: LiveProgress['state'];
          exercise_name?: string | null;
          set_index?: number | null;
          set_count?: number | null;
          last_reps?: number | null;
          rest_ends_at?: string | null;
          pr_today?: number;
          finished_at?: string | null;
          group_label?: string | null;
          station_id?: string | null;
          rotate_at?: string | null;
        }[]
      ).map((r) => ({
        groupLabel: r.group_label ?? null,
        stationId: r.station_id ?? null,
        rotateAt: r.rotate_at ?? null,
        state: r.state,
        exerciseName: r.exercise_name ?? null,
        setIndex: r.set_index ?? null,
        setCount: r.set_count ?? null,
        lastReps: r.last_reps ?? null,
        restEndsAt: r.rest_ends_at ?? null,
        prToday: r.pr_today ?? 0,
        finishedAt: r.finished_at ?? null,
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
      const [{ data, error }, following, mine] = await Promise.all([
        sb.rpc('team_effort', { t: teamId, since }),
        // Coach only (empty for everyone else): members who follow another team's lift program.
        sb.rpc('members_following_other', { t: teamId }),
        sb.rpc('my_lift_program'),
      ]);
      if (isMissing(error)) return [];
      if (error) fail(error);
      // 2.2.1 J3: the server sends no `ranked` flag. Teammates only receive ranked athletes; the coach marks athletes who
      // follow another team's program, and the viewer's own row uses their own lift program.
      const other = new Set(((following.data ?? []) as (string | { members_following_other: string })[]).map((x) => (typeof x === 'string' ? x : x.members_following_other)));
      const myProgram = typeof mine.data === 'string' ? mine.data : null;
      return (
        data as {
          user_id: string;
          board_name: string;
          group_id: string | null;
          is_me: boolean;
          logs: EffortInput['logs'] | null;
          attendance: EffortInput['attendance'];
          jump_gain?: number | string | null;
        }[]
      ).map((r) => ({
        userId: r.user_id,
        boardName: r.board_name,
        groupId: r.group_id,
        isMe: r.is_me,
        ranked: r.is_me ? myProgram == null || myProgram === teamId : !other.has(r.user_id),
        logs: r.logs ?? [],
        attendance: r.attendance,
        // Before migration 006 the function returned a % ("improvement"); FA-4 never shows %, so it's dropped.
        jumpGain: r.jump_gain != null ? Number(r.jump_gain) : null,
      }));
    },

    async boardTests(teamId, day) {
      const { data, error } = await sb.rpc('board_tests', { t: teamId, d: day });
      if (isMissing(error)) return [];
      if (error) fail(error);
      return (data as { user_id: string; jumps_done: number; strength_done: boolean; changes: BoardTest['changes'] | null }[]).map((r) => ({
        userId: r.user_id,
        jumpsDone: r.jumps_done,
        strengthDone: r.strength_done,
        changes: (r.changes ?? []).map((c) => ({ ...c, delta: c.delta != null ? Number(c.delta) : null })),
      }));
    },

    async listRacks(teamId) {
      const [g, m] = await Promise.all([
        sb.from('rack_groups').select('id,name,sort_order').eq('team_id', teamId).order('sort_order'),
        sb.from('rack_group_members').select('group_id,user_id').eq('team_id', teamId),
      ]);
      if (isMissing(g.error) || isMissing(m.error)) return [];
      if (g.error) fail(g.error);
      if (m.error) fail(m.error);
      const members = m.data as { group_id: string; user_id: string }[];
      return (g.data as { id: string; name: string; sort_order: number }[]).map((r) => ({
        id: r.id,
        name: r.name,
        sortOrder: r.sort_order,
        userIds: members.filter((x) => x.group_id === r.id).map((x) => x.user_id),
      }));
    },

    async saveRacks(teamId, racks) {
      const { error } = await sb.rpc('save_racks', { t: teamId, racks: racks.map((r) => ({ name: r.name, users: r.userIds })) });
      if (error) fail(error);
    },

    async getStationRun(teamId, day) {
      const { data, error } = await sb.from('station_runs').select('*').eq('team_id', teamId).eq('day', day).maybeSingle();
      if (isMissing(error)) return null;
      if (error) fail(error);
      const r = data as { team_id: string; day: string; session_id: string; round: number; rounds: number; station_sec: number; transition_sec: number; rotate_at: string; ended_at: string | null } | null;
      return r
        ? { teamId: r.team_id, day: r.day, sessionId: r.session_id, round: r.round, rounds: r.rounds, stationSec: r.station_sec, transitionSec: r.transition_sec, rotateAt: r.rotate_at, endedAt: r.ended_at }
        : null;
    },

    async saveStationRun(run) {
      const { error } = await sb.from('station_runs').upsert(
        {
          team_id: run.teamId,
          day: run.day,
          session_id: run.sessionId,
          round: run.round,
          rounds: run.rounds,
          station_sec: run.stationSec,
          transition_sec: run.transitionSec,
          rotate_at: run.rotateAt,
          ended_at: run.endedAt ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'team_id,day' },
      );
      if (error) fail(error);
    },

    async myRack(teamId) {
      const { data, error } = await sb.rpc('my_rack', { t: teamId });
      if (isMissing(error)) return null;
      if (error) fail(error);
      const r = (data as { group_id: string; rack_name: string; partners: number; partner_names: string[] | null; others: number | null }[])[0];
      return r ? { groupId: r.group_id, rackName: r.rack_name, partners: r.partners, partnerNames: r.partner_names, others: r.others } : null;
    },

    subscribeBoard(teamId, onChange, onStatus) {
      const channel = sb
        .channel(`board-${teamId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'live_progress', filter: `team_id=eq.${teamId}` }, onChange)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'test_results', filter: `team_id=eq.${teamId}` }, onChange)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'rack_group_members', filter: `team_id=eq.${teamId}` }, onChange)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'station_runs', filter: `team_id=eq.${teamId}` }, onChange)
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
        // 2.3.0: a program for one client carries target_user_id (RLS shows it to that client only).
        .upsert(
          { team_id: teamId, group_key: groupKey, program, updated_at: updatedAt, ...(clientOf(groupKey) ? { target_user_id: clientOf(groupKey) } : {}) },
          { onConflict: 'team_id,group_key' },
        );
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
          ...(log.kind === 'extra_recovery' ? { kind: 'extra_recovery' } : {}),
        },
        { onConflict: 'id', ignoreDuplicates: true },
      );
      // An extra recovery session is never sent without its kind (it would count as a prescribed session).
      if (isMissing(error) && log.kind === 'extra_recovery') return;
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
        .on('postgres_changes', { event: '*', schema: 'public', table: 'station_runs', filter }, onChange)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'rack_group_members', filter }, onChange)
        .subscribe();
      return () => {
        sb.removeChannel(channel);
      };
    },
  };
}
