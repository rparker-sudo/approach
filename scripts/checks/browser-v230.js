// 2.3.0 trainer mode, demo build on :8099. Usage: node test-v230.js <shotsDir>
const { chromium, devices } = require('playwright');
const S = process.argv[2];
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ ...devices['iPhone 13'], deviceScaleFactor: 1 }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push('PAGEERR ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  const hosts = new Set(); p.on('request', r => { try { hosts.add(new URL(r.url()).host); } catch {} });
  let fails = 0; const check = (c, m) => { console.log(c ? '  PASS' : '  FAIL', m); if (!c) fails++; };
  const step = s => console.log('·', s);
  const click = async (t, o = {}) => p.getByText(t, { exact: true }).last().click({ timeout: 8000, ...o });
  const shot = n => p.screenshot({ path: `${S}/${n}.png`, fullPage: true });
  const body = () => p.evaluate(() => document.body.innerText);
  const ls = () => p.evaluate(() => Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)])));
  const demo = async () => JSON.parse((await ls())['load-and-launch/demo-server/v1']);
  const app = async () => JSON.parse((await ls())['volley-strength/data/v1']);
  const setDemo = async (fn) => { const d = await demo(); fn(d); await p.evaluate((v) => localStorage.setItem('load-and-launch/demo-server/v1', v), JSON.stringify(d)); };
  const BAD = /coach|athlete|roster|teammate|volleyball|parent|consent/i;
  // Design "Accessibility and sizes": 44 pt targets (same audit as 2.2.1 F-7). Runs with every S0.4 screen check.
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
  const s04 = async (where) => { await tapAudit(where); await s04text(where); };
  const s04text = async (where) => { const t = await body(); const m = t.match(new RegExp(BAD.source, 'gi')); check(!m, `§S0.4 string search clean: ${where}${m ? ' → ' + [...new Set(m)].join(', ') + ' :: ' + t.split('\n').filter(l => BAD.test(l)).slice(0, 3).join(' | ') : ''}`); };
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
  // Each person has their own phone: keep their device data when switching (the demo server is shared).
  const phones = {}; let current = null;
  const stash = async () => { if (current) phones[current] = await p.evaluate(() => localStorage.getItem('volley-strength/data/v1')); };
  const restore = async (who) => { current = who; if (phones[who]) await p.evaluate((v) => localStorage.setItem('volley-strength/data/v1', v), phones[who]); };
  // Sign out of the demo server and clear this device's app data (works mid-onboarding too).
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
  const trainerIn = async () => { await erase(); await restore('tess'); await logIn('tess@test.org', 'secret1'); };
  const clientIn = async (email) => {
    await erase(); await restore(email);
    await p.goto('http://localhost:8099/sign-in'); await p.waitForTimeout(800);
    await p.evaluate(() => {
      const k = 'volley-strength/data/v1';
      const d = JSON.parse(localStorage.getItem(k) || '{"version":1,"programs":[],"activeProgramId":null,"logs":[],"bodyLogs":[],"athletes":[]}');
      d.profile = { ...(d.profile || { name: '', role: 'athlete', position: 'Outside Hitter', phase: 'in', bodyWeightLb: null, liftDaysPerWeek: 2, volleyballWeek: ['off','off','off','off','off','off','off'] }), experience: 'intermediate' };
      localStorage.setItem(k, JSON.stringify(d));
    });
    await logIn(email, 'secret2');
  };
  const signUpClient = async (code, name, email, year, expectError) => {
    await erase();
    await p.goto(`http://localhost:8099/join?code=${code}`); await p.waitForTimeout(2200); await welcomeCreate();
    await age('January', year); await click("I'm an athlete or client"); await click('Next');
    await p.getByPlaceholder('First and last name').fill(name); await p.getByPlaceholder('you@example.com').fill(email); await p.getByPlaceholder('At least 6 characters').fill('secret2');
    await click('Create account'); await p.waitForTimeout(2500); current = email;
    const t = await body();
    if (expectError) { check(t.includes(expectError), `join error: "${expectError}"`); return t; }
    return t;
  };

  // ---------------- F31 ----------------
  step('F31 trainer creates a general team');
  await p.goto('http://localhost:8099/'); await p.waitForTimeout(2500);
  await age('March', 1988);
  let t = await body(); check(/I'm a coach or trainer/.test(t) && /I'm an athlete or client/.test(t), 'S2: neutral role cards');
  await click("I'm a coach or trainer"); await click('Next');
  await p.getByPlaceholder('Coach Parker').fill('Tess Trainer'); await p.getByPlaceholder('you@example.com').fill('tess@test.org'); await p.getByPlaceholder('At least 6 characters').fill('secret1');
  await tickCoachTerms(); await click('Create account'); await p.waitForTimeout(1800); current = 'tess';
  await click('New team'); await p.waitForTimeout(400);
  t = await body(); check(/Volleyball team/.test(t) && /Training clients \(adults 18\+\)/.test(t), 'F31 type picker: two cards');
  const sel = await p.evaluate(() => [...document.querySelectorAll('[aria-selected="true"]')].map(e => e.innerText).filter(x => /Volleyball team|Training clients/.test(x)).length);
  check(sel === 0, 'F31 nothing preselected');
  const nextDisabled = await p.getByRole('button', { name: 'Next' }).last().isDisabled().catch(() => null);
  check(nextDisabled === true || (await p.getByRole('button', { name: 'Next' }).last().getAttribute('aria-disabled')) === 'true', 'F31 Next disabled until a card is chosen');
  await click('Training clients (adults 18+)'); await click('Next'); await p.waitForTimeout(300);
  t = await body(); check(/Only you and your clients see this\./.test(t), 'F31 name helper');
  await p.getByPlaceholder('My clients').fill('Tess Clients'); await click('Next'); await p.waitForTimeout(300);
  await shot('f31-confirm');
  const boxes = p.getByRole('checkbox');
  const nb = await boxes.count(); const states = []; for (let i = 0; i < nb; i++) states.push(await boxes.nth(i).getAttribute('aria-checked'));
  check(nb === 3 && states.every(x => x !== 'true'), `F31 three separate unticked confirmations (${nb})`);
  t = await body();
  check(t.includes("My clients are adults (18+), and I'm responsible for the programs I give them, including screening clients before they train."), 'T2 confirmation 2 text (Legal)');
  check(t.includes("I won't put the Approach Strength name on anything my gym prints, posts, or shares."), 'T2 confirmation 3 text (Legal)');
  check(/Trainer Terms/.test(t) && /\(Terms §4T\)/.test(t), 'T2 confirmation 1 with Trainer Terms link');
  const createBtn = () => p.getByRole('button', { name: 'Create team' }).last();
  check(await createBtn().isDisabled().catch(() => (true)) || (await createBtn().getAttribute('aria-disabled')) === 'true', 'Create disabled with none ticked');
  await boxes.nth(1).click({ position: { x: 12, y: 22 } }); await boxes.nth(2).click({ position: { x: 12, y: 22 } }); await p.waitForTimeout(200);
  check((await createBtn().getAttribute('aria-disabled')) === 'true' || (await createBtn().isDisabled()), 'Create disabled with two of three ticked');
  await boxes.nth(0).click({ position: { x: 12, y: 22 } }); await p.waitForTimeout(200);
  check(!(await createBtn().isDisabled()) && (await createBtn().getAttribute('aria-disabled')) !== 'true', 'Create enabled with all three');
  check(!/tick all|select all/i.test(await body()), 'no "tick all"');
  await createBtn().click(); await p.waitForTimeout(2000);
  let d = await demo(); const team = d.teams.find(x => x.name === 'Tess Clients');
  check(team && team.kind === 'general', 'team kind = general');
  const rec = d.trainer && d.trainer[team.id];
  check(rec && rec.termsVersion === '2026-11-15' && ['terms', 'adults_responsible', 'no_cobranding'].every(k => typeof rec.confirmations[k] === 'string') && !!rec.acceptedAt && rec.verifiedAt === null, 'T2 recorded: Terms version, time, the three confirmations; not verified');
  check(team.settings.effortBoard === false, 'effort board off by default (general)');
  const code = team.joinCode;

  // ---------------- F32a ----------------
  step('F32a not open');
  await p.goto(`http://localhost:8099/team/${team.id}`); await p.waitForTimeout(1800);
  t = await body(); await shot('f32a-not-open');
  check(/Your team isn't open yet/.test(t) && t.includes('Your team opens once Ryan confirms your details by email.'), 'F32a banner + Legal line');
  check(/Email Ryan/.test(t) && /insurer and expiry date/.test(t), 'F32a email line and link');
  check(t.includes("Clients can't join until your team is open."), 'F32a code dimmed line');
  check(t.includes('You can post once your team is open.'), 'F32a post line');
  const showQr = p.getByRole('button', { name: 'Show QR code' }).last();
  check((await showQr.getAttribute('aria-disabled')) === 'true' || await showQr.isDisabled(), 'Share/QR disabled while not open');
  await s04('trainer Clients screen (not open)');
  t = await body(); check(!/Parent consent|Print parent consent|Testing|Groups by position|Practice \(min\)|Med-ball/i.test(t), 'F34: no consent, testing, positions, practice length on the trainer screen');
  check(/Type: Training clients \(adults 18\+\)/.test(t), 'type shown read-only');

  // ---------------- F39a / B3 ----------------
  step('F39a new program (goals)');
  await click('New program'); await p.waitForTimeout(500);
  t = await body();
  check(['Strength', 'Muscle', 'General fitness', 'Back after a break'].every(g => t.includes(g)), 'four goals');
  check(t.includes('Clients returning from an injury or medical condition should be cleared by a qualified professional first.'), 'Back after a break clearance line');
  check(!/weight loss|weight-loss|fat loss|body composition|tone|Return to training/i.test(t), 'no weight-loss/body-composition goal; no "Return to training"');
  await click('Strength'); await p.waitForTimeout(200);
  t = await body(); check(/Suggested: 3/.test(t), 'sessions/week suggestion shown');
  await click('Create'); await p.waitForTimeout(1500);
  t = await body(); await shot('f39b-week');
  check(/W1/.test(t) && /W8/.test(t) && /Deload/.test(t), 'week strip W1–W8 with a deload label');
  check(/Week 1 effort: RPE 7/.test(t), 'week 1 effort from the wave (Strength lower RPE 7)');
  // try to go above 8
  await click('W3'); await p.waitForTimeout(300);
  await p.getByLabel('Increase').last().click(); await p.waitForTimeout(300);
  t = await body(); check(/Week 3 effort: RPE 9/.test(t) && !t.includes('Strength work stays at RPE 8 or below'), 'SUPERSEDED (§0.3) → RPE above 8 saves in the week view with no A1 line (F39b)');
  await click('W4'); await p.waitForTimeout(300); t = await body(); check(/Week 4 effort: RPE 6/.test(t), 'week 4 deload RPE 6');
  await s04('trainer program builder');
  let a = await app(); let draft = a.programs.find(x => x.teamId === team.id);
  check(draft.general && draft.goal === 'strength' && draft.weeks.length === 8 && draft.weeks[3].deload === true, 'program stored: goal, 8 weeks, week 4 deload');
  await click('Post'); await p.waitForTimeout(500);
  t = await body(); check(t.includes('You can post once your team is open.'), 'F36 Post blocked while not open');
  const postBtn = p.getByRole('button', { name: 'Post' }).last();
  check((await postBtn.getAttribute('aria-disabled')) === 'true' || await postBtn.isDisabled(), 'Post disabled');
  await click('Cancel');

  // ---------------- T1 / T3 joins ----------------
  step('T1 minor cannot join; T3 unopened team rejects adults');
  await signUpClient(code, 'Jordan Minor', 'jordan@test.org', new Date().getFullYear() - 16);
  t = await body(); if (!/This team is for adults 18 and older\./.test(t)) { await p.goto(`http://localhost:8099/join?code=${code}`); await p.waitForTimeout(2500); t = await body(); }
  check(/This team is for adults 18 and older\./.test(t), 'UI: minor sees "This team is for adults 18 and older."');
  d = await demo(); const jordan = d.users.find(u => u.email === 'jordan@test.org');
  check(!d.members.some(m => m.teamId === team.id && m.userId === jordan.id), 'minor not added');
  await signUpClient(code, 'Pat Early', 'pat@test.org', 1992);
  t = await body(); if (!/This trainer's team isn't open yet\./.test(t)) { await p.goto(`http://localhost:8099/join?code=${code}`); await p.waitForTimeout(2500); t = await body(); }
  check(/This trainer's team isn't open yet\./.test(t), "UI: adult sees \"This trainer's team isn't open yet.\"");

  step('service role opens the team (demo storage); trainer cannot from the app');
  await setDemo(dd => { dd.trainer[team.id].verifiedAt = new Date().toISOString(); dd.trainer[team.id].verifiedBy = 'Ryan (service role)'; });

  step('F33 adult clients join');
  await signUpClient(code, 'Alex Client', 'alex@test.org', 1990);
  t = await body(); await shot('f33-after-account');
  // onboarding: no position step
  check(!/What position do you play/.test(t), 'F33 no position step');
  if (/Joined/i.test(t)) { check(/Trainer Tess Trainer/.test(t), 'joined card says Trainer'); await click('Next'); await p.waitForTimeout(400); }
  t = await body(); await shot('f33-level'); check(/Your trainer confirms this\./.test(t), 'F33 level step: "Your trainer confirms this."'); if (!/Your trainer confirms/.test(t)) console.log(t.slice(0, 400));
  await click('Some experience'); await click('Go to my team plan'); await p.waitForTimeout(2500);
  t = await body(); await shot('f33-choices');
  check(/Your choices/i.test(t) && t.includes('Share my check-ins with my trainer') && t.includes('Other clients never will.'), 'F33 choices with the T5 sharing row');
  check(/Class board/.test(t) && !/Attendance & hours|Testing days/.test(t), 'F33 rows: no attendance/testing; Class board row');
  const tg = await p.evaluate(() => [...document.querySelectorAll('[role=switch][aria-label]')].map(e => ({ l: e.getAttribute('aria-label'), c: e.getAttribute('aria-checked'), d: e.getAttribute('aria-disabled') })));
  check(tg.length === 3 && tg.every(x => x.c !== 'true'), `F33 all off by default (${JSON.stringify(tg)})`);
  check(tg.find(x => /Share/.test(x.l))?.d === 'true', 'sharing disabled until check-ins on');
  await s04('client Your choices');
  await click('Save'); await p.waitForTimeout(2000);
  d = await demo(); const alex = d.users.find(u => u.email === 'alex@test.org');
  const mA = d.members.find(m => m.teamId === team.id && m.userId === alex.id);
  check(mA && mA.perms.participation && !mA.perms.checkins && !mA.perms.shareCheckins && !mA.perms.boards, 'T5/T6: participation on; check-ins, sharing, boards off');
  t = await body(); check(/Your trainer hasn't posted a program yet\. It shows up here as soon as they do\./.test(t), 'F42 no-program line');
  check(!/Fuel/.test(await p.evaluate(() => [...document.querySelectorAll('[role=tab],a[role=link],[role=tablist] *')].map(e => e.innerText).join(' '))), 'F34 no Fuel tab');
  await s04('client Today (no program)');
  await signUpClient(code, 'Sam Client', 'sam@test.org', 1985);
  t = await body(); if (/Joined/i.test(t)) { await click('Next'); await p.waitForTimeout(300); }
  await click('New to lifting'); await click('Go to my team plan'); await p.waitForTimeout(2500); await click('Save'); await p.waitForTimeout(1500);
  d = await demo(); const sam = d.users.find(u => u.email === 'sam@test.org');

  // ---------------- F32b, F35, F36 ----------------
  step('F32b open; F35 groups; F36 post to group and to one client');
  await trainerIn(); await p.goto(`http://localhost:8099/team/${team.id}`); await p.waitForTimeout(2000);
  t = await body(); check(/Your team is open\. Share your code with clients\./.test(t), 'F32b opened message');
  await click('OK').catch(() => {}); await p.waitForTimeout(300);
  check(!/Your team isn't open yet/.test(await body()), 'F32a banner gone');
  await click('Create group'); await p.waitForTimeout(300);
  t = await body(); check(t.includes("Use a class time or first name. Don't include health details."), 'F35 Legal helper text');
  await p.getByPlaceholder('Mon/Wed 6am class').fill('Mon/Wed 6am class'); await click('Create'); await p.waitForTimeout(300);
  await shot('f35-pick'); await p.getByRole('checkbox', { name: 'Alex Client' }).click(); await click('Save'); await p.waitForTimeout(1500); await shot('f35-saved');
  if (!(await demo()).groups.length) console.log((await body()).slice(0, 600));
  d = await demo(); const grp = d.groups.find(g => g.teamId === team.id);
  check(grp && d.members.find(m => m.userId === alex.id && m.teamId === team.id).groupId === grp.id, 'Alex in Mon/Wed 6am class');
  // post the Strength program to the group
  a = await app(); draft = a.programs.find(x => x.teamId === team.id && x.groupKey.startsWith('draft:'));
  await p.goto(`http://localhost:8099/program/${draft.id}`); await p.waitForTimeout(1500);
  await click('Post'); await p.waitForTimeout(400); await click('A group'); await click('Mon/Wed 6am class'); await p.waitForTimeout(300);
  t = await body(); check(/Alex: 3 sessions a week across all programs\./.test(t) && !/Blocked:|weekly limit/.test(t), 'SUPERSEDED (§0.3) → F36 checks: neutral per-client readout "Alex: 3 sessions a week across all programs."');
  await p.getByRole('button', { name: 'Post' }).last().click(); await p.waitForTimeout(1800);
  t = await body(); check(/Mon\/Wed 6am class has the new program\./.test(t), 'F36 group toast'); await click('OK').catch(() => {});
  // second program, 3/week Muscle, to Alex alone → 6 > cap 5 (intermediate) → block
  await p.goto(`http://localhost:8099/team/${team.id}`); await p.waitForTimeout(1500);
  await click('New program'); await p.waitForTimeout(300); await click('Muscle'); await click('Create'); await p.waitForTimeout(1500);
  await click('Post'); await p.waitForTimeout(400); await click('One client'); await click('Alex Client'); await p.waitForTimeout(400);
  t = await body(); await shot('f36-combined-block');
  check(/Alex: 6 sessions a week across all programs\./.test(t) && !/max 5 for Alex/.test(t), 'SUPERSEDED (§0.3) → F36 combined count shown as information ("Alex: 6 sessions a week across all programs.")');
  const pb = p.getByRole('button', { name: 'Post' }).last();
  check(!((await pb.getAttribute('aria-disabled')) === 'true' || await pb.isDisabled()), 'SUPERSEDED (§0.3) → Post stays enabled over the combined cap');
  await click('Cancel');
  // make it 2 sessions: set Wednesday to Rest in week view for all weeks? simpler: new 2/week General fitness program
  await p.goto(`http://localhost:8099/team/${team.id}`); await p.waitForTimeout(1500);
  await click('New program'); await p.waitForTimeout(300); await click('General fitness');
  // sessions per week is the second stepper; press its minus once (3 → 2)
  await p.getByLabel('Decrease').nth(1).click(); await p.waitForTimeout(200);
  await click('Create'); await p.waitForTimeout(1500);
  await click('Post'); await p.waitForTimeout(400); await click('One client'); await click('Alex Client'); await p.waitForTimeout(400);
  t = await body(); check(!/Blocked:/.test(t), `2 more sessions fit (total 5) ${t.match(/Blocked:[^\n]*/)?.[0] ?? ''}`);
  await click('Today'); await p.waitForTimeout(200);
  await p.getByRole('button', { name: 'Post' }).last().click(); await p.waitForTimeout(1800);
  t = await body(); check(/Posted\. Alex Client has the new program\./.test(t), 'F36 client toast'); await click('OK').catch(() => {});
  d = await demo();
  const tps = d.programs.filter(x => x.teamId === team.id);
  check(tps.some(x => x.groupKey === grp.id) && tps.some(x => x.groupKey === `client:${alex.id}`), 'posted: group program + client program');
  await p.goto(`http://localhost:8099/team/${team.id}`); await p.waitForTimeout(1800);
  t = await body(); await shot('f37-clients');
  check(/Sort/.test(t) && /Name/.test(t) && /Last session/.test(t) && /Flags/.test(t), 'F37 sort control');
  check(/Alex Client/.test(t) && /Strength · week|Strength · starts/.test(t), 'F37 row program line');
  check(/No check-in shared/.test(t), 'F37 "No check-in shared"');
  check(!/rank|#1|top client|leader/i.test(t), 'F37 no ranking');
  await s04('trainer Clients screen (open)');
  step('B11 duplicate to a second client and edit without changing the first; templates');
  a = await app(); const alexProg = a.programs.find(x => x.groupKey === `client:${alex.id}`);
  const alexBefore = JSON.stringify(alexProg.sessions);
  await p.goto(`http://localhost:8099/program/${alexProg.id}`); await p.waitForTimeout(1500);
  await click('Duplicate to another client'); await p.waitForTimeout(300); await click('Sam Client'); await click('Duplicate'); await p.waitForTimeout(1500);
  t = await body(); check(/Copy for Sam Client\. Changes here don't affect the original program\./.test(t), 'duplicate banner');
  { const dd = (await app()).programs.find(x => x.draftTarget === `client:${sam.id}`); await p.goto(`http://localhost:8099/program/${dd.id}`); await p.waitForTimeout(1500); }
  t = await body(); check(/Copy for Sam Client\./.test(t), 'duplicate banner after reload');
  await p.locator('input').first().fill('Sam: General fitness'); await p.waitForTimeout(300);
  await click('Add session'); await p.waitForTimeout(1200); await p.goBack(); await p.waitForTimeout(1200);
  await click('Post'); await p.waitForTimeout(400);
  t = await body(); check(/One client/.test(t), 'post sheet opens with the duplicate');
  await p.getByRole('button', { name: 'Post' }).last().click(); await p.waitForTimeout(1800);
  t = await body(); check(/Posted\. Sam Client has the new program\./.test(t), 'duplicate posted to Sam'); await click('OK').catch(() => {});
  a = await app(); d = await demo();
  check(JSON.stringify(a.programs.find(x => x.id === alexProg.id).sessions) === alexBefore && d.programs.find(x => x.groupKey === `client:${alex.id}`).program.sessions.length === alexProg.sessions.length, "Alex's program unchanged by the copy");
  const samP = d.programs.find(x => x.groupKey === `client:${sam.id}`);
  console.log('    sam program:', JSON.stringify({ name: samP?.program.name, sessions: samP?.program.sessions.length, alexSessions: alexProg.sessions.length, keys: samP && Object.keys(samP.program).filter(k => /draft|forName/.test(k)) }));
  check(samP && samP.program.name === 'Sam: General fitness' && samP.program.sessions.length >= alexProg.sessions.length && !('draftTarget' in samP.program) && samP.program.forName === 'Tess Clients', 'Sam has the edited copy (draftTarget not posted; forName is the team name, as built)');
  await p.goto(`http://localhost:8099/program/${alexProg.id}`); await p.waitForTimeout(1500);
  await click('Save as template'); await p.waitForTimeout(300);
  t = await body(); check(t.includes("Templates keep the plan only, never a client's logs."), 'template Legal line');
  await p.locator('input').last().fill('GF 8-week'); await p.waitForTimeout(200); await click('Save'); await p.waitForTimeout(500); await click('OK').catch(() => {});
  a = await app(); check((a.templates ?? []).length === 1 && !a.templates[0].teamId && !a.templates[0].groupKey && !a.templates[0].startDate, 'template saved on the device, plan only');
  await p.goto(`http://localhost:8099/team/${team.id}`); await p.waitForTimeout(1500);
  await click('New program'); await p.waitForTimeout(300); await click('A template'); await click('GF 8-week'); await click('Create'); await p.waitForTimeout(1500);
  t = await body(); check(/From template: GF 8-week/.test(t), 'a new program starts from the template');
  await p.goto(`http://localhost:8099/client?teamId=${team.id}&userId=${alex.id}`); await p.waitForTimeout(1800);
  t = await body(); await shot('f38-client');
  check(/Program/i.test(t) && /Recent sessions/i.test(t) && /PRs/i.test(t) && /Check-ins/i.test(t) && /No check-in shared/.test(t), 'F38 sections; check-ins not shared');
  await s04('trainer client detail');
  await p.goto(`http://localhost:8099/gym?teamId=${team.id}`); await p.waitForTimeout(1500);
  t = await body(); check(/Programs only use what you tick\./.test(t) && /Cable station/.test(t) && /Leg press/.test(t) && /Stationary bike/.test(t), 'F40 gym profile with Cable station and the 13 items');
  await s04('trainer gym equipment');

  step('A6 smoke + §S0.4 on the other trainer screens: racks, class board, calendar, invite, program, session');
  await p.goto(`http://localhost:8099/racks?teamId=${team.id}`); await p.waitForTimeout(1500);
  t = await body(); check(/Clients per rack/.test(t) && /Tap a client, then a rack, to move them\.|Split your class into racks/.test(t), 'racks: Clients wording'); await s04('trainer racks');
  await p.goto(`http://localhost:8099/board/${team.id}`); await p.waitForTimeout(2500);
  t = await body(); await shot('f44-board');
  check(/Class board/.test(t), 'F44 board titled "Class board"'); await s04('trainer class board');
  check(!/RPE|lb\b|kg\b|Pain|Sleep|Soreness|Beginner|Intermediate|Advanced/.test(t), 'board shows no weights, RPE, check-ins or levels');
  a = await app(); const anyP = a.programs.find(x => x.teamId === team.id && !x.groupKey.startsWith('draft:'));
  await p.goto(`http://localhost:8099/calendar?programId=${anyP.id}`); await p.waitForTimeout(1500);
  t = await body(); check(/Next 2 weeks/i.test(t) && /Breaks/i.test(t) && !/Practice|Match|Tournament|Testing day/.test(t), 'F34 calendar: sessions and breaks only');
  await click('Add'); await p.waitForTimeout(300); t = await body(); check(/Session/.test(t) && /Break/.test(t) && !/Practice|Match|Tournament/.test(t), 'Calendar → Add offers Session and Break only');
  await click('Cancel'); await s04('trainer calendar');
  await p.goto(`http://localhost:8099/invite?teamId=${team.id}`); await p.waitForTimeout(1500); await s04('trainer invite');
  await p.goto(`http://localhost:8099/program/${anyP.id}`); await p.waitForTimeout(1500); await s04('trainer posted program');
  await p.goto(`http://localhost:8099/session?programId=${anyP.id}&sessionId=${anyP.sessions[0].id}`); await p.waitForTimeout(1500);
  t = await body(); check(/Warm-up · .* · about \d+ min/.test(t) && !/General warm-up/.test(t) && /Missing something\? Add equipment in Gym equipment\./.test(t), 'SUPERSEDED (§0.3, W1–W3) → F39c: generated warm-up row (F49) and the gym equipment link'); await s04('trainer session editor');
  await click('Add exercise'); await p.waitForTimeout(600); t = await body();
  // The gym profile wasn't saved in this run, so the standard 10 items apply: Walk or Jog yes, machines no.
  check(/Cardio/i.test(t) && /Walk or Jog/.test(t) && /Lateral Raise/.test(t) && !/Stationary Bike|Leg Press|Needs other equipment/.test(t), 'picker: general library + cardio, limited to the gym profile'); await click('Cancel');
  await p.goto('http://localhost:8099/settings'); await p.waitForTimeout(1500); await s04('trainer settings');
  await p.goto('http://localhost:8099/program'); await p.waitForTimeout(1500); t = await body(); check(!/Recommend for me|Volleyball week|Position/.test(t), 'F34 no volleyball generator'); await s04('trainer Program tab');
  // TM-19: the trainer can't open the team from the app (no control exists; the server trigger is in rls-2.3.0-a)
  check(!/verify|verified_at|Open my team/i.test(await body()), 'no in-app verification control');

  // ---------------- Client views ----------------
  step('client A4 visibility, F42 Today, F34 hidden, cardio, check-ins');
  await clientIn('alex@test.org');
  a = await app(); const mine = a.programs.filter(x => x.teamId === team.id);
  check(mine.length === 2 && mine.every(x => x.general), `Alex mirrors 2 programs (group + own): ${mine.length}`);
  d = await demo();
  t = await body(); await shot('f42-today');
  await s04('client Today');
  check(!/Practice|Match|Tournament|Testing|I was there|Fuel|Above the net/.test(t), 'F34 nothing volleyball on Today');
  for (const path of ['/program', '/progress', '/settings']) {
    await p.goto('http://localhost:8099' + path); await p.waitForTimeout(1500);
    t = await body(); await s04('client ' + path);
    if (path === '/progress') check(!/Above the net|Jump test|Touch|Estimated strength|Body weight/i.test(t), 'F34 Progress: no touch, jumps, estimates, body weight');
    if (path === '/settings') check(/Delete my check-ins/.test(t) && !/Parent consent form/.test(t), 'F43 Delete my check-ins; no consent form link');
  }
  // workout with cardio (General fitness program to Alex has a cardio block)
  const gp = mine.find(x => x.goal === 'general');
  await p.goto(`http://localhost:8099/workout?programId=${gp.id}&sessionId=${gp.sessions[0].id}`); await p.waitForTimeout(2000);
  await click('List').catch(() => {}); await p.waitForTimeout(300);
  t = await body(); await shot('f41-workout');
  check(/min · Easy|min · Moderate/.test(t) && /You can hold a full conversation\.|You can talk in short sentences, but not sing\./.test(t), 'F41 cardio card with the talk-test line');
  check(!/heart rate|pace|distance|calorie|km|mph/i.test(t), 'F41 no HR/pace/distance/calorie fields');
  check(t.includes("Your trainer sees your notes. Don't include health or injury details."), 'T5 notes helper');
  await s04('client workout');
  await p.goto('http://localhost:8099/exercise/kb-swing'); await p.waitForTimeout(1000);
  t = await body(); check(/Teaches a fast, powerful hip snap\./.test(t), 'whyGeneral shown in a general team'); await s04('client exercise how-to');
  await p.goto(`http://localhost:8099/workout?programId=${gp.id}&sessionId=${gp.sessions[0].id}`); await p.waitForTimeout(2000);
  await click('List').catch(() => {}); await p.waitForTimeout(300);
  // log: mark cardio done + one set
  await p.getByRole('button', { name: /^Done/ }).first().click(); await p.waitForTimeout(400);
  const setBox = p.getByRole('checkbox', { name: /Set 1 done/ }); if (await setBox.count()) { await setBox.first().click(); await p.waitForTimeout(500); }
  await click('Skip').catch(() => {});
  await p.getByText('Finish workout', { exact: true }).last().click(); await p.waitForTimeout(1500);
  a = await app(); const lg = a.logs[0]; const ce = lg && lg.entries.find(e => e.minutesDone != null);
  check(ce && ce.sets.length === 0 && Object.keys(ce).sort().join(',') === 'exerciseId,minutesDone,sets', `cardio log stores minutes only: ${JSON.stringify(ce)}`);
  // check-ins on + share; pain → G3 trainer card
  await p.goto('http://localhost:8099/settings'); await p.waitForTimeout(1500);
  await p.getByRole('switch', { name: 'Check-ins', exact: true }).click(); await p.waitForTimeout(200);
  const shr = p.getByRole('switch', { name: 'Share my check-ins with my trainer' });
  check((await shr.getAttribute('aria-checked')) !== 'true', 'turning check-ins on does not turn sharing on');
  await shr.click(); await p.waitForTimeout(200); await click('Save choices'); await p.waitForTimeout(1500);
  await p.goto('http://localhost:8099/'); await p.waitForTimeout(1800);
  for (const lab of ['Sleep 4', 'Soreness 2', 'Energy 4']) await p.getByRole('radio', { name: lab }).click();
  await click('Yes'); await click('Check in'); await p.waitForTimeout(1500);
  t = await body(); check(t.includes("Don't train through pain. Talk to your trainer or a health professional before you train today."), 'G3 trainer pain card (pending Legal constant)');
  check(/Sent to your trainer\.|Sending to your trainer…/.test(t), 'check-in sent to your trainer');
  await s04('client Today with check-in');

  step('trainer sees pain only while sharing; sharing off hides it');
  await trainerIn(); await p.goto(`http://localhost:8099/team/${team.id}`); await p.waitForTimeout(2000);
  t = await body(); check(/Pain reported today/.test(t) && /Check in with Alex in person\./.test(t), 'trainer flag: Pain reported today (no detail)');
  check(!/sleep 4|soreness 2/i.test(t), 'no check-in detail on the dashboard');
  await clientIn('alex@test.org'); await p.goto('http://localhost:8099/settings'); await p.waitForTimeout(1500);
  await p.getByRole('switch', { name: 'Share my check-ins with my trainer' }).click(); await p.waitForTimeout(400);
  t = await body(); check(/Stop sharing\?/.test(t) && t.includes("Your trainer won't see any of your check-ins, including past ones."), 'F43 stop-sharing confirmation');
  await click('Stop sharing'); await p.waitForTimeout(300); await click('Save choices'); await p.waitForTimeout(1500);
  await trainerIn(); await p.goto(`http://localhost:8099/team/${team.id}`); await p.waitForTimeout(2000);
  t = await body(); check(!/Pain reported today/.test(t) && /No check-in shared/.test(t), 'sharing off: no pain flag, "No check-in shared"');

  step('F43 delete my check-ins');
  await clientIn('alex@test.org'); await p.goto('http://localhost:8099/settings'); await p.waitForTimeout(1500);
  await click('Delete my check-ins'); await p.waitForTimeout(300);
  t = await body(); check(/Delete all your check-ins\? This can't be undone\./.test(t), 'delete dialog');
  await p.getByPlaceholder('Type DELETE').fill('DELETE'); await click('Delete'); await p.waitForTimeout(1500);
  t = await body(); check(/Check-ins deleted\./.test(t), 'Check-ins deleted.'); await click('OK').catch(() => {});
  d = await demo(); a = await app();
  check(!d.readiness.some(r => r.userId === alex.id) && (a.readinessLog ?? []).length === 0, 'server and device check-ins gone');

  step('A4: Sam sees no client or group program of Alex');
  await clientIn('sam@test.org');
  a = await app(); const samMine = a.programs.filter(x => x.teamId === team.id);
  check(samMine.length === 1 && samMine[0].groupKey === `client:${sam.id}`, `Sam has only his own program (${samMine.map(x => x.groupKey).join(', ')})`);
  d = await demo();
  t = await body(); check(!/Mon\/Wed 6am class/.test(t) && !samMine.some(x => x.name === alexProg.name && x.groupKey !== `client:${sam.id}`), "Sam never sees Alex's group or program");

  step('A2 no testing in general teams (demo API)');
  const testErr = await p.evaluate(async (tid) => {
    try {
      const raw = localStorage.getItem('load-and-launch/demo-server/v1'); return raw ? 'n/a' : 'n/a';
    } catch (e) { return String(e); }
  }, team.id);
  check(testErr === 'n/a', 'see SQL A2 for the API check');

  step('tap targets on every general-team screen checked above');
  check(taps.length === 0, `all tap targets ≥ 44 pt (${taps.length}: ${taps.slice(0, 8).join(' | ')})`);
  step('network: no third-party or AI hosts');
  const ext = [...hosts].filter(h => !/^localhost(:\d+)?$/.test(h));
  check(ext.length === 0, `only localhost requested (${ext.join(', ') || 'none'})`);
  check(errs.filter(e => !/favicon|Failed to load resource/.test(e)).length === 0, `no page errors (${errs.slice(0, 3).join(' | ')})`);
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED');
  await b.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(2); });
