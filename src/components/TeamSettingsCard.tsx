import { useState } from 'react';
import { Pressable, Switch, View } from 'react-native';
import type { Team, TeamSettings } from '../lib/backend';
import { useTeams } from '../lib/team';
import { BOARD_BG, boardAccent, DEFAULT_ACCENT, isHex, PRESETS, textOn } from '../lib/accent';
import { showAlert } from '../lib/dialog';
import { Button, Card, colors, Field, H2, Label, Row, Text } from './ui';

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
      <Toggle label="Show leaderboard on Season view" value={s.boardEffortPanel} onChange={(v) => save({ boardEffortPanel: v })} />
      <Field
        label="Team goal (sessions this season)"
        keyboardType="number-pad"
        placeholder={`Suggested: ${suggestedGoal}`}
        value={goal}
        onChangeText={setGoal}
      />
      <Text style={{ fontSize: 12, color: colors.muted }}>
        Leave empty to use the suggestion (athletes × sessions a week × weeks left × 0.8). Break weeks are left out of the suggestion.
      </Text>
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
      <BoardColor team={team} />
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

/** F9c Board color: 8 presets, a hex field, a live preview on the board background, and the contrast note. */
function BoardColor({ team }: { team: Team }) {
  const { updateTeamSettings } = useTeams();
  const [chosen, setChosen] = useState(team.settings.accentColor ?? DEFAULT_ACCENT);
  const [hex, setHex] = useState('');
  const [error, setError] = useState<string | null>(null);
  const shown = boardAccent(chosen);
  return (
    <View style={{ gap: 8 }}>
      <Label>Board color</Label>
      <Row style={{ flexWrap: 'wrap', gap: 8 }}>
        {PRESETS.map((p) => (
          <Pressable
            key={p.hex}
            accessibilityRole="button"
            accessibilityLabel={`${p.name}${chosen.toUpperCase() === p.hex ? ', selected' : ''}`}
            onPress={() => {
              setChosen(p.hex);
              setError(null);
            }}
            style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: p.hex, borderWidth: chosen.toUpperCase() === p.hex ? 3 : 1, borderColor: chosen.toUpperCase() === p.hex ? colors.ink : colors.line }}
          />
        ))}
      </Row>
      <Field
        label="Custom: #"
        placeholder="#1E5AA8"
        autoCapitalize="none"
        value={hex}
        onChangeText={(v) => {
          setHex(v);
          const h = v.trim().startsWith('#') ? v.trim() : `#${v.trim()}`;
          if (isHex(h)) {
            setChosen(h.toUpperCase());
            setError(null);
          } else setError(v.trim() ? 'Enter a color like #1E5AA8.' : null);
        }}
      />
      {error ? <Text style={{ fontSize: 13, color: colors.error }}>{error}</Text> : null}
      {/* Live preview on the board background: a Resting tile, a Done tile, and the goal bar. */}
      <View style={{ backgroundColor: BOARD_BG, borderRadius: 12, padding: 12, gap: 10 }}>
        <Row style={{ gap: 8 }}>
          <View style={{ flex: 1, backgroundColor: '#1C1D20', borderRadius: 10, padding: 10, borderWidth: 2, borderColor: '#3A3D42', gap: 6 }}>
            <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Jordan M.</Text>
            <View style={{ alignSelf: 'flex-start', backgroundColor: shown.color, borderRadius: 999, paddingHorizontal: 10 }}>
              <Text style={{ color: textOn(shown.color), fontWeight: '700', fontSize: 13 }}>Rest 1:24</Text>
            </View>
          </View>
          <View style={{ flex: 1, backgroundColor: '#1C1D20', borderRadius: 10, padding: 10, borderWidth: 3, borderColor: shown.color, gap: 6 }}>
            <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Ava R.</Text>
            <View style={{ alignSelf: 'flex-start', backgroundColor: shown.color, borderRadius: 999, paddingHorizontal: 10 }}>
              <Text style={{ color: textOn(shown.color), fontWeight: '700', fontSize: 13 }}>Done</Text>
            </View>
          </View>
        </Row>
        <View style={{ height: 10, borderRadius: 5, backgroundColor: '#1C1D20', overflow: 'hidden' }}>
          <View style={{ width: '62%', height: '100%', backgroundColor: shown.color }} />
        </View>
      </View>
      {shown.adjusted ? (
        <Row style={{ gap: 8 }}>
          <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: chosen }} />
          <Text style={{ fontSize: 13 }}>→</Text>
          <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: shown.color }} />
          <Text style={{ fontSize: 13, color: colors.muted, flex: 1 }}>Adjusted so it shows up on a projector</Text>
        </Row>
      ) : null}
      <Row style={{ gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Button
            small
            title="Save board color"
            onPress={() =>
              updateTeamSettings(team.id, { accentColor: chosen.toUpperCase() === DEFAULT_ACCENT ? null : chosen.toUpperCase() })
                .then(() => showAlert('Board color saved.'))
                .catch((e) => setError(e instanceof Error ? e.message : 'Something went wrong.'))
            }
          />
        </View>
        <Text
          accessibilityRole="link"
          onPress={() => {
            setChosen(DEFAULT_ACCENT);
            setHex('');
          }}
          style={{ fontSize: 13, textDecorationLine: 'underline', paddingHorizontal: 8 }}
        >
          Reset to default
        </Text>
      </Row>
    </View>
  );
}
