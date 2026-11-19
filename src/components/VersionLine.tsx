import { useState } from 'react';
import { Pressable } from 'react-native';
import { LEVEL_NAME, ownLevel } from '../lib/athlete';
import { getExercise } from '../lib/exercises';
import { useStore } from '../lib/store';
import Sheet from './Sheet';
import { Body, Button, colors, Icon, Row, Text } from './ui';

/** "Your level on Varsity: Intermediate (set by your coach)" / "(not confirmed yet)". */
export function levelLine(teamName: string, level: number, confirmed: boolean) {
  return `Your level on ${teamName}: ${LEVEL_NAME[level]} (${confirmed ? 'set by your coach' : 'not confirmed yet'})`;
}

/** F13: shown under an exercise when resolveSession gave the athlete a different version than the team plan. */
export default function VersionLine({ exerciseId, teamExerciseId, teamId }: { exerciseId: string; teamExerciseId?: string; teamId?: string }) {
  const { data } = useStore();
  const [open, setOpen] = useState(false);
  if (!teamExerciseId) return null;
  const mine = getExercise(exerciseId).name;
  const team = getExercise(teamExerciseId).name;
  const tl = teamId ? data.teamLevels?.[teamId] : undefined;
  const teamName = tl?.teamName ?? 'your team';
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Your version: ${mine} (team: ${team}).`}
        onPress={() => setOpen(true)}
        style={{ minHeight: 28, justifyContent: 'center' }}
      >
        <Row style={{ gap: 6 }}>
          <Icon name="arrow.triangle.2.circlepath" size={12} color={colors.muted} />
          <Text style={{ fontSize: 13, color: colors.muted, textDecorationLine: 'underline' }}>{`Your version (team: ${team})`}</Text>
        </Row>
      </Pressable>
      {open ? (
        <Sheet title="Why is this different?" onClose={() => setOpen(false)}>
          <Body>
            {`Your coach's plan is for the whole team. Approach Strength gives you the version that fits your level on ${teamName}. Your sets, reps, and rest stay the same.`}
          </Body>
          {tl ? <Body muted>{levelLine(teamName, tl.level ?? ownLevel(data), tl.confirmed)}</Body> : null}
          <Button title="Got it" onPress={() => setOpen(false)} />
        </Sheet>
      ) : null}
    </>
  );
}

/** F13 [UX proposal]: slots with no version at the athlete's level. No exercise name. */
export function DroppedLine({ count }: { count: number }) {
  if (!count) return null;
  return <Text style={{ fontSize: 13, color: colors.muted }}>{`${count} exercise${count === 1 ? '' : 's'} left out for your level.`}</Text>;
}

/** 2.4.1: the resolver's session notes (R-2 "1 jump set dropped…", the mobility day's effort line, "After your match."). */
export function NotesLines({ notes }: { notes?: string[] }) {
  if (!notes?.length) return null;
  return (
    <>
      {notes.map((n) => (
        <Text key={n} style={{ fontSize: 13, color: colors.muted }}>{n}</Text>
      ))}
    </>
  );
}
