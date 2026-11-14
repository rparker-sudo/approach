import { useEffect, useState } from 'react';
import { backend } from '../lib/backend';
import { getExercise } from '../lib/exercises';
import type { ResolvedExercise } from '../lib/resolve';
import { stationFor } from '../lib/stations';
import { useTeams } from '../lib/team';
import type { Session } from '../lib/types';
import { Card, colors, Text } from './ui';

/** F29b: Today before a Stations session: Part 1 (together) and the athlete's first station. */
export default function StationsCard({ teamId, session, exercises }: { teamId: string; session: Session; exercises: ResolvedExercise[] }) {
  const { syncing } = useTeams();
  const [rackIndex, setRackIndex] = useState<number | null | undefined>(undefined);
  useEffect(() => {
    if (syncing) return;
    let alive = true;
    backend
      .listRacks(teamId)
      .then((r) => {
        if (!alive) return;
        const i = [...r].sort((a, b) => a.sortOrder - b.sortOrder).findIndex((x) => x.userIds.length > 0);
        setRackIndex(i >= 0 ? i : null);
      })
      .catch(() => alive && setRackIndex(null));
    return () => {
      alive = false;
    };
  }, [teamId, syncing]);
  const stations = session.stations ?? [];
  if (session.format !== 'stations' || !stations.length) return null;
  const part1 = exercises.filter((e) => !e.stationId);
  const start = rackIndex != null ? stations[stationFor(rackIndex, 0, stations.length)] : null;
  return (
    <Card>
      <Text style={{ fontSize: 15, fontWeight: '700' }}>Part 1: together</Text>
      {part1.map((e, i) => (
        <Text key={i} style={{ fontSize: 13 }}>{`${getExercise(e.exerciseId).name} · ${e.sets} × ${e.reps}`}</Text>
      ))}
      {rackIndex === undefined ? null : start ? (
        <Text style={{ fontSize: 15, fontWeight: '700' }}>{`Stations: you start at Station ${stations.indexOf(start) + 1} (${start.name}).`}</Text>
      ) : (
        <Text style={{ fontSize: 13, color: colors.muted }}>You&apos;re not on a rack today. Follow the standard order.</Text>
      )}
    </Card>
  );
}
