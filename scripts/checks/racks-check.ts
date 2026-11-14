import { autoAssign, rackCountFor, sizeSummary, RackAthlete } from '../../src/lib/racks';
let f = 0; const ok = (c: boolean, m: string) => { console.log(c ? 'pass' : 'FAIL', m); if (!c) f++; };
const pos = ['Outside Hitter', 'Opposite', 'Middle Blocker', 'Setter', 'Libero / DS'];
const roster = (n: number, lv: (i: number) => number): RackAthlete[] => Array.from({ length: n }, (_, i) => ({ userId: `u${i}`, level: lv(i), position: pos[i % 5], groupId: null }));
const spread = (r: RackAthlete[][]) => Math.max(...r.map((x) => x.length)) - Math.min(...r.map((x) => x.length));
ok(sizeSummary(16, rackCountFor(16, 'size', 3)) === '16 athletes → 6 racks of 2–3' && sizeSummary(16, 5) === '16 athletes → 5 racks of 3–4', 'size summary');
for (const n of [7, 12, 16, 23, 30]) for (const R of [2, 4, 5, 7]) {
  const r0 = roster(n, (i) => (i % 3) + 1);
  for (const m of ['random', 'balanced', 'experience'] as const) {
    const out = autoAssign(r0, R, m);
    if (spread(out) > 1 || out.flat().length !== n) ok(false, `${m} ${n}/${R} sizes ±1`);
  }
  const p = autoAssign(r0, R, 'position'); const target = Math.ceil(n / R);
  if (p.flat().length !== n || p.some((x) => Math.abs(x.length - target) > 1)) ok(false, `position ${n}/${R} within ±1 of ${target}: ${p.map((x) => x.length)}`);
}
ok(true, 'sizes differ by ≤ 1 (random, balanced, experience) and by-position within ±1 of the target, 20 roster/rack combos');
// Balanced: at least one intermediate/advanced per rack of 2+
let balOk = true;
for (let k = 0; k < 50; k++) { const r0 = roster(15, (i) => (i < 5 ? 3 - (i % 2) : 1)); const out = autoAssign(r0, 5, 'balanced'); if (out.some((r) => r.length >= 2 && !r.some((a) => (a.level ?? 2) >= 2))) balOk = false; }
ok(balOk, 'balanced: every rack of 2+ has an intermediate/advanced athlete (50 runs)');
// By experience: advanced group not always rack 1
let firstAdv = 0;
for (let k = 0; k < 20; k++) { const out = autoAssign(roster(12, (i) => (i < 4 ? 3 : i < 8 ? 2 : 1)), 3, 'experience'); if (out[0].every((a) => a.level === 3)) firstAdv++; }
ok(firstAdv < 20, `by experience: rack numbers shuffled (advanced = Rack 1 in ${firstAdv}/20 runs)`);
const ex = autoAssign(roster(12, (i) => (i < 4 ? 3 : i < 8 ? 2 : 1)), 3, 'experience');
ok(ex.every((r) => new Set(r.map((a) => a.level)).size === 1), 'by experience: same level together');
console.log(f ? `${f} FAILED` : 'all passed');
