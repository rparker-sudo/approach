import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Body, Button, Card, Chip, ChipRow, Field, H2, Label, Screen } from '../components/ui';
import { LiftDayPicker, WeekEditor } from '../components/week';
import EquipmentPicker from '../components/EquipmentPicker';
import { ALL_EQUIPMENT } from '../lib/exercises';
import { generateProgram, pickLiftDays } from '../lib/generator';
import { useStore } from '../lib/store';
import { teamProgramId, useTeams } from '../lib/team';
import type { DayType, Equipment, Experience, Phase, ProgramPosition } from '../lib/types';
import { EXPERIENCE, PHASES, POSITIONS } from '../lib/types';

export default function Builder() {
  const { data } = useStore();
  if (!data.profile) return null;
  return <BuilderForm />;
}

function BuilderForm() {
  const { programId, teamId } = useLocalSearchParams<{ programId?: string; teamId?: string }>();
  const { data, saveProgram, setProfile } = useStore();
  const { teams } = useTeams();
  const profile = data.profile!;
  const coach = profile.role === 'coach';
  const team = teams.find((t) => t.id === teamId);
  const existing = data.programs.find((p) => p.id === (programId ?? (teamId ? teamProgramId(teamId) : undefined)));

  const [name, setName] = useState(existing?.name ?? '');
  const [position, setPosition] = useState<ProgramPosition>(existing?.position ?? (team ? 'All positions' : profile.position));
  const [phase, setPhase] = useState<Phase>(existing?.phase ?? profile.phase);
  const [experience, setExperience] = useState<Experience>(existing?.experience ?? profile.experience);
  const [week, setWeekState] = useState<DayType[]>(existing?.volleyballWeek ?? profile.volleyballWeek);
  const [liftDays, setLiftDaysState] = useState<number[]>(() => {
    if (existing) return existing.liftSchedule.map((s, i) => (s ? i : -1)).filter((i) => i >= 0);
    return profile.liftDays?.length ? profile.liftDays : pickLiftDays(week, profile.liftDaysPerWeek);
  });
  // Until the user taps a day, changing the volleyball week re-suggests lift days.
  const [equipment, setEquipment] = useState<Equipment[]>(existing?.equipment ?? profile.equipment ?? ALL_EQUIPMENT);
  const [daysTouched, setDaysTouched] = useState(!!existing || !!profile.liftDays?.length);
  const setLiftDays = (d: number[]) => {
    setDaysTouched(true);
    setLiftDaysState(d);
  };
  const setWeek = (w: DayType[]) => {
    setWeekState(w);
    if (!daysTouched) setLiftDaysState(pickLiftDays(w, liftDays.length || 2));
  };
  const positionChoices: ProgramPosition[] = team || coach ? ['All positions', ...POSITIONS] : POSITIONS;

  function build() {
    const generated = generateProgram({
      name: name || (team ? `${team.name} – ${PHASES.find((p) => p.id === phase)!.label}` : ''),
      forName: team?.name,
      author: coach ? profile.name : existing?.author,
      position,
      phase,
      experience,
      volleyballWeek: week,
      liftDaysPerWeek: liftDays.length,
      liftDays,
      equipment,
    });
    let program = existing ? { ...generated, id: existing.id } : generated;
    if (existing) {
      // Keep the season calendar. Date choices that pointed at old sessions go back to automatic; chosen rest days stay.
      const overrides = Object.fromEntries(Object.entries(existing.overrides ?? {}).filter(([, v]) => v === null));
      program = { ...program, events: existing.events, overrides, lightDates: existing.lightDates };
    }
    if (team) {
      // The coach's working copy of the team workout. Posting sends it to the roster.
      program = { ...program, id: teamProgramId(team.id), teamId: team.id, teamName: team.name, postedAt: existing?.postedAt, unposted: true };
    }
    saveProgram(program, !coach);
    if (coach) setProfile({ ...profile, equipment });
    if (!coach) {
      setProfile({ ...profile, position: position === 'All positions' ? profile.position : position, phase, experience, volleyballWeek: week, liftDaysPerWeek: liftDays.length, liftDays, equipment });
    }
    router.back();
    if (coach && !existing && !team) router.push(`/program/${program.id}`);
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
        placeholder={team ? `${team.name} – ${PHASES.find((p) => p.id === phase)!.label}` : `${PHASES.find((p) => p.id === phase)!.label} – ${position}`}
        value={name}
        onChangeText={setName}
      />
      {team ? <Body muted>Building the workout for {team.name}. You'll post it to the roster next.</Body> : null}

      <Label>Position</Label>
      <ChipRow>
        {positionChoices.map((p) => (
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
        <H2>What's in your gym?</H2>
        <EquipmentPicker value={equipment} onChange={setEquipment} />
      </Card>

      <Card>
        <H2>Lift days</H2>
        <LiftDayPicker week={week} value={liftDays} onChange={setLiftDays} phase={phase} />
      </Card>

      <Button
        title={existing ? 'Rebuild program' : team ? 'Build team workout' : 'Build program'}
        icon="wand.and.stars"
        disabled={liftDays.length === 0}
        onPress={build}
      />
    </Screen>
  );
}
