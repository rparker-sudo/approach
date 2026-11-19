import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { backend } from '../lib/backend';
import type { Team, WarmupTemplate } from '../lib/backend/types';
import { useTeams } from '../lib/team';
import { Card, Chip, ChipRow, colors, H2, Row, Text, Toggle } from './ui';

/**
 * F50 Team settings → Warm-up: "Approach / My template / None" and Limited space. Applies to new sessions and sessions
 * whose warm-up hasn't been edited, when the program is next posted. Trainer teams: same control (no UI difference).
 */
export default function WarmupSettings({ team }: { team: Team }) {
  const { updateTeamSettings } = useTeams();
  const s = team.settings;
  const [templates, setTemplates] = useState<WarmupTemplate[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    backend.listWarmupTemplates(team.id).then((t) => alive && setTemplates(t)).catch(() => {});
    return () => {
      alive = false;
    };
  }, [team.id]);
  const save = (patch: Parameters<typeof updateTeamSettings>[1]) => {
    setError(null);
    updateTeamSettings(team.id, patch).catch(() => setError("Couldn't save the setting. Try again."));
  };
  const mode = s.defaultWarmup ?? 'approach';
  return (
    <Card style={{ gap: 8 }}>
      <H2>Warm-up</H2>
      <ChipRow>
        <Chip label="Approach Strength" selected={mode === 'approach'} onPress={() => save({ defaultWarmup: 'approach' })} />
        <Chip label="My template" selected={mode === 'template'} onPress={() => save({ defaultWarmup: 'template', defaultWarmupTemplateId: s.defaultWarmupTemplateId ?? templates[0]?.id ?? null })} />
        <Chip label="None" selected={mode === 'none'} onPress={() => save({ defaultWarmup: 'none' })} />
      </ChipRow>
      {mode === 'approach' ? <Text style={{ fontSize: 13, color: colors.muted }}>A warm-up built from each session.</Text> : null}
      {mode === 'none' ? <Text style={{ fontSize: 13, color: colors.muted }}>Sessions start with the first exercise.</Text> : null}
      {mode === 'template' ? (
        templates.length ? (
          <ChipRow>
            {templates.map((t) => (
              <Chip key={t.id} label={t.name} selected={s.defaultWarmupTemplateId === t.id} onPress={() => save({ defaultWarmupTemplateId: t.id })} />
            ))}
          </ChipRow>
        ) : (
          <Text style={{ fontSize: 13, color: colors.muted }}>Save a warm-up as a template first. Open any session, then Warm-up ⋯ Save as template.</Text>
        )
      ) : null}
      <Row style={{ justifyContent: 'space-between', minHeight: 44 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '600' }}>Limited space</Text>
          <Text style={{ fontSize: 13, color: colors.muted }}>Use in-place drills for Raise (no running room).</Text>
        </View>
        <Toggle accessibilityLabel="Limited space" value={!!s.limitedSpace} onValueChange={(v) => save({ limitedSpace: v })} />
      </Row>
      <Text style={{ fontSize: 13, color: colors.muted }}>Sessions you&apos;ve already edited keep their warm-up.</Text>
      {error ? <Text accessibilityRole="alert" style={{ fontSize: 13, color: colors.errorText }}>{error}</Text> : null}
    </Card>
  );
}
