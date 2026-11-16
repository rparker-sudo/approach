/**
 * Rack groups auto-assign (D-026, rack-groups.md R2–R3, spec 2.3). Pure functions; no React.
 * Inputs are ONLY the roster, each athlete's team level (team_members.level, confirmed or self-reported) and their
 * position / position group. Never test results, estimated maxes, loads, check-ins, pain, bodyweight, age or nutrition.
 */

export type RackAthlete = { userId: string; level: number | null; position: string | null; groupId: string | null };
export type RackMethod = 'random' | 'balanced' | 'experience' | 'position';
export const METHODS: { id: RackMethod; label: string }[] = [
  { id: 'random', label: 'Random' },
  { id: 'balanced', label: 'Balanced mix' },
  { id: 'experience', label: 'By experience' },
  { id: 'position', label: 'By position' },
];

/** safety-guidelines §6 (hints only, not enforced). */
export const RACK_HINTS = [
  '3 per squat or bench rack: one lifts, one spots, one is next up (4 max).',
  '2–3 per trap bar or platform.',
  '2–3 per dumbbell or bench station.',
  'Up to 4 per plyo box.',
  '2 per med ball.',
  'Testing day: 2–3 per station, so you can watch every attempt.',
];

export type Rng = () => number;

export function shuffle<T>(list: T[], rng: Rng = Math.random): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Racks from a count (1–12) or a size (2–6). */
export function rackCountFor(athletes: number, by: 'count' | 'size', value: number): number {
  if (by === 'count') return Math.max(1, Math.min(12, Math.round(value)));
  return Math.max(1, Math.min(12, Math.ceil(athletes / Math.max(2, Math.min(6, value)))));
}

/** "16 athletes → 5 racks of 3–4" */
export function sizeSummary(athletes: number, racks: number, general = false): string {
  const word = general ? 'client' : 'athlete';
  if (!athletes) return `No ${word}s selected.`;
  const lo = Math.floor(athletes / racks);
  const hi = Math.ceil(athletes / racks);
  return `${athletes} ${word}${athletes === 1 ? '' : 's'} → ${racks} rack${racks === 1 ? '' : 's'} of ${lo === hi ? lo : `${lo}–${hi}`}`;
}

const lvl = (a: RackAthlete) => a.level ?? 2;

function deal(list: RackAthlete[], n: number, snake: boolean): RackAthlete[][] {
  const racks: RackAthlete[][] = Array.from({ length: n }, () => []);
  list.forEach((a, i) => {
    const round = Math.floor(i / n);
    const k = i % n;
    racks[snake && round % 2 ? n - 1 - k : k].push(a);
  });
  return racks;
}

/** Sizes differ by at most 1: fill racks in order with the given chunk sizes. */
function chunk(list: RackAthlete[], n: number): RackAthlete[][] {
  const out: RackAthlete[][] = [];
  let i = 0;
  for (let k = 0; k < n; k++) {
    const size = Math.floor(list.length / n) + (k < list.length % n ? 1 : 0);
    out.push(list.slice(i, i + size));
    i += size;
  }
  return out;
}

const POSITION_ORDER = ['Outside Hitter', 'Opposite', 'Middle Blocker', 'Setter', 'Libero / DS'];

export function autoAssign(athletes: RackAthlete[], n: number, method: RackMethod, rng: Rng = Math.random): RackAthlete[][] {
  n = Math.max(1, Math.min(n, Math.max(1, athletes.length)));
  if (method === 'random') return deal(shuffle(athletes, rng), n, false);

  if (method === 'balanced') {
    // Advanced → beginner (random within a level), snake order; then swap within a level to spread positions.
    const sorted = [...new Set(athletes.map(lvl))]
      .sort((a, b) => b - a)
      .flatMap((L) => shuffle(athletes.filter((a) => lvl(a) === L), rng));
    const racks = deal(sorted, n, true);
    for (let pass = 0; pass < 3; pass++) {
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          if (i === j) continue;
          for (const a of racks[i]) {
            for (const b of racks[j]) {
              if (lvl(a) !== lvl(b) || a.position === b.position) continue;
              const dup = (r: RackAthlete[], p: string | null) => r.filter((x) => x.position === p).length;
              const before = Math.max(dup(racks[i], a.position), 1) + Math.max(dup(racks[j], b.position), 1);
              const ri = racks[i].map((x) => (x === a ? b : x));
              const rj = racks[j].map((x) => (x === b ? a : x));
              const after = Math.max(dup(ri, b.position), 1) + Math.max(dup(rj, a.position), 1);
              if (after < before) {
                racks[i] = ri;
                racks[j] = rj;
              }
            }
          }
        }
      }
    }
    return racks;
  }

  if (method === 'experience') {
    // Same level together, filling racks in order; a leftover level shares with the nearest level. Rack order is
    // then shuffled so "Rack 1" isn't always the advanced group.
    const sorted = [3, 2, 1].flatMap((L) => shuffle(athletes.filter((a) => lvl(a) === L), rng));
    return shuffle(chunk(sorted, n), rng);
  }

  // By position: start from position groups, split big ones, merge small leftovers with the closest group.
  const target = Math.ceil(athletes.length / n);
  const key = (a: RackAthlete) => a.groupId ?? a.position ?? 'Other';
  const orderOf = (k: string) => {
    const p = athletes.find((a) => key(a) === k)?.position ?? '';
    const i = POSITION_ORDER.indexOf(p);
    return i < 0 ? 99 : i;
  };
  const groups = [...new Set(athletes.map(key))].sort((a, b) => orderOf(a) - orderOf(b) || a.localeCompare(b));
  const out: RackAthlete[][] = [];
  const leftovers: RackAthlete[] = [];
  for (const g of groups) {
    const members = shuffle(athletes.filter((a) => key(a) === g), rng);
    const parts = Math.floor(members.length / target);
    if (parts >= 1) {
      const rem = members.length - parts * target;
      // Spread the remainder over this group's parts when it keeps them within +1 of the target.
      if (rem <= parts) out.push(...chunk(members, parts));
      else {
        out.push(...chunk(members.slice(0, parts * target), parts));
        leftovers.push(...members.slice(parts * target));
      }
    } else leftovers.push(...members);
  }
  if (leftovers.length) out.push(...chunk(leftovers, Math.max(1, Math.round(leftovers.length / target))));
  return out.filter((r) => r.length);
}

/** R6: suggested rack for someone who joined later (the smallest rack; ties go to the first). */
export function suggestRack(racks: { userIds: string[] }[]): number {
  let best = 0;
  racks.forEach((r, i) => {
    if (r.userIds.length < racks[best].userIds.length) best = i;
  });
  return best;
}
