// 2.4.1 UI: Week setup card (UX F56, F56i) and the v3 week it builds (spec Part D). Demo build on :8099.
// Usage: node browser-v241.js <shotsDir>
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
    const click = async (t, o = {}) => p.getByText(t, { exact: true }).last().click({ timeout: 8000, ...o });
    const body = () => p.evaluate(() => document.body.innerText);
    const ls = () => p.evaluate(() => Object.fromEntries(Object.keys(localStorage).map((k) => [k, localStorage.getItem(k)])));
    const demo = async () => JSON.parse((await ls())['load-and-launch/demo-server/v1']);
    const app = async () => JSON.parse((await ls())['volley-strength/data/v1']);
    const age = async (month, year) => {
      if (!(await p.getByRole('button', { name: /^Month:/ }).count()) && (await p.getByText('Create an account', { exact: true }).count())) {
        await p.getByText('Create an account', { exact: true }).last().click(); await p.waitForTimeout(500);
      }
      await p.getByRole('button', { name: /^Month:/ }).click(); await p.waitForTimeout(250); await click(month); await p.waitForTimeout(250);
      await p.getByRole('button', { name: /^Year:/ }).click(); await p.waitForTimeout(250); await click(String(year)); await p.waitForTimeout(250);
      await click('Next'); await p.waitForTimeout(500);
    };
    const row = (day) => p.getByRole('radiogroup', { name: new RegExp(`^${day},`) });
    const pick = async (day, kind) => { await row(day).getByRole('radio', { name: new RegExp(`^${kind}`) }).click(); await p.waitForTimeout(250); };

    step(`${label}: coach, team, builder shows the Week setup card`);
    await p.goto('http://localhost:8099/'); await p.waitForTimeout(2500);
    await age('March', 1985); await click("I'm a coach or trainer"); await click('Next');
    await p.getByPlaceholder('Coach Parker').fill('Riley Coach'); await p.getByPlaceholder('you@example.com').fill(`coach-${label}@test.org`); await p.getByPlaceholder('At least 6 characters').fill('secret1');
    const cb = p.getByRole('checkbox', { name: 'I agree to the Coach Terms (Terms §4)' });
    if (await cb.count()) { await cb.last().click({ position: { x: 12, y: 22 } }); await p.waitForTimeout(200); }
    await click('Create account'); await p.waitForTimeout(1800);
    await click('New team'); await click('Volleyball team'); await click('Next');
    await p.getByPlaceholder('Team name, e.g. Varsity').fill('Varsity'); await click('Create'); await p.waitForTimeout(1500);
    const team = (await demo()).teams[0];
    await click('Build workout'); await p.waitForTimeout(1200);
    await click('Off-season'); await p.waitForTimeout(300);
    let t = await body();
    check(/Week setup/.test(t) && (await p.getByRole('radiogroup').count()) === 7, 'F56: the card with 7 day rows');
    check(!/Weight room only|Weight room \+ home|Training days per week/.test(t), 'F56i: the old chips, Weight room days row and Training days stepper are gone');
    const labels = await row('Monday').getByRole('radio').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
    check(JSON.stringify(labels.map((l) => l.replace(', selected', ''))) === JSON.stringify(['Off', 'Weight room', 'Home workout', 'Mobility']), `F56c segmented choice with full screen-reader names (${labels.join(' · ')})`);
    const segText = await row('Saturday').innerText();
    check(label === 'phone' ? /\bHome\b/.test(segText) && !/Home workout/.test(segText) : /Home workout/.test(segText), `F56${label === 'phone' ? 'b phone label "Home"' : 'a web label "Home workout"'}`);
    check(/Session length: about \d+ min/.test(t) && /Jumps at home/.test(t), 'F56i: Session length and Jumps at home live on the card');

    step(`${label}: the founder's week (Mon Mobility, Tue/Thu Weight room, Sat Home workout)`);
    for (const d of ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']) await pick(d, 'Off');
    t = await body();
    check(/No training days set\./.test(t) && /Pick at least one day\./.test(t), 'F56f all Off: "Pick at least one day." and Build disabled');
    await pick('Monday', 'Mobility'); await pick('Tuesday', 'Weight room'); await pick('Thursday', 'Weight room'); await pick('Saturday', 'Home workout');
    t = await body();
    check(/2 weight room \+ 1 home workout \+ 1 mobility day\./.test(t), 'F56e week line');
    const sizes = await p.getByRole('radio').evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; }));
    check(sizes.every(([w, h]) => h >= 44 && w >= 56), `F56h segments ≥ 44 pt tall and ≥ 56 wide (${sizes.length} segments)`);
    await p.screenshot({ path: `${S}/v241-${label}-card.png`, fullPage: true });

    step(`${label}: Recommend fills Off days only, tags them, Undo restores`);
    const chosen = () => p.getByRole('radio').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')).filter((l) => /, selected$/.test(l)));
    const before = await chosen();
    await click(label === 'web' ? 'Recommend for me' : 'Recommend'); await p.waitForTimeout(500);
    t = await body();
    const after = await chosen();
    const kept = before.every((v, i) => v.startsWith('Off') || v === after[i]);
    check(before.length === 7 && after.length === 7 && kept && /Recommended \d/.test(t) && /Recommended/.test(t) && after.some((v) => v.startsWith('Off')), `F56d Recommend changes Off days only and keeps a day off (${after.map((x) => x.replace(', selected', '')).join(' · ')})`);
    await click('Undo'); await p.waitForTimeout(300);
    const undone = await chosen();
    check(JSON.stringify(undone) === JSON.stringify(before), 'F56d Undo restores the exact previous choices');

    step(`${label}: build; the program is the founder's week`);
    await click('Build program'); await p.waitForTimeout(1500);
    let a = await app();
    let prog = a.programs.find((x) => x.teamId === team.id);
    const s = (i) => prog.sessions.find((x) => x.id === prog.liftSchedule[i]);
    check(!!prog && prog.liftSchedule.filter(Boolean).length === 4 && s(0)?.mobility && s(0)?.location === 'home' && !s(1)?.location && !s(3)?.location && s(5)?.name === 'Home Upper', `Part D: 4 sessions as set (${prog?.liftSchedule.map((x, i) => s(i)?.name ?? '-').join(' | ')})`);
    check(!prog.sessions.some((x) => x.location === 'home' && /^Day \d/.test(x.name)), 'Part D: no gym session relabeled as home');

    step(`${label}: edit opens "As built"; a change shows Rebuild with its confirm`);
    await p.goto(`http://localhost:8099/builder?teamId=${team.id}&programId=${prog.id}`); await p.waitForTimeout(1500);
    t = await body();
    check(/As built/.test(t) && /Rebuild program/.test(t), 'F56f existing program opens "As built"');
    await pick('Wednesday', 'Home workout'); t = await body();
    check(/Changes apply from the next week that hasn.t started\./.test(t) && /Cancel changes/.test(t), 'F56f a change shows the next-week line and Cancel changes');
    await click('Rebuild program'); await p.waitForTimeout(500); t = await body();
    check(/Rebuild the week from these days\?/.test(t) && /Sessions you.ve edited keep your edits\./.test(t), 'F56f Rebuild asks to confirm');
    await click('Rebuild'); await p.waitForTimeout(1500);
    a = await app(); prog = a.programs.find((x) => x.teamId === team.id);
    check(prog.sessions.find((x) => x.id === prog.liftSchedule[2])?.name === 'Home Upper' && prog.sessions.find((x) => x.id === prog.liftSchedule[5])?.name === 'Home Lower', 'Part D: rebuild with a second home day → Wed Home Upper, Sat Home Lower');
    check(!errs.length, `no page errors (${errs.slice(0, 2).join(' | ')})`);
    await ctx.close();
  }
  await b.close();
  console.log(fails ? `${fails} FAIL` : 'all pass');
  process.exit(fails ? 1 : 0);
})();
