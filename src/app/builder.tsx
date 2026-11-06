import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Body, Button, Card, Chip, ChipRow, Field, H2, Label, Screen } from '../components/ui';
import { LiftDaysPicker, WeekEditor } from '../components/week';
import { generateProgram } from '../lib/generator';
import { useStore } from '../lib/store';
import type { DayType, Experience, Phase, Position } from '../lib/types';
import { EXPERIENCE, PHASES, POSITIONS } from '../lib/types';

export default function Builder() {
  const { data } = useStore();
  if (!data.profile) return null;
  return <BuilderForm />;
}

function BuilderForm() {
  const { athleteId, programId } = useLocalSearchParams<{ athleteId?: string; programId?: string }>();
  const { data, saveProgram, saveAthlete, setProfile } = useStore();
  const profile = data.profile!;
  const coach = profile.role === 'coach';
  const athlete = data.athletes.find((a) => a.id === athleteId);
  const existing = data.programs.find((p) => p.id === programId);

  const [name, setName] = useState(existing?.name ?? '');
  const [forName, setForName] = useState(existing?.forName ?? athlete?.name ?? '');
  const [position, setPosition] = useState<Position>(existing?.position ?? athlete?.position ?? profile.position);
  const [phase, setPhase] = useState<Phase>(existing?.phase ?? profile.phase);
  const [experience, setExperience] = useState<Experience>(existing?.experience ?? profile.experience);
  const [week, setWeek] = useState<DayType[]>(existing?.volleyballWeek ?? profile.volleyballWeek);
  const [liftDays, setLiftDays] = useState(
    existing ? existing.liftSchedule.filter(Boolean).length || 2 : profile.liftDaysPerWeek,
  );

  function build() {
    const generated = generateProgram({
      name,
      forName: coach ? forName.trim() || undefined : undefined,
      author: coach ? profile.name : existing?.author,
      position,
      phase,
      experience,
      volleyballWeek: week,
      liftDaysPerWeek: liftDays,
    });
    const program = existing ? { ...generated, id: existing.id } : generated;
    saveProgram(program, !coach);
    if (athlete) saveAthlete({ ...athlete, programId: program.id });
    if (!coach) {
      setProfile({ ...profile, position, phase, experience, volleyballWeek: week, liftDaysPerWeek: liftDays });
    }
    router.back();
    if (coach && !existing) router.push(`/program/${program.id}`);
  }

  return (
    <Screen>
      {existing ? (
        <Card>
          <Body>
            Rebuilding replaces the sessions in this program with a fresh plan. Any exercise changes you made by hand will be
            lost.
          </Body>
        </Card>
      ) : null}

      <Field
        label="Program name (optional)"
        placeholder={`${PHASES.find((p) => p.id === phase)!.label} – ${position}`}
        value={name}
        onChangeText={setName}
      />
      {coach ? (
        <Field label="For (athlete or group)" placeholder="e.g. Maya, or Middles" value={forName} onChangeText={setForName} />
      ) : null}

      <Label>Position</Label>
      <ChipRow>
        {POSITIONS.map((p) => (
          <Chip key={p} label={p} selected={position === p} onPress={() => setPosition(p)} />
        ))}
      </ChipRow>

      <Label>Time of year</Label>
      <ChipRow>
        {PHASES.map((p) => (
          <Chip key={p.id} label={p.label} selected={phase === p.id} onPress={() => setPhase(p.id)} />
        ))}
      </ChipRow>
      <Body muted style={{ fontSize: 13 }}>{PHASES.find((p) => p.id === phase)!.blurb}</Body>

      <Label>Lifting experience</Label>
      <ChipRow>
        {EXPERIENCE.map((e) => (
          <Chip key={e.id} label={e.label} selected={experience === e.id} onPress={() => setExperience(e.id)} />
        ))}
      </ChipRow>

      <Card>
        <H2>Volleyball week</H2>
        <WeekEditor value={week} onChange={setWeek} />
      </Card>

      <Card>
        <H2>Lift days per week</H2>
        <LiftDaysPicker value={liftDays} onChange={setLiftDays} />
      </Card>

      <Button title={existing ? 'Rebuild program' : 'Build program'} icon="wand.and.stars" onPress={build} />
    </Screen>
  );
}
