// 2.2.1 logic checks: board presets (§3), F-2 contrast (§5), J1 level table (§6), rename sweep (§3), role param (§9).
/* eslint-disable @typescript-eslint/no-require-imports */
// Node built-ins without @types/node (the app's tsconfig has no Node types).
declare const require: (m: string) => unknown;
declare const __dirname: string;
type Dirent = { name: string; isDirectory: () => boolean };
const fs = require('fs') as { readdirSync: (d: string, o: { withFileTypes: true }) => Dirent[]; readFileSync: (p: string, e: 'utf8') => string };
const path = require('path') as { join: (...p: string[]) => string; resolve: (...p: string[]) => string; relative: (a: string, b: string) => string };
import { BOARD_PRESETS, contrast, textOn } from '../../src/lib/accent';
import tokens from '../../src/lib/brand-tokens.json';
import { LEVEL_CHECKLIST, LEVEL_DESCRIPTIONS } from '../../src/lib/levelChecklist';
import { adjustedFor, levelKey, levelTable } from '../../src/lib/resolve';
import { roleParam } from '../../src/lib/roleParam';
import { generateProgram } from '../../src/lib/generator';

let f = 0;
const ok = (c: boolean, m: string) => {
  console.log(c ? 'pass' : 'FAIL', m);
  if (!c) f++;
};
const root = path.resolve(__dirname, '../..');

// §3 board presets, exactly as brand guide §7.
const want = [
  ['Silver', '#C9CDD2'], ['Red', '#F2555C'], ['Orange', '#FF8A3D'], ['Gold', '#FFC53D'],
  ['Green', '#3DDC84'], ['Teal', '#2EC4B6'], ['Blue', '#4C8DF6'], ['Purple', '#B78CFF'],
];
ok(JSON.stringify(BOARD_PRESETS.map((p) => [p.name, p.hex])) === JSON.stringify(want), 'board presets match brand guide §7 (order, names, hex)');
ok(BOARD_PRESETS[0].id === 'silver' && 'isDefault' in BOARD_PRESETS[0], 'Silver is the default');
for (const p of BOARD_PRESETS) {
  ok(textOn(p.hex) === '#0B0B0C', `"Done" pill text is Carbon on ${p.name}`);
  ok(contrast(p.hex, '#0B0B0C') >= 3 && contrast(p.hex, '#1C1D20') >= 3 && contrast(p.hex, '#3A3D42') >= 3, `${p.name} ≥ 3:1 on board, tile and track`);
}

// §5 F-2: light-theme error and warning text ≥ 4.5:1 on every light surface; dark keeps the existing colors.
const st = tokens.color.status as unknown as Record<string, { dark: string; light: string } | string>;
const et = st.errorText as { dark: string; light: string };
const wt = st.warningText as { dark: string; light: string };
ok(et.light === '#C42B30' && wt.light === '#8A5A00', 'light errorText #C42B30, warningText #8A5A00 (tokens)');
ok(et.dark === st.error && wt.dark === st.warning, 'dark errorText/warningText = existing error/warning');
for (const bg of [tokens.color.light.background, tokens.color.light.surface, tokens.color.light.surfaceRaised]) {
  ok(contrast(et.light, bg) >= 4.5, `light errorText on ${bg}: ${contrast(et.light, bg).toFixed(2)}:1`);
  ok(contrast(wt.light, bg) >= 4.5, `light warningText on ${bg}: ${contrast(wt.light, bg).toFixed(2)}:1`);
}
// Dark keeps the existing values (2.2.1 §5); reported, not asserted, on raised surfaces (design system F-1, 2.2.2).
ok(contrast(et.dark, tokens.color.dark.background) >= 4.5 && contrast(wt.dark, tokens.color.dark.background) >= 4.5, 'dark error/warning text ≥ 4.5:1 on the background');
for (const bg of [tokens.color.dark.surface, tokens.color.dark.surfaceRaised]) {
  console.log('info', `dark errorText on ${bg}: ${contrast(et.dark, bg).toFixed(2)}:1; warningText ${contrast(wt.dark, bg).toFixed(2)}:1`);
}
// No text use of the fill tokens (text and icons use errorText / warningText).
const srcFiles: string[] = [];
const walk = (d: string) =>
  fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.tsx?$/.test(e.name)) srcFiles.push(p);
  });
walk(path.join(root, 'src'));
const textUses = srcFiles.flatMap((p) =>
  fs
    .readFileSync(p, 'utf8')
    .split('\n')
    .map((l, i) => ({ p, i, l }))
    .filter(({ l }) => /(^|[^A-Za-z])color(: |=\{)[^,}]*colors\.(error|warning)\b(?!Text)/.test(l) && !/border|background/i.test(l)),
);
ok(!textUses.length, `no text/icon color uses colors.error / colors.warning (${textUses.map((x) => `${path.relative(root, x.p)}:${x.i + 1}`).join(' ')})`);

// §4 level cards and checklist.
ok(LEVEL_DESCRIPTIONS[1].startsWith('New to lifting (under about 6 months)') && LEVEL_DESCRIPTIONS[3].endsWith('Ready for coached Olympic lifts.'), "Training's three level descriptions");
ok(LEVEL_CHECKLIST.map((s) => s.title).join('|') === 'Beginner (level 1)|Intermediate (level 2)|Advanced (level 3)|Moving down', 'Appendix B sections');

// §6 J1: the level table lists only what each exercise becomes per level; adjustments come back by key.
const prog = generateProgram({ position: 'Setter', phase: 'off', experience: 'advanced', volleyballWeek: ['practice', 'practice', 'practice', 'practice', 'practice', 'off', 'off'] as never, liftDaysPerWeek: 3, liftDays: [0, 2, 4] });
const table = levelTable([prog]);
const keys = Object.keys(table);
ok(keys.length > 0 && keys.every((k) => table[k].length === 3), 'level table: one [L1, L2, L3] row per program exercise');
ok(Object.values(table).every((row) => row.every((x) => x === null || typeof x === 'string')), 'level table holds only exercise ids (no levels or names)');
const someKey = keys.find((k) => table[k][0] !== table[k][2]);
if (someKey) {
  const exId = someKey.split('@')[0];
  ok(adjustedFor({ [someKey]: table[someKey][0] }, exId, prog.equipment) === table[someKey][0], 'adjustedFor finds the athlete\'s exercise by key');
  ok(adjustedFor({}, exId, prog.equipment) === undefined, 'not adjusted → undefined');
  ok(levelKey(exId, []) === `${exId}@all`, 'no equipment list → "all"');
}

// §9 role param.
ok(roleParam('coach') === 'coach' && roleParam('athlete') === 'athlete' && roleParam('admin') === null && roleParam(undefined) === null, 'sign-in?role= accepts only coach|athlete');

// §3 rename sweep: user-visible strings say "Approach Strength" (the volleyball term "approach touch" is not the name).
const offenders = srcFiles.flatMap((p) =>
  fs
    .readFileSync(p, 'utf8')
    .split('\n')
    .map((l, i) => ({ p, i, l }))
    .filter(({ l }) => /\bApproach\b(?! Strength| touch| jump)/.test(l) && !/^\s*(\/\/|\*|\/\*)/.test(l)),
);
ok(!offenders.length, `no bare "Approach" product name in src (${offenders.map((x) => `${path.relative(root, x.p)}:${x.i + 1}`).join(' ')})`);
ok(JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8')).expo.ios.bundleIdentifier === 'com.approachvolleyball.app', 'bundle ID unchanged');
ok(tokens.name === 'Approach Strength' && tokens.tagline === 'Build it under the bar. Use it above the net.', 'brand-tokens name renamed; tagline unchanged');

// §3 outlined SVGs.
for (const n of ['lockup-plain-on-dark', 'lockup-plain-on-light', 'lockup-stacked-on-dark', 'lockup-stacked-on-light', 'wordmark-on-dark', 'wordmark-on-light', 'lockup-on-dark', 'lockup-on-light', 'powered-by-on-board']) {
  const svg = fs.readFileSync(path.join(root, 'assets/brand/source', `${n}.svg`), 'utf8');
  ok(!/<text|font-family|font-face|@import|href="http/i.test(svg), `${n}.svg is outlined (no <text> or font reference)`);
}

if (f) console.log(`${f} FAIL`);
