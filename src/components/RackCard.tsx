import { useEffect, useState } from 'react';
import { backend, MyRack } from '../lib/backend';
import { useStore } from '../lib/store';
import { useTeams } from '../lib/team';
import { Card, colors, H2, Text } from './ui';

/**
 * R5: "You're on Rack 2" on Today. Partners show as a count ("with 2 teammates") until Legal confirms names (B5);
 * the server flag rack_partner_names() turns names on without a new build. Hidden or non-consented partners are only
 * ever counted ("1 more teammate"). Solo athletes: no racks.
 */
export default function RackCard({ teamId }: { teamId: string }) {
  const { data, mutate } = useStore();
  const { syncing, teams } = useTeams();
  const [rack, setRack] = useState<MyRack | null>(null);
  useEffect(() => {
    if (syncing) return;
    let alive = true;
    backend
      .myRack(teamId)
      .then((r) => alive && setRack(r))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [teamId, syncing]);
  const last = data.lastRack?.[teamId];
  useEffect(() => {
    if (!rack || last === rack.rackName) return;
    // Remember it after a short delay so the "Moved to" note shows once.
    const t = setTimeout(() => mutate((d) => ({ ...d, lastRack: { ...(d.lastRack ?? {}), [teamId]: rack.rackName } })), 30000);
    return () => clearTimeout(t);
  }, [rack, last, teamId, mutate]);
  if (!rack) return null;
  const general = teams.find((x) => x.id === teamId)?.kind === 'general';
  const names = rack.partnerNames;
  const n = rack.partners;
  let partners: string;
  if (names && names.length) {
    const more = rack.others ?? 0;
    const list = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0];
    partners = `with ${list}${more ? ` and ${more} more ${general ? 'other client' : 'teammate'}${more === 1 ? '' : 's'}` : ''}`;
  } else partners = n ? (general ? `with ${n} other client${n === 1 ? '' : 's'}` : `with ${n} teammate${n === 1 ? '' : 's'}`) : 'Just you for now';
  return (
    <Card>
      <H2>{`You're on ${rack.rackName}`}</H2>
      <Text style={{ fontSize: 14, color: colors.muted }}>{partners}</Text>
      {last && last !== rack.rackName ? <Text style={{ fontSize: 13 }}>{`Moved to ${rack.rackName}`}</Text> : null}
    </Card>
  );
}
