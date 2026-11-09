import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import type { Position, Program, Role, WorkoutLog } from '../types';
import {
  Account,
  Backend,
  BackendError,
  makeJoinCode,
  Member,
  normalizeCode,
  setsDone,
  Team,
  TeamLog,
  TeamProgram,
} from './types';

if (Platform.OS !== 'web') {
  // Supabase needs a full URL implementation on iOS/Android.
  require('react-native-url-polyfill/auto');
}

type ProfileRow = { id: string; name: string; role: Role; position: string | null };
type TeamRow = {
  id: string;
  name: string;
  join_code: string;
  coach_id: string;
  created_at: string;
  coach?: { name: string } | null;
};

function fail(error: { message: string } | null, fallback?: string): never {
  const msg = error?.message ?? fallback ?? 'Something went wrong.';
  if (/invalid login credentials/i.test(msg)) throw new BackendError("Email or password doesn't match.");
  if (/already registered/i.test(msg)) throw new BackendError('That email already has an account. Sign in instead.');
  if (/email not confirmed/i.test(msg)) throw new BackendError('Check your email and tap the confirm link, then sign in.');
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

  async function account(id: string, email: string): Promise<Account> {
    const { data, error } = await sb.from('profiles').select('id,name,role,position').eq('id', id).single<ProfileRow>();
    if (error || !data) fail(error, 'Your profile was not found.');
    return { id, email, name: data.name, role: data.role, position: (data.position as Position) ?? null };
  }

  const TEAM_SELECT = 'id,name,join_code,coach_id,created_at,coach:profiles(name)';

  return {
    mode: 'supabase',

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

    async signUp({ email, password, name, role, position }) {
      const { data, error } = await sb.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: { data: { name: name.trim(), role, position: position ?? null } },
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

    async listMyTeams() {
      const id = await userId();
      const { data: me, error: e1 } = await sb.from('profiles').select('role').eq('id', id).single<{ role: Role }>();
      if (e1) fail(e1);
      if (me.role === 'coach') {
        const { data, error } = await sb.from('teams').select(TEAM_SELECT).eq('coach_id', id).order('created_at');
        if (error) fail(error);
        return (data as unknown as TeamRow[]).map(toTeam);
      }
      const { data, error } = await sb.from('team_members').select(`team:teams(${TEAM_SELECT})`).eq('user_id', id);
      if (error) fail(error);
      return (data as unknown as { team: TeamRow | null }[]).filter((r) => r.team).map((r) => toTeam(r.team!));
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
      const { data, error } = await sb
        .from('team_members')
        .select('user_id,joined_at,profile:profiles(name,position)')
        .eq('team_id', teamId)
        .order('joined_at');
      if (error) fail(error);
      return (data as unknown as { user_id: string; joined_at: string; profile: { name: string; position: string | null } | null }[]).map(
        (r): Member => ({
          userId: r.user_id,
          name: r.profile?.name || 'Athlete',
          position: (r.profile?.position as Position) ?? null,
          joinedAt: r.joined_at,
        }),
      );
    },

    async removeMember(teamId, memberId) {
      const { error } = await sb.from('team_members').delete().eq('team_id', teamId).eq('user_id', memberId);
      if (error) fail(error);
    },

    async postProgram(teamId, program: Program) {
      const updatedAt = new Date().toISOString();
      const { error } = await sb.from('team_programs').upsert({ team_id: teamId, program, updated_at: updatedAt });
      if (error) fail(error);
      return { teamId, program, updatedAt };
    },

    async getPrograms(teamIds) {
      if (!teamIds.length) return [];
      const { data, error } = await sb.from('team_programs').select('team_id,program,updated_at').in('team_id', teamIds);
      if (error) fail(error);
      return (data as { team_id: string; program: Program; updated_at: string }[]).map(
        (r): TeamProgram => ({ teamId: r.team_id, program: r.program, updatedAt: r.updated_at }),
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
        .select('id,team_id,user_id,session_name,logged_at,sets_done,note,profile:profiles(name)')
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
        .subscribe();
      return () => {
        sb.removeChannel(channel);
      };
    },
  };
}
