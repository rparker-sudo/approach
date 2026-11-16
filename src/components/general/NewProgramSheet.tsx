import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import type { Team } from '../../lib/backend';
import { GOALS, goalLabel, gymOf } from '../../lib/general';
import { newGeneralProgram } from '../../lib/starter';
import { useStore } from '../../lib/store';
import { teamProgramId, useTeams } from '../../lib/team';
import type { Goal, Program } from '../../lib/types';
import { uid } from '../../lib/util';
import Sheet from '../Sheet';
import { Button, colors, Field, Label, OptionCard, Row, Stepper, Text } from '../ui';

type From = 'blank' | 'template' | 'copy';

/** F39a New program: start from, goal (four only), length 1–16 weeks, sessions per week 1–6, name. The target is chosen at Post. */
export default function NewProgramSheet({ team, onClose, copyOf, forName }: { team: Team; onClose: () => void; copyOf?: Program; forName?: string }) {
  const { data, saveProgram } = useStore();
  const { account, members } = useTeams();
  const templates = data.templates ?? [];
  const posted = data.programs.filter((p) => p.teamId === team.id && p.general && p.postedAt);
  const [from, setFrom] = useState<From>(copyOf ? 'copy' : 'blank');
  const [source, setSource] = useState<Program | null>(copyOf ?? null);
  const [goal, setGoal] = useState<Goal | null>(copyOf?.goal ?? null);
  const [weeks, setWeeks] = useState(copyOf?.weeks?.length ?? 8);
  const [perWeek, setPerWeek] = useState(3);
  const [name, setName] = useState(copyOf ? copyOf.name : '');
  const suggested = GOALS.find((g) => g.id === goal)?.suggested;
  const label = (p: Program) => {
    const uidOf = p.groupKey?.startsWith('client:') ? p.groupKey.slice(7) : null;
    const who = uidOf ? (members[team.id] ?? []).find((m) => m.userId === uidOf)?.name : null;
    return `${p.name}${who ? ` · ${who}` : ''}`;
  };

  function create() {
    const id = teamProgramId(team.id, `draft:${uid()}`);
    const groupKey = id.slice(`team-${team.id}-`.length);
    let program: Program;
    if ((from === 'template' || from === 'copy') && source) {
      // A copy of the plan only (never a client's logs).
      program = {
        ...source,
        id,
        teamId: team.id,
        teamName: team.name,
        groupKey,
        groupName: undefined,
        name: name || source.name,
        postedAt: undefined,
        unposted: true,
        startDate: undefined,
        createdAt: new Date().toISOString(),
        templateOf: from === 'template' ? source.name : source.templateOf,
        forName,
      };
    } else {
      program = newGeneralProgram({
        id,
        teamId: team.id,
        teamName: team.name,
        groupKey,
        goal: goal!,
        weeks,
        perWeek,
        name: name || `${goalLabel(goal!)} · ${weeks} weeks`,
        equipment: gymOf(team),
        author: account?.name,
      });
    }
    saveProgram(program);
    onClose();
    router.push(`/program/${program.id}`);
  }

  const canCreate = from === 'blank' ? !!goal : !!source;
  return (
    <Sheet title={copyOf ? 'Duplicate program' : 'New program'} onClose={onClose}>
      {copyOf ? (
        <Text style={{ fontSize: 14 }}>{`Copy for ${forName ?? 'another client'}. Changes here don't affect the original program.`}</Text>
      ) : (
        <>
          <Label>Start from</Label>
          <OptionCard title="Blank" selected={from === 'blank'} onPress={() => setFrom('blank')} />
          <OptionCard title="A template" subtitle={templates.length ? undefined : 'No templates yet.'} disabled={!templates.length} selected={from === 'template'} onPress={() => setFrom('template')} />
          <OptionCard title="Copy a client's program" subtitle={posted.length ? undefined : 'No programs posted yet.'} disabled={!posted.length} selected={from === 'copy'} onPress={() => setFrom('copy')} />
          {from === 'template'
            ? templates.map((t) => (
                <OptionCard key={t.id} title={t.name} subtitle={`${goalLabel(t.goal)} · ${t.weeks?.length ?? 1} weeks`} selected={source?.id === t.id} onPress={() => setSource(t)} />
              ))
            : null}
          {from === 'copy'
            ? posted.map((p) => <OptionCard key={p.id} title={label(p)} subtitle={goalLabel(p.goal)} selected={source?.id === p.id} onPress={() => setSource(p)} />)
            : null}
        </>
      )}
      {from === 'blank' ? (
        <>
          <Label>Goal</Label>
          {GOALS.map((g) => (
            <OptionCard key={g.id} title={g.label} subtitle={g.who} selected={goal === g.id} onPress={() => {
              setGoal(g.id);
              setPerWeek(g.suggested);
              if (g.id === 'back_after_break') setWeeks(4);
            }} />
          ))}
          <Row style={{ justifyContent: 'space-between' }}>
            <Label>Length (weeks)</Label>
            <Stepper value={weeks} min={1} max={16} onChange={setWeeks} />
          </Row>
          <Row style={{ justifyContent: 'space-between' }}>
            <Label>Sessions per week</Label>
            <Stepper value={perWeek} min={1} max={goal === 'back_after_break' ? 3 : 6} onChange={setPerWeek} />
          </Row>
          {suggested ? <Text style={{ fontSize: 13, color: colors.muted }}>{`Suggested: ${suggested}`}</Text> : null}
        </>
      ) : null}
      <Field label="Name" placeholder={goal ? `${goalLabel(goal)} · ${weeks} weeks` : source?.name ?? 'Program name'} value={name} onChangeText={setName} maxLength={60} />
      <View style={{ gap: 8 }}>
        <Button title="Create" disabled={!canCreate} onPress={create} />
        <Button kind="ghost" title="Cancel" onPress={onClose} />
      </View>
    </Sheet>
  );
}
