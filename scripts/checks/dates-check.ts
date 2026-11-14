import { generateProgram } from '../../src/lib/generator';
import { suggestTestDates, spacingNote, goodTestDay } from '../../src/lib/testingDates';
import { addDays, dateKey, fromKey, weekPlan, testBlocked, breakOn, dayTypeOn, withBreak } from '../../src/lib/calendar';
let fail = 0; const ok = (c: boolean, m: string) => { if (!c) { fail++; console.log('FAIL', m); } else console.log('pass', m); };
const wk = ['practice','practice','off','practice','practice','off','off'] as any;
const base = generateProgram({ position: 'Setter', phase: 'off', experience: 'intermediate', volleyballWeek: wk, liftDaysPerWeek: 3, liftDays: [0,2,4] });
const start = new Date(2026, 10, 16); // Monday
const p = { ...base, blockStart: '2026-11-16', createdAt: '2026-11-01T00:00:00Z', teamId: 't' };
// 1. Off-season, no matches: last lift day of block week 1
const s1 = suggestTestDates(p, start);
const w1 = weekPlan(p, start).filter((d) => d.sessionId).map((d) => d.date);
ok(s1.battery === 'full' && s1.dates[0]?.date === w1[w1.length - 1], `off-season → last lift day of week 1 (${s1.dates[0]?.reason})`);
// 2. Mid-season: Saturday tournament every week except one
const inP: any = { ...p, phase: 'in', events: [] };
const sat0 = addDays(start, 5);
for (let k = 0; k < 10; k++) if (k !== 5) inP.events.push({ date: dateKey(addDays(sat0, 7 * k)), type: 'tournament' });
inP.events.push({ date: dateKey(addDays(sat0, 7 * 5 - 1)), type: 'game' }); // a Friday match in the free week
const s2 = suggestTestDates(inP, start);
const freeMon = addDays(start, 35);
ok(s2.dates.length > 0 && s2.dates.every((x) => x.date >= dateKey(freeMon) && x.date <= dateKey(addDays(freeMon, 6))), `mid-season → free week (${s2.dates.map((d) => d.reason).join(', ')})`);
ok(s2.dates.every((x) => !testBlocked(inP, x.date)), 'mid-season suggestions ≥ 48 h before the next match');
const allT: any = { ...inP, events: Array.from({ length: 10 }, (_, k) => ({ date: dateKey(addDays(sat0, 7 * k)), type: 'tournament' })) };
const s3 = suggestTestDates(allT, start);
ok(!!s3.jumpOnly && s3.battery === 'jump' && !s3.dates.length, 'no free week → Jump tests only');
// 3. Never within 48 h of a match, never on break or match day
const brk: any = withBreak({ ...p, events: [{ date: dateKey(addDays(start, 4)), type: 'game' }] }, dateKey(addDays(start, 7)), dateKey(addDays(start, 13)));
for (const phase of ['off', 'pre', 'in', 'post'] as const) {
  const q = { ...brk, phase, events: [...brk.events, { date: dateKey(addDays(start, 40)), type: 'game' }] };
  const s = suggestTestDates(q, start);
  ok(s.dates.every((x) => !testBlocked(q, x.date) && !breakOn(q, fromKey(x.date)) && !['game','tournament'].includes(dayTypeOn(q, fromKey(x.date)))), `${phase}: suggestions avoid matches, 48 h, breaks (${s.dates.map((d) => d.date).join(' ')})`);
}
// 4. Spacing note
const sp: any = { ...p, events: [{ date: dateKey(start), type: 'practice', test: 'full' }] };
ok(spacingNote(sp, dateKey(addDays(start, 21)), 'full') === 'Last full battery was 3 weeks ago. Most teams test every 6–12 weeks.', 'full battery 3 weeks later → spacing note (save still allowed)');
ok(spacingNote(sp, dateKey(addDays(start, 42)), 'full') === null, '6 weeks later → no note');
console.log(fail ? `${fail} FAILED` : 'all passed'); process.exit(fail ? 1 : 0);
