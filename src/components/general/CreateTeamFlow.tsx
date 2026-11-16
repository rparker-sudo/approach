import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { LEGAL } from '../../lib/general';
import { useTeams } from '../../lib/team';
import { Button, Card, colors, Field, H2, Label, OptionCard, Row, Text } from '../ui';
import { ConfirmRow, TrainerTermsCheckbox } from './TrainerTerms';

type Kind = 'volleyball' | 'general';

/**
 * F31 Create a team. Step 1 type (nothing preselected). Volleyball continues to the existing create card unchanged.
 * Training clients: name, then three separate, unticked confirmations (compliance T2); Create is enabled only when all
 * three are ticked. No "tick all".
 */
export default function CreateTeamFlow({ onCancel, volleyball }: { onCancel: () => void; volleyball: () => void }) {
  const { createGeneralTeam } = useTeams();
  const [kind, setKind] = useState<Kind | null>(null);
  const [step, setStep] = useState<'type' | 'name' | 'confirm'>('type');
  const [name, setName] = useState('');
  const [c1, setC1] = useState(false);
  const [c2, setC2] = useState(false);
  const [c3, setC3] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [at, setAt] = useState<{ terms?: string; adults_responsible?: string; no_cobranding?: string }>({});
  const tick = (key: keyof typeof at, set: (v: boolean) => void) => (v: boolean) => {
    set(v);
    setAt((s) => ({ ...s, [key]: v ? new Date().toISOString() : undefined }));
  };

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const t = await createGeneralTeam(name, { terms: at.terms!, adults_responsible: at.adults_responsible!, no_cobranding: at.no_cobranding! });
      router.push(`/team/${t.id}`);
    } catch {
      setError("Couldn't create the team. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <H2>New team</H2>
      {step === 'type' ? (
        <>
          <OptionCard
            title="Volleyball team"
            subtitle="Athletes 13+, parent consent for minors, volleyball programs."
            selected={kind === 'volleyball'}
            onPress={() => setKind('volleyball')}
          />
          <OptionCard
            title="Training clients (adults 18+)"
            subtitle="Your own clients: 1-on-1 programs, small groups, and clients who train alone."
            selected={kind === 'general'}
            onPress={() => setKind('general')}
          />
          <Row>
            <View style={{ flex: 1 }}>
              <Button kind="ghost" title="Cancel" onPress={onCancel} />
            </View>
            <View style={{ flex: 1 }}>
              <Button title="Next" disabled={!kind} onPress={() => (kind === 'volleyball' ? volleyball() : setStep('name'))} />
            </View>
          </Row>
        </>
      ) : step === 'name' ? (
        <>
          <Field label="Team name" placeholder="My clients" value={name} onChangeText={setName} autoFocus maxLength={40} />
          <Text style={{ fontSize: 13, color: colors.muted }}>Only you and your clients see this.</Text>
          <Row>
            <View style={{ flex: 1 }}>
              <Button kind="ghost" title="Back" onPress={() => setStep('type')} />
            </View>
            <View style={{ flex: 1 }}>
              <Button title="Next" disabled={!name.trim()} onPress={() => setStep('confirm')} />
            </View>
          </Row>
        </>
      ) : (
        <>
          <Label>Before you create it</Label>
          <TrainerTermsCheckbox checked={c1} onChange={tick('terms', setC1)} />
          <ConfirmRow checked={c2} onChange={tick('adults_responsible', setC2)} text={LEGAL.confirmAdults} />
          <ConfirmRow checked={c3} onChange={tick('no_cobranding', setC3)} text={LEGAL.confirmNoCobranding} />
          {error ? <Text style={{ color: colors.errorText, fontSize: 13 }}>{error}</Text> : null}
          <Button large title={busy ? 'Creating…' : 'Create team'} disabled={!(c1 && c2 && c3) || busy} onPress={create} />
          <Button kind="ghost" title="Back" onPress={() => setStep('name')} />
        </>
      )}
    </Card>
  );
}
