import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Body, Button, Card, Chip, ChipRow, colors, Field, H2, Label, Note, Row, Screen, Stepper, Text } from '../components/ui';
import { LEVEL_NAME } from '../lib/athlete';
import { backend, Member } from '../lib/backend';
import { showAlert } from '../lib/dialog';
import { autoAssign, METHODS, RACK_HINTS, rackCountFor, RackMethod, sizeSummary, suggestRack } from '../lib/racks';
import { useTeams } from '../lib/team';

type Draft = { name: string; userIds: string[] };

/**
 * Team → Racks (D-026, rack-groups R2–R6). Count or size, who's here today (a temporary filter, never stored as
 * attendance), an auto-assign method with a preview, renaming, tap-to-move, and an Unassigned tray.
 * Levels and positions show only here, to the coach. Athletes following another team's program are left out of
 * auto-assign by default (the coach can still add them by hand).
 */
export default function RacksScreen() {
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  const t = useTeams();
  const team = t.teams.find((x) => x.id === teamId);
  const roster: Member[] = t.members[teamId] ?? [];
  const followingOther = t.coachExtras[teamId]?.followingOther ?? [];
  const [by, setBy] = useState<'count' | 'size'>('size');
  const [value, setValue] = useState(3);
  const [here, setHere] = useState<Set<string> | null>(null);
  const [method, setMethod] = useState<RackMethod>('balanced');
  const [draft, setDraft] = useState<Draft[] | null>(null);
  const [saved, setSaved] = useState<Draft[] | null>(null);
  const [moving, setMoving] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    backend
      .listRacks(teamId)
      .then((r) => {
        if (!alive) return;
        const d = r.map((x) => ({ name: x.name, userIds: x.userIds }));
        setSaved(d);
        setDraft(d);
      })
      .catch(() => alive && setSaved([]));
    return () => {
      alive = false;
    };
  }, [teamId]);

  if (!team) return <Screen><Body muted>Team not found.</Body></Screen>;
  // 2.3.0 design §S1b: Clients wording in general teams.
  const g = team.kind === 'general';
  const present = here ?? new Set(roster.filter((m) => !followingOther.includes(m.userId)).map((m) => m.userId));
  const chosen = roster.filter((m) => present.has(m.userId));
  const count = rackCountFor(chosen.length, by, value);
  const nameOf = (u: string) => roster.find((m) => m.userId === u)?.name ?? (team.kind === 'general' ? 'Client' : 'Athlete');
  const placed = new Set((draft ?? []).flatMap((r) => r.userIds));
  const unassigned = roster.filter((m) => !placed.has(m.userId));
  const changed = JSON.stringify(draft) !== JSON.stringify(saved);

  function run() {
    const groups = autoAssign(
      chosen.map((m) => ({ userId: m.userId, level: m.level ?? null, position: m.position ?? null, groupId: m.groupId ?? null })),
      count,
      method,
    );
    // Keep existing rack names where there are any.
    setDraft(groups.map((g, i) => ({ name: draft?.[i]?.name ?? `Rack ${i + 1}`, userIds: g.map((a) => a.userId) })));
  }

  function moveTo(target: number | null) {
    if (!moving || !draft) return;
    const next = draft.map((r) => ({ ...r, userIds: r.userIds.filter((u) => u !== moving) }));
    if (target != null) next[target].userIds.push(moving);
    setDraft(next);
    setMoving(null);
  }

  async function apply() {
    if (!draft) return;
    const go = async () => {
      setBusy(true);
      try {
        await backend.saveRacks(teamId, draft);
        setSaved(draft);
        showAlert('Racks saved', g ? 'Clients see their rack on Today.' : 'Athletes see their rack on the Lift screen.');
      } catch (e) {
        showAlert("Couldn't save racks", e instanceof Error ? e.message : 'Try again.');
      } finally {
        setBusy(false);
      }
    };
    if (saved?.length) {
      showAlert('Replace current racks?', undefined, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Replace', onPress: () => void go() },
      ]);
    } else await go();
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Racks' }} />
      <Body muted>{g ? "Split your class into racks: who trains together where. Racks don't change anyone's program." : "Split the team into racks: who lifts together where. Racks don't change anyone's program."}</Body>

      <Card>
        <H2>How many racks</H2>
        <ChipRow>
          <Chip label={g ? 'Clients per rack' : 'Athletes per rack'} selected={by === 'size'} onPress={() => { setBy('size'); setValue(3); }} />
          <Chip label="Number of racks" selected={by === 'count'} onPress={() => { setBy('count'); setValue(Math.max(1, Math.ceil(chosen.length / 3))); }} />
        </ChipRow>
        <Row style={{ justifyContent: 'space-between' }}>
          <Label>{by === 'size' ? (g ? 'Clients per rack' : 'Athletes per rack') : 'Racks'}</Label>
          <Stepper value={value} min={by === 'size' ? 2 : 1} max={by === 'size' ? 6 : 12} onChange={setValue} />
        </Row>
        <Text style={{ fontSize: 15, fontWeight: '600' }}>{sizeSummary(chosen.length, count)}</Text>
        <View style={{ gap: 2 }}>
          {RACK_HINTS.map((h) => (
            <Text key={h} style={{ fontSize: 13, color: colors.muted }}>{`• ${h}`}</Text>
          ))}
        </View>
      </Card>

      <Card>
        <H2>Who&apos;s here today</H2>
        <Text style={{ fontSize: 13, color: colors.muted }}>Optional. Untick anyone who&apos;s absent so racks balance around who&apos;s here. This isn&apos;t saved as attendance.</Text>
        {roster.map((m) => (
          <Pressable
            key={m.userId}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: present.has(m.userId) }}
            onPress={() => {
              const next = new Set(present);
              if (next.has(m.userId)) next.delete(m.userId);
              else next.add(m.userId);
              setHere(next);
            }}
            style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 10 }}
          >
            <Text style={{ fontSize: 18 }}>{present.has(m.userId) ? '☑' : '☐'}</Text>
            <Text style={{ flex: 1 }}>{m.name}</Text>
            {followingOther.includes(m.userId) ? <Text style={{ fontSize: 12, color: colors.muted }}>Following another team&apos;s lift program</Text> : null}
          </Pressable>
        ))}
      </Card>

      <Card>
        <H2>Auto-assign</H2>
        <ChipRow>
          {METHODS.map((m) => (
            <Chip key={m.id} label={m.label} selected={method === m.id} onPress={() => setMethod(m.id)} />
          ))}
        </ChipRow>
        <Button title={draft?.length ? (method === 'random' ? 'Shuffle again' : 'Re-run auto-assign') : 'Preview racks'} disabled={!chosen.length} onPress={run} />
        {!draft?.length ? (
          <Button
            kind="ghost"
            title="Skip auto: assign by hand"
            onPress={() => setDraft(Array.from({ length: count }, (_, i) => ({ name: `Rack ${i + 1}`, userIds: [] })))}
          />
        ) : null}
      </Card>

      {draft?.length ? (
        <View style={{ gap: 10 }}>
          <Label>Preview</Label>
          <Text style={{ fontSize: 13, color: colors.muted }}>{g ? 'Use neutral names. Groups show on the class board.' : 'Use neutral names. Groups show on the team board.'}</Text>
          {moving ? <Note>{`Tap a rack to move ${nameOf(moving)}, or Unassigned.`}</Note> : <Text style={{ fontSize: 13, color: colors.muted }}>{g ? 'Tap a client, then a rack, to move them.' : 'Tap an athlete, then a rack, to move them.'}</Text>}
          {draft.map((r, i) => (
            <Card key={i}>
              <Pressable disabled={!moving} onPress={() => moveTo(i)}>
                <Field
                  label={`Rack ${i + 1} name`}
                  value={r.name}
                  maxLength={20}
                  onChangeText={(v) => setDraft(draft.map((x, k) => (k === i ? { ...x, name: v.slice(0, 20) } : x)))}
                />
              </Pressable>
              {r.userIds.map((u) => {
                const m = roster.find((x) => x.userId === u);
                return (
                  <Pressable key={u} accessibilityRole="button" onPress={() => setMoving(moving === u ? null : u)} style={{ minHeight: 44, justifyContent: 'center' }}>
                    <Row style={{ gap: 8 }}>
                      <Text style={{ flex: 1, fontWeight: moving === u ? '700' : '400' }}>{nameOf(u)}</Text>
                      {/* Coach only: small level and position chips. */}
                      {m?.level ? <Text style={{ fontSize: 12, color: colors.muted }}>{LEVEL_NAME[m.level]}</Text> : null}
                      {m?.position ? <Text style={{ fontSize: 12, color: colors.muted }}>{m.position}</Text> : null}
                    </Row>
                  </Pressable>
                );
              })}
              {moving && !r.userIds.includes(moving) ? <Button small kind="ghost" title={`Move here`} onPress={() => moveTo(i)} /> : null}
            </Card>
          ))}
          <Card>
            <Label>Unassigned</Label>
            {unassigned.length ? (
              unassigned.map((m) => (
                <View key={m.userId} style={{ gap: 4 }}>
                  <Pressable accessibilityRole="button" onPress={() => setMoving(moving === m.userId ? null : m.userId)} style={{ minHeight: 44, justifyContent: 'center' }}>
                    <Text style={{ fontWeight: moving === m.userId ? '700' : '400' }}>{m.name}</Text>
                  </Pressable>
                  {/* R6: someone who joined after the racks were set. */}
                  {saved?.length && !followingOther.includes(m.userId) ? (
                    <Text
                      accessibilityRole="button"
                      onPress={() => {
                        const k = suggestRack(draft);
                        setDraft(draft.map((x, j) => (j === k ? { ...x, userIds: [...x.userIds, m.userId] } : x)));
                      }}
                      style={{ fontSize: 13, textDecorationLine: 'underline', paddingVertical: 14 }}
                    >
                      {`Add ${m.name.split(' ')[0]} to a rack? Suggested: ${draft[suggestRack(draft)].name}`}
                    </Text>
                  ) : null}
                </View>
              ))
            ) : (
              <Text style={{ fontSize: 13, color: colors.muted }}>Everyone has a rack.</Text>
            )}
            {moving ? <Button small kind="ghost" title="Move to Unassigned" onPress={() => moveTo(null)} /> : null}
          </Card>
          <Button title={busy ? 'Saving…' : 'Apply'} disabled={busy || !changed} onPress={apply} />
        </View>
      ) : saved && !saved.length ? (
        <Body muted>No racks yet. Pick a method and preview, or set the count and assign by hand after a preview.</Body>
      ) : null}
    </Screen>
  );
}
