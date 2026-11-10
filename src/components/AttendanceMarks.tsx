import { View } from 'react-native';
import { canAttend, Member, Team } from '../lib/backend';
import { markableDays, minutesFor } from '../lib/attendance';
import { useTeams } from '../lib/team';
import type { Program } from '../lib/types';
import { Chip, ChipRow, colors, Text } from './ui';

/** Coach roster: mark or unmark attendance for an athlete (P5.2). The coach's entry wins. Needs attendance permission. */
export default function AttendanceMarks({ team, member, program }: { team: Team; member: Member; program: Program | undefined }) {
  const { attendance, markAttendance } = useTeams();
  if (!canAttend(member.perms)) return null;
  const days = markableDays(program);
  if (!days.length) return null;
  const rows = attendance[team.id] ?? [];
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 12, color: colors.muted }}>Attendance</Text>
      {days.map((d) => {
        const row = rows.find((r) => r.userId === member.userId && r.day === d.day && r.kind === d.kind);
        const mark = (minutes: number) => markAttendance({ teamId: team.id, userId: member.userId, day: d.day, kind: d.kind, minutes }).catch(() => {});
        return (
          <ChipRow key={`${d.day}-${d.kind}`}>
            <Text style={{ fontSize: 13, alignSelf: 'center', minWidth: 130 }}>{d.label}</Text>
            <Chip label="There" selected={!!row && row.minutes > 0} onPress={() => mark(minutesFor(team.settings, d.kind))} />
            <Chip label="Not there" selected={!!row && row.minutes === 0} onPress={() => mark(0)} />
          </ChipRow>
        );
      })}
    </View>
  );
}
