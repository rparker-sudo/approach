import { useMemo, useState } from 'react';
import { View } from 'react-native';
import type { Team } from '../../lib/backend';
import { clientKey } from '../../lib/backend';
import { programsFor } from '../../lib/clients';
import { GATE, GateState, nextMonday, postChecks, programLine } from '../../lib/general';
import { useStore } from '../../lib/store';
import { ALL, useTeams } from '../../lib/team';
import type { Program } from '../../lib/types';
import { showAlert } from '../../lib/dialog';
import Sheet from '../Sheet';
import { Button, Chip, ChipRow, colors, Field, Label, OptionCard, Text } from '../ui';

type Target = 'all' | 'group' | 'client';

const keyOfDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * F36 "Who gets this program?": all clients, a group, or one client; a start date (default next Monday); then live checks
 * per affected client from adult rules §4, combined with everything already posted to them (blocks first). Post is
 * disabled while any block remains, while the team isn't open, or while the Trainer Terms are out of date.
 */
export default function PostSheet({ team, program, gate, onClose }: { team: Team; program: Program; gate: GateState; onClose: () => void }) {
  const { data } = useStore();
  const { members, groups, postGeneral } = useTeams();
  const roster = useMemo(() => members[team.id] ?? [], [members, team.id]);
  const teamGroups = useMemo(() => groups[team.id] ?? [], [groups, team.id]);
  const current = program.groupKey && !program.groupKey.startsWith('draft:') ? program.groupKey : null;
  const [target, setTarget] = useState<Target>(current?.startsWith('client:') ? 'client' : current && current !== ALL ? 'group' : 'all');
  const [groupId, setGroupId] = useState<string | null>(current && current !== ALL && !current.startsWith('client:') ? current : null);
  const [clientId, setClientId] = useState<string | null>(current?.startsWith('client:') ? current.slice(7) : null);
  const [search, setSearch] = useState('');
  const [start, setStart] = useState(program.startDate ?? nextMonday());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const targetKey = target === 'all' ? ALL : target === 'group' ? groupId : clientId ? clientKey(clientId) : null;
  const affected = target === 'all' ? roster : target === 'group' ? roster.filter((m) => m.groupId === groupId) : roster.filter((m) => m.userId === clientId);
  const checks = useMemo(() => {
    if (!targetKey) return [];
    const next: Program = { ...program, startDate: start, groupKey: targetKey };
    return postChecks(
      next,
      affected.map((m) => ({
        userId: m.userId,
        name: m.name,
        level: (m.level ?? 1) as 1 | 2 | 3,
        existing: programsFor(team, m, data.programs)
          .filter((p) => p.id !== program.id || p.groupKey === targetKey)
          .map((p) => ({
            label: p.groupKey === ALL ? 'your whole-team program' : p.groupKey?.startsWith('client:') ? programLine(p) : teamGroups.find((g) => g.id === p.groupKey)?.name ?? 'a group',
            program: p,
            sameTarget: p.groupKey === targetKey,
          })),
      })),
    );
  }, [targetKey, start, program, affected, team, data.programs, teamGroups]);
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(start) && !Number.isNaN(new Date(`${start}T12:00:00`).getTime());
  const gateLine = gate === 'not_open' || gate === 'paused' ? GATE.cantPost : gate === 'terms' ? GATE.termsChanged : null;
  // 2.4.0 (F36): Post is always enabled, subject only to F45b (the team is open, Trainer Terms current).
  const canPost = !!targetKey && validDate && !gateLine && !busy;
  const who = (uid?: string) => roster.find((m) => m.userId === uid)?.name ?? '';
  const filtered = roster.filter((m) => m.name.toLowerCase().includes(search.trim().toLowerCase()));
  const today = new Date();
  const mondays = [nextMonday(today), nextMonday(new Date(today.getTime() + 7 * 864e5))];

  async function post() {
    setBusy(true);
    setError(null);
    try {
      await postGeneral(team.id, program.id, targetKey!, start);
      const done =
        target === 'client'
          ? `Posted. ${who(clientId!)} has the new program.`
          : target === 'group'
            ? `${teamGroups.find((g) => g.id === groupId)?.name ?? 'The group'} has the new program.`
            : 'Posted. All your clients have the new program.';
      onClose();
      showAlert(done);
    } catch {
      setError("Couldn't post. Your program is saved as a draft.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet title="Who gets this program?" onClose={onClose}>
      <OptionCard title="All my clients" selected={target === 'all'} onPress={() => setTarget('all')} />
      <OptionCard title="A group" subtitle={teamGroups.length ? undefined : 'No groups yet.'} disabled={!teamGroups.length} selected={target === 'group'} onPress={() => setTarget('group')} />
      {target === 'group' ? (
        <ChipRow>
          {teamGroups.map((g) => (
            <Chip key={g.id} label={g.name} selected={groupId === g.id} onPress={() => setGroupId(g.id)} />
          ))}
        </ChipRow>
      ) : null}
      <OptionCard title="One client" subtitle={roster.length ? undefined : 'No clients yet.'} disabled={!roster.length} selected={target === 'client'} onPress={() => setTarget('client')} />
      {target === 'client' ? (
        <View style={{ gap: 8 }}>
          <Field placeholder="Search clients" value={search} onChangeText={setSearch} accessibilityLabel="Search clients" />
          <ChipRow>
            {filtered.map((m) => (
              <Chip key={m.userId} label={m.name} selected={clientId === m.userId} onPress={() => setClientId(m.userId)} />
            ))}
          </ChipRow>
        </View>
      ) : null}

      <Label>Start date</Label>
      <ChipRow>
        {mondays.map((d) => (
          <Chip key={d} label={`Mon ${d.slice(5).replace('-', '/')}`} selected={start === d} onPress={() => setStart(d)} />
        ))}
        <Chip label="Today" selected={start === keyOfDate(today)} onPress={() => setStart(keyOfDate(today))} />
      </ChipRow>
      <Field label="Or a date (YYYY-MM-DD)" value={start} onChangeText={setStart} autoCapitalize="none" maxLength={10} />

      {targetKey ? (
        <View style={{ gap: 6 }}>
          {checks.map((c, i) => (
            <Text key={i} style={{ fontSize: 13, lineHeight: 19, color: colors.ink }}>{c.message}</Text>
          ))}
        </View>
      ) : null}
      {gateLine ? <Text style={{ fontSize: 13, color: colors.errorText }}>{gateLine}</Text> : null}
      {error ? <Text style={{ fontSize: 13, color: colors.errorText }}>{error}</Text> : null}
      <Button large title={busy ? 'Posting…' : 'Post'} icon="square.and.arrow.up" disabled={!canPost} onPress={post} />
      <Button kind="ghost" title="Cancel" onPress={onClose} />
    </Sheet>
  );
}
