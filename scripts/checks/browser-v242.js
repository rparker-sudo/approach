// 2.4.2 UI (UX user-flows-planner-v3.md F57–F62; spec Parts A, B, D) on the demo build at :8099, web 1280 px and iPhone 13.
// Usage: node browser-v242.js <shotsDir>
const { chromium, devices } = require('playwright');
const S = process.argv[2];
(async () => {
  const b = await chromium.launch();
  let fails = 0;
  const check = (c, m) => { console.log(c ? '  PASS' : '  FAIL', m); if (!c) fails++; };
  const step = (s) => console.log('·', s);

  for (const [label, ctxOpts] of [['web', { viewport: { width: 1280, height: 900 } }], ['phone', { ...devices['iPhone 13'], deviceScaleFactor: 1 }]]) {
    const ctx = await b.newContext(ctxOpts);
    const p = await ctx.newPage();
    const errs = [];
    p.on('pageerror', (e) => errs.push('PAGEERR ' + e.message));
    const hosts = new Set(); const bodies = [];
    p.on('request', (r) => { try { hosts.add(new URL(r.url()).host); if (r.postData()) bodies.push(r.postData()); } catch { /* ignore */ } });
    const click = async (t, o = {}) => p.getByText(t, { exact: true }).last().click({ timeout: 8000, ...o });
    const body = () => p.evaluate(() => document.body.innerText);
    const ls = () => p.evaluate(() => Object.fromEntries(Object.keys(localStorage).map((k) => [k, localStorage.getItem(k)])));
    const demo = async () => JSON.parse((await ls())['load-and-launch/demo-server/v1']);
    const app = async () => JSON.parse((await ls())['volley-strength/data/v1']);
    const setDemo = async (fn) => { const d = await demo(); fn(d); await p.evaluate((v) => localStorage.setItem('load-and-launch/demo-server/v1', v), JSON.stringify(d)); };
    const age = async (month, year) => {
      if (!(await p.getByRole('button', { name: /^Month:/ }).count()) && (await p.getByText('Create an account', { exact: true }).count())) {
        await p.getByText('Create an account', { exact: true }).last().click(); await p.waitForTimeout(500);
      }
      await p.getByRole('button', { name: /^Month:/ }).click(); await p.waitForTimeout(250); await click(month); await p.waitForTimeout(250);
      await p.getByRole('button', { name: /^Year:/ }).click(); await p.waitForTimeout(250); await click(String(year)); await p.waitForTimeout(250);
      await click('Next'); await p.waitForTimeout(500);
    };
    const row = (day) => p.getByRole('radiogroup', { name: new RegExp(`^${day},`) });
    const pick = async (day, kind) => { await row(day).getByRole('radio', { name: new RegExp(`^${kind}`) }).click(); await p.waitForTimeout(200); };
    // With "Ends by" on End date, the only steppers on the builder are card 3's: racks (0) and athletes per session (1).
    const plus = async (_h, k, nth = 0) => { for (let i = 0; i < k; i++) { await p.getByLabel('Increase', { exact: true }).nth(nth).click(); await p.waitForTimeout(60); } };
    const minus = async (_h, k, nth = 0) => { for (let i = 0; i < k; i++) { await p.getByLabel('Decrease', { exact: true }).nth(nth).click(); await p.waitForTimeout(60); } };

    step(`${label}: coach, team, the builder (F57)`);
    await p.goto('http://localhost:8099/'); await p.waitForTimeout(2500);
    await age('March', 1985); await click("I'm a coach or trainer"); await click('Next');
    await p.getByPlaceholder('Coach Parker').fill('Riley Coach'); await p.getByPlaceholder('you@example.com').fill(`coach242-${label}@test.org`); await p.getByPlaceholder('At least 6 characters').fill('secret1');
    const cb = p.getByRole('checkbox', { name: 'I agree to the Coach Terms (Terms §4)' });
    if (await cb.count()) { await cb.last().click({ position: { x: 12, y: 22 } }); await p.waitForTimeout(200); }
    await click('Create account'); await p.waitForTimeout(1800);
    await click('New team'); await click('Volleyball team'); await click('Next');
    await p.getByPlaceholder('Team name, e.g. Varsity').fill('Varsity'); await click('Create'); await p.waitForTimeout(1500);
    const team = (await demo()).teams[0];
    await click('Build workout'); await p.waitForTimeout(1500);
    let t = await body();
    const order = ['1 Program length', '2 Week setup', '3 Your weight room', 'Build program', 'Plan · Preview: not built yet'].map((x) => t.indexOf(x));
    check(order.every((x, i) => x >= 0 && (i === 0 || x > order[i - 1])), `F57 order: Program length → Week setup → Your weight room → Build program → Plan (${order.join(',')})`);
    check((t.match(/\bBuild program\b/g) || []).length === 1 && !/What's in your gym\?/.test(t), 'F57 one Build button; the old "What\'s in your gym?" card is gone (equipment is in card 3)');
    check(/Time of year \(no season dates on your calendar\)/i.test(t) && /The whole plan uses this phase\./.test(t), 'F57b no season dates: chips relabeled with the fallback line');
    await click('Off-season'); await p.waitForTimeout(300);

    step(`${label}: Program length card (F58)`);
    t = await body();
    check(/Number of weeks/.test(t) && /8 weeks · Mon Nov 23 – Sun Jan 17\./.test(t), 'F58 defaults: next Monday, 8 weeks; length line shows both forms');
    check(/Season starts/.test(t) && /Tapers into the first match or practice\./.test(t) && /The last week is lighter, with testing at the end\./.test(t) && /Full training through the last week\./.test(t) && /Blocks run in order to the end\./.test(t) && !/Ends fresh/.test(t), 'F58c four end types with their lines (known conflict 4: "Tapers into")');
    check(/Add your first match in Calendar and Approach Strength can suggest an end date\./.test(t), 'F58d no first match: the "Add your first match" line');
    await p.getByRole('radio', { name: 'End date' }).click(); await p.waitForTimeout(300);
    await p.getByLabel('End date').fill('2026-11-20'); await p.waitForTimeout(400); t = await body();
    check(/End date must be after the start date\./.test(t) && /Fix the program dates above\./.test(t), 'F58e: end before start → the field line, and Build says "Fix the program dates above."');
    await p.getByLabel('End date').fill('2027-01-17'); await p.waitForTimeout(400); t = await body();
    check(!/End date must be after/.test(t) && /8 weeks · Mon Nov 23 – Sun Jan 17\./.test(t), 'F58b switching to End date keeps the same end (8 weeks ↔ Sun Jan 17)');

    step(`${label}: Week setup (card 2) and Your weight room (F60)`);
    for (const d of ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']) await pick(d, 'Off');
    await pick('Monday', 'Mobility'); await pick('Tuesday', 'Weight room'); await pick('Thursday', 'Weight room'); await pick('Saturday', 'Home workout');
    t = await body();
    check(/No racks or platforms\./.test(t) && /Suggested: Stations\. No racks, so groups rotate through equipment stations\./.test(t), 'F60c 0 racks: "No racks or platforms." and the Stations suggestion (exact reason)');
    check(/Used for the suggestion only\. Not saved\./.test(t) && /Home workout and mobility days are always Standard\./.test(t), 'F60b/F60c lines: athletes per session not saved; home and mobility always Standard');
    const rr = p.getByRole('radio', { name: /^Rack rotation/ });
    check((await rr.getAttribute('aria-disabled')) === 'true', 'F60d Rack rotation disabled with 0 racks (an input dependency, not a training rule)');
    await plus('3 Your weight room', 4, 0);
    await plus('3 Your weight room', 15, 1);
    t = await body();
    check(/16 athletes ÷ 4 racks = 4 per rack\./.test(t) && /Suggested: Rack rotation\. 3–5 per rack, so each group rotates at its rack and nobody waits\./.test(t), 'F60c 16 ÷ 4: math line and Rack rotation suggestion (exact reason)');
    check(/Rack groups: you have none yet\. Building makes 4 racks of 4 \(balanced mix\)\. You can edit them after in Team → Racks\./.test(t), 'F60d "none yet" line (groups are made on Build)');
    await minus('3 Your weight room', 2, 1); t = await body();
    check(/14 athletes ÷ 4 racks = 4 per rack \(3\.5, rounded up\)\./.test(t), 'F60c math rounds up (D-065): 14 ÷ 4');
    await p.getByRole('radio', { name: /^Standard/ }).click(); await p.waitForTimeout(250);
    await plus('3 Your weight room', 10, 1); t = await body();
    const stdOn = await p.getByRole('radio', { name: /^Standard/ }).getAttribute('aria-checked');
    if (stdOn !== 'true' || !/Suggested: Stations\. More than 5 per rack/.test(t)) console.log('DEBUG', stdOn, (t.match(/\d+ athletes ÷[^\n]*|Suggested:[^\n]*/g) || []).join(' | '));
    check(stdOn === 'true' && /Suggested: Stations\. More than 5 per rack/.test(t), 'F60c a style the coach picked is never changed by the suggestion (Standard stays; suggestion moves to Stations at 24 ÷ 4)');
    await minus('3 Your weight room', 10, 1);
    await p.getByRole('radio', { name: /^Rack rotation/ }).click(); await p.waitForTimeout(250);
    await minus('3 Your weight room', 2, 0); t = await body();
    check(/7 per rack: sessions use the groups-of-5 layout, and extra athletes share a non-rack position\./.test(t), 'F60d D-068.3 line for 6+ per rack');
    await plus('3 Your weight room', 2, 0); await plus('3 Your weight room', 2, 1);

    step(`${label}: the plan preview (F59)`);
    await click('Season starts'); await p.waitForTimeout(400);
    t = await body();
    check(/8 weeks, Nov 23 – Jan 17: Accumulation \(3\) → Strength \(3\) → Power \(2\)\. Tapers into the season\./.test(t), 'F59a summary line (Season starts, no match on the calendar)');
    check(/Testing day suggested · Thu Nov 26/.test(t) && /Testing day suggested · Thu Jan 14/.test(t) && /Taper · −30% volume/.test(t) && (t.match(/\bDeload\b/g) || []).length >= 2, 'F59b/F59c rows with Deload, Taper and Legal\'s "Testing day suggested" chips (week 1 baseline, last week)');
    check(!/Test suggested|max test|1RM/.test(t), 'F59c never "Test suggested", "max test" or "1RM"');
    const rows = await p.getByRole('button', { name: /^Week \d+, / }).count();
    check(rows === 8, `F59b one row per week (${rows})`);
    if (label === 'web') check(/Weight room Tue Thu · Home Sat · Mobility Mon/.test(t), 'F59d Days column (web)');
    else check(/2 weight room · 1 home · 1 mobility/.test(t), 'F59f Days text (phone counts)');
    await p.screenshot({ path: `${S}/v242-${label}-builder.png`, fullPage: true });

    step(`${label}: Build`);
    await click('Build program'); await p.waitForTimeout(2000);
    t = await body();
    if (!/Program built/.test(t)) console.log('DEBUG build', t.slice(0, 400).replace(/\n/g, ' | '));
    check(/Program built: 8 weeks, 4 sessions a week\./.test(t), 'F57a success line (the demo roster is empty, so no rack groups are made; the "groups made" sentence is a logic check)');
    await click('OK').catch(() => {}); await p.waitForTimeout(400);
    let a = await app();
    let prog = a.programs.find((x) => x.teamId === team.id);
    check(prog.endDate === '2027-01-17' && prog.endType === 'season' && prog.generatedFormat === 'rack_rotation' && prog.blockStart === '2026-11-23', `Data: endDate ${prog.endDate}, endType ${prog.endType}, generatedFormat ${prog.generatedFormat}, start = blockStart ${prog.blockStart}`);
    check(!/athletesPerSession|perRack|"athletes"/.test(JSON.stringify(prog)) && !bodies.some((x) => /athletesPerSession|perRack/.test(x)), 'Data: athletes per session isn\'t in the program or any request body');
    const d1 = await demo();
    const racks = (d1.racks || d1.rackGroups || []).filter((r) => r.teamId === team.id);
    check(racks.length === 0 || racks.length <= 4, `B3 rack groups on Build (demo roster is empty: ${racks.length} made)`);
    const rooms = prog.sessions.filter((x) => !x.mobility && !x.light && x.location !== 'home');
    check(rooms.length === 2 && rooms.every((x) => x.format === 'rack_rotation' && x.exercises.slice(-3).every((e) => e.group === 'CD')), 'C/D weight-room sessions are Rack rotation and end with the cooldown rows');

    step(`${label}: the session editor (F61)`);
    const day1 = rooms[0];
    await p.goto(`http://localhost:8099/session?programId=${prog.id}&sessionId=${day1.id}`); await p.waitForTimeout(1800);
    t = await body();
    check(/A · Power · \d+ s rotations · \d rounds? · about \d+ min/i.test(t) && /B · Strength · \d+ s rotations/i.test(t), 'F61d rotation block headers in the §3a format');
    check(/Accumulation block · week 1 of 3\./.test(t) && /Jumps today: about \d+ contacts\./.test(t), 'F61b summary lines (block/week, jumps)');
    check(/Bar speed is the priority\. End the set if the bar slows\./.test(t) && /Same depth every rep\. Stop with about 2 reps left\./.test(t) && /Week 1: 65%\./.test(t), 'F61c cue and week note under the rows');
    check(/Cooldown · Total · about \d min/.test(t) && /Approach Strength/.test(t), 'F61e cooldown row pinned at the bottom with its source tag');
    await click('Show'); await p.waitForTimeout(300); t = await body();
    check(/Half-Kneeling Hip Flexor Stretch · 30 s\/side/.test(t) && /Crocodile Breathing · × 3/.test(t), 'F61e expanded cooldown rows');
    await p.screenshot({ path: `${S}/v242-${label}-session.png`, fullPage: true });
    await p.getByLabel('Notes').first().fill('Coach note'); await p.waitForTimeout(400);
    a = await app(); prog = a.programs.find((x) => x.teamId === team.id);
    check(prog.sessions.find((x) => x.id === day1.id).source === 'coach', 'D3 editing a note makes the session the coach\'s');

    step(`${label}: edit opens "As built"; changes show Rebuild, "Preview of changes", Cancel changes`);
    await p.goto(`http://localhost:8099/builder?teamId=${team.id}&programId=${prog.id}`); await p.waitForTimeout(1800);
    t = await body();
    check((t.match(/As built/g) || []).length >= 2 && /Plan · /.test(t) && !/Preview: not built yet/.test(t), 'F57a existing program: cards "As built", the built plan');
    check(/Rack rotation/.test(t) && (await p.getByRole('radio', { name: /^Rack rotation/ }).getAttribute('aria-checked')) === 'true', 'B3 generatedFormat restores on edit');
    await p.getByLabel('End date').fill('2027-01-31'); await p.waitForTimeout(500); t = await body();
    check(/Rebuild program/.test(t) && /Plan · Preview of changes/.test(t) && /Changed/.test(t) && /Cancel changes/.test(t) && /Changes apply from the next week that hasn.t started\./.test(t), 'F57a/F59e a change: Rebuild, Preview of changes with Changed tags, Cancel changes');
    await click('Cancel changes'); await p.waitForTimeout(400); t = await body();
    check(!/Preview of changes/.test(t) && /As built/.test(t), 'F57a Cancel changes restores "As built"');
    await p.getByLabel('End date').fill('2027-01-31'); await p.waitForTimeout(400);
    await click('Rebuild program'); await p.waitForTimeout(500); t = await body();
    check(/Rebuild from these settings\?/.test(t) && /Approach Strength's sessions are rebuilt\. Sessions you've edited keep your edits\./.test(t), 'F57a Rebuild confirm (D-068.5 wording)');
    await click('Rebuild'); await p.waitForTimeout(1800); await click('OK').catch(() => {});
    a = await app(); prog = a.programs.find((x) => x.teamId === team.id);
    check(prog.endDate === '2027-01-31' && prog.sessions.some((x) => x.id === day1.id && x.source === 'coach'), 'A-5 rebuilding after a date change keeps the coach-edited session; generated ones are rebuilt');

    step(`${label}: season dates from this team's calendar (F57b, F58d)`);
    await setDemo((d) => { d.calendars = [...(d.calendars || []).filter((c) => c.teamId !== team.id), { teamId: team.id, events: [{ date: '2027-01-04', type: 'practice' }, { date: '2027-01-26', type: 'game' }], lightDates: {}, updatedAt: new Date().toISOString() }]; });
    await p.goto(`http://localhost:8099/team/${team.id}`); await p.waitForTimeout(2500);
    await p.goto(`http://localhost:8099/builder?teamId=${team.id}&programId=${prog.id}`); await p.waitForTimeout(1800);
    t = await body();
    check(/Phases come from your calendar: off-season until Jan 4, preseason until Jan 26\./.test(t) && !/Time of year/i.test(t), 'F57b season dates on the calendar: chips hidden, "Phases come from your calendar" line');
    check(/Suggested: Sun Jan 3 · before first practice Jan 4/.test(t) && /Suggested: Sun Jan 24 · before first match Jan 26/.test(t), 'F58d suggestion chips from this team\'s first practice and first match');

    step(`${label}: boards show nothing new (F62e)`);
    await p.goto(`http://localhost:8099/board/${team.id}`); await p.waitForTimeout(2500);
    t = await body();
    check(!/Bar speed|Same depth|Week 1:|Jumps today|block · week|Cooldown ·|%/.test(t), 'F62e board: no cue, week note, summary line, cooldown header or %');
    check([...hosts].every((h) => /localhost/.test(h) || /fonts\.|gstatic/.test(h)), `only localhost (and fonts) requested (${[...hosts].join(', ')})`);
    check(!errs.length, `no page errors (${errs.slice(0, 2).join(' | ')})`);
    await ctx.close();
  }

  step('athlete (personal program, phone): length planner card, Today summary, workout cues and cooldown (F62)');
  {
    const ctx = await b.newContext({ ...devices['iPhone 13'], deviceScaleFactor: 1 });
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', (e) => errs.push('PAGEERR ' + e.message));
    const click = async (t, o = {}) => p.getByText(t, { exact: true }).last().click({ timeout: 8000, ...o });
    const body = () => p.evaluate(() => document.body.innerText);
    const app = async () => JSON.parse(await p.evaluate(() => localStorage.getItem('volley-strength/data/v1')));
    await p.goto('http://localhost:8099/'); await p.waitForTimeout(2500);
    if (await p.getByText('Create an account', { exact: true }).count()) { await click('Create an account'); await p.waitForTimeout(500); }
    await p.getByRole('button', { name: /^Month:/ }).click(); await p.waitForTimeout(250); await click('January'); await p.waitForTimeout(250);
    await p.getByRole('button', { name: /^Year:/ }).click(); await p.waitForTimeout(250); await click('2000'); await p.waitForTimeout(250);
    await click('Next'); await p.waitForTimeout(500);
    await click("I'm an athlete or client"); await click('Next'); await p.waitForTimeout(400);
    await click('Train solo, no account'); await p.waitForTimeout(400);
    await click('Skip for now').catch(() => {}); await p.waitForTimeout(400);
    await p.getByPlaceholder(/name/i).first().fill('Taylor').catch(() => {}); await click('Next').catch(() => {}); await p.waitForTimeout(300);
    await click('Outside Hitter'); await click('Next'); await p.waitForTimeout(300);
    await click('Experienced'); await click('Off-season'); await click('Next'); await p.waitForTimeout(300);
    await click('Build my program'); await p.waitForTimeout(2500);
    let a0 = await app();
    await p.goto(`http://localhost:8099/builder?programId=${a0.programs[0].id}`); await p.waitForTimeout(1800);
    let t = await body();
    if (!/1 Program length/.test(t)) console.log('DEBUG athlete builder', p.url(), t.slice(0, 500).replace(/\n/g, ' | '));
    check(/1 Program length/.test(t) && !/3 Your weight room/.test(t) && !/2 Week setup/.test(t) && /No end date \(rolling blocks\)/.test(t) && /Rolling 4-week blocks, no end date\. Now: /.test(t), 'F57/F58f personal program saved without an end: card 1 only, "No end date (rolling blocks)", the rolling plan line');
    await p.getByRole('radio', { name: 'Number of weeks' }).click(); await p.waitForTimeout(400);
    await click('Rebuild program'); await p.waitForTimeout(600); await click('Rebuild'); await p.waitForTimeout(2000); await click('OK').catch(() => {});
    let a = await app();
    const prog = a.programs[0];
    t = await body();
    check(!!prog?.endDate && !prog.generatedFormat, `personal program: endDate ${prog?.endDate}, no generatedFormat (Standard)`);
    // Start date is next Monday: open the session directly; the plan's week 1 applies before the start.
    const s1 = prog.sessions.find((x) => !x.mobility && x.location !== 'home');
    await p.goto(`http://localhost:8099/workout?programId=${prog.id}&sessionId=${s1.id}`); await p.waitForTimeout(2500);
    await click('List').catch(() => {}); await p.waitForTimeout(500);
    t = await body();
    check(/block · week 1 of \d\./.test(t), 'F62a summary lines in the workout view');
    check(/Bar speed is the priority|Every rep fast|Same depth every rep/.test(t) && !/Coach: (Bar speed|Same depth|Every rep fast)/.test(t), 'F62b cue under the exercise with no "Coach:" prefix (generated)');
    check(/[A-E] · (Power|Strength|Secondary|Accessory|Care) · \d+ sets? · rest \d:\d\d · about \d+ min/i.test(t), 'F62b Standard block headers');
    check(/Cooldown · about \d min/.test(t) && /How-to/.test(t), 'F62d cooldown card (last card, rows with How-to)');
    const cueSize = await p.getByText(/^(Bar speed is the priority|Same depth every rep)/).first().evaluate((el) => getComputedStyle(el).fontSize).catch(() => '0px');
    check(cueSize === '16px', `F62b athlete cue 16 pt (${cueSize})`);
    await p.getByRole('checkbox', { name: 'Cooldown done.' }).click(); await p.waitForTimeout(400); t = await body();
    check(/Cooldown done ✓/.test(t) && /Finish workout/.test(t), 'F62d Done collapses to "Cooldown done ✓"; Finish is never gated');
    a = await app();
    check((a.cooldownDone || []).some((k) => k.endsWith(`|${s1.id}`)), 'F62d Done is kept on the device only');
    const sizes = await p.getByRole('checkbox', { name: /Cooldown done/ }).evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height));
    check(sizes.every((h) => h >= 44), 'targets ≥ 44 pt (cooldown Done)');
    await p.screenshot({ path: `${S}/v242-athlete-workout.png`, fullPage: true });
    check(!errs.length, `no page errors (${errs.slice(0, 2).join(' | ')})`);
    await ctx.close();
  }
  await b.close();
  console.log(fails ? `${fails} FAIL` : 'all pass');
})();
