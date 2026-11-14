import { computeEffort, cappedHours, rank, topWithMe, weekStreak, scheduledDays, defaultTeamGoal } from '../../src/lib/effort';
import { generateProgram } from '../../src/lib/generator';
import { addDays, dateKey, mondayOf, withTest } from '../../src/lib/calendar';
import type { DayType } from '../../src/lib/types';
let fail = 0; const ok = (c: boolean, m: string) => { if (!c) { fail++; console.log('FAIL', m); } else console.log('pass', m); };
const week: DayType[] = ['practice','practice','practice','practice','practice','off','off'];
let prog = generateProgram({ position: 'Setter', phase: 'off', experience: 'intermediate', volleyballWeek: week, liftDaysPerWeek: 3, liftDays: [0, 2, 4] });
const today = new Date(2026, 10, 25); // Wed Nov 25
const since = mondayOf(addDays(today, -21)); // Mon Nov 2
prog = { ...prog, createdAt: since.toISOString() };
const sched = scheduledDays(prog, since, addDays(mondayOf(today), 6));
console.log('scheduled', sched.join(' '));
const at = (d: string, h = 17) => new Date(`${d}T${String(h).padStart(2,'0')}:00:00`).toISOString();
// Athlete A: every scheduled day + 3 extra logs (2 same day, 1 on a rest day)
const pastOrToday = sched.filter(d => d <= dateKey(today));
const logsA = [...pastOrToday.map(d => ({ at: at(d), session: 'x', minutes: 60 })), { at: at(pastOrToday[0], 19), session: 'x', minutes: 60 }, { at: at('2026-11-07'), session: 'x', minutes: 60 }];
// Athlete B: missed one session last week
const missed = sched.find(d => d >= '2026-11-16' && d < '2026-11-23')!;
const logsB = pastOrToday.filter(d => d !== missed).map(d => ({ at: at(d), session: 'x', minutes: 200 }));
const rows = [
  { userId: 'a', boardName: 'Ava A.', groupId: null, isMe: false, ranked: true, logs: logsA, attendance: [{ day: '2026-11-02', kind: 'practice' as const, minutes: 120 }], jumpGain: 2.6 },
  { userId: 'b', boardName: 'Ben B.', groupId: null, isMe: true, ranked: true, logs: logsB, attendance: null, jumpGain: null },
  { userId: 'c', boardName: 'Cy C.', groupId: null, isMe: false, ranked: true, logs: logsA, attendance: [], jumpGain: 1 },
];
const stats = computeEffort(rows, () => prog, since, today);
for (const s of stats) console.log(JSON.stringify(s));
const A = stats[0], B = stats[1];
ok(A.sessions === pastOrToday.length, `extra/duplicate sessions don't count (A sessions ${A.sessions} = scheduled ${pastOrToday.length})`);
ok(A.consistency === 100 && B.consistency! < 100, 'consistency');
ok(A.streak === 3, `streak counts full weeks; rest days (Sat/Sun) don't break it (A ${A.streak})`);
ok(B.streak === 0 || B.streak === 0, `a missed session breaks the streak (B ${B.streak})`);
// day cap: Nov 2 has 60+60 lift (+extra) + 120 practice = 240 → capped 180
ok(cappedHours({ '2026-11-02': 240 }) === 3, 'day cap 3 h');
ok(cappedHours({ '2026-11-02': 180, '2026-11-03': 180, '2026-11-04': 180, '2026-11-05': 180, '2026-11-06': 180, '2026-11-07': 180 }) === 15, 'week cap 15 h');
ok(B.hours <= 15 * 4, 'B hours capped');
ok(B.attendance === null && rank(stats, 'attendance').every(r => r.stats.userId !== 'b'), 'no attendance permission → not ranked');
ok(rank(stats, 'jumpGains').map(r => r.stats.userId).join() === 'a,c', 'improvement ranks only permitted members');
const r = rank(stats, 'consistency');
ok(r[0].rank === 1 && r[1].rank === 1 && r[2].rank === 3, 'ties share a rank');
const many = Array.from({ length: 14 }, (_, i) => ({ stats: { ...stats[0], userId: 'u' + i, isMe: i === 12, boardName: 'U' + i }, rank: i + 1, value: 100 - i }));
const tm = topWithMe(many);
ok(tm.top.length === 10 && tm.me?.stats.userId === 'u12', 'own row pinned below top 10');
// testing day replaces a lift and isn't a scheduled session
const tday = sched.find(d => d > dateKey(today))!;
const withT = withTest(prog, tday, 'jump');
ok(!scheduledDays(withT, since, addDays(mondayOf(today), 6)).includes(tday), 'testing day replaces that lift');
ok(defaultTeamGoal(10, 3, 12) === 288, 'default team goal 10×3×12×0.8');
console.log(fail ? `${fail} FAILED` : 'ALL EFFORT CHECKS PASS');
