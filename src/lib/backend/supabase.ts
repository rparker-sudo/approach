import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import type { CalendarEvent, Position, Program, Role, WorkoutLog } from '../types';
import {
  Account,
  Backend,
  BackendError,
  ConsentStatus,
  Group,
  initialConsent,
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

type ProfileRow = { id: string; name: string; role: Role; position: string | null; birth_year?: number | null; is_minor?: boolean | null };
type TeamRow = {
  id: string;
  name: string;
  join_code: string;
  coach_id: string;
  created_at: string;
  coach?: { name: string } | null;
};

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
  return { id: r.id, name: r.name, joinCode: r.join_code, coachId: r.coach_id, coachName: r.coach?.name, createdAt: r.created_at };
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
    let { data, error } = await sb.from('profiles').select('id,name,role,position,birth_year,is_minor').eq('id', id).single<ProfileRow>();
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
    };
  }

  // teams↔profiles has several links (coach, roster, workout logs); name the coach one explicitly.
  const TEAM_SELECT = 'id,name,join_code,coach_id,created_at,coach:profiles!teams_coach_id_fkey(name)';

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
        const { data, error } = await sb.from('teams').select(TEAM_SELECT).eq('coach_id', id).order('created_at');
        if (error) fail(error);
        return (data as unknown as TeamRow[]).map(toTeam);
      }
      // team_members has one link to teams (team_id), so this embed is unambiguous.
      type Res = { data: unknown; error: { message: string } | null };
      const embed = `team:teams!team_members_team_id_fkey(${TEAM_SELECT})`;
      let { data, error }: Res = await sb.from('team_members').select(`group_id,consent_status,${embed}`).eq('user_id', id);
      if (isMissing(error)) ({ data, error } = (await sb.from('team_members').select(`group_id,${embed}`).eq('user_id', id)) as Res);
      if (isMissing(error)) ({ data, error } = (await sb.from('team_members').select(embed).eq('user_id', id)) as Res);
      if (error) fail(error);
      // Before the 2.1 update there's no consent on file, so a minor (or unknown age) stays read-only.
      return (data as unknown as { group_id?: string | null; consent_status?: ConsentStatus; team: TeamRow | null }[])
        .filter((r) => r.team)
        .map((r) => ({ ...toTeam(r.team!), myGroupId: r.group_id ?? null, myConsent: r.consent_status ?? initialConsent(me.is_minor) }));
    },

    async createTeam(name) {
      const id = await userId();
      for (let attempt = 0; attempt < 5; attempt++) {
        const { data, error } = await sb
          .from('teams')
          .insert({ name: name.trim(), join_code: makeJoinCode(), coach_id: id })
          .select(TEAM_SELECT)
          .single();
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
        consent_status?: ConsentStatus;
        profile: { name: string; position: string | null; is_minor?: boolean | null } | null;
      };
      type Res = { data: unknown; error: { message: string } | null };
      let { data, error }: Res = await sb
        .from('team_members')
        .select('user_id,joined_at,group_id,consent_status,profile:profiles!team_members_user_id_fkey(name,position,is_minor)')
        .eq('team_id', teamId)
        .order('joined_at');
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
            consentStatus: 'pending',
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
          consentStatus: r.consent_status ?? initialConsent(r.profile?.is_minor),
        }),
      );
    },

    async recordConsent(teamId, memberId, status) {
      const { error } = await sb.rpc('record_consent', { t: teamId, athlete: memberId, status });
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
        },
        { onConflict: 'id', ignoreDuplicates: true },
      );
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
