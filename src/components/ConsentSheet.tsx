import { useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import type { ConsentStatus, Member, RecordableConsent } from '../lib/backend';
import { showAlert } from '../lib/dialog';
import { openLegal } from '../lib/legal';
import { BRAND, Button, colors, H2, Icon, OptionCard, Text } from './ui';

const OPTIONS: { value: Exclude<RecordableConsent, 'pending'>; title: string }[] = [
  { value: 'training_only', title: 'Training only (no check-ins)' },
  { value: 'full', title: 'Training and check-ins shared with me' },
];

/** Coach records (or changes / clears) a minor's parent consent (F3). */
export default function ConsentSheet({
  member,
  onClose,
  onSave,
}: {
  member: Member | null;
  onClose: () => void;
  onSave: (status: RecordableConsent) => Promise<void>;
}) {
  return (
    <Modal visible={!!member} transparent animationType="slide" onRequestClose={onClose}>
      {member ? <Sheet key={member.userId} member={member} onClose={onClose} onSave={onSave} /> : null}
    </Modal>
  );
}

function Sheet({ member, onClose, onSave }: { member: Member; onClose: () => void; onSave: (status: RecordableConsent) => Promise<void> }) {
  const recorded: ConsentStatus = member.consentStatus;
  const isRecorded = recorded === 'training_only' || recorded === 'full';
  const [choice, setChoice] = useState<RecordableConsent | null>(isRecorded ? recorded : null);
  const [signed, setSigned] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(status: RecordableConsent) {
    setBusy(true);
    setError(null);
    try {
      await onSave(status);
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
        style={{ backgroundColor: colors.card, borderTopLeftRadius: BRAND.radius.lg, borderTopRightRadius: BRAND.radius.lg, padding: 16, paddingBottom: 32, gap: 12 }}
      >
        <H2>{`Record parent consent for ${member.name}`}</H2>
        {OPTIONS.map((o) => (
          <OptionCard key={o.value} title={o.title} selected={choice === o.value} onPress={() => setChoice(o.value)} />
        ))}
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: signed }}
          aria-checked={signed}
          onPress={() => setSigned((v) => !v)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 }}
        >
          <Icon name={signed ? 'checkmark.square.fill' : 'square'} size={24} color={colors.ink} />
          <Text style={{ flex: 1, fontSize: 15 }}>{`I have a signed parent consent form for ${member.name}.`}</Text>
        </Pressable>
        {error ? <Text style={{ color: colors.error, fontSize: 13 }}>{error}</Text> : null}
        <Button
          title={busy ? 'Saving…' : isRecorded ? 'Change' : 'Save'}
          disabled={!choice || !signed || busy || (isRecorded && choice === recorded)}
          onPress={() => save(choice!)}
        />
        {isRecorded ? (
          <Button
            kind="ghost"
            title="Clear consent"
            disabled={busy}
            onPress={() =>
              showAlert(`Clear consent for ${member.name}?`, "They won't be able to log or check in until you record a form again.", [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Clear consent', style: 'destructive', onPress: () => save('pending') },
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
      </Pressable>
    </Pressable>
  );
}
