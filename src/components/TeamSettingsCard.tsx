import { useState } from 'react';
import { Switch, View } from 'react-native';
import type { Team, TeamSettings } from '../lib/backend';
import { useTeams } from '../lib/team';
import { Button, Card, colors, Field, H2, Row, Text } from './ui';

/** Coach team settings: effort board toggles, team goal (F10), practice/match lengths (P5.3), med-ball weight (P6.5). */
export default function TeamSettingsCard({ team, suggestedGoal }: { team: Team; suggestedGoal: number }) {
  const { updateTeamSettings } = useTeams();
  const s = team.settings;
  const [goal, setGoal] = useState(s.teamGoal != null ? String(s.teamGoal) : '');
  const [practice, setPractice] = useState(String(s.practiceMin));
  const [match, setMatch] = useState(String(s.matchMin));
  const [tourney, setTourney] = useState(String(s.tournamentMin));
  const [ball, setBall] = useState(String(s.medBallLb));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save(patch: Partial<TeamSettings>) {
    setBusy(true);
    setMsg(null);
    try {
      await updateTeamSettings(team.id, patch);
      setMsg('Saved.');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  const num = (v: string, min: number, max: number) => {
    const n = Math.round(Number(v));
    return Number.isFinite(n) && n >= min && n <= max ? n : null;
  };

  return (
    <Card>
      <H2>Boards and testing</H2>
      <Toggle label="Effort board" value={s.effortBoard} onChange={(v) => save({ effortBoard: v })} />
      <Toggle label="Show effort on coach board" value={s.boardEffortPanel} onChange={(v) => save({ boardEffortPanel: v })} />
      <Field
        label="Team goal (sessions this season)"
        keyboardType="number-pad"
        placeholder={`Suggested: ${suggestedGoal}`}
        value={goal}
        onChangeText={setGoal}
      />
      <Text style={{ fontSize: 12, color: colors.muted }}>Leave empty to use the suggestion (athletes × sessions a week × weeks left × 0.8).</Text>
      <Row style={{ gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Field label="Practice (min)" keyboardType="number-pad" value={practice} onChangeText={setPractice} />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Match (min)" keyboardType="number-pad" value={match} onChangeText={setMatch} />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Tournament (min)" keyboardType="number-pad" value={tourney} onChangeText={setTourney} />
        </View>
      </Row>
      <Field label="Med-ball throw: ball weight (lb)" keyboardType="decimal-pad" value={ball} onChangeText={setBall} />
      {msg ? <Text style={{ fontSize: 13, color: msg === 'Saved.' ? colors.muted : colors.error }}>{msg}</Text> : null}
      <Button
        small
        title={busy ? 'Saving…' : 'Save settings'}
        disabled={busy}
        onPress={() => {
          const g = goal.trim() ? num(goal, 0, 100000) : null;
          const p = num(practice, 0, 600);
          const m = num(match, 0, 600);
          const t = num(tourney, 0, 900);
          const b = Number(ball);
          if ((goal.trim() && g == null) || p == null || m == null || t == null || !(b >= 1 && b <= 30)) {
            setMsg('Check the numbers: minutes 0–600 (tournament up to 900), ball 1–30 lb.');
            return;
          }
          save({ teamGoal: g, practiceMin: p, matchMin: m, tournamentMin: t, medBallLb: Math.round(b * 10) / 10 });
        }}
      />
    </Card>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Row style={{ justifyContent: 'space-between', minHeight: 44 }}>
      <Text style={{ fontSize: 15, flex: 1 }}>{label}</Text>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.ink, false: colors.line }}
        thumbColor={value ? colors.bg : colors.muted}
        {...({ activeThumbColor: colors.bg } as object)}
      />
    </Row>
  );
}
