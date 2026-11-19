import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { LEVEL_NAME } from '../lib/athlete';
import type { Member, MemberLevel } from '../lib/backend';
import { getExercise } from '../lib/exercises';
import { adjustedFor, Level, levelAdjustFor, levelOffKey, swapsFor } from '../lib/resolve';
import { useStore } from '../lib/store';
import type { Program } from '../lib/types';
import { formatDate } from '../lib/util';
import Sheet from './Sheet';
import { LEVEL_CHECKLIST, LEVEL_DESCRIPTIONS, LEVEL_PRINCIPLES } from '../lib/levelChecklist';
import { BRAND, Button, colors, OptionCard, Row, Text, TextLink, Toggle } from './ui';

/** F24a: level chip. Coach-set = solid outline; self-reported = dotted outline (and "Level not confirmed" text in the row). */
export function LevelChip({ member, onPress }: { member: Member; onPress: () => void }) {
  const lv = member.level;
  const label = lv ? LEVEL_NAME[lv] : 'Set level';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Level: ${lv ? LEVEL_NAME[lv] : 'not set'}${member.levelConfirmed ? '' : ', not confirmed'}. Set ${member.name}'s level`}
      onPress={onPress}
      // F-7: a 44 pt tap area around the small chip.
      style={{ minHeight: 44, minWidth: 44, justifyContent: 'center', alignSelf: 'flex-start' }}
    >
      <View
        style={{
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: BRAND.radius.pill,
          borderWidth: 1,
          borderStyle: member.levelConfirmed ? 'solid' : 'dotted',
          borderColor: member.levelConfirmed ? colors.ink : colors.muted,
        }}
      >
        <Text style={{ fontSize: 12, fontWeight: '600', color: member.levelConfirmed ? colors.ink : colors.muted }}>{label}</Text>
      </View>
    </Pressable>
  );
}

/** Training's full level checklist, read-only (2.2.1 §4, Appendix B). */
export function LevelChecklistSheet({ onClose }: { onClose: () => void }) {
  return (
    <Sheet title="Level checklist" onClose={onClose}>
      <Text style={{ fontSize: 14, color: colors.muted }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.muted }}>Principles. </Text>
        {LEVEL_PRINCIPLES}
      </Text>
      {LEVEL_CHECKLIST.map((sec) => (
        <View key={sec.title} style={{ gap: 8 }}>
          <Text style={{ fontSize: 16, fontWeight: '600' }}>{sec.title}</Text>
          {sec.blocks.map((b, i) =>
            b.kind === 'p' ? (
              <Text key={i} style={{ fontSize: 14, lineHeight: 20 }}>
                {b.lead ? `${b.lead} ` : ''}
                {b.text}
              </Text>
            ) : b.kind === 'ol' ? (
              <View key={i} style={{ gap: 4 }}>
                {b.items.map((it, k) => (
                  <Text key={k} style={{ fontSize: 14, lineHeight: 20 }}>{`${k + 1}. ${it}`}</Text>
                ))}
              </View>
            ) : (
              <View key={i} style={{ borderWidth: 1, borderColor: colors.line, borderRadius: BRAND.radius.sm }}>
                {b.rows.map(([pattern, check], k) => (
                  <View key={pattern} style={{ flexDirection: 'row', gap: 10, padding: 8, borderTopWidth: k ? 1 : 0, borderTopColor: colors.line }}>
                    <Text style={{ width: 84, fontSize: 13, fontWeight: '600' }}>{pattern}</Text>
                    <Text style={{ flex: 1, fontSize: 13, lineHeight: 18 }}>{check}</Text>
                  </View>
                ))}
              </View>
            ),
          )}
        </View>
      ))}
      <Button kind="secondary" title="Close" onPress={onClose} />
    </Sheet>
  );
}

/** F24b: set level sheet. Saving the same level as the self-reported one still confirms it. */
export function SetLevelSheet({ member, onClose, onSave, general }: { member: Member; onClose: () => void; onSave: (level: number) => Promise<void>; general?: boolean }) {
  const [choice, setChoice] = useState<number | null>(member.level ?? null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [checklist, setChecklist] = useState(false);
  const first = member.name.split(' ')[0] || member.name;
  if (checklist) return <LevelChecklistSheet onClose={() => setChecklist(false)} />;
  return (
    <Sheet title={`Set ${first}'s level`} onClose={onClose}>
      {([1, 2, 3] as const).map((lv) => (
        <OptionCard key={lv} title={LEVEL_NAME[lv]} subtitle={LEVEL_DESCRIPTIONS[lv]} selected={choice === lv} onPress={() => setChoice(lv)} />
      ))}
      <TextLink title="See the full checklist" onPress={() => setChecklist(true)} />
      <Text style={{ fontSize: 13, color: colors.muted }}>
        {general
          ? `Sets which version of each exercise ${first} gets.`
          : `Sets which version of each exercise ${first} gets. Athletes under 18 need intermediate or advanced, set by you, for strength checks.`}
      </Text>
      {!member.levelConfirmed && member.level ? (
        <Text style={{ fontSize: 13, color: colors.muted }}>{`${first} said: ${LEVEL_NAME[member.level]} (not confirmed).`}</Text>
      ) : null}
      {error ? <Text style={{ color: colors.errorText, fontSize: 13 }}>{error}</Text> : null}
      <Button
        title={busy ? 'Saving…' : 'Save'}
        disabled={choice == null || busy}
        onPress={async () => {
          setBusy(true);
          setError(null);
          try {
            await onSave(choice!);
          } catch {
            setError("Couldn't save the level. Try again.");
          } finally {
            setBusy(false);
          }
        }}
      />
    </Sheet>
  );
}

/**
 * F13 / F24c coach athlete detail: swaps from this team's level ("adjusted to level") and swaps caused only by
 * the athlete's lower level elsewhere ("Adjusted for this athlete", no reason; Legal copy review §4).
 */
export function LevelSwaps({ program, member, info }: { program?: Program; member: Member; info?: MemberLevel }) {
  const [open, setOpen] = useState(false);
  if (!program) return null;
  // 2.4.0 F46d: off for this athlete (or the whole program): no "adjusted to level" chip.
  if (!levelAdjustFor(program, null, member.userId)) {
    const first = member.name.split(' ')[0] || member.name;
    return <Text style={{ fontSize: 13, color: colors.muted }}>{`Exercises not adjusted for ${first}.`}</Text>;
  }
  if (!member.level) return null;
  const teamLevel = member.level as Level;
  const uniq = (list: { from: string; to: string | null }[]) => [...new Map(list.map((x) => [`${x.from}>${x.to}`, x])).values()];
  const own = uniq(program.sessions.flatMap((s) => swapsFor(program, s, teamLevel)));
  const ownKeys = new Set(own.map((x) => x.from));
  // 2.2.1 J1: the server sends only the exercises this athlete gets instead (no level, team or reason).
  const extra = uniq(
    program.sessions.flatMap((s) =>
      s.exercises.flatMap((pe) => {
        const to = adjustedFor(info?.adjusted, pe.exerciseId, program.equipment);
        return to === undefined ? [] : [{ from: getExercise(pe.exerciseId).name, to: to ? getExercise(to).name : null }];
      }),
    ),
  ).filter((x) => !ownKeys.has(x.from));
  if (!own.length && !extra.length) return null;
  const line = (x: { from: string; to: string | null }) => `${x.from} → ${x.to ?? 'left out'}`;
  return (
    <View style={{ gap: 4 }}>
      {own.length ? (
        <Pressable accessibilityRole="button" onPress={() => setOpen(!open)} style={{ minHeight: 32, justifyContent: 'center' }}>
          <Text style={{ fontSize: 13, fontWeight: '600', textDecorationLine: 'underline' }}>
            {`${own.length} exercise${own.length === 1 ? '' : 's'} adjusted to level.`}
          </Text>
        </Pressable>
      ) : null}
      {open ? own.map((x) => <Text key={line(x)} style={{ fontSize: 13, color: colors.muted }}>{line(x)}</Text>) : null}
      {extra.length ? (
        <>
          <Text style={{ fontSize: 13, fontWeight: '600' }}>{program.general ? 'Adjusted for this client' : 'Adjusted for this athlete'}</Text>
          {extra.map((x) => (
            <Text key={line(x)} style={{ fontSize: 13, color: colors.muted }}>{line(x)}</Text>
          ))}
        </>
      ) : null}
    </View>
  );
}

/**
 * 2.4.0 F46c: "Adjust exercises to Jordan's level" for one program. Off: the athlete gets exactly what the coach writes in
 * every session of this program (stored in the program as `levelAdjustOffFor`; sent with the next post). Testing
 * eligibility doesn't change (F46d).
 */
export function AdjustToLevel({ program, member }: { program?: Program; member: Member }) {
  const { data, saveProgram } = useStore();
  const local = program ? data.programs.find((p) => p.id === program.id) : undefined;
  if (!local) return null;
  const first = member.name.split(' ')[0] || member.name;
  const key = levelOffKey(local.teamId, member.userId);
  const off = (local.levelAdjustOffFor ?? []).includes(key);
  const programOff = local.levelAdjust === false;
  function set(on: boolean) {
    const list = (local!.levelAdjustOffFor ?? []).filter((u) => u !== key);
    saveProgram({ ...local!, levelAdjustOffFor: on ? list : [...list, key], ...(local!.teamId ? { unposted: true } : null) });
  }
  return (
    <View style={{ gap: 4 }}>
      <Row style={{ justifyContent: 'space-between', minHeight: 44 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', flex: 1 }}>{`Adjust exercises to ${first}'s level`}</Text>
        <Toggle accessibilityLabel={`Adjust exercises to ${first}'s level`} value={!off && !programOff} disabled={programOff} onValueChange={set} />
      </Row>
      {off ? <Text style={{ fontSize: 13, color: colors.muted }}>{`${first} gets exactly what you write, in every session of this program.`}</Text> : null}
      {programOff ? <Text style={{ fontSize: 13, color: colors.muted }}>Program setting: Off</Text> : null}
      {local.unposted ? <Text style={{ fontSize: 12, color: colors.muted }}>Post the program to send this change.</Text> : null}
    </View>
  );
}

/** F46c roster tag when the athlete's level adjust is off for their program. */
export const exactProgram = (program: Program | undefined, userId: string) => !!program && !levelAdjustFor(program, null, userId);

export function levelSetLine(member: Member) {
  return member.levelConfirmed && member.levelSetAt ? `Level set by you · ${formatDate(member.levelSetAt)}` : null;
}
