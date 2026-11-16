import { useState } from 'react';
import { View } from 'react-native';
import { normalizePerms, Perms } from '../lib/backend';
import { Button, colors, Text, Toggle } from './ui';
import { LEGAL } from '../lib/general';
import { showAlert } from '../lib/dialog';

export type Choices = Omit<Perms, 'participation'>;

/** Adults' defaults (P1.4): everything on. */
export const DEFAULT_CHOICES: Choices = { checkins: true, shareCheckins: true, boards: true, attendance: true, testing: true };

/** 2.3.0 general teams (compliance T5/T6, F33): check-ins, sharing and the class board start off; no attendance or testing. */
export const GENERAL_CHOICES: Choices = { checkins: false, shareCheckins: false, boards: false, attendance: false, testing: false };

const GENERAL_ROWS: { key: keyof Choices; title: string; line: string }[] = [
  { key: 'checkins', title: 'Check-ins', line: 'Log sleep, soreness, energy, and pain (yes/no).' },
  { key: 'shareCheckins', title: LEGAL.shareRow, line: LEGAL.shareLine },
  { key: 'boards', title: 'Class board', line: 'Your name and progress can appear on your class board when your trainer uses one.' },
];

const ROWS: { key: keyof Choices; title: string; line: string }[] = [
  { key: 'checkins', title: 'Check-ins', line: 'Log sleep, soreness, energy, and pain (yes/no).' },
  { key: 'shareCheckins', title: 'Share check-ins with my coach', line: 'Your coach sees them. Teammates never do.' },
  { key: 'boards', title: 'Team boards', line: 'Your name and effort can appear on team boards.' },
  { key: 'attendance', title: 'Attendance & hours', line: 'Count practices and matches toward your effort.' },
  { key: 'testing', title: 'Testing days', line: 'Jump tests and coach-supervised strength checks.' },
];

/** Adult athlete's toggles for boxes 2–6 (F8, and Settings → Privacy). */
export default function YourChoices({
  initial,
  onSave,
  saveLabel = 'Save',
  general,
}: {
  initial: Choices;
  onSave: (c: Choices) => Promise<void>;
  saveLabel?: string;
  /** 2.3.0: a general team's rows; sharing stays off when check-ins turn on, and turning sharing off asks first (F43). */
  general?: boolean;
}) {
  const [c, setC] = useState<Choices>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (key: keyof Choices, v: boolean) => {
    if (general) {
      const apply = () =>
        setC((cur) => {
          const n = normalizePerms({ participation: true, ...cur, [key]: v });
          return { checkins: n.checkins, shareCheckins: n.checkins && n.shareCheckins, boards: n.boards, attendance: false, testing: false };
        });
      if (key === 'shareCheckins' && !v && initial.shareCheckins) {
        showAlert('Stop sharing?', "Your trainer won't see any of your check-ins, including past ones.", [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Stop sharing', style: 'destructive', onPress: apply },
        ]);
        return;
      }
      apply();
      return;
    }
    const n = normalizePerms({ participation: true, ...c, [key]: v });
    // Turning check-ins on brings sharing back to its default (on), like the first-time screen.
    setC({ checkins: n.checkins, shareCheckins: key === 'checkins' && v ? true : n.shareCheckins, boards: n.boards, attendance: n.attendance, testing: n.testing });
  };
  return (
    <View style={{ gap: 12 }}>
      {(general ? GENERAL_ROWS : ROWS).map((r) => {
        const disabled = r.key === 'shareCheckins' && !c.checkins;
        return (
          <View key={r.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44, opacity: disabled ? 0.45 : 1 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '600' }}>{r.title}</Text>
              <Text style={{ fontSize: 13, color: colors.muted }}>{r.line}</Text>
            </View>
            <Toggle accessibilityLabel={r.title} value={c[r.key]} disabled={disabled} onValueChange={(v) => set(r.key, v)} />
          </View>
        );
      })}
      {error ? <Text style={{ color: colors.errorText, fontSize: 13 }}>{error}</Text> : null}
      <Button
        title={busy ? 'Saving…' : saveLabel}
        disabled={busy}
        onPress={async () => {
          setBusy(true);
          setError(null);
          try {
            await onSave(c);
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Something went wrong.');
          } finally {
            setBusy(false);
          }
        }}
      />
    </View>
  );
}
