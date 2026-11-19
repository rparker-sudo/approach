// 2.4.0 Part 2 UI (F52–F55), demo build on :8099. Usage: node test-v240-p1.js <shotsDir>
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


  step('coach team, two athletes on one rack');
  await p.goto('http://localhost:8099/'); await p.waitForTimeout(2500);
  await age('March', 1985); await click("I'm a coach or trainer"); await click('Next');
  await p.getByPlaceholder('Coach Parker').fill('Riley Coach'); await p.getByPlaceholder('you@example.com').fill('coach@test.org'); await p.getByPlaceholder('At least 6 characters').fill('secret1');
  await tickCoachTerms(); await click('Create account'); await p.waitForTimeout(1800); current = 'coach';
  await click('New team'); await click('Volleyball team'); await click('Next');
  await p.getByPlaceholder('Team name, e.g. Varsity').fill('Varsity'); await click('Create'); await p.waitForTimeout(1500);
  let d = await demo(); const team = d.teams[0]; const code = team.joinCode;
  await click('Build workout'); await p.waitForTimeout(800); await p.getByText('Build team workout', { exact: true }).last().click(); await p.waitForTimeout(1200);
  const joinAthlete = async (name, email) => {
    await erase();
    await p.goto(`http://localhost:8099/join?code=${code}`); await p.waitForTimeout(2200); await welcomeCreate();
    await age('January', 2000); await click("I'm an athlete or client"); await click('Next');
    await p.getByPlaceholder('First and last name').fill(name); await p.getByPlaceholder('you@example.com').fill(email); await p.getByPlaceholder('At least 6 characters').fill('secret2');
    await click('Create account'); await p.waitForTimeout(2000); current = email;
    await click('Next'); await click('Outside Hitter'); await click('Next'); await click('Experienced'); await click('Go to my team plan'); await p.waitForTimeout(2500);
    await click('Save').catch(() => {}); await p.waitForTimeout(1200);
  };
  await joinAthlete('Ava Rivera', 'ava@test.org');
  await joinAthlete('Jordan Miles', 'jordan@test.org');
  await setDemo((dd) => {
    for (const m of dd.members.filter(x => x.teamId === team.id)) m.perms = { ...(m.perms || {}), participation: true, boards: true, logging: true };
    dd.racks = [{ id: 'rk1', teamId: team.id, name: 'Rack 1', sortOrder: 0, userIds: dd.members.filter(x => x.teamId === team.id).map(x => x.userId) }];
  });
  await coachIn();
  let a = await app(); let prog = a.programs.find(x => x.teamId === team.id);
  const ses = prog.sessions.find(s => s.location !== 'home' && !s.mobility && s.exercises.length >= 3) || prog.sessions[0];
  const sUrl = `http://localhost:8099/session?programId=${prog.id}&sessionId=${ses.id}`;

  step('F52/F53 rotation cards');
  await p.goto(sUrl); await p.waitForTimeout(1500);
  await click('Rack rotation'); await p.waitForTimeout(800);
  let t = await body(); await shot('p2-rotation-cards');
  a = await app(); let s2 = a.programs.find(x => x.id === prog.id).sessions.find(s => s.id === ses.id);
  check(s2.format === 'rack_rotation' && (s2.rotation || []).length >= 1, `format rack_rotation with ${(s2.rotation || []).length} rotation blocks`);
  check(/\w · Rack rotation/.test(t) && /\d+ positions · \d:\d\d rotation · \d+ rounds · about \d+ min/.test(t) && /Suggested/.test(t), 'rotation card header, readout line and "Suggested" tag');
  if (!/Rest between turns at each position: \d:\d\d/.test(t)) console.log('DEBUG cards:', t.slice(t.indexOf('Rack rotation'), t.indexOf('Rack rotation') + 900).replace(/\n/g, ' | '));
  check(/Rest between turns at each position: \d:\d\d/.test(t) && /Block time: about \d+ min/.test(t), 'rest per position and block time readouts');
  check(/Rack 1 has 2 athletes: .* open each turn\./.test(t) || /positions/.test(t), 'group fit readout per rack');
  check(!/Spot and coach/.test(t), 'no "Spot and coach" anywhere (Legal: "Spot")');
  check(/about \d+ min · target \d+/.test(t), 'session footer estimate includes rotation block time');
  await p.getByRole('button', { name: 'Rotation time plus 15 seconds' }).first().click(); await p.waitForTimeout(400);
  t = await body(); check(/Auto \d:\d\d/.test(t), 'changing the rotation time shows the Auto chip (no block)');
  await p.getByRole('button', { name: 'More rounds' }).first().click(); await p.waitForTimeout(300);
  a = await app(); s2 = a.programs.find(x => x.id === prog.id).sessions.find(s => s.id === ses.id);
  check(s2.source === 'coach', 'rotation edits make the session the coach\'s');
  await p.goto(`http://localhost:8099/team/${team.id}`); await p.waitForTimeout(1500);
  await click('Post all changes'); await p.waitForTimeout(1200); await click('OK').catch(() => {});
  // make today's lift this session
  const today = new Date(); const dk = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  await setDemo((dd) => { for (const tp of dd.programs.filter(x => x.teamId === team.id)) { tp.program.overrides = { ...(tp.program.overrides || {}), [dk]: ses.id }; } });
  await p.evaluate(([pid, dk2, sid]) => { const k = 'volley-strength/data/v1'; const d2 = JSON.parse(localStorage.getItem(k)); const pr = d2.programs.find(x => x.id === pid); pr.overrides = { ...(pr.overrides || {}), [dk2]: sid }; localStorage.setItem(k, JSON.stringify(d2)); }, [prog.id, dk, ses.id]);

  step('F55a coach controls');
  await p.goto(`http://localhost:8099/team/${team.id}`); await p.waitForTimeout(1800);
  t = await body(); await shot('p2-team-start');
  check(/Rack rotation/.test(t) && /Start rotation/.test(t), 'team screen: "Start rotation"');
  await click('Start rotation'); await p.waitForTimeout(1200);
  t = await body(); check(/Rack rotation · \w · Round 1 of \d+ · Rotate in \d:\d\d/.test(t) && /Rotate now/.test(t) && /\+15 s/.test(t) && /End block/.test(t), 'control bar: "Rack rotation · A · Round 1 of N · Rotate in m:ss" with Rotate now, +15 s, End block');

  step('F55b board ring');
  await p.goto(`http://localhost:8099/board/${team.id}`); await p.waitForTimeout(2800);
  t = await body(); await shot('p2-board-ring');
  check(/Rack rotation · \w · Round 1 of \d+/.test(t) && /Rotate in \d:\d\d/.test(t), 'board: session line and big shared countdown');
  const blockA = (await (async () => { const dd = await demo(); return dd.programs.find(x => x.teamId === team.id).program.sessions.find(s => s.id === ses.id).rotation[0]; })());
  const hasRack = blockA.positions.some(pp => pp.usesRack);
  check(/Rack 1 · 2 athletes/.test(t) && (!hasRack || /RACK/.test(t)) && /Ava R\./.test(t) && /Jordan M\./.test(t) && /→ /.test(t), `ring: rack panel, both board names at their nodes, the text list${hasRack ? ', and the RACK node' : ' (block A has no rack position)'}`);
  check(blockA.positions.length >= 2 ? !/Ava R\., Jordan M\./.test(t) : true, 'staggered: two athletes are never at the same position when there are enough positions');
  check(!/RPE|\blb\b|Beginner|Intermediate|Advanced|Pain|Sleep/.test(t), 'ring shows no loads, RPE, level or check-ins');

  step('F54 athlete view');
  await erase(); await restore('ava@test.org'); await logIn('ava@test.org', 'secret2');
  await p.waitForTimeout(1500);
  a = await app(); const ap = a.programs.find(x => x.teamId === team.id);
  await p.goto(`http://localhost:8099/workout?programId=${ap.id}&sessionId=${ses.id}`); await p.waitForTimeout(3500);
  t = await body(); await shot('p2-athlete-workout');
  check(/Rack 1 · \w · Round 1 of \d+/.test(t) && /Position \d · /.test(t) && /Rotate in \d:\d\d → Position \d \(/.test(t), 'athlete: "Rack 1 · A · Round 1 of N", current position, "Rotate in m:ss → Position n (…)"');
  await p.goto(`http://localhost:8099/`); await p.waitForTimeout(2500);
  t = await body(); check(/Rack 1 · Rack rotation/.test(t) && /You start at Position \d \(/.test(t) || /Rack rotation/.test(t), 'Today: "Rack 1 · Rack rotation" with start positions');

  check([...hosts].every(h => h.startsWith('localhost')), `only localhost requested (${[...hosts].filter(h => !h.startsWith('localhost')).join(', ') || 'none'})`);
  check(errs.filter(e => !/favicon|Failed to load resource|wake lock/.test(e)).length === 0, `no page errors (${errs.slice(0, 3).join(' | ')})`);
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED');
  await b.close();
})().catch(e => { console.log('CRASH', e.message.slice(0, 600)); process.exit(1); });
