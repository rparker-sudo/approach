import { EXTRA_RECOVERY_SESSIONS, recoveryList, recoveryProgram } from '../../src/lib/recovery';
import { getExercise, fits } from '../../src/lib/exercises';
import { resolveSession } from '../../src/lib/resolve';
import { computeEffort, rank, OVERALL_POINTS } from '../../src/lib/effort';
import { generateProgram } from '../../src/lib/generator';
import { suggestWeight } from '../../src/lib/progression';
import { addDays, dateKey, mondayOf, withBreak, weekPlan } from '../../src/lib/calendar';
let f = 0; const ok = (c: boolean, m: string) => { console.log(c ? 'pass' : 'FAIL', m); if (!c) f++; };
// ER acceptance
ok(EXTRA_RECOVERY_SESSIONS.length === 5, 'ER1–ER5');
const bad = EXTRA_RECOVERY_SESSIONS.flatMap((s) => s.exercises.map((e) => getExercise(e.exerciseId))).filter((x) => x.category !== 'prehab' || !fits(x, []));
ok(!bad.length, `all prehab, no equipment (${bad.map((x) => `${x.id}:${x.category}:${JSON.stringify(x.equipment)}`).join(' ')})`);
ok(recoveryList({ dayAfterMatch: true, matchWeek: false, upperDay: false })[0].id === 'er2-legs-after-matches', 'day after match → ER2 first');
ok(recoveryList({ dayAfterMatch: false, matchWeek: false, upperDay: false, position: 'Middle Blocker' })[0].id === 'er4-ankles-knees', 'middle → ER4 first');
ok(recoveryList({ dayAfterMatch: false, matchWeek: true, upperDay: false })[0].id === 'er5-quick-10', 'match week → ER5');
ok(recoveryList({ dayAfterMatch: false, matchWeek: false, upperDay: false })[0].id === 'er1-full-body-reset', 'otherwise ER1');
const s1 = EXTRA_RECOVERY_SESSIONS[0];
const rs = resolveSession(recoveryProgram(s1, 'in'), s1, { level: 1, logs: [] });
ok(rs.exercises.length === s1.exercises.length && rs.exercises.every((e) => e.restSecResolved === 0), 'resolved ER1 keeps every exercise, rest 0');
const s4 = EXTRA_RECOVERY_SESSIONS[3]; const r4 = resolveSession(recoveryProgram(s4, 'in'), s4, { level: 1, logs: [] });
ok(r4.exercises.find((e) => e.exerciseId === 'wall-sit')!.restSecResolved === 30, 'wall sit rest 30 s');
const log = { id: 'x', date: new Date().toISOString(), programId: 'extra-recovery', sessionId: 's', sessionName: 'Full-Body Reset', entries: [{ exerciseId: 'wall-sit', sets: [{ weight: '25', reps: '20', done: true }] }], kind: 'extra_recovery' as const };
ok(suggestWeight([log as any], { exerciseId: 'wall-sit', sets: 2, reps: '20s', effort: 'Easy' }) === null, 'extra recovery log never creates weight suggestions');
// Effort: points & limits
const wk = ['practice','practice','practice','practice','practice','off','off'] as any;
const prog = { ...generateProgram({ position: 'Setter', phase: 'off', experience: 'intermediate', volleyballWeek: wk, liftDaysPerWeek: 3, liftDays: [0,2,4] }), teamId: 't' };
const today = new Date(2026, 10, 25); // Wed
const lastMon = addDays(mondayOf(today), -7);
const days = weekPlan(prog, lastMon).filter((d) => d.sessionId).map((d) => d.date);
const at = (k: string) => new Date(`${k}T18:00:00`).toISOString();
const extras = [0, 1, 2].map((i) => ({ at: at(dateKey(addDays(lastMon, 5 + (i % 2)))), session: 'ER', minutes: 12, kind: 'extra_recovery' as const }));
const rows = [
  { userId: 'a', boardName: 'A', groupId: null, isMe: false, ranked: true, logs: [...days.map((d) => ({ at: at(d), session: 'L', minutes: 60, kind: 'lift' as const })), ...extras], attendance: [{ day: dateKey(lastMon), kind: 'practice' as const, minutes: 120 }], jumpGain: 2.5 },
  { userId: 'b', boardName: 'B', groupId: null, isMe: false, ranked: false, logs: [], attendance: [{ day: dateKey(lastMon), kind: 'practice' as const, minutes: 120 }], jumpGain: 1 },
];
const st = computeEffort(rows, () => prog, lastMon, today);
const a = st.find((x) => x.userId === 'a')!;
ok(a.sessions === days.length, `sessions = prescribed only (${a.sessions})`);
ok(a.overall === days.length * 10 + 2 * 5 + 5, `overall = ${days.length}×10 + 2×5 (3rd extra 0) + full week 5 → ${a.overall}`);
ok(a.extra === 3, 'extra recovery tab counts all 3');
ok(rank(st, 'overall').every((r) => r.stats.userId !== 'b') && rank(st, 'streak').every((r) => r.stats.userId !== 'b'), 'D-027: non-program athlete off Overall/Streak');
ok(rank(st, 'attendance').some((r) => r.stats.userId === 'b') && rank(st, 'jumpGains').some((r) => r.stats.userId === 'b') && rank(st, 'hours').some((r) => r.stats.userId === 'b'), 'D-027: stays on Attendance/Hours/Jump gains');
// Break week: consistency unchanged, streak skip
const brk = withBreak(prog, dateKey(mondayOf(today)), dateKey(addDays(mondayOf(today), 6)));
const st2 = computeEffort([{ ...rows[0], logs: rows[0].logs.filter((l) => l.kind === 'lift') }], () => brk, lastMon, today)[0];
ok(st2.consistency === 100, `break days don't lower consistency (${st2.consistency}%)`);
ok(st2.streak === 1, `all-break week neither breaks nor extends the streak (${st2.streak})`);
console.log(f ? `${f} FAILED` : 'all passed');
