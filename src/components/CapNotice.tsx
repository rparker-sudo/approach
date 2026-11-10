import { router } from 'expo-router';
import { liftDayCap, liftDayCount, overCap } from '../lib/generator';
import type { Program } from '../lib/types';
import { Button, Card, Text } from './ui';

/** G2: plans made before the lift-day caps get an offer to rebuild within the cap. */
export default function CapNotice({ program }: { program: Program }) {
  if (!overCap(program)) return null;
  const cap = liftDayCap(program.experience, program.phase);
  return (
    <Card>
      <Text style={{ fontWeight: '600' }}>{`This plan has ${liftDayCount(program)} lift days. Max ${cap} for this level and time of year.`}</Text>
      <Text style={{ fontSize: 13 }}>Rebuild it within the cap. Extra days can be mobility days instead.</Text>
      <Button
        small
        title={`Rebuild with ${cap} lift days`}
        icon="arrow.triangle.2.circlepath"
        onPress={() => router.push({ pathname: '/builder', params: { programId: program.id, ...(program.teamId ? { teamId: program.teamId } : {}) } })}
      />
    </Card>
  );
}
