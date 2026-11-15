import { useState } from 'react';
import { Text as RNText } from 'react-native';
import { COACH_TERMS_REASON } from '../lib/coachTerms';
import { openLegal } from '../lib/legal';
import { useTeams } from '../lib/team';
import Sheet from './Sheet';
import { Button, Checkbox, colors, Text } from './ui';

/**
 * 2.2.1 §8 Coach Terms. "I agree to the Coach Terms (Terms §4)" with "Coach Terms" linking to SITE_URL/terms#coach-terms.
 * Separate from the Terms/Privacy agreement line and unchecked to start.
 */
export function CoachTermsCheckbox({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <Checkbox checked={checked} onChange={onChange} label="I agree to the Coach Terms (Terms §4)">
      <Text style={{ fontSize: 15, lineHeight: 21 }}>
        I agree to the{' '}
        <RNText
          accessibilityRole="link"
          onPress={(e) => {
            e.stopPropagation?.();
            openLegal('terms', 'coach-terms');
          }}
          style={{ color: colors.ink, fontWeight: '600', textDecorationLine: 'underline' }}
        >
          Coach Terms
        </RNText>{' '}
        (Terms §4)
      </Text>
    </Checkbox>
  );
}

/** Existing coach accounts: a one-time sheet with the same checkbox. Closing it keeps the blocked actions blocked. */
export function CoachTermsSheet({ onClose }: { onClose: () => void }) {
  const { acceptCoachTerms } = useTeams();
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <Sheet title="Coach Terms" onClose={onClose}>
      <CoachTermsCheckbox checked={checked} onChange={setChecked} />
      {error ? <Text style={{ fontSize: 13, color: colors.errorText }}>{error}</Text> : null}
      <Button
        title={busy ? 'Saving…' : 'Continue'}
        disabled={!checked || busy}
        onPress={async () => {
          setBusy(true);
          setError(null);
          try {
            await acceptCoachTerms();
            onClose();
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Something went wrong. Try again.');
          } finally {
            setBusy(false);
          }
        }}
      />
      <Button kind="ghost" title="Not now" onPress={onClose} />
    </Sheet>
  );
}

/** True when this account may record consent and start strength checks (coaches who accepted; everyone else n/a). */
export function useCoachTermsOk(): boolean {
  const { account } = useTeams();
  return !account || account.role !== 'coach' || account.coachTermsAccepted !== false;
}

/** The reason line under a blocked action; tapping it opens the Coach Terms sheet. */
export function CoachTermsReason() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <RNText
        accessibilityRole="link"
        onPress={() => setOpen(true)}
        style={{ fontSize: 13, color: colors.warningText, textDecorationLine: 'underline', minHeight: 44, paddingVertical: 12 }}
      >
        {COACH_TERMS_REASON}
      </RNText>
      {open ? <CoachTermsSheet onClose={() => setOpen(false)} /> : null}
    </>
  );
}
