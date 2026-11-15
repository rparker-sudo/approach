import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Body, Button, Card, Chip, ChipRow, Field, H2, Label, Screen , Row, Stepper, Text, Toggle, colors } from '../components/ui';
import { LiftDayPicker, WeekEditor } from '../components/week';
import EquipmentPicker from '../components/EquipmentPicker';
import { ALL_EQUIPMENT } from '../lib/exercises';
import { generateProgram, liftDayCap, pickLiftDays, recommendedTotal, weekSummary } from '../lib/generator';
import { LEVEL_NAME } from '../lib/athlete';
import { WEEKDAYS , EXPERIENCE, PHASES, POSITIONS } from '../lib/types';
import { useStore } from '../lib/store';
import { ALL, teamProgramId, useTeams } from '../lib/team';
import type { DayType, Equipment, Experience, Phase, ProgramPosition } from '../lib/types';
import { goBack } from '../lib/nav';

export default function Builder() {
  const { data } = useStore();
  if (!data.profile) return null;
  return <BuilderForm />;
}

function BuilderForm() {
  const { programId, teamId, groupKey: groupParam } = useLocalSearchParams<{ programId?: string; teamId?: string; groupKey?: string }>();
  const { data, saveProgram, setProfile } = useStore();
  const { teams, groups, members } = useTeams();
  const profile = data.profile!;
  const coach = profile.role === 'coach';
  const team = teams.find((t) => t.id === teamId);
  const groupKey = groupParam ?? (programId ? data.programs.find((p) => p.id === programId)?.groupKey : undefined) ?? ALL;
  const group = team ? (groups[team.id] ?? []).find((g) => g.id === groupKey) : undefined;
  const existing = data.programs.find((p) => p.id === (programId ?? (teamId ? teamProgramId(teamId, groupKey) : undefined)));
  // A position group pre-fills its position (e.g. Middles → Middle Blocker); mixed groups use All positions.
  const hintPositions = (group?.positionHint ?? '').split(',').filter(Boolean) as ProgramPosition[];
  const groupPosition: ProgramPosition = hintPositions.length === 1 ? hintPositions[0] : 'All positions';

  const [name, setName] = useState(existing?.name ?? '');
  const [position, setPosition] = useState<ProgramPosition>(existing?.position ?? (team ? groupPosition : profile.position));
  const [phase, setPhase] = useState<Phase>(existing?.phase ?? profile.phase);
  const [experience, setExperience] = useState<Experience>(existing?.experience ?? profile.experience);
  const [week, setWeekState] = useState<DayType[]>(existing?.volleyballWeek ?? profile.volleyballWeek);
  const [liftDays, setLiftDaysState] = useState<number[]>(() => {
    const cap = liftDayCap(existing?.experience ?? profile.experience, existing?.phase ?? profile.phase);
    const start = existing
      ? existing.liftSchedule.map((s, i) => (s && !existing.sessions.find((x) => x.id === s)?.mobility ? i : -1)).filter((i) => i >= 0)
      : profile.liftDays?.length
        ? profile.liftDays
        : pickLiftDays(week, Math.min(profile.liftDaysPerWeek, cap));
    // G2: plans made before the caps rebuild within them (best days kept).
    return start.length > cap ? pickLiftDays(week, cap, start) : start;
  });
  const cap = liftDayCap(experience, phase);
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
  // v2.2 pass 3 (F19a): school + home week for team programs.
  const [homeMode, setHomeMode] = useState(!!existing?.weightRoomDays);
  const [roomDays, setRoomDays] = useState<number[]>(existing?.weightRoomDays ?? [1, 3]);
  const [total, setTotal] = useState(() => (existing?.weightRoomDays ? existing.liftSchedule.filter((sid) => sid && !existing.sessions.find((x) => x.id === sid)?.light && !existing.sessions.find((x) => x.id === sid)?.mobility).length : 4));
  const [homeJumps, setHomeJumps] = useState(!!existing?.homeJumps);
  const [supersets, setSupersets] = useState<boolean | null>(existing?.supersets ?? null);
  const [showFewer, setShowFewer] = useState(false);
  const jumpsAllowed = phase === 'off' || phase === 'pre';
  const supersetsOn = supersets ?? phase === 'in';
  const input = () => ({
    name: name || (team ? `${group ? group.name : team.name} – ${PHASES.find((p) => p.id === phase)!.label}` : ''),
    forName: team?.name,
    author: coach ? profile.name : existing?.author,
    position,
    phase,
    experience,
    volleyballWeek: week,
    liftDaysPerWeek: homeMode ? Math.min(total, cap) : liftDays.length,
    ...(homeMode ? { weightRoomDays: roomDays, homeJumps: homeJumps && jumpsAllowed } : { liftDays }),
    equipment,
    ...(supersets != null ? { supersets } : {}),
  });
  const preview = team && homeMode ? weekSummary(generateProgram(input())) : null;
  const fewer = team && preview?.beginners ? (members[team.id] ?? []).filter((m) => (m.level ?? 2) === 1) : [];

  function build() {
    const generated = generateProgram(input());
    let program = existing ? { ...generated, id: existing.id } : generated;
    if (existing) {
      // Keep the season calendar. Date choices that pointed at old sessions go back to automatic; chosen rest days stay.
      const overrides = Object.fromEntries(Object.entries(existing.overrides ?? {}).filter(([, v]) => v === null));
      program = { ...program, events: existing.events, overrides, lightDates: existing.lightDates };
    }
    if (team) {
      // The coach's working copy of the team workout. Posting sends it to the roster.
      const cal = data.teamCalendars?.[team.id];
      program = {
        ...program,
        id: teamProgramId(team.id, groupKey),
        teamId: team.id,
        teamName: team.name,
        groupKey,
        groupName: group?.name,
        postedAt: existing?.postedAt,
        unposted: true,
        events: cal?.events ?? existing?.events ?? [],
        lightDates: existing?.lightDates,
      };
    }
    saveProgram(program, !coach);
    if (coach) setProfile({ ...profile, equipment });
    if (!coach) {
      setProfile({ ...profile, position: position === 'All positions' ? profile.position : position, phase, experience, volleyballWeek: week, liftDaysPerWeek: liftDays.length, liftDays, equipment });
    }
    goBack();
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
        placeholder={team ? `${group ? group.name : team.name} – ${PHASES.find((p) => p.id === phase)!.label}` : `${PHASES.find((p) => p.id === phase)!.label} – ${position}`}
        value={name}
        onChangeText={setName}
      />
      {team ? (
        <Body muted>
          Building the workout for {group ? `${group.name} (${team.name})` : `${team.name} (whole team)`}. You&apos;ll post it to the roster next.
        </Body>
      ) : null}

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
        <H2>What&apos;s in your gym?</H2>
        <EquipmentPicker value={equipment} onChange={setEquipment} />
      </Card>

      {team ? (
        <ChipRow>
          <Chip label="Weight room only" selected={!homeMode} onPress={() => setHomeMode(false)} />
          <Chip label="Weight room + home" selected={homeMode} onPress={() => setHomeMode(true)} />
        </ChipRow>
      ) : null}

      {team && homeMode ? (
        <Card>
          <H2>Week setup</H2>
          <Label>Weight room days</Label>
          <ChipRow>
            {WEEKDAYS.map((d, i) => (
              <Chip key={d} label={d} selected={roomDays.includes(i)} onPress={() => setRoomDays(roomDays.includes(i) ? roomDays.filter((x) => x !== i) : [...roomDays, i].sort())} />
            ))}
          </ChipRow>
          <Row style={{ justifyContent: 'space-between' }}>
            <Label>Training days per week</Label>
            <Stepper value={total} min={1} max={6} onChange={setTotal} />
          </Row>
          <Button
            small
            kind="ghost"
            title="Recommend for me"
            onPress={() => setTotal(Math.min(recommendedTotal(phase, roomDays), cap))}
          />
          {total > cap ? <Text style={{ fontSize: 13, color: colors.muted }}>{`Max ${cap} full lift days for this level and time of year.`}</Text> : null}
          <Row style={{ justifyContent: 'space-between', minHeight: 44 }}>
            <Text style={{ fontSize: 15, flex: 1 }}>Jumps at home</Text>
            <Toggle accessibilityLabel="Jumps at home" disabled={!jumpsAllowed} value={homeJumps && jumpsAllowed} onValueChange={setHomeJumps} />
          </Row>
          <Text style={{ fontSize: 13, color: colors.muted }}>
            {jumpsAllowed
              ? homeJumps
                ? 'Level 1 jumps only, up to 20 contacts. Athletes see: Clear space, no low ceilings, sneakers on.'
                : 'Off by default.'
              : 'Home jumps are for off-season and preseason only.'}
          </Text>
          <Row style={{ justifyContent: 'space-between', minHeight: 44 }}>
            <Text style={{ fontSize: 15, flex: 1 }}>Save time with supersets</Text>
            <Toggle accessibilityLabel="Save time with supersets" value={supersetsOn} onValueChange={(v) => setSupersets(v)} />
          </Row>
          <Text style={{ fontSize: 13, color: colors.muted }}>
            {`Pairs exercises only until the session fits about ${phase === 'off' ? 60 : phase === 'pre' ? 50 : phase === 'in' ? 40 : 45} min (home: 30).`}
          </Text>
          {preview ? <Text style={{ fontSize: 16, fontWeight: '600' }}>{preview.line}</Text> : null}
          {preview?.beginners ? (
            <>
              <Text style={{ fontSize: 13 }}>{preview.beginners}</Text>
              <Text accessibilityRole="button" onPress={() => setShowFewer(!showFewer)} style={{ fontSize: 13, textDecorationLine: 'underline' }}>
                Who gets fewer days?
              </Text>
              {showFewer
                ? fewer.length
                  ? fewer.map((m) => <Text key={m.userId} style={{ fontSize: 13, color: colors.muted }}>{`${m.name} · ${LEVEL_NAME[m.level ?? 1]} · Lift-day limit for their level`}</Text>)
                  : <Text style={{ fontSize: 13, color: colors.muted }}>No beginners on the roster right now.</Text>
                : null}
            </>
          ) : null}
        </Card>
      ) : (
        <Card>
          <H2>Lift days</H2>
          <LiftDayPicker week={week} value={liftDays} onChange={setLiftDays} cap={cap} />
        </Card>
      )}

      <Button
        title={existing ? 'Rebuild program' : team ? 'Build team workout' : 'Build program'}
        icon="wand.and.stars"
        disabled={homeMode ? total < 1 : liftDays.length === 0}
        onPress={build}
      />
    </Screen>
  );
}
