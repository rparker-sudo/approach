import { router } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { noteLines, isGeneratedLine, WEEK_NOTE } from '../lib/coaching';
import { getExercise } from '../lib/exercises';
import type { ProgramExercise } from '../lib/types';
import { Button, Card, colors, Row, Text } from './ui';

/**
 * 2.4.2 Part D components (UX F61–F62). Not board-safe (design system §7.2: `SessionSummary`, `CoachingNote`, "Board-safe:
 * No"): never import these under src/app/board/ or the effort board (G-4).
 */

/** F61b / F62a: 1–4 footnote lines, first `ink`, the rest `muted`; long lines wrap to 2 then "More" opens a sheet. */
export function SessionSummary({ lines }: { lines?: string[] | null }) {
  const [sheet, setSheet] = useState<string | null>(null);
  if (!lines?.length) return null;
  return (
    <View style={{ gap: 2 }}>
      {lines.map((l, i) => {
        const long = l.length > 90;
        return (
          <Row key={l} style={{ gap: 4, alignItems: 'flex-end' }}>
            <Text numberOfLines={long ? 2 : undefined} style={{ flex: 1, fontSize: 13, color: i === 0 ? colors.ink : colors.muted }}>{l}</Text>
            {long ? (
              <Text accessibilityRole="button" onPress={() => setSheet(l)} style={{ fontSize: 13, fontWeight: '700', textDecorationLine: 'underline', minHeight: 44, minWidth: 44, paddingVertical: 12 }}>More</Text>
            ) : null}
          </Row>
        );
      })}
      <Modal visible={!!sheet} transparent animationType="fade" onRequestClose={() => setSheet(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
          <Card style={{ margin: 16 }}>
            <Text style={{ fontSize: 15 }}>{sheet}</Text>
            <Button title="Close" onPress={() => setSheet(null)} />
          </Card>
        </View>
      </Modal>
    </View>
  );
}

/**
 * F61c / F62b: notes shown one line per line of text. Coach: both 13 pt muted. Athlete: the cue 16 pt `ink` (readable mid-set),
 * the week note and other notes 13 pt `muted`. No "Coach:" prefix on Approach-generated sessions (F61c [Repo]).
 */
export function CoachingNote({ notes, variant, prefix }: { notes?: string | null; variant: 'coach' | 'athlete'; prefix?: string | null }) {
  const lines = noteLines(notes);
  if (!lines.length) return null;
  if (prefix) return <Text style={{ fontSize: 13 }}>{`${prefix}: ${lines.join(' ')}`}</Text>;
  return (
    <View style={{ gap: 2 }}>
      {lines.map((l, i) => (
        <Text key={`${i}-${l}`} style={variant === 'athlete' && i === 0 && isGeneratedLine(l) && !/^(Week |Deload|Top set|Straight sets|Round 1)/.test(l) ? { fontSize: 16, color: colors.ink } : { fontSize: 13, color: colors.muted }}>
          {l}
        </Text>
      ))}
    </View>
  );
}

/** The build-up week note shows above the ramp-up rows on the rack position (F62c). */
export const hasBuildUpNote = (notes?: string | null) => noteLines(notes).includes(WEEK_NOTE.buildUp);

/** F62d athlete cooldown card: last card, rows with How-to, one Done (device only), never gates Finish. */
export function CooldownCard({ rows, minutes, together, coachSet, done, onDone }: { rows: ProgramExercise[]; minutes: number; together: boolean; coachSet: boolean; done: boolean; onDone?: (v: boolean) => void }) {
  const [open, setOpen] = useState(!done);
  if (!rows.length) return null;
  if (done && !open) {
    return (
      <Pressable accessibilityRole="button" accessibilityLabel="Cooldown done. Reopen" onPress={() => setOpen(true)} style={{ minHeight: 56, justifyContent: 'center' }}>
        <Card>
          <Text style={{ fontSize: 16, fontWeight: '600' }}>Cooldown done ✓</Text>
        </Card>
      </Pressable>
    );
  }
  return (
    <Card style={{ gap: 8 }}>
      <Row style={{ gap: 8, flexWrap: 'wrap' }}>
        <Text accessibilityRole="header" style={{ fontSize: 17, fontWeight: '700' }}>{`Cooldown · about ${minutes} min`}</Text>
        {together ? <Text style={{ fontSize: 13, color: colors.muted }}>Together</Text> : null}
        {coachSet ? <Text style={{ fontSize: 13, color: colors.muted }}>Set by your coach</Text> : null}
      </Row>
      {rows.map((r, i) => {
        const ex = getExercise(r.exerciseId);
        return (
          <Pressable key={`${r.exerciseId}-${i}`} accessibilityRole="link" onPress={() => router.push(`/exercise/${ex.id}`)} style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 15, flex: 1 }}>{`${ex.name} · ${prescriptionText(r)}`}</Text>
            <Text style={{ fontSize: 13, textDecorationLine: 'underline' }}>How-to</Text>
          </Pressable>
        );
      })}
      {p_onDone(onDone) ? (
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done }}
        accessibilityLabel="Cooldown done."
        onPress={() => {
          onDone!(!done);
          if (!done) setOpen(false);
        }}
        style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 12 }}
      >
        <Text style={{ fontSize: 20 }}>{done ? '☑' : '☐'}</Text>
        <Text style={{ fontSize: 16, fontWeight: '600' }}>Cooldown done.</Text>
      </Pressable>
      ) : null}
    </Card>
  );
}

const p_onDone = (f?: (v: boolean) => void) => !!f;

/** "30 s/side", "20 s/side", "× 3", "5/side". */
export function prescriptionText(r: Pick<ProgramExercise, 'reps' | 'sets'>): string {
  const hold = r.reps.match(/(\d+)\s*s/);
  if (hold) return `${hold[1]} s${/each/.test(r.reps) ? '/side' : ''}`;
  const n = r.reps.match(/[\d–-]+/)?.[0] ?? r.reps;
  return /each/.test(r.reps) ? `${n}/side` : `× ${n}`;
}
