import { View } from 'react-native';
import { canAttend } from '../lib/backend';
import { markableDays, minutesFor } from '../lib/attendance';
import { useTeams } from '../lib/team';
import type { Program } from '../lib/types';
import { Chip, ChipRow, colors, Text } from './ui';

/** Athlete's Today screen: one-tap "I was there" for practices and matches (P5.2). Only with attendance permission. */
export default function AttendanceCheck({ program }: { program: Program }) {
  const { teams, consentFor, attendance, markAttendance, account } = useTeams();
  const team = teams.find((t) => t.id === program.teamId);
  if (!team || !account || !canAttend(consentFor(team.id))) return null;
  const days = markableDays(program);
  if (!days.length) return null;
  const rows = attendance[team.id] ?? [];
  return (
    <View style={{ gap: 6 }}>
      {days.map((d) => {
        const row = rows.find((r) => r.userId === account.id && r.day === d.day && r.kind === d.kind);
        const byCoach = !!row && row.markedBy !== account.id;
        const there = !!row && row.minutes > 0;
        return (
          <View key={`${d.day}-${d.kind}`} style={{ gap: 4 }}>
            <ChipRow>
              <Chip
                label={there ? `✓ I was there · ${d.label}` : `I was there · ${d.label}`}
                selected={there}
                onPress={() => {
                  if (byCoach) return; // the coach's entry wins
                  markAttendance({ teamId: team.id, userId: account.id, day: d.day, kind: d.kind, minutes: there ? null : minutesFor(team.settings, d.kind) }).catch(() => {});
                }}
              />
            </ChipRow>
            {byCoach ? (
              <Text style={{ fontSize: 12, color: colors.muted }}>{there ? 'Marked by your coach.' : 'Your coach marked you not there.'}</Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}
