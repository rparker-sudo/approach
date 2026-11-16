import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { clientKey } from '../../lib/backend';
import { showAlert } from '../../lib/dialog';
import {
  adultWave,
  BACK_AFTER_BREAK_RAMP,
  EFFORT_BLOCK,
  endDate,
  endsSoon,
  gateState,
  goalLabel,
  isGeneral,
  LEGAL,
  programChecks,
  programLine,
  programWeeks,
  RPE_CEILING,
  scheduleFor,
  weekIndex,
} from '../../lib/general';
import { useStore } from '../../lib/store';
import { isDraftKey, teamProgramId, useTeams } from '../../lib/team';
import type { Program, ProgramWeekPlan, Session } from '../../lib/types';
import { WEEKDAYS } from '../../lib/types';
import { uid } from '../../lib/util';
import Sheet from '../Sheet';
import { Body, Button, Card, Checkbox, ChipRow, colors, Field, H2, Label, OptionCard, Pill, Row, Stepper, Text, Toggle } from '../ui';
import NewProgramSheet from './NewProgramSheet';
import PostSheet from './PostSheet';


/** F39b–F39e for the trainer; a read-only week for the client. */
export default function GeneralProgram({ program }: { program: Program }) {
  const { data } = useStore();
  const coach = data.profile?.role === 'coach';
  return coach ? <TrainerProgram program={program} /> : <ClientProgram program={program} />;
}

function ClientProgram({ program }: { program: Program }) {
  const w = weekIndex(program, new Date());
  const week = scheduleFor(program, w ?? 0);
  return (
    <View style={{ gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: '600' }}>{program.name}</Text>
      <Text style={{ fontSize: 15 }}>{programLine(program)}</Text>
      {program.groupName ? <Text style={{ fontSize: 13, color: colors.muted }}>{program.groupName}</Text> : null}
      <Text style={{ fontSize: 13, color: colors.muted }}>Tap a session to see it. Your trainer updates this plan.</Text>
      {WEEKDAYS.map((d, i) => {
        const s = program.sessions.find((x) => x.id === week[i]);
        return (
          <Pressable
            key={d}
            disabled={!s}
            accessibilityRole={s ? 'button' : undefined}
            onPress={() => s && router.push({ pathname: '/session', params: { programId: program.id, sessionId: s.id } })}
            style={{ minHeight: 44, flexDirection: 'row', gap: 12, alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card }}
          >
            <Text style={{ width: 40, fontWeight: '600' }}>{d}</Text>
            <Text style={{ flex: 1, color: s ? colors.ink : colors.muted }}>{s ? s.name : 'Rest'}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function TrainerProgram({ program }: { program: Program }) {
  const { data, saveProgram, deleteProgram, mutate } = useStore();
  const t = useTeams();
  const team = t.teams.find((x) => x.id === program.teamId);
  const roster = team ? t.members[team.id] ?? [] : [];
  const weeks = programWeeks(program);
  const [week, setWeek] = useState(0);
  const [dayPick, setDayPick] = useState<number | null>(null);
  const [copy, setCopy] = useState<{ kind: 'days' | 'weeks'; sessionId?: string } | null>(null);
  const [posting, setPosting] = useState(false);
  const [template, setTemplate] = useState(false);
  const [dup, setDup] = useState<string | null>(null);
  const [dupPick, setDupPick] = useState(false);
  const [newFrom, setNewFrom] = useState(false);
  const [rpeMsg, setRpeMsg] = useState<string | null>(null);
  if (!team || !isGeneral(team)) return <Body muted>Program not found.</Body>;
  const gate = gateState(t.trainerStatus[team.id], (data.openSeen ?? []).includes(team.id));
  const draft = isDraftKey(program.groupKey);
  const ramp = program.goal === 'back_after_break';
  const plans: ProgramWeekPlan[] = Array.from({ length: weeks }, (_, i) => program.weeks?.[i] ?? {});
  const plan = plans[week];
  const schedule = scheduleFor(program, week);
  const target = program.groupKey;
  const targets = draft ? roster : target === 'all' ? roster : target?.startsWith('client:') ? roster.filter((m) => m.userId === target.slice(7)) : roster.filter((m) => m.groupId === target);
  const lowest = (targets.length ? Math.min(...targets.map((m) => m.level ?? 1)) : 3) as 1 | 2 | 3;
  const checks = programChecks(program, lowest);
  const who = target?.startsWith('client:') ? roster.find((m) => m.userId === target.slice(7)) : undefined;
  const first = who ? who.name.split(' ')[0] : null;
  const original = program.draftTarget ? roster.find((m) => m.userId === program.draftTarget!.slice(7)) : undefined;

  const save = (patch: Partial<Program>) => saveProgram({ ...program, ...patch, ...(draft ? {} : { unposted: true }) });
  const setPlan = (i: number, next: ProgramWeekPlan) => save({ weeks: plans.map((p, k) => (k === i ? next : p)) });
  const setDay = (d: number, sessionId: string | null) => setPlan(week, { ...plan, schedule: schedule.map((x, k) => (k === d ? sessionId : x)) });

  function setRpe(n: number) {
    if (n > RPE_CEILING) {
      setRpeMsg(EFFORT_BLOCK);
      return;
    }
    setRpeMsg(null);
    setPlan(week, { ...plan, rpe: Math.max(5, n) });
  }
  function addSession() {
    const s: Session = { id: uid(), name: `Session ${program.sessions.length + 1}`, focus: 'Full body', exercises: [], warmup: 'W1' };
    save({ sessions: [...program.sessions, s] });
    router.push({ pathname: '/session', params: { programId: program.id, sessionId: s.id } });
  }
  function extend() {
    const add = Array.from({ length: 4 }, (_, i) => {
      const w = adultWave(program.goal ?? 'strength', i + 1);
      return { rpe: w.rpe, ...(w.deload ? { deload: true } : {}), schedule: plans[weeks - 1]?.schedule };
    });
    save({ weeks: [...plans, ...add].slice(0, 16) });
    showAlert('Added 4 weeks.');
  }

  const fmt = (k: string) => new Date(`${k}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const posted = !draft && !!program.postedAt;
  return (
    <View style={{ gap: 14 }}>
      {original || program.forName ? (
        <Card>
          <Text style={{ fontSize: 14 }}>{`Copy for ${original?.name ?? program.forName}. Changes here don't affect the original program.`}</Text>
        </Card>
      ) : null}
      <Field label="Program name" value={program.name} onChangeText={(name) => save({ name })} maxLength={60} />
      <Row style={{ gap: 6, flexWrap: 'wrap' }}>
        <Pill text={goalLabel(program.goal)} />
        <Pill text={`${weeks} ${weeks === 1 ? 'week' : 'weeks'}`} />
        <Pill text={draft ? 'Draft, not posted' : program.unposted ? 'Changes not posted' : `Posted to ${who?.name ?? (target === 'all' ? 'all clients' : program.groupName ?? 'a group')}`} />
      </Row>
      {program.templateOf ? <Text style={{ fontSize: 13, color: colors.muted }}>{`From template: ${program.templateOf}`}</Text> : null}
      {posted && program.startDate ? <Text style={{ fontSize: 13, color: colors.muted }}>{`${programLine(program)} · ${fmt(program.startDate)} – ${fmt(endDate(program))}`}</Text> : null}
      {posted && endsSoon(program) ? (
        <Card>
          <Text style={{ fontSize: 15, fontWeight: '600' }}>{`${first ? `${first}'s program` : 'This program'} ends ${fmt(endDate(program))}.`}</Text>
          <Row>
            <View style={{ flex: 1 }}>
              <Button small title="Extend" onPress={extend} />
            </View>
            <View style={{ flex: 1 }}>
              <Button small kind="secondary" title="New program" onPress={() => setNewFrom(true)} />
            </View>
          </Row>
        </Card>
      ) : null}

      {/* Week strip */}
      <Label>Weeks</Label>
      <ChipRow>
        {plans.map((p, i) => (
          <Pressable
            key={i}
            accessibilityRole="button"
            accessibilityState={{ selected: week === i }}
            onPress={() => setWeek(i)}
            style={{ minHeight: 44, minWidth: 44, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderWidth: week === i ? 2 : 1, borderColor: week === i ? colors.ink : colors.line }}
          >
            <Text style={{ fontWeight: '600' }}>{`W${i + 1}`}</Text>
            {ramp && i < 4 ? <Text style={{ fontSize: 11, color: colors.muted }}>Ramp</Text> : p.deload ? <Text style={{ fontSize: 11, color: colors.muted }}>Deload</Text> : null}
          </Pressable>
        ))}
      </ChipRow>
      {weeks < 16 ? <Button small kind="ghost" title="Add a week" onPress={() => save({ weeks: [...plans, { ...plans[weeks - 1], deload: false }] })} /> : null}

      {/* Per-week effort */}
      <Card>
        {ramp && week < 4 ? (
          <>
            <Text style={{ fontSize: 15, fontWeight: '600' }}>{`Week ${week + 1} effort: ${BACK_AFTER_BREAK_RAMP[(week + 1) as 1 | 2 | 3 | 4].effort} (main and secondary)`}</Text>
            <Text style={{ fontSize: 13, color: colors.muted }}>Set by the Back after a break ramp.</Text>
          </>
        ) : (
          <>
            <Row style={{ justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 15, fontWeight: '600', flex: 1 }}>{`Week ${week + 1} effort: RPE ${plan.rpe ?? 7} (main and secondary)`}</Text>
              <Stepper value={plan.rpe ?? 7} min={5} max={RPE_CEILING + 1} onChange={setRpe} />
            </Row>
            {rpeMsg ? <Text accessibilityRole="alert" style={{ fontSize: 13, color: colors.errorText }}>{rpeMsg}</Text> : null}
            <Row style={{ justifyContent: 'space-between', minHeight: 44 }}>
              <Text style={{ fontSize: 14, flex: 1 }}>{`Make week ${week + 1} a deload (fewer sets, same rest)`}</Text>
              <Toggle accessibilityLabel={`Make week ${week + 1} a deload`} value={!!plan.deload} onValueChange={(v) => setPlan(week, { ...plan, deload: v, ...(v ? { rpe: 6 } : {}) })} />
            </Row>
          </>
        )}
      </Card>

      {/* Day columns for the selected week */}
      <Label>{`Week ${week + 1}`}</Label>
      {WEEKDAYS.map((d, i) => {
        const s = program.sessions.find((x) => x.id === schedule[i]);
        return (
          <Pressable
            key={d}
            accessibilityRole="button"
            accessibilityLabel={`${d}: ${s ? s.name : 'Rest'}. Tap to change.`}
            onPress={() => setDayPick(i)}
            style={{ minHeight: 48, flexDirection: 'row', gap: 12, alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card }}
          >
            <Text style={{ width: 40, fontWeight: '600' }}>{d}</Text>
            <Text style={{ flex: 1, color: s ? colors.ink : colors.muted }}>{s ? `${s.name} · ${s.exercises.length} exercises` : 'Rest'}</Text>
          </Pressable>
        );
      })}

      {checks.length ? (
        <View style={{ gap: 4 }}>
          {checks.map((c, i) => (
            <Text key={i} accessibilityRole={c.kind === 'block' ? 'alert' : undefined} style={{ fontSize: 13, color: c.kind === 'block' ? colors.errorText : colors.warningText }}>
              {`${c.kind === 'block' ? 'Blocked: ' : 'Note: '}${c.message}`}
            </Text>
          ))}
        </View>
      ) : null}

      {/* Sessions */}
      <Label>Sessions</Label>
      {program.sessions.map((s) => (
        <Card key={s.id}>
          <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/session', params: { programId: program.id, sessionId: s.id } })} style={{ minHeight: 44, justifyContent: 'center' }}>
            <H2>{s.name}</H2>
            <Text style={{ fontSize: 13, color: colors.muted }}>{`${s.focus} · ${s.exercises.length} exercises`}</Text>
          </Pressable>
          <Row style={{ gap: 6 }}>
            <View style={{ flex: 1 }}>
              <Button small kind="ghost" title="Copy to other days…" onPress={() => setCopy({ kind: 'days', sessionId: s.id })} />
            </View>
            <View style={{ flex: 1 }}>
              <Button small kind="ghost" title="Copy this week forward…" onPress={() => setCopy({ kind: 'weeks' })} />
            </View>
          </Row>
        </Card>
      ))}
      <Button kind="ghost" title="Add session" icon="plus" onPress={addSession} />

      <Button large title="Post" icon="square.and.arrow.up" disabled={checks.some((c) => c.kind === 'block')} onPress={() => setPosting(true)} />
      {gate === 'not_open' || gate === 'paused' ? <Text style={{ fontSize: 13, color: colors.muted }}>You can post once your team is open.</Text> : null}
      <Button kind="secondary" title="Save as template" onPress={() => setTemplate(true)} />
      {!draft ? <Button kind="secondary" title="Duplicate to another client" onPress={() => setDupPick(true)} /> : null}
      {draft ? (
        <Button
          kind="danger"
          title="Delete draft"
          onPress={() =>
            showAlert('Delete this draft?', undefined, [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: () => {
                  deleteProgram(program.id);
                  router.back();
                },
              },
            ])
          }
        />
      ) : null}

      {dayPick != null ? (
        <Sheet title={`${WEEKDAYS[dayPick]}, week ${week + 1}`} onClose={() => setDayPick(null)}>
          <OptionCard title="Rest" selected={!schedule[dayPick]} onPress={() => (setDay(dayPick, null), setDayPick(null))} />
          {program.sessions.map((s) => (
            <OptionCard key={s.id} title={s.name} subtitle={s.focus} selected={schedule[dayPick] === s.id} onPress={() => (setDay(dayPick, s.id), setDayPick(null))} />
          ))}
        </Sheet>
      ) : null}
      {copy ? <CopySheet program={program} week={week} plans={plans} copy={copy} onSave={(next) => save({ weeks: next })} onClose={() => setCopy(null)} /> : null}
      {posting ? <PostSheet team={team} program={program.draftTarget ? { ...program, groupKey: program.draftTarget } : program} gate={gate} onClose={() => setPosting(false)} /> : null}
      {template ? (
        <TemplateSheet
          name={program.name}
          onClose={() => setTemplate(false)}
          onSave={(name) => {
            const { teamId: _a, teamName: _b, groupKey: _c, groupName: _d, postedAt: _e, unposted: _f, startDate: _g, draftTarget: _h, forName: _i, lightDates: _j, events: _k, ...plan } = program;
            mutate((d) => ({ ...d, templates: [{ ...plan, id: uid(), name, createdAt: new Date().toISOString() }, ...(d.templates ?? [])] }));
            showAlert('Template saved.');
          }}
        />
      ) : null}
      {dupPick ? (
        <Sheet title="Duplicate to another client" onClose={() => setDupPick(false)}>
          {roster.filter((m) => clientKey(m.userId) !== target).map((m) => (
            <OptionCard key={m.userId} title={m.name} selected={dup === m.userId} onPress={() => setDup(m.userId)} />
          ))}
          <Button
            title="Duplicate"
            disabled={!dup}
            onPress={() => {
              const id = teamProgramId(team.id, `draft:${uid()}`);
              const m = roster.find((x) => x.userId === dup)!;
              const copyProgram: Program = {
                ...program,
                id,
                groupKey: id.slice(`team-${team.id}-`.length),
                groupName: undefined,
                postedAt: undefined,
                unposted: true,
                startDate: undefined,
                draftTarget: clientKey(m.userId),
                forName: m.name,
                createdAt: new Date().toISOString(),
              };
              saveProgram(copyProgram);
              setDupPick(false);
              router.push(`/program/${id}`);
            }}
          />
        </Sheet>
      ) : null}
      {newFrom ? <NewProgramSheet team={team} onClose={() => setNewFrom(false)} /> : null}
    </View>
  );
}

function CopySheet({ program, week, plans, copy, onSave, onClose }: { program: Program; week: number; plans: ProgramWeekPlan[]; copy: { kind: 'days' | 'weeks'; sessionId?: string }; onSave: (w: ProgramWeekPlan[]) => void; onClose: () => void }) {
  const [picked, setPicked] = useState<number[]>([]);
  const schedule = scheduleFor(program, week);
  const options = copy.kind === 'days' ? WEEKDAYS.map((d, i) => ({ i, label: d })).filter((x) => schedule[x.i] !== copy.sessionId) : plans.map((_, i) => ({ i, label: `Week ${i + 1}` })).filter((x) => x.i > week);
  return (
    <Sheet title={copy.kind === 'days' ? 'Copy to other days' : 'Copy this week forward'} onClose={onClose}>
      {options.map((o) => (
        <Checkbox key={o.i} checked={picked.includes(o.i)} onChange={(v) => setPicked((s) => (v ? [...s, o.i] : s.filter((x) => x !== o.i)))} label={o.label}>
          <Text style={{ fontSize: 15 }}>{o.label}</Text>
        </Checkbox>
      ))}
      <Button
        title="Copy"
        disabled={!picked.length}
        onPress={() => {
          if (copy.kind === 'days') {
            const next = schedule.map((x, i) => (picked.includes(i) ? copy.sessionId! : x));
            onSave(plans.map((p, k) => (k === week ? { ...p, schedule: next } : p)));
          } else {
            onSave(plans.map((p, k) => (picked.includes(k) ? { ...p, schedule: [...schedule] } : p)));
          }
          onClose();
        }}
      />
    </Sheet>
  );
}

function TemplateSheet({ name, onSave, onClose }: { name: string; onSave: (n: string) => void; onClose: () => void }) {
  const [n, setN] = useState(name);
  return (
    <Sheet title="Save as template" onClose={onClose}>
      <Field label="Template name" value={n} onChangeText={setN} maxLength={60} autoFocus />
      <Text style={{ fontSize: 13, color: colors.muted }}>{LEGAL.templateLine}</Text>
      <Button
        title="Save"
        disabled={!n.trim()}
        onPress={() => {
          onSave(n.trim());
          onClose();
        }}
      />
    </Sheet>
  );
}
