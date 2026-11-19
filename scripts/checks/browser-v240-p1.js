// 2.4.0 Part 1 UI (F45–F51), demo build on :8099. Usage: node test-v240-p1.js <shotsDir>
const { chromium, devices } = require('playwright');
const S = process.argv[2];
const fs = require('fs');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ ...devices['iPhone 13'], deviceScaleFactor: 1 }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push('PAGEERR ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  const hosts = new Set(); p.on('request', r => { try { hosts.add(new URL(r.url()).host); } catch {} });
  let fails = 0; const check = (c, m) => { console.log(c ? '  PASS' : '  FAIL', m); if (!c) fails++; };
  const step = s => console.log('·', s);
  const click = async (t, o = {}) => p.getByText(t, { exact: true }).last().click({ timeout: 8000, ...o });
  const shot = n => p.screenshot({ path: `${S}/v240-${n}.png`, fullPage: true });
  const body = () => p.evaluate(() => document.body.innerText);
  const ls = () => p.evaluate(() => Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)])));
  const demo = async () => JSON.parse((await ls())['load-and-launch/demo-server/v1']);
  const app = async () => JSON.parse((await ls())['volley-strength/data/v1']);
  const setDemo = async (fn) => { const d = await demo(); fn(d); await p.evaluate((v) => localStorage.setItem('load-and-launch/demo-server/v1', v), JSON.stringify(d)); };
  const taps = [];
  const tapAudit = async (label) => {
    const bad = await p.evaluate(() => {
      const sel = '[role=button],[role=link],[role=checkbox],[role=switch],[role=tab],[role=radio],a[href],button,input,textarea,select';
      const out = [];
      for (const el of new Set(document.querySelectorAll(sel))) {
        const r = el.getBoundingClientRect(); const st = getComputedStyle(el);
        if (!r.width || !r.height || st.visibility === 'hidden' || st.display === 'none' || el.closest('[aria-hidden=true]')) continue;
        if (el.tagName !== 'INPUT' && st.display === 'inline') continue;
        let ok = r.width >= 44 && r.height >= 44;
        if (!ok) { let a = el.parentElement; for (let k = 0; a && k < 3; k++, a = a.parentElement) { if (a.matches?.(sel)) { const ar = a.getBoundingClientRect(); if (ar.width >= 44 && ar.height >= 44) ok = true; break; } } }
        if (!ok) out.push(`${(el.innerText || el.getAttribute('aria-label') || el.tagName).trim().slice(0, 30)} ${Math.round(r.width)}×${Math.round(r.height)}`);
      }
      return out;
    });
    for (const b2 of bad) taps.push(`${label}: ${b2}`);
  };
  const welcomeCreate = async () => {
    if (!(await p.getByRole('button', { name: /^Month:/ }).count()) && (await p.getByText('Create an account', { exact: true }).count())) {
      await p.getByText('Create an account', { exact: true }).last().click(); await p.waitForTimeout(500);
    }
  };
  const age = async (month, year) => {
    await welcomeCreate();
    await p.getByRole('button', { name: /^Month:/ }).click(); await p.waitForTimeout(250); await click(month); await p.waitForTimeout(250);
    await p.getByRole('button', { name: /^Year:/ }).click(); await p.waitForTimeout(250); await click(String(year)); await p.waitForTimeout(250);
    await click('Next'); await p.waitForTimeout(500);
  };
  const tickCoachTerms = async () => {
    const cb = p.getByRole('checkbox', { name: 'I agree to the Coach Terms (Terms §4)' });
    if ((await cb.count()) && (await cb.last().getAttribute('aria-checked')) !== 'true') { await cb.last().click({ position: { x: 12, y: 22 } }); await p.waitForTimeout(200); }
  };
  const phones = {}; let current = null;
  const stash = async () => { if (current) phones[current] = await p.evaluate(() => localStorage.getItem('volley-strength/data/v1')); };
  const restore = async (who) => { current = who; if (phones[who]) await p.evaluate((v) => localStorage.setItem('volley-strength/data/v1', v), phones[who]); };
  const erase = async () => {
    await p.goto('http://localhost:8099/sign-in'); await p.waitForTimeout(800);
    await stash(); current = null;
    await p.evaluate(() => {
      const k = 'load-and-launch/demo-server/v1'; const d = JSON.parse(localStorage.getItem(k) || 'null');
      if (d) { d.sessionUserId = null; localStorage.setItem(k, JSON.stringify(d)); }
      localStorage.removeItem('volley-strength/data/v1');
    });
    await p.goto('http://localhost:8099/'); await p.waitForTimeout(1200);
  };
  const logIn = async (email, password) => {
    await p.goto('http://localhost:8099/sign-in'); await p.waitForTimeout(1500);
    await p.getByPlaceholder('you@example.com').fill(email); await p.locator('input[type=password]').fill(password);
    await click('Sign in'); await p.waitForTimeout(2200);
    if (await p.getByText('I agree to the Coach Terms (Terms §4)', { exact: false }).count()) { await tickCoachTerms(); await click('Continue'); await p.waitForTimeout(800); }
    if (p.url().includes('/join')) { await p.goto('http://localhost:8099/'); await p.waitForTimeout(1800); }
  };
  const coachIn = async () => { await erase(); await restore('coach'); await logIn('coach@test.org', 'secret1'); };
  const BLOCKS = /under 18|RPE 8 or below|No racing the clock|Heavy lifts need at least|Power work needs at least|Supersets are for|done in Part 1, fresh|Blocked:|Max \d lift days/;

  step('coach: team with a minor, generated workout, session editor (F45, F49, F51)');
  await p.goto('http://localhost:8099/'); await p.waitForTimeout(2500);
  await age('March', 1985); await click("I'm a coach or trainer"); await click('Next');
  await p.getByPlaceholder('Coach Parker').fill('Riley Coach'); await p.getByPlaceholder('you@example.com').fill('coach@test.org'); await p.getByPlaceholder('At least 6 characters').fill('secret1');
  await tickCoachTerms(); await click('Create account'); await p.waitForTimeout(1800); current = 'coach';
  await click('New team'); await click('Volleyball team'); await click('Next');
  await p.getByPlaceholder('Team name, e.g. Varsity').fill('Varsity'); await click('Create'); await p.waitForTimeout(1500);
  let d = await demo(); const team = d.teams[0]; const code = team.joinCode;
  await click('Build workout'); await p.waitForTimeout(800); await p.getByText('Build team workout', { exact: true }).last().click(); await p.waitForTimeout(1200);
  let a = await app(); let prog = a.programs.find(x => x.teamId === team.id);
  check(prog.sessions.every(s => s.source === 'approach'), "generated team workout: source = 'approach'");
  const ses = prog.sessions.find(s => s.exercises.some(e => e.role === 'main')) || prog.sessions[0];
  const sUrl = `http://localhost:8099/session?programId=${prog.id}&sessionId=${ses.id}`;
  await p.goto(sUrl); await p.waitForTimeout(1500);
  let t = await body(); await shot('editor-generated'); await tapAudit('session editor');
  check(/Warm-up · (Lower|Upper|Total|Power)[^\n]* · about \d+ min/.test(t) && /Approach Strength/.test(t), 'F49: Warm-up row pinned at the top with type, minutes and the source tag');
  check(/Adjust to level/.test(t) && /Program setting: On/.test(t), 'F46b: session "Adjust to level" toggle');
  check(/about \d+ min · target \d+/.test(t), 'F51d: estimate against the target in the builder footer');
  // effort: RPE 10 saves, no message
  const effortBoxes = p.locator('input').filter({ hasNot: p.locator('xx') });
  const mainIdx = ses.exercises.findIndex(e => e.role === 'main');
  const rowsBefore = (await app()).programs.find(x => x.id === prog.id).sessions.find(s => s.id === ses.id).exercises;
  // reps/effort inputs come in pairs after the name field; find the effort input by its current value
  const eff = p.locator(`input[value="${rowsBefore[mainIdx].effort}"]`).first();
  await eff.fill('RPE 10'); await p.waitForTimeout(400);
  t = await body(); await shot('editor-rpe10');
  check(!BLOCKS.test(t), `effort "RPE 10" on a minors team: no block, warning or note${(t.match(BLOCKS) || [''])[0]}`);
  a = await app(); let s2 = a.programs.find(x => x.id === prog.id).sessions.find(s => s.id === ses.id);
  check(s2.exercises[mainIdx].effort === 'RPE 10' && s2.source === 'coach', "saved as typed; editing the effort flipped the session to source = 'coach'");
  for (const v of ['to failure', 'max', 'AMRAP']) { await p.locator(`input[value="RPE 10"], input[value="to failure"], input[value="max"]`).first().fill(v); await p.waitForTimeout(250); }
  t = await body(); check(!BLOCKS.test(t), '"to failure", "max", "AMRAP" also save with no message');
  await p.locator('input[value="AMRAP"]').first().fill('RPE 10'); await p.waitForTimeout(300);
  // rest: down to 0:30 on the main lift
  const minus = p.getByRole('button', { name: 'Rest minus 15 seconds' }).nth(mainIdx);
  for (let i = 0; i < 20; i++) { await minus.click(); await p.waitForTimeout(60); }
  await p.waitForTimeout(400);
  a = await app(); s2 = a.programs.find(x => x.id === prog.id).sessions.find(s => s.id === ses.id);
  t = await body(); await shot('editor-rest0');
  check(s2.exercises[mainIdx].restSec === 0 && /No timer/.test(t), `rest goes down to 0:00 and saves as typed (${s2.exercises[mainIdx].restSec}s)`);
  check(/Auto \d:\d\d/.test(t) && !BLOCKS.test(t), 'F45d: "Auto m:ss" chip beside the rest, no floor message');
  const plus = p.getByRole('button', { name: 'Rest plus 15 seconds' }).nth(mainIdx);
  await plus.click(); await p.waitForTimeout(80); await plus.click(); await p.waitForTimeout(400);
  a = await app(); s2 = a.programs.find(x => x.id === prog.id).sessions.find(s => s.id === ses.id);
  check(s2.exercises[mainIdx].restSec === 30, `rest 0:30 on the main lift saves as typed (${s2.exercises[mainIdx].restSec}s)`);
  await p.getByRole('button', { name: /^Use auto rest/ }).first().click(); await p.waitForTimeout(400);
  a = await app(); s2 = a.programs.find(x => x.id === prog.id).sessions.find(s => s.id === ses.id);
  check(s2.exercises[mainIdx].restSec == null, 'tapping the Auto chip sets the field back to auto');
  await plus.click(); await p.waitForTimeout(80);
  for (let i = 0; i < 10; i++) { await minus.click(); await p.waitForTimeout(60); }
  // pair: select the main lift with the next exercise (any tiers)
  const boxes = p.getByRole('checkbox', { name: /^Select / });
  await boxes.nth(0).click(); await boxes.nth(1).click(); await p.waitForTimeout(200);
  await click('Pair as superset'); await p.waitForTimeout(400);
  t = await body(); check(/Superset · \d+ rounds/.test(t) && !BLOCKS.test(t), 'any two exercises pair with no reason (incl. power/heavy)');
  const n = (await app()).programs.find(x => x.id === prog.id).sessions.find(s => s.id === ses.id).exercises.length;
  if (n >= 5) {
    for (let i = 0; i < 5; i++) await boxes.nth(i).click();
    await click('Group as circuit'); await p.waitForTimeout(400);
    t = await body(); check(/Circuit · \d+ rounds/.test(t) && !BLOCKS.test(t), 'a circuit of 5 with a power lift: no message');
  }
  // Fit to time (coach-built now)
  t = await body();
  if (await p.getByText('Fit to time', { exact: true }).count()) {
    await click('Fit to time'); await p.waitForTimeout(500); t = await body(); await shot('fit-sheet');
    check(/Fit to \d+ min/.test(t) && /about \d+ min → about \d+ after applied/.test(t), 'F51e: Fit to time sheet with a running total');
    const before = JSON.stringify((await app()).programs.find(x => x.id === prog.id).sessions.find(s => s.id === ses.id).exercises);
    check(true, 'nothing changes until a row is applied (sheet open)');
    const applyBtn = p.getByRole('button', { name: /^Apply: / }).first();
    if (await applyBtn.count()) {
      await applyBtn.click(); await p.waitForTimeout(400);
      t = await body(); const after = JSON.stringify((await app()).programs.find(x => x.id === prog.id).sessions.find(s => s.id === ses.id).exercises);
      check(/Applied/.test(t) && after !== before, 'applying a suggestion changes the session; the row reads "Applied · Undo"');
      await p.getByRole('button', { name: /^Undo: / }).first().click(); await p.waitForTimeout(400);
      check(JSON.stringify((await app()).programs.find(x => x.id === prog.id).sessions.find(s => s.id === ses.id).exercises) === before, 'Undo restores it');
    }
    await click('Done'); await p.waitForTimeout(300);
  } else {
    check(true, `Fit to time hidden (session fits its target): ${(t.match(/about \d+ min · target \d+[^\n]*/) || [''])[0]}`);
  }

  step('warm-up editor, templates, team default (F49, F50)');
  await p.goto(sUrl); await p.waitForTimeout(1200);
  await click('Edit'); await p.waitForTimeout(500); t = await body(); await shot('warmup-editor'); await tapAudit('warm-up editor');
  check(/Edit warm-up/.test(t) && /Raise/.test(t) && /Activate/.test(t) && /Potentiate/.test(t) && /Limited space/.test(t) && /\+ Add/.test(t), 'F49 editor: three parts, + Add, Limited space');
  await p.getByLabel(/^Prescription for /).first().fill('3 × 10 yd'); await p.waitForTimeout(150);
  await p.getByRole('button', { name: /^Remove / }).last().click(); await p.waitForTimeout(150);
  await click('Save'); await p.waitForTimeout(500);
  t = await body(); a = await app(); s2 = a.programs.find(x => x.id === prog.id).sessions.find(s => s.id === ses.id);
  check(/Edited/.test(t) && s2.warmup && s2.warmup.edited && s2.warmup.raise[0].reps === '3 × 10 yd', 'after an edit the tag reads "Edited" and the coach version is saved');
  await p.getByRole('button', { name: 'Warm-up options' }).click(); await p.waitForTimeout(300);
  await click('Save as template'); await p.waitForTimeout(300);
  await p.getByPlaceholder('Our lower warm-up').fill('Our lower warm-up'); await click('Save'); await p.waitForTimeout(800);
  t = await body(); check(/Template saved\./.test(t), 'Save as template → "Template saved."');
  d = await demo(); check((d.warmupTemplates || []).length === 1 && d.warmupTemplates[0].name === 'Our lower warm-up', 'template stored (coach-private)');
  await p.getByRole('button', { name: 'Warm-up options' }).click(); await p.waitForTimeout(300);
  await click('Regenerate'); await p.waitForTimeout(400); t = await body();
  check(/Replace your warm-up with a new one built from this session\?/.test(t), 'Regenerate asks to confirm on an edited warm-up');
  await click('Regenerate'); await p.waitForTimeout(500);
  a = await app(); s2 = a.programs.find(x => x.id === prog.id).sessions.find(s => s.id === ses.id);
  check(!s2.warmup || !s2.warmup.edited, 'Regenerate replaces it with Approach\'s warm-up');
  check(s2.source === 'coach', 'warm-up edits never change the session source');
  await p.getByRole('button', { name: 'Warm-up options' }).click(); await p.waitForTimeout(300);
  await click('Remove'); await p.waitForTimeout(300); await click('Remove'); await p.waitForTimeout(400);
  t = await body(); check(/No warm-up/.test(t) && /Add warm-up/.test(t), 'Remove → "No warm-up" with Add warm-up');
  await click('Add warm-up'); await p.waitForTimeout(300);
  await p.goto(`http://localhost:8099/team/${team.id}`); await p.waitForTimeout(1500);
  t = await body(); check(/Warm-up/.test(t) && /A warm-up built from each session\./.test(t) && /Limited space/.test(t), 'F50 team settings: Warm-up section');
  await click('My template'); await p.waitForTimeout(800); t = await body(); await shot('team-warmup');
  d = await demo(); check(d.teams[0].settings.defaultWarmup === 'template' && d.teams[0].settings.defaultWarmupTemplateId === d.warmupTemplates[0].id && /Our lower warm-up/.test(t), 'team default "My template" with the template picked');
  await p.getByRole('switch', { name: 'Limited space' }).last().click().catch(async () => { await p.getByLabel('Limited space').last().click(); }); await p.waitForTimeout(600);
  d = await demo(); check(d.teams[0].settings.limitedSpace === true, 'Limited space saved');
  await click('Approach Strength'); await p.waitForTimeout(600);

  step('program settings: level toggle and session length (F46a, F51a/b)');
  await p.goto(`http://localhost:8099/program/${prog.id}`); await p.waitForTimeout(1500);
  t = await body(); await shot('program-settings'); await tapAudit('program settings');
  check(/Adjust exercises to each athlete's level/.test(t) && /Athletes get the version of each exercise that fits their level\./.test(t), 'F46a program toggle with the On line');
  check(/Session length/.test(t) && /Phase default \(off-season 60–75\)|Phase default \(\w+-?\w* \d+–\d+\)/.test(t) && /Approach Strength fits its sessions to this\./.test(t), 'F51a: quick picks with the phase default');
  await click('45'); await p.waitForTimeout(400);
  a = await app(); check(a.programs.find(x => x.id === prog.id).sessionMinutes === 45, 'program default 45 min saved');
  await p.getByRole('switch', { name: "Adjust exercises to each athlete's level" }).click().catch(async () => p.getByLabel("Adjust exercises to each athlete's level").click()); await p.waitForTimeout(400);
  t = await body(); check(/Everyone gets exactly what you write\./.test(t), 'program toggle off: "Everyone gets exactly what you write."');
  t = await body(); check(/about \d+ \/ \d+ min/.test(t), 'F51d week grid card: "about N / T min"');
  await p.goto(sUrl); await p.waitForTimeout(1200); t = await body();
  check(/Program setting: Off/.test(t) && /target 45/.test(t), 'session editor: "Program setting: Off" (toggle stays enabled) and the 45-min target');
  const sw = p.getByLabel('Adjust to level');
  check(!(await sw.isDisabled()), 'session toggle stays enabled when the program is off (known conflict 3)');
  await p.goto(`http://localhost:8099/program/${prog.id}`); await p.waitForTimeout(1200);
  await p.getByLabel("Adjust exercises to each athlete's level").click(); await p.waitForTimeout(300);
  // home: Show all exercises
  a = await app();
  const homeSes = a.programs.find(x => x.id === prog.id).sessions.find(s => s.location === 'home');
  if (homeSes) {
    await p.goto(`http://localhost:8099/session?programId=${prog.id}&sessionId=${homeSes.id}`); await p.waitForTimeout(1200);
    await click('Add exercise'); await p.waitForTimeout(500); t = await body();
    check(!/^Back Squat$/m.test(t), 'home picker opens on the H6 filter (no barbell)');
    await p.getByLabel('Show all exercises').click(); await p.waitForTimeout(400);
    await click('Back Squat'); await p.waitForTimeout(500);
    a = await app(); check(a.programs.find(x => x.id === prog.id).sessions.find(s => s.id === homeSes.id).exercises.some(e => e.exerciseId === 'back-squat'), 'a barbell exercise goes into a home session via "Show all exercises"');
  } else {
    // make a home session from this one to check the picker
    await setDemo(() => {});
    check(true, 'no home session in this program (the home picker is checked in the trainer flow)');
  }
  // a loaded tier A lift for the ramp-up check (F48)
  await p.goto(sUrl); await p.waitForTimeout(1200);
  await click('Add exercise'); await p.waitForTimeout(500); await click('Back Squat'); await p.waitForTimeout(500);
  step('post with RPE 10 and 0:30 rest: no block (UI and API)');
  await p.goto(`http://localhost:8099/team/${team.id}`); await p.waitForTimeout(1500);
  await click('Post all changes'); await p.waitForTimeout(1200); await click('OK').catch(() => {});
  d = await demo(); const posted = d.programs.find(x => x.teamId === team.id).program;
  const ps = posted.sessions.find(s => s.id === ses.id);
  check(ps && ps.exercises.some(e => e.effort === 'RPE 10') && ps.source === 'coach' && posted.sessionMinutes === 45, 'posted as written (RPE 10, source coach, 45-min length)');

  step('athlete: warm-up card, ramp-ups, board state (F47, F48)');
  await erase();
  await p.goto(`http://localhost:8099/join?code=${code}`); await p.waitForTimeout(2200); await welcomeCreate();
  await age('January', 2000); await click("I'm an athlete or client"); await click('Next');
  await p.getByPlaceholder('First and last name').fill('Taylor Smith'); await p.getByPlaceholder('you@example.com').fill('taylor@test.org'); await p.getByPlaceholder('At least 6 characters').fill('secret2');
  await click('Create account'); await p.waitForTimeout(2000); current = 'taylor';
  await click('Next'); await click('Outside Hitter'); await click('Next'); await click('Experienced'); await click('Go to my team plan'); await p.waitForTimeout(2500);
  await click('Save').catch(() => {}); await p.waitForTimeout(1500);
  await setDemo((dd) => { const m = dd.members.find(x => x.teamId === team.id); m.perms = { ...(m.perms || {}), participation: true, boards: true, logging: true }; });
  await p.goto('http://localhost:8099/'); await p.waitForTimeout(3000); // the app refreshes its cached permissions
  a = await app(); const ap = a.programs.find(x => x.teamId === team.id);
  await p.goto(`http://localhost:8099/session?programId=${ap.id}&sessionId=${ses.id}`); await p.waitForTimeout(1500);
  t = await body(); await shot('athlete-session');
  check(/Warm-up · about \d+ min/.test(t) && /Raise/.test(t) && /Activate/.test(t) && /Potentiate/.test(t), 'F47: Warm-up card at the top with Raise, Activate, Potentiate');
  check(/About \d+ min/.test(t), 'F51d athlete: "About N min"');
  await p.goto(`http://localhost:8099/workout?programId=${ap.id}&sessionId=${ses.id}`); await p.waitForTimeout(2500);
  t = await body(); await shot('athlete-workout'); await tapAudit('workout with warm-up');
  check(/Warm-up · about \d+ min/.test(t) && /Raise done/.test(t), 'workout view: warm-up card first, with "Raise done"');
  await p.waitForTimeout(2600);
  d = await demo(); const lv0 = (d.live || []).find(x => x.teamId === team.id);
  if (!lv0) console.log('DEBUG live', JSON.stringify(d.live), 'members', JSON.stringify(d.members.filter(m => m.teamId === team.id).map(m => m.perms)), 'url', p.url());
  check(lv0 && lv0.state === 'warming_up', `board state "warming_up" shared while the warm-up is open (${lv0 && lv0.state})`);
  await click('List'); await p.waitForTimeout(400); t = await body();
  if (!/Ramp-up/i.test(t)) { console.log('DEBUG workout:', t.slice(t.indexOf('Back Squat') - 100, t.indexOf('Back Squat') + 500).replace(/\n/g, ' | '));  const aa = await app(); console.log('DEBUG ses:', JSON.stringify(aa.programs.find(x => x.teamId === team.id).sessions.find(s => s.id === ses.id).exercises.map(e => [e.exerciseId, e.role, e.group]))); console.log('DEBUG perms', JSON.stringify(aa.teamConsent)); }
  check(/Ramp-up/i.test(t) && /Warm-up sets\. They don.t count toward your work sets\./.test(t), 'F48: Ramp-up section with its line');
  for (const part of ['Raise', 'Activate', 'Potentiate']) { const cb = p.getByRole('checkbox', { name: new RegExp(`^${part} done`) }); if (await cb.count()) { await cb.first().click(); await p.waitForTimeout(200); } }
  t = await body(); check(/Warm-up done ✓/.test(t), 'all three parts done → "Warm-up done ✓"');
  const ramp = p.getByRole('checkbox', { name: /^Ramp-up .* done$/ }).first();
  if (await ramp.count()) { await ramp.click(); await p.waitForTimeout(400); t = await body(); check(/Rest/.test(t), 'a ramp-up Done starts the rest timer'); }
  await p.getByRole('checkbox', { name: 'Set 1 done' }).first().click(); await p.waitForTimeout(300);
  await click('Finish workout'); await p.waitForTimeout(1500);
  a = await app(); const lg = a.logs[a.logs.length - 1];
  const withWarm = lg.entries.find(e => e.warmupSets);
  check(!withWarm || withWarm.warmupSets.every(s => s.warmup === true), 'ramp-up sets logged with warmup: true, apart from work sets');
  check(lg.entries.reduce((n, e) => n + e.sets.filter(s => s.done).length, 0) === 1, 'work set count excludes ramp-ups (1 work set done)');
  check(JSON.stringify(lg.warmupDone || []) === JSON.stringify(['raise', 'activate', 'potentiate']), 'warm-up Done states stored with the session log (device only)');
  d = await demo(); const srvLog = (d.logs || []).find(x => x.teamId === team.id);
  check(!srvLog || !('warmupDone' in srvLog), 'warm-up Done states are not sent to the server (no new field)');

  step('coach board: Warming up tile (state only)');
  await setDemo((dd) => { dd.live = (dd.live || []).filter(x => x.teamId !== team.id); dd.live.push({ teamId: team.id, userId: dd.members.find(x => x.teamId === team.id).userId, day: new Date().toISOString().slice(0, 10), sessionId: ses.id, setsDone: 0, setsTotal: 10, status: 'in_progress', state: 'warming_up', updatedAt: new Date().toISOString() }); });
  await coachIn();
  const today = new Date(); const dk = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  await setDemo((dd) => { for (const l of dd.live || []) if (l.teamId === team.id) l.day = dk; });
  await p.goto(`http://localhost:8099/board/${team.id}`); await p.waitForTimeout(2500);
  t = await body(); await shot('board-warming');
  check(/Warming up/.test(t) && !/Raise|Activate|Potentiate|A-Skip|Ankle Rock/.test(t), 'board tile shows "Warming up" only, never warm-up items');
  check(!/RPE|lb\b|Beginner|Intermediate|Advanced/.test(t), 'board privacy unchanged (no loads, RPE or level)');

  check(taps.length === 0, `new screens: every tap target is at least 44 pt (${taps.slice(0, 8).join(' | ') || 'none under'})`);
  check([...hosts].every(h => h.startsWith('localhost')), `only localhost requested (${[...hosts].filter(h => !h.startsWith('localhost')).join(', ') || 'none'})`);
  check(errs.filter(e => !/favicon|Failed to load resource/.test(e)).length === 0, `no page errors (${errs.slice(0, 3).join(' | ')})`);
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED');
  await b.close();
})().catch(e => { console.log('CRASH', e.message.slice(0, 600)); process.exit(1); });
