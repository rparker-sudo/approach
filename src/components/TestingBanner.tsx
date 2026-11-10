import { useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import type { Team } from '../lib/backend';
import { dateKey, planForDate, today } from '../lib/calendar';
import { ALL, useTeams } from '../lib/team';
import { BATTERY_LABEL } from '../lib/testing';
import { useTeamProgramFor } from './EffortBoard';
import { BRAND, Banner, Button, colors, H2, Icon, Text } from './ui';

/**
 * Coach team screen on a testing day (F11): banner, and "Start strength check" with the supervision
 * confirmation. Load tests stay locked for everyone until this is confirmed that day (P6.3).
 */
export default function TestingBanner({ team }: { team: Team }) {
  const t = useTeams();
  const programFor = useTeamProgramFor(team.id);
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const keys = [ALL, ...(t.groups[team.id] ?? []).map((g) => g.id)];
  const battery = keys.map((k) => programFor(k === ALL ? null : k)).map((p) => (p ? planForDate(p, today()).test : undefined)).find(Boolean);
  if (!battery) return null;
  const session = t.testSessions[team.id];
  const needsLock = battery !== 'jump';

  return (
    <>
      <Banner
        action={needsLock && !session ? { label: 'Start strength check', onPress: () => setOpen(true) } : undefined}
      >
        {`Testing day: ${BATTERY_LABEL[battery]}`}
        {needsLock
          ? session
            ? ` · Strength checks open · confirmed ${new Date(session.confirmedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
            : ' · Strength checks are locked until you confirm you’re supervising.'
          : ' · Jump tests only.'}
      </Banner>
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }} onPress={() => setOpen(false)}>
          <Pressable
            onPress={() => {}}
            style={{ backgroundColor: colors.card, borderTopLeftRadius: BRAND.radius.lg, borderTopRightRadius: BRAND.radius.lg, padding: 16, paddingBottom: 32, gap: 12 }}
          >
            <H2>Start strength check</H2>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked }}
              aria-checked={checked}
              onPress={() => setChecked((v) => !v)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 }}
            >
              <Icon name={checked ? 'checkmark.square.fill' : 'square'} size={24} color={colors.ink} />
              <Text style={{ flex: 1, fontSize: 15 }}>I&apos;ll be supervising this test, with safeties or spotters set.</Text>
            </Pressable>
            {error ? <Text style={{ color: colors.error, fontSize: 13 }}>{error}</Text> : null}
            <Button
              title={busy ? 'Confirming…' : 'Confirm'}
              disabled={!checked || busy}
              onPress={async () => {
                setBusy(true);
                setError(null);
                try {
                  await t.confirmSupervision(team.id, dateKey(today()), battery);
                  setOpen(false);
                } catch (e) {
                  setError(e instanceof Error ? e.message : 'Something went wrong.');
                } finally {
                  setBusy(false);
                }
              }}
            />
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 12, color: colors.muted }}>Your name and the time are recorded.</Text>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
