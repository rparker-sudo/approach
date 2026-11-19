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


  const createCustom = async (name, type, movement, levelLabel, equipment, steps) => {
    await click('Add exercise'); await p.waitForTimeout(600);
    await click('Create custom exercise'); await p.waitForTimeout(600);
    await p.getByPlaceholder('e.g. Banded Lateral Walk').fill(name);
    await p.getByPlaceholder('What to focus on').fill('Knees out, stay low.');
    await click(type); await p.waitForTimeout(150); await click(movement); await click(levelLabel);
    for (const e of equipment) await p.getByRole('checkbox', { name: e }).click();
    await p.getByLabel('How-to steps, one per line').fill(steps.join('\n'));
    await shot('custom-form-' + name.replace(/\W+/g, '-'));
    await click('Save exercise'); await p.waitForTimeout(800);
  };

  step('volleyball coach: custom exercise in a team workout');
  await p.goto('http://localhost:8099/'); await p.waitForTimeout(2500);
  await age('March', 1985); await click("I'm a coach or trainer"); await click('Next');
  await p.getByPlaceholder('Coach Parker').fill('Riley Coach'); await p.getByPlaceholder('you@example.com').fill('coach@test.org'); await p.getByPlaceholder('At least 6 characters').fill('secret1');
  await tickCoachTerms(); await click('Create account'); await p.waitForTimeout(1800); current = 'coach';
  await click('New team'); await click('Volleyball team'); await click('Next');
  await p.getByPlaceholder('Team name, e.g. Varsity').fill('Varsity'); await click('Create'); await p.waitForTimeout(1500);
  let d = await demo(); const team = d.teams[0]; const code = team.joinCode;
  await click('Build workout'); await p.waitForTimeout(800); await p.getByText('Build team workout', { exact: true }).last().click(); await p.waitForTimeout(1200);
  let a = await app(); let prog = a.programs.find(x => x.teamId === team.id);
  const ses = prog.sessions[0];
  await p.goto(`http://localhost:8099/session?programId=${prog.id}&sessionId=${ses.id}`); await p.waitForTimeout(1500);
  await click('Add exercise'); await p.waitForTimeout(600);
  let t = await body(); check(/Create custom exercise/.test(t), 'picker offers "Create custom exercise"');
  await click('Cancel');
  await click('Add exercise'); await p.waitForTimeout(500); await click('Create custom exercise'); await p.waitForTimeout(500);
  t = await body();
  check(['Power', 'Heavy', 'Compound', 'Accessory', 'Care / mobility'].every(x => t.includes(x)) && /Level/i.test(t) && /Movement/i.test(t), 'form asks type, movement and level');
  check(!/Arm curl/.test(t), 'volleyball: no trainer-only movements');
  const save = p.getByRole('button', { name: 'Save exercise' }).last();
  check((await save.getAttribute('aria-disabled')) === 'true' || await save.isDisabled(), 'Save disabled without a name');
  await click('Cancel'); await p.waitForTimeout(300);
  await createCustom('Banded Lateral Walk', 'Accessory', 'Single leg', 'Beginner', ['Bands'], ['Loop a band above the knees.', 'Step sideways, staying low.']);
  t = await body(); await shot('custom-in-session');
  check(/Banded Lateral Walk/.test(t), 'custom exercise added to the session');
  a = await app(); prog = a.programs.find(x => x.id === prog.id);
  const cx = (prog.customExercises || [])[0];
  check(cx && cx.custom && cx.tier === 'C' && cx.level === 1 && cx.pattern === 'single-leg' && JSON.stringify(cx.equipment) === '[["bands"]]' && cx.howTo.steps.length === 2, 'stored in the program with type, level, movement, equipment, steps');
  check(prog.sessions[0].exercises.some(e => e.exerciseId === cx.id), 'session row uses the custom id');
  // heavy custom at level 3: athletes below get a library exercise
  await createCustom('Safety Bar Squat', 'Heavy', 'Squat', 'Advanced', ['Barbell & rack'], ['Bar on the upper back.']);
  a = await app(); prog = a.programs.find(x => x.id === prog.id);
  const hx = prog.customExercises.find(x => x.name === 'Safety Bar Squat');
  check(hx && hx.tier === 'A' && hx.level === 3, 'heavy custom at level 3');
  t = await body(); check(/Heavy/.test(t), 'tier chip shows Heavy');
  // edit
  await click('Add exercise'); await p.waitForTimeout(500);
  t = await body(); check(/Your exercises/i.test(t) && /Banded Lateral Walk/.test(t), "picker lists the program's own exercises");
  await p.getByRole('button', { name: 'Edit', exact: true }).nth(1).click(); await p.waitForTimeout(500); // 2.4.0: nth(1) — the session's Warm-up row (F49) has the first Edit button
  await p.getByPlaceholder('e.g. Banded Lateral Walk').fill('Banded Side Walk'); await click('Save exercise'); await p.waitForTimeout(800);
  a = await app(); prog = a.programs.find(x => x.id === prog.id);
  check(prog.customExercises.length === 2 && prog.customExercises.some(x => x.id === cx.id && x.name === 'Banded Side Walk'), 'edit keeps the id, changes the name');
  await p.goto(`http://localhost:8099/team/${team.id}`); await p.waitForTimeout(1500);
  await click('Post all changes'); await p.waitForTimeout(1000); await click('OK').catch(() => {});
  d = await demo(); const posted = d.programs.find(x => x.teamId === team.id).program;
  check(posted.customExercises?.length === 2, 'posted with the team workout');

  step('athlete: sees the custom exercise; beginner gets a library version of the heavy one');
  await erase();
  await p.goto(`http://localhost:8099/join?code=${code}`); await p.waitForTimeout(2200); await welcomeCreate();
  await age('January', 2000); await click("I'm an athlete or client"); await click('Next');
  await p.getByPlaceholder('First and last name').fill('Taylor Smith'); await p.getByPlaceholder('you@example.com').fill('taylor@test.org'); await p.getByPlaceholder('At least 6 characters').fill('secret2');
  await click('Create account'); await p.waitForTimeout(2000); current = 'taylor';
  await click('Next'); await click('Outside Hitter'); await click('Next'); await click('New to lifting'); await click('Go to my team plan'); await p.waitForTimeout(2500);
  await click('Save').catch(() => {}); await p.waitForTimeout(1500);
  a = await app(); const ap = a.programs.find(x => x.teamId === team.id);
  check(ap && ap.customExercises?.length === 2, 'athlete device has the custom exercises');
  await p.goto(`http://localhost:8099/session?programId=${ap.id}&sessionId=${ses.id}`); await p.waitForTimeout(1500);
  t = await body(); await shot('athlete-session');
  check(/Banded Side Walk/.test(t), 'athlete session shows the level 1 custom exercise');
  const lines = t.split('\n').filter(l => /Safety Bar Squat/.test(l)); if (lines.length) console.log('    lines:', lines);
  check(!/^Safety Bar Squat$/m.test(t), 'beginner does not get the level 3 custom lift (only a "your version" note may name it)');
  await p.goto(`http://localhost:8099/exercise/${cx.id}`); await p.waitForTimeout(1200);
  t = await body(); await shot('athlete-howto');
  check(/A custom exercise from the coach\./.test(t) && /Loop a band above the knees\./.test(t) && /Knees out, stay low\./.test(t) && /Bands/.test(t), 'how-to: label, cue, steps, equipment');
  check(!/Common mistakes|Coaching cues/i.test(t), 'empty sections hidden');

  step('trainer: custom exercise in a general program (trainer-only movements, Client wording)');
  await erase(); await p.goto('http://localhost:8099/'); await p.waitForTimeout(1500);
  await age('March', 1988); await click("I'm a coach or trainer"); await click('Next');
  await p.getByPlaceholder('Coach Parker').fill('Tess Trainer'); await p.getByPlaceholder('you@example.com').fill('tess@test.org'); await p.getByPlaceholder('At least 6 characters').fill('secret1');
  await tickCoachTerms(); await click('Create account'); await p.waitForTimeout(1800); current = 'tess';
  await click('New team'); await click('Training clients (adults 18+)'); await click('Next');
  await p.getByPlaceholder('My clients').fill('Tess Clients'); await click('Next');
  for (let i = 0; i < 3; i++) await p.getByRole('checkbox').nth(i).click({ position: { x: 12, y: 22 } });
  await p.getByRole('button', { name: 'Create team' }).last().click(); await p.waitForTimeout(2000);
  await click('New program'); await p.waitForTimeout(300); await click('Strength'); await click('Create'); await p.waitForTimeout(1500);
  a = await app(); const gp = a.programs.find(x => x.general);
  await p.goto(`http://localhost:8099/session?programId=${gp.id}&sessionId=${gp.sessions[0].id}`); await p.waitForTimeout(1500);
  await click('Add exercise'); await p.waitForTimeout(500); await click('Create custom exercise'); await p.waitForTimeout(500);
  await click('Accessory'); t = await body();
  check(/Arm curl/.test(t) && /Cable station/.test(t) && /Leg press/.test(t), 'trainer: arm movements, Cable station and gym items');
  check(!/coach|athlete/i.test(t), 'trainer form: Client wording only');
  await click('Arm curl'); await p.getByPlaceholder('e.g. Banded Lateral Walk').fill('Cable Preacher Curl'); await p.getByRole('checkbox', { name: 'Cable station' }).click();
  await click('Save exercise'); await p.waitForTimeout(800);
  a = await app(); const gp2 = a.programs.find(x => x.id === gp.id);
  const gx = gp2.customExercises?.[0];
  check(gx && gx.pattern === 'arm-flex' && gp2.sessions[0].exercises.some(e => e.exerciseId === gx.id && /RPE/.test(e.effort)), 'added with the goal defaults (Strength accessory)');

  check(errs.filter(e => !/favicon|Failed to load resource/.test(e)).length === 0, `no page errors (${errs.slice(0, 3).join(' | ')})`);
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED');
  await b.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(2); });
