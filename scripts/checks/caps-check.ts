import { generateProgram, liftDayCap } from '../../src/lib/generator';
import { weekPlan, withOverride, withEvent, withBreak, mondayOf, addDays, dateKey, testBlocked } from '../../src/lib/calendar';
import type { Program } from '../../src/lib/types';
let fail = 0; const ok = (c: boolean, m: string) => { if (!c) { fail++; console.log('FAIL', m); } else console.log('pass', m); };
const wk = ['practice','practice','practice','practice','practice','off','off'] as any;
const mon = mondayOf(new Date(2026, 10, 16));
const lifts = (p: Program, exp?: any) => weekPlan(p, mon, exp).filter((d) => (d.sessionId && !p.sessions.find((s) => s.id === d.sessionId)?.mobility) || d.test).length;
const free = (p: Program, exp?: any) => weekPlan(p, mon, exp).filter((d) => !d.sessionId && !d.test).length;
const check = (name: string, p: Program, exp?: any) => {
  const cap = liftDayCap(exp && ['beginner','intermediate','advanced'].indexOf(exp) < ['beginner','intermediate','advanced'].indexOf(p.experience) ? exp : p.experience, p.phase);
  ok(lifts(p, exp) <= cap && free(p, exp) >= 1, `${name}: ${lifts(p, exp)} lift days (cap ${cap}), ${free(p, exp)} free day(s)`);
};
// 1. Onboarding: asks for 7 days
const onb = generateProgram({ position: 'Outside Hitter', phase: 'off', experience: 'beginner', volleyballWeek: wk, liftDaysPerWeek: 7, liftDays: [0,1,2,3,4,5,6] });
check('onboarding (7 days asked, beginner)', onb);
// 2. Personal week / schedule screen: liftSchedule edited to every day
const sid = onb.sessions.find((s) => !s.mobility)!.id;
const sched = { ...onb, liftSchedule: [sid, sid, sid, sid, sid, sid, sid] };
check('schedule screen (7 lift days written)', sched);
// 3. Team calendar: per-date overrides on every day of the week
let cal: Program = { ...onb, experience: 'advanced', teamId: 't' };
for (let i = 0; i < 7; i++) cal = withOverride(cal, dateKey(addDays(mon, i)), sid);
check('team calendar overrides (7 dates)', cal);
// 4. Coach lift days on a team program (advanced plan), beginner athlete
const coach = { ...generateProgram({ position: 'Setter', phase: 'off', experience: 'advanced', volleyballWeek: wk, liftDaysPerWeek: 5 }), teamId: 't' };
check('coach lift days, advanced plan, coach view', coach);
check('coach lift days, advanced plan, beginner athlete', coach, 'beginner');
// 5. In-season cap 3 even for advanced
check('in-season advanced (5 written)', { ...sched, phase: 'in', experience: 'advanced' });
// 6. Automatic moves: matches push lifts around
let mv: Program = { ...sched, experience: 'intermediate' };
mv = withEvent(mv, dateKey(addDays(mon, 2)), 'game');
check('automatic moves around a match', mv);
// Break: no lifts on the program team's break; another team's break doesn't stop lifting
const brk = withBreak({ ...coach }, dateKey(mon), dateKey(addDays(mon, 6)));
ok(weekPlan(brk, mon).every((d) => !d.sessionId && d.break), 'program team break: no lift sessions');
const other = { ...coach, events: [{ date: dateKey(mon), endDate: dateKey(addDays(mon, 6)), type: 'break' as const, teamName: 'Club 16s' }] };
ok(weekPlan(other, mon).some((d) => d.sessionId), "other team's break: lifting continues");
// Union: club tournament Saturday blocks school testing Thursday
const union = { ...coach, events: [{ date: dateKey(addDays(mon, 5)), type: 'tournament' as const, teamName: 'Club 16s' }] };
ok(!!testBlocked(union, dateKey(addDays(mon, 3))), 'club tournament Sat blocks testing Thu (union)');
console.log(fail ? `${fail} FAILED` : 'all passed');
process.exit(fail ? 1 : 0);
