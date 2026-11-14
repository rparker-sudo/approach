import { boardAccent, contrast, textOn, PRESETS, BOARD_BG } from '../../src/lib/accent';
let f = 0; const ok = (c: boolean, m: string) => { console.log(c ? 'pass' : 'FAIL', m); if (!c) f++; };
ok(boardAccent(null).color === '#C9CDD2' && !boardAccent(null).adjusted, 'null → #C9CDD2');
for (const h of ['#000080', '#800000']) { const a = boardAccent(h); ok(a.adjusted && contrast(a.color, BOARD_BG) >= 3 && contrast(a.color, BOARD_BG) < 3.6, `${h} lightened to ${a.color} (${contrast(a.color, BOARD_BG).toFixed(2)}:1)`); ok(contrast(textOn(a.color), a.color) >= 4.5, `${h} pill text ≥ 4.5 (${textOn(a.color)} ${contrast(textOn(a.color), a.color).toFixed(2)})`); }
for (const p of PRESETS) ok(!boardAccent(p.hex).adjusted && textOn(p.hex) === BOARD_BG && contrast(BOARD_BG, p.hex) >= 4.5, `preset ${p.name} ${contrast(p.hex, BOARD_BG).toFixed(1)}:1`);
console.log(f ? `${f} FAILED` : 'all passed');
