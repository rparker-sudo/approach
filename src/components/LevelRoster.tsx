import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { LEVEL_NAME } from '../lib/athlete';
import type { Member, MemberLevel } from '../lib/backend';
import { Level, swapsFor } from '../lib/resolve';
import type { Program } from '../lib/types';
import { formatDate } from '../lib/util';
import Sheet from './Sheet';
import { BRAND, Button, colors, OptionCard, Text } from './ui';

/** F24a: level chip. Coach-set = solid outline; self-reported = dotted outline (and "Level not confirmed" text in the row). */
export function LevelChip({ member, onPress }: { member: Member; onPress: () => void }) {
  const lv = member.level;
  const label = lv ? LEVEL_NAME[lv] : 'Set level';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Level: ${lv ? LEVEL_NAME[lv] : 'not set'}${member.levelConfirmed ? '' : ', not confirmed'}. Set ${member.name}'s level`}
      onPress={onPress}
      hitSlop={8}
      style={{
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: BRAND.radius.pill,
        borderWidth: 1,
        borderStyle: member.levelConfirmed ? 'solid' : 'dotted',
        borderColor: member.levelConfirmed ? colors.ink : colors.muted,
        alignSelf: 'flex-start',
      }}
    >
      <Text style={{ fontSize: 12, fontWeight: '600', color: member.levelConfirmed ? colors.ink : colors.muted }}>{label}</Text>
    </Pressable>
  );
}

const DESCRIPTIONS: Record<number, string> = {
  1: 'Learning the basic lifts.',
  2: 'Solid form on the main lifts.',
  3: 'Years of coached lifting, including barbell lifts.',
};

/** F24b: set level sheet. Saving the same level as the self-reported one still confirms it. */
export function SetLevelSheet({ member, onClose, onSave }: { member: Member; onClose: () => void; onSave: (level: number) => Promise<void> }) {
  const [choice, setChoice] = useState<number | null>(member.level ?? null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const first = member.name.split(' ')[0] || member.name;
  return (
    <Sheet title={`Set ${first}'s level`} onClose={onClose}>
      {[1, 2, 3].map((lv) => (
        <OptionCard key={lv} title={LEVEL_NAME[lv]} subtitle={DESCRIPTIONS[lv]} selected={choice === lv} onPress={() => setChoice(lv)} />
      ))}
      <Text style={{ fontSize: 13, color: colors.muted }}>
        {`Sets which version of each exercise ${first} gets. Athletes under 18 need intermediate or advanced, set by you, for strength checks.`}
      </Text>
      {!member.levelConfirmed && member.level ? (
        <Text style={{ fontSize: 13, color: colors.muted }}>{`${first} said: ${LEVEL_NAME[member.level]} (not confirmed).`}</Text>
      ) : null}
      {error ? <Text style={{ color: colors.error, fontSize: 13 }}>{error}</Text> : null}
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
  if (!program || !member.level) return null;
  const teamLevel = member.level as Level;
  const effective = Math.min(teamLevel, info?.swapLevel ?? teamLevel) as Level;
  const uniq = (list: { from: string; to: string | null }[]) => [...new Map(list.map((x) => [`${x.from}>${x.to}`, x])).values()];
  const own = uniq(program.sessions.flatMap((s) => swapsFor(program, s, teamLevel)));
  const ownKeys = new Set(own.map((x) => x.from));
  const extra = effective < teamLevel ? uniq(program.sessions.flatMap((s) => swapsFor(program, s, effective))).filter((x) => !ownKeys.has(x.from)) : [];
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
          <Text style={{ fontSize: 13, fontWeight: '600' }}>Adjusted for this athlete</Text>
          {extra.map((x) => (
            <Text key={line(x)} style={{ fontSize: 13, color: colors.muted }}>{line(x)}</Text>
          ))}
        </>
      ) : null}
    </View>
  );
}

export function levelSetLine(member: Member) {
  return member.levelConfirmed && member.levelSetAt ? `Level set by you · ${formatDate(member.levelSetAt)}` : null;
}
