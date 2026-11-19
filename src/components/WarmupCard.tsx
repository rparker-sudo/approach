import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { getExercise } from '../lib/exercises';
import { PART_TITLE, WARMUP_PARTS, warmupName, type WarmupPart } from '../lib/warmup';
import type { SessionWarmup } from '../lib/types';
import { Card, colors, H2, Row, Text } from './ui';

/**
 * F47 Warm-up card: the first card of every session (athlete and client). Three parts, each collapsible and open by
 * default, a Done checkbox per part (56 pt). Not required: Start workout isn't gated on it. No card when there's no warm-up.
 */
export default function WarmupCard({
  warmup,
  minutes,
  typeLabel,
  done,
  onToggle,
  coachWord = 'coach',
}: {
  warmup: SessionWarmup & { source?: 'approach' | 'edited' | 'template' };
  minutes: number;
  typeLabel: string;
  done: WarmupPart[];
  onToggle?: (part: WarmupPart, value: boolean) => void;
  coachWord?: string;
}) {
  const [closed, setClosed] = useState<WarmupPart[]>([]);
  const [reopened, setReopened] = useState(false);
  const allDone = WARMUP_PARTS.every((p) => done.includes(p));
  if (allDone && !reopened) {
    return (
      <Pressable accessibilityRole="button" accessibilityLabel="Warm-up done. Open the warm-up." onPress={() => setReopened(true)}>
        <Card style={{ minHeight: 48, justifyContent: 'center' }}>
          <Text style={{ fontSize: 15, fontWeight: '600' }}>Warm-up done ✓</Text>
        </Card>
      </Pressable>
    );
  }
  return (
    <Card style={{ gap: 8 }}>
      <H2>{`Warm-up · about ${minutes} min${warmup.compact ? ' · Compact' : ''}`}</H2>
      <Text style={{ fontSize: 13, color: colors.muted }}>{typeLabel}</Text>
      {warmup.source && warmup.source !== 'approach' ? <Text style={{ fontSize: 13, color: colors.muted }}>{`Set by your ${coachWord}`}</Text> : null}
      {WARMUP_PARTS.map((part) => {
        const items = warmup[part];
        if (!items.length) return null;
        const open = !closed.includes(part);
        const isDone = done.includes(part);
        return (
          <View key={part} style={{ gap: 4 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: open }}
              onPress={() => setClosed((c) => (open ? [...c, part] : c.filter((x) => x !== part)))}
              style={{ minHeight: 44, justifyContent: 'center' }}
            >
              <Row style={{ justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 15, fontWeight: '700' }}>{PART_TITLE[part]}</Text>
                <Text style={{ fontSize: 13, color: colors.muted }}>{open ? 'Hide' : 'Show'}</Text>
              </Row>
            </Pressable>
            {open
              ? items.map((pe, i) => {
                  const linked = !pe.customName && getExercise(pe.exerciseId).howTo.steps.length > 0;
                  const label = `${warmupName(pe)} · ${pe.reps}`;
                  return linked ? (
                    <Pressable
                      key={`${part}-${i}`}
                      accessibilityRole="link"
                      accessibilityLabel={`${label}. How-to`}
                      onPress={() => router.push(`/exercise/${pe.exerciseId}`)}
                      style={{ minHeight: 48, justifyContent: 'center' }}
                    >
                      <Row style={{ justifyContent: 'space-between', gap: 8 }}>
                        <Text style={{ fontSize: 14, flex: 1 }}>{label}</Text>
                        <Text style={{ fontSize: 13, textDecorationLine: 'underline' }}>How-to</Text>
                      </Row>
                    </Pressable>
                  ) : (
                    <View key={`${part}-${i}`} style={{ minHeight: 48, justifyContent: 'center' }}>
                      <Text style={{ fontSize: 14 }}>{label}</Text>
                    </View>
                  );
                })
              : null}
            {onToggle ? (
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isDone }}
                aria-checked={isDone}
                onPress={() => onToggle(part, !isDone)}
                style={{
                  minHeight: 56,
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: isDone ? colors.achievement : colors.line,
                  backgroundColor: isDone ? colors.achievement : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 15, fontWeight: '600', color: isDone ? colors.bg : colors.ink }}>{`${isDone ? '✓ ' : ''}${PART_TITLE[part]} done`}</Text>
              </Pressable>
            ) : null}
          </View>
        );
      })}
    </Card>
  );
}
