import { e1rm } from '../../src/lib/backend/types';
import { eligibility, loadTestsFor, repOptions, testedWeight, PHASE_RANGE, bestOf } from '../../src/lib/testing';
import { suggestWeight } from '../../src/lib/progression';
import { testBlocked, withTest, planForDate, fromKey } from '../../src/lib/calendar';
import { generateProgram } from '../../src/lib/generator';
import { ALL_EQUIPMENT } from '../../src/lib/exercises';
let fail = 0; const ok = (c: boolean, m: string) => { if (!c) { fail++; console.log('FAIL', m); } else console.log('pass', m); };
const full = { participation: true, checkins: true, shareCheckins: true, boards: true, attendance: true, testing: true };
ok(Math.round(e1rm(200, 5)) === 233, `e1RM 200×5 → ${e1rm(200, 5)}`);
ok(bestOf([110, null, 112]) === 112, 'best of 3');
// eligibility
const fine = { sleep: 4, soreness: 2, energy: 4, pain: false };
ok(eligibility({ onTeam: true, perms: full, levelOk: true, todayCheckIn: fine }).strength, 'intermediate with testing permission and a good check-in: strength checks allowed');
ok(!eligibility({ onTeam: true, perms: full, levelOk: false }).strength, 'beginner: jumps only');
ok(eligibility({ onTeam: true, perms: full, levelOk: false }).jumps, 'beginner can still do jump tests');
ok(!eligibility({ onTeam: false, perms: undefined, levelOk: true }).strength && eligibility({ onTeam: false, perms: undefined, levelOk: true }).jumps, 'solo: jumps only (on device)');
const noBox6 = eligibility({ onTeam: true, perms: { ...full, testing: false }, levelOk: true });
ok(!noBox6.strength && !noBox6.jumps, 'no box 6: no tests on the team');
ok(!eligibility({ onTeam: true, perms: full, levelOk: true, todayCheckIn: { ...fine, pain: true } }).strength, 'pain today: no strength checks');
ok(!eligibility({ onTeam: true, perms: full, levelOk: true, todayCheckIn: { sleep: 1, soreness: 5, energy: 1, pain: false } }).strength, 'run down today: no strength checks');
ok(!eligibility({ onTeam: true, perms: { ...full, checkins: false, shareCheckins: false }, levelOk: true, painToday: true }).strength, 'no check-in permission: on-the-spot pain = yes skips');
console.log('note:', eligibility({ onTeam: true, perms: full, levelOk: false }).note, '|', eligibility({ onTeam: true, perms: full, levelOk: true, painToday: true }).note);
// batteries
ok(loadTestsFor('full', ALL_EQUIPMENT).join() === 'trap-bar-deadlift,back-squat,bench', 'full battery (weight room)');
ok(loadTestsFor('mid', ALL_EQUIPMENT).join() === 'trap-bar-deadlift', 'mid-season: trap bar only');
ok(loadTestsFor('jump', ALL_EQUIPMENT).length === 0, 'jump battery: no strength checks');
ok(loadTestsFor('full', ['dumbbells', 'bench']).join() === 'goblet-squat,db-bench', 'dumbbell gym: goblet + DB bench');
ok(repOptions('back-squat', 'advanced').join() === '5,3' && repOptions('back-squat', 'intermediate').join() === '5' && repOptions('db-bench', 'advanced').join() === '8', 'rep options');
// loading from tests
const pe = { exerciseId: 'back-squat', sets: 4, reps: '5', effort: '' };
const log = (w: number) => ({ id: 'l', date: '2026-11-01T10:00:00Z', programId: 'p', sessionId: 's', sessionName: 'x', entries: [{ exerciseId: 'back-squat', sets: [5,5,5,5].map((r) => ({ weight: String(w), reps: String(r), done: true })) }] });
for (const phase of ['off','pre','in','post'] as const) {
  const est = e1rm(200, 5);
  const s = suggestWeight([log(225)] as never, pe, ALL_EQUIPMENT, { e1rm: est, phase })!;
  ok(s.weight <= est * PHASE_RANGE[phase][1], `${phase}: ${s.weight} ≤ e1RM ${est} × ${PHASE_RANGE[phase][1]}`);
}
const noHist = suggestWeight([], pe, ALL_EQUIPMENT, { e1rm: 233.3, phase: 'off' })!;
ok(noHist.weight === 160 && noHist.reason === 'test', `no history → e1RM × lower % rounded to 5 (${noHist.weight})`);
const hi = suggestWeight([log(150)] as never, pe, ALL_EQUIPMENT, { e1rm: 300, phase: 'off' })!;
const lo = suggestWeight([log(150)] as never, pe, ALL_EQUIPMENT, { e1rm: 180, phase: 'off' })!;
ok(lo.weight < hi.weight && lo.weight <= 180 * 0.8, `lower re-test lowers the suggestion (${hi.weight} → ${lo.weight})`);
ok(testedWeight(100, 'off', null, 2.5) === 70, 'dumbbell rounding to 2.5');
// untested lift keeps G5 progression
const untested = suggestWeight([log(100)] as never, pe, ALL_EQUIPMENT)!;
ok(untested.reason === 'up' && untested.delta === 10, 'untested lift keeps pass 1 progression');
// 48h rule
const prog = { ...generateProgram({ position: 'Setter', phase: 'in', experience: 'intermediate', volleyballWeek: ['practice','practice','practice','practice','practice','off','off'], liftDaysPerWeek: 2, liftDays: [0, 2] }), events: [{ date: '2026-12-05', type: 'game' as const }] };
ok(!!testBlocked(prog, '2026-12-03') && !!testBlocked(prog, '2026-12-04') && !!testBlocked(prog, '2026-12-05'), 'testing blocked within 2 days before a match');
ok(!testBlocked(prog, '2026-12-02'), '3 days before is fine');
const t = withTest(prog, '2026-12-02', 'full');
ok(planForDate(t, fromKey('2026-12-02')).test === 'full', 'testing day on the plan');
const t2 = { ...t, events: [...t.events!, { date: '2026-12-03', type: 'tournament' as const }] };
ok(!planForDate(t2, fromKey('2026-12-02')).test, 'a match added later within 48 h cancels the testing day');
console.log(fail ? `${fail} FAILED` : 'ALL TESTING CHECKS PASS');
