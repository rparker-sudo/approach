import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { dateKey, today } from '../lib/calendar';
import { canShareCheckIns } from '../lib/backend';
import { useStore } from '../lib/store';
import { useTeams } from '../lib/team';
import { Button, Card, Chip, ChipRow, colors, Label, Note, Row, Text } from './ui';

const SHARING = 'Your coach sees your check-ins. Teammates never do.';

const SCALES = [
  { key: 'sleep', label: 'Sleep', low: 'Bad', high: 'Great' },
  { key: 'soreness', label: 'Soreness', low: 'None', high: 'Very sore' },
  { key: 'energy', label: 'Energy', low: 'Drained', high: 'Great' },
] as const;

type Scores = { sleep: number; soreness: number; energy: number };

/**
 * Daily check-in. It never changes the athlete's workout by itself; for team
 * athletes it goes to the coach, who decides whether to lighten the day.
 */
export default function ReadinessCard() {
  const { data, mutate } = useStore();
  const { teams, checkIn, consentFor } = useTeams();
  const day = dateKey(today());
  const existing = (data.readinessLog ?? []).find((r) => r.day === day);
  const [editing, setEditing] = useState(!existing);
  const [scores, setScores] = useState<Scores>({ sleep: existing?.sleep ?? 0, soreness: existing?.soreness ?? 0, energy: existing?.energy ?? 0 });
  const [pain, setPain] = useState<boolean | null>(existing ? existing.pain : null);
  // Only teams with check-in consent (or adults) get check-ins.
  // Sent only to teams where check-ins are shared with the coach (boxes 2 and 3).
  const sharedWith = teams.filter((t) => canShareCheckIns(consentFor(t.id)));
  const onTeam = sharedWith.length > 0 || Object.values(data.teamConsent ?? {}).some((c) => canShareCheckIns(c));
  const showNotice = onTeam && !data.checkinNoticeSeen;
  const ready = scores.sleep && scores.soreness && scores.energy && pain !== null;

  if (existing && !editing) {
    return (
      <Pressable accessibilityRole="button" onPress={() => setEditing(true)}>
        <Card style={{ gap: 4 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Label>Checked in</Label>
            <Text style={{ fontSize: 12, color: colors.faint }}>Edit</Text>
          </Row>
          <Text style={{ fontSize: 13 }}>
            Sleep {existing.sleep}/5 · Soreness {existing.soreness}/5 · Energy {existing.energy}/5
            {existing.pain ? ' · Pain' : ''}
          </Text>
          {onTeam ? (
            <Text style={{ fontSize: 12, color: colors.muted }}>
              {sharedWith.every((t) => existing.sentTo.includes(t.id)) ? 'Sent to your coach.' : 'Sending to your coach…'}
            </Text>
          ) : null}
        </Card>
      </Pressable>
    );
  }

  return (
    <Card>
      <Label>How are you today?</Label>
      {showNotice ? (
        <View style={{ gap: 8 }}>
          <Note>{SHARING}</Note>
          <Button small kind="secondary" title="Got it." onPress={() => mutate((d) => ({ ...d, checkinNoticeSeen: true }))} />
        </View>
      ) : null}
      {SCALES.map((sc) => (
        <View key={sc.key} style={{ gap: 6 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text style={{ fontWeight: '600' }}>{sc.label}</Text>
            <Text style={{ fontSize: 12, color: colors.muted }}>
              1 {sc.low} · 5 {sc.high}
            </Text>
          </Row>
          <Row style={{ gap: 6 }}>
            {[1, 2, 3, 4, 5].map((n) => {
              const on = scores[sc.key] === n;
              return (
                <Pressable
                  key={n}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  aria-checked={on}
                  accessibilityLabel={`${sc.label} ${n}`}
                  onPress={() => setScores((s) => ({ ...s, [sc.key]: n }))}
                  style={{
                    flex: 1,
                    height: 40,
                    borderRadius: 8,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: on ? colors.primaryBg : colors.card,
                    borderWidth: 1,
                    borderColor: on ? colors.primaryBg : colors.line,
                  }}
                >
                  <Text style={{ fontWeight: '600', color: on ? colors.primaryText : colors.ink }}>{n}</Text>
                </Pressable>
              );
            })}
          </Row>
        </View>
      ))}
      <Text style={{ fontWeight: '600' }}>Anything hurting?</Text>
      <ChipRow>
        <Chip label="No" selected={pain === false} onPress={() => setPain(false)} />
        <Chip label="Yes" selected={pain === true} onPress={() => setPain(true)} />
      </ChipRow>
      <Text style={{ fontSize: 13, color: colors.muted }}>Tell your coach, parent, or athletic trainer in person about any pain.</Text>
      <Button
        title="Check in"
        disabled={!ready}
        onPress={() => {
          checkIn({ day, ...scores, pain: !!pain });
          setEditing(false);
        }}
      />
      <Text style={{ fontSize: 12, color: colors.muted }}>
        {onTeam ? (showNotice ? "It doesn't change your workout; your coach decides if the team goes lighter." : SHARING) : "Just for you. It doesn't change your workout."}
      </Text>
    </Card>
  );
}
