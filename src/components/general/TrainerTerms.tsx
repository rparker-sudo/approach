import { useState } from 'react';
import { Linking, Platform, Text as RNText, View } from 'react-native';
import { GATE, GateState, LEGAL } from '../../lib/general';
import { openLegal } from '../../lib/legal';
import { useTeams } from '../../lib/team';
import Sheet from '../Sheet';
import { Button, Checkbox, colors, H2, Text } from '../ui';

/** T2 confirmation 1: "I've read and accept the Trainer Terms (Terms §4T)." The link opens SITE_URL/terms#trainer-terms. */
export function TrainerTermsCheckbox({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={{ minHeight: 48, justifyContent: 'center' }}>
      <Checkbox checked={checked} onChange={onChange} label={`${LEGAL.confirmTermsBefore}${LEGAL.confirmTermsLink}${LEGAL.confirmTermsAfter}`}>
        <Text style={{ fontSize: 15, lineHeight: 21 }}>
          {LEGAL.confirmTermsBefore}
          <RNText
            accessibilityRole="link"
            onPress={(e) => {
              e.stopPropagation?.();
              openLegal('terms', 'trainer-terms');
            }}
            style={{ color: colors.ink, fontWeight: '700', textDecorationLine: 'underline' }}
          >
            {LEGAL.confirmTermsLink}
          </RNText>
          {LEGAL.confirmTermsAfter}
        </Text>
      </Checkbox>
    </View>
  );
}

/** A full-width 48 pt confirmation row (T2 items 2 and 3, Legal's wording). */
export function ConfirmRow({ checked, onChange, text }: { checked: boolean; onChange: (v: boolean) => void; text: string }) {
  return (
    <View style={{ minHeight: 48, justifyContent: 'center' }}>
      <Checkbox checked={checked} onChange={onChange} label={text}>
        <Text style={{ fontSize: 15, lineHeight: 21 }}>{text}</Text>
      </Checkbox>
    </View>
  );
}

/** F31: the Terms changed. Review opens a sheet with the link and checkbox 1 only, then Accept. */
export function TermsReviewSheet({ teamId, onClose }: { teamId: string; onClose: () => void }) {
  const { acceptTrainerTerms } = useTeams();
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <Sheet title="Trainer Terms" onClose={onClose}>
      <TrainerTermsCheckbox checked={checked} onChange={setChecked} />
      {error ? <Text style={{ fontSize: 13, color: colors.errorText }}>{error}</Text> : null}
      <Button
        title={busy ? 'Saving…' : 'Accept'}
        disabled={!checked || busy}
        onPress={async () => {
          setBusy(true);
          setError(null);
          try {
            await acceptTrainerTerms(teamId);
            onClose();
          } catch {
            setError("Couldn't save. Try again.");
          } finally {
            setBusy(false);
          }
        }}
      />
    </Sheet>
  );
}

const emailRyan = () => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') window.location.href = GATE.emailHref;
  else Linking.openURL(GATE.emailHref).catch(() => {});
};

function EmailLink() {
  return (
    <RNText accessibilityRole="link" onPress={emailRyan} style={{ fontSize: 15, fontWeight: '600', textDecorationLine: 'underline', color: colors.ink, minHeight: 44, paddingVertical: 12 }}>
      Email Ryan
    </RNText>
  );
}

/** F32a/F32c and the F31 Terms banner. Nothing when the team is open. */
export function GateBanner({ teamId, state }: { teamId: string; state: GateState }) {
  const [review, setReview] = useState(false);
  if (state === 'open') return null;
  const warn = state !== 'not_open';
  return (
    <View
      accessibilityRole={warn ? 'alert' : undefined}
      style={{ backgroundColor: colors.raised, padding: 14, gap: 6, borderRadius: 12, borderLeftWidth: 4, borderLeftColor: warn ? colors.warning : colors.ink }}
    >
      {state === 'not_open' ? (
        <>
          <H2>{GATE.notOpenTitle}</H2>
          <Text style={{ fontSize: 15, lineHeight: 21 }}>{LEGAL.notOpenTrainer}</Text>
          <Text style={{ fontSize: 13, color: colors.muted, lineHeight: 19 }}>{GATE.emailLine}</Text>
          <EmailLink />
        </>
      ) : state === 'paused' ? (
        <>
          <H2>{GATE.pausedTitle}</H2>
          <Text style={{ fontSize: 15, lineHeight: 21 }}>{GATE.pausedBody}</Text>
          <EmailLink />
        </>
      ) : (
        <>
          <Text style={{ fontSize: 15, lineHeight: 21, fontWeight: '600' }}>{GATE.termsChanged}</Text>
          <Button small title="Review" onPress={() => setReview(true)} />
          {review ? <TermsReviewSheet teamId={teamId} onClose={() => setReview(false)} /> : null}
        </>
      )}
    </View>
  );
}
