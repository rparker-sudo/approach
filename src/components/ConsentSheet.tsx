import { useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { Member, NO_PERMS, normalizePerms, Perms } from '../lib/backend';
import { showAlert } from '../lib/dialog';
import { openLegal } from '../lib/legal';
import { BRAND, Button, colors, H2, Icon, Text } from './ui';

/** The six boxes on parent consent form v2, in order (F7). */
export const CONSENT_BOXES: { key: keyof Perms; title: string; line: string }[] = [
  { key: 'participation', title: '1 Participation (required)', line: 'Use Approach and log workouts.' },
  { key: 'checkins', title: '2 Check-ins', line: 'Log sleep, soreness, energy, and pain (yes/no).' },
  { key: 'shareCheckins', title: '3 Share check-ins with me', line: 'You see their check-ins. Teammates never do.' },
  { key: 'boards', title: '4 Team boards', line: 'Name ("Jordan M." or initials) and progress on team boards.' },
  { key: 'attendance', title: '5 Attendance & hours', line: 'Practices, matches, and hours on the effort board.' },
  { key: 'testing', title: '6 Testing days', line: 'Jump tests and coach-supervised strength checks.' },
];

/** Box 3 needs box 2; boxes 2–6 need box 1. */
function enabled(key: keyof Perms, p: Perms) {
  if (key === 'participation') return true;
  if (key === 'shareCheckins') return p.participation && p.checkins;
  return p.participation;
}

function Check({
  checked,
  disabled,
  onPress,
  title,
  line,
}: {
  checked: boolean;
  disabled?: boolean;
  onPress: () => void;
  title: string;
  line?: string;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      aria-checked={checked}
      aria-disabled={disabled}
      disabled={disabled}
      onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, minHeight: 44, paddingVertical: 4, opacity: disabled ? 0.4 : 1 }}
    >
      <Icon name={checked ? 'checkmark.square.fill' : 'square'} size={24} color={colors.ink} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: line ? '600' : '400' }}>{title}</Text>
        {line ? <Text style={{ fontSize: 13, color: colors.muted }}>{line}</Text> : null}
      </View>
    </Pressable>
  );
}

/** Coach records (or changes / clears) a minor's six permissions from a signed form v2 (F7). */
export default function ConsentSheet({
  member,
  onClose,
  onSave,
}: {
  member: Member | null;
  onClose: () => void;
  onSave: (perms: Perms) => Promise<void>;
}) {
  return (
    <Modal visible={!!member} transparent animationType="slide" onRequestClose={onClose}>
      {member ? <Sheet key={member.userId} member={member} onClose={onClose} onSave={onSave} /> : null}
    </Modal>
  );
}

function Sheet({ member, onClose, onSave }: { member: Member; onClose: () => void; onSave: (perms: Perms) => Promise<void> }) {
  // Start from what's on file only if it came from form v2; a v1 record needs the new form.
  const onFile = member.consentVersion === 2 && member.perms.participation;
  const [perms, setPerms] = useState<Perms>(onFile ? member.perms : { ...NO_PERMS });
  const [signed, setSigned] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (key: keyof Perms) => setPerms((p) => normalizePerms({ ...p, [key]: !p[key] }));

  async function save(p: Perms) {
    setBusy(true);
    setError(null);
    try {
      await onSave(p);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }} onPress={onClose}>
      <Pressable
        onPress={() => {}}
        style={{ backgroundColor: colors.card, borderTopLeftRadius: BRAND.radius.lg, borderTopRightRadius: BRAND.radius.lg, maxHeight: '92%' }}
      >
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 10 }}>
          <H2>{`Record parent consent for ${member.name} (form v2)`}</H2>
          {member.consentVersion === 1 ? (
            <Text style={{ fontSize: 13, color: colors.muted }}>
              On file: the earlier form. Record the new form to turn on boards, attendance, and testing.
            </Text>
          ) : null}
          {CONSENT_BOXES.map((b) => (
            <Check
              key={b.key}
              checked={perms[b.key]}
              disabled={!enabled(b.key, perms)}
              onPress={() => toggle(b.key)}
              title={b.title}
              line={b.line}
            />
          ))}
          <View style={{ height: 1, backgroundColor: colors.line, marginVertical: 4 }} />
          <Check checked={signed} onPress={() => setSigned((v) => !v)} title={`I have a signed parent consent form (version 2) for ${member.name}.`} />
          {error ? <Text style={{ color: colors.error, fontSize: 13 }}>{error}</Text> : null}
          <Button title={busy ? 'Saving…' : 'Save'} disabled={!perms.participation || !signed || busy} onPress={() => save(perms)} />
          {member.perms.participation ? (
            <Button
              kind="ghost"
              title="Clear consent"
              disabled={busy}
              onPress={() =>
                showAlert(`Clear consent for ${member.name}?`, "They won't be able to log or check in until you record a form again.", [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Clear consent', style: 'destructive', onPress: () => save({ ...NO_PERMS }) },
                ])
              }
            />
          ) : null}
          <View style={{ alignItems: 'center' }}>
            <Text
              accessibilityRole="link"
              onPress={() => openLegal('consent')}
              style={{ fontSize: 14, textDecorationLine: 'underline', color: colors.muted, paddingVertical: 12 }}
            >
              Print the consent form
            </Text>
          </View>
        </ScrollView>
      </Pressable>
    </Pressable>
  );
}
