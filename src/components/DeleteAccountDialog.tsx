import { useState } from 'react';
import { Modal, Pressable } from 'react-native';
import { BRAND, Body, Button, colors, Field, H2, Text } from './ui';

/** "Delete your account?" with typed DELETE confirmation (F5). */
export default function DeleteAccountDialog({
  visible,
  coach,
  onCancel,
  onDelete,
}: {
  visible: boolean;
  coach: boolean;
  onCancel: () => void;
  /** Resolves when the account is gone; throws on failure. */
  onDelete: () => Promise<void>;
}) {
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function close() {
    if (busy) return;
    setTyped('');
    setError(null);
    onCancel();
  }

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      await onDelete();
    } catch {
      setError("Couldn't delete your account. Check your connection and try again.");
      setBusy(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 16 }} onPress={close}>
        <Pressable onPress={() => {}} style={{ backgroundColor: colors.card, borderRadius: BRAND.radius.lg, padding: 20, gap: 14 }}>
          <H2>Delete your account?</H2>
          <Body muted>
            This deletes your account, your team memberships, logged workouts, and check-ins. Data on this phone is erased too. This
            can't be undone.
            {coach ? " Your teams and every athlete's logs for those teams are deleted too." : ''}
          </Body>
          <Field
            label="Type DELETE to confirm."
            value={typed}
            onChangeText={setTyped}
            autoCapitalize="characters"
            autoCorrect={false}
            editable={!busy}
          />
          {error ? <Text style={{ color: colors.error, fontSize: 13 }}>{error}</Text> : null}
          <Button kind="danger" title={busy ? 'Deleting…' : 'Delete my account'} disabled={typed !== 'DELETE' || busy} onPress={confirm} />
          <Button kind="ghost" title="Cancel" disabled={busy} onPress={close} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}
