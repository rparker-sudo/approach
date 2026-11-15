#!/usr/bin/env python3
"""Builds the Approach Strength wordmark and lockup SVGs (2.2.1 §3, brand guide v0.3 §5, §8).

    pip install fonttools
    python3 scripts/build-brand-svgs.py

Text is converted to outlines (glyph paths from Inter Tight, bundled with @expo-google-fonts), so the SVGs
contain no <text> element and no font reference.

Wordmark: APPROACH in Inter Tight 600 uppercase; STRENGTH beneath at ~40% of APPROACH's cap height,
wide-tracked so its ink is exactly as wide as APPROACH's. Colors: APPROACH Chalk on dark / Carbon on light;
STRENGTH Steel on dark / Gunmetal on light. The mark is the existing barbell + chevron
(assets/brand/source/logo-mark-on-*.svg); the badge is the existing volleyball badge.

Writes assets/brand/source/:
  wordmark-on-dark|light.svg, lockup-plain-on-dark|light.svg, lockup-stacked-on-dark|light.svg,
  lockup-on-dark|light.svg (badge + wordmark + tagline), powered-by-on-board.svg
"""
from pathlib import Path

from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'assets/brand/source'
FONTS = ROOT / 'node_modules/@expo-google-fonts'
SEMI = TTFont(FONTS / 'inter-tight/600SemiBold/InterTight_600SemiBold.ttf')
REG = TTFont(FONTS / 'inter-tight/400Regular/InterTight_400Regular.ttf')

C = dict(carbon='#0B0B0C', graphite='#1C1D20', gunmetal='#3A3D42', seam='#4A4E55', steel='#A7ABB2', chrome='#C9CDD2', chalk='#FFFFFF')
THEMES = {
    'dark': dict(top=C['chalk'], sub=C['steel'], chevron=C['chrome'], bar=C['chalk'], ball=C['graphite'], seam=C['seam'], tag=C['steel']),
    'light': dict(top=C['carbon'], sub=C['gunmetal'], chevron=C['gunmetal'], bar=C['carbon'], ball='#F1F2F4', seam=C['chrome'], tag=C['gunmetal']),
}


def f(n: float) -> str:
    return f'{n:.2f}'.rstrip('0').rstrip('.')


class Line:
    """A line of outlined text. Coordinates: x from the first glyph's ink left edge, y = baseline."""

    def __init__(self, font: TTFont, text: str, cap: float, tracking_em: float = 0.0):
        self.font, self.text = font, text
        gs = font.getGlyphSet()
        cmap = font.getBestCmap()
        self.names = [cmap[ord(ch)] for ch in text]
        self.upm = font['head'].unitsPerEm
        cap_units = getattr(font['OS/2'], 'sCapHeight', 0) or 700
        self.scale = cap / cap_units
        self.cap = cap
        self.gs = gs
        self.adv = [font['hmtx'][n][0] for n in self.names]
        self.bounds = []
        for n in self.names:
            bp = BoundsPen(gs)
            gs[n].draw(bp)
            self.bounds.append(bp.bounds)  # None for a space
        self.tracking = tracking_em * self.upm  # font units between glyphs

    def positions(self) -> list[float]:
        xs, x = [], 0.0
        for a in self.adv:
            xs.append(x)
            x += a + self.tracking
        return xs

    def ink(self) -> tuple[float, float]:
        xs = self.positions()
        lefts = [x + b[0] for x, b in zip(xs, self.bounds) if b]
        rights = [x + b[2] for x, b in zip(xs, self.bounds) if b]
        return min(lefts), max(rights)

    def width(self) -> float:
        a, b = self.ink()
        return (b - a) * self.scale

    def fit_width(self, target: float) -> None:
        """Sets the tracking so the ink width equals `target` (px)."""
        self.tracking = 0.0
        w0 = self.width()
        gaps = len(self.names) - 1
        self.tracking = (target - w0) / self.scale / gaps

    def path(self, x0: float, baseline: float) -> str:
        """SVG path data with the ink's left edge at x0."""
        left, _ = self.ink()
        d = []
        for x, n in zip(self.positions(), self.names):
            pen = SVGPathPen(self.gs, ntos=f)
            # font units → px: flip y; ink left edge to x0.
            t = (self.scale, 0, 0, -self.scale, x0 + (x - left) * self.scale, baseline)
            self.gs[n].draw(TransformPen(pen, t))
            d.append(pen.getCommands())
        return ''.join(d)


def wordmark(cap: float):
    """Returns (svg_fn(x, y_top, theme) -> str, width, height)."""
    top = Line(SEMI, 'APPROACH', cap, 0.18)
    sub = Line(SEMI, 'STRENGTH', cap * 0.40)
    sub.fit_width(top.width())
    gap = cap * 0.34
    height = cap + gap + sub.cap

    def svg(x: float, y: float, th: dict) -> str:
        return (
            f'<path fill="{th["top"]}" d="{top.path(x, y + cap)}"/>'
            f'<path fill="{th["sub"]}" d="{sub.path(x, y + height)}"/>'
        )

    return svg, top.width(), height


# The mark's ink box in its 64 × 64 source: x 6..58, y 16..57.
MARK_INK = (6, 16, 58, 57)


def mark(x: float, y: float, h: float, th: dict) -> str:
    """The barbell + chevron mark with its ink box at (x, y), ink height h."""
    s = h / (MARK_INK[3] - MARK_INK[1])
    tx, ty = x - MARK_INK[0] * s, y - MARK_INK[1] * s
    return (
        f'<g transform="translate({f(tx)} {f(ty)}) scale({f(s)})">'
        f'<polyline points="18,34 32,16 46,34" fill="none" stroke="{th["chevron"]}" stroke-width="5" stroke-linecap="square"/>'
        f'<line x1="6" y1="48" x2="58" y2="48" stroke="{th["bar"]}" stroke-width="3"/>'
        f'<rect x="11" y="39" width="5" height="18" fill="{th["bar"]}"/><rect x="17" y="42" width="3" height="12" fill="{th["bar"]}"/>'
        f'<rect x="48" y="39" width="5" height="18" fill="{th["bar"]}"/><rect x="44" y="42" width="3" height="12" fill="{th["bar"]}"/>'
        '</g>'
    )


def mark_width(h: float) -> float:
    return (MARK_INK[2] - MARK_INK[0]) * h / (MARK_INK[3] - MARK_INK[1])


def badge(x: float, y: float, d: float, th: dict, uid: str) -> str:
    """The volleyball badge (from the old lockup) in a d × d box."""
    s = d / 100
    seams = ''.join(
        f'<g{"" if r == 0 else f" transform=\"rotate({r} 50 50)\""}><g clip-path="url(#seg{uid})"><circle cx="28.58" cy="29" r="42"/><circle cx="28.58" cy="29" r="54"/></g><path d="M50 50A30 30 0 0 0 50 8"/></g>'
        for r in (0, 120, 240)
    )
    inner = mark(19.6 + 6 * 0.95, 15.3 + 16 * 0.95, 41 * 0.95, th)
    return (
        f'<g transform="translate({f(x)} {f(y)}) scale({f(s)})">'
        f'<defs><clipPath id="seg{uid}"><path d="M50 50A30 30 0 0 0 50 8A42 42 0 0 1 86.37 71A30 30 0 0 1 50 50Z"/></clipPath></defs>'
        f'<circle cx="50" cy="50" r="42" fill="{th["ball"]}"/>'
        f'<g fill="none" stroke="{th["seam"]}" stroke-width="1.8">{seams}<circle cx="50" cy="50" r="42" stroke-width="2.2"/></g>'
        f'{inner}</g>'
    )


def doc(w: float, h: float, body: str, label: str) -> str:
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {f(w)} {f(h)}" width="{f(w)}" height="{f(h)}" role="img" aria-label="{label}">'
        f'<title>{label}</title>{body}</svg>\n'
    )


def build() -> dict[str, str]:
    out = {}
    for name, th in THEMES.items():
        # Wordmark alone.
        wm, ww, wh = wordmark(40)
        out[f'wordmark-on-{name}.svg'] = doc(ww, wh, wm(0, 0, th), 'Approach Strength')

        # Plain mark + wordmark (site header, app sign-in, consent form header). Mark ink height = wordmark height.
        wm, ww, wh = wordmark(40)
        mw = mark_width(wh)
        gap = wh * 0.45
        out[f'lockup-plain-on-{name}.svg'] = doc(mw + gap + ww, wh, mark(0, 0, wh, th) + wm(mw + gap, 0, th), 'Approach Strength')

        # Stacked: mark centered above the wordmark (square uses).
        wm, ww, wh = wordmark(40)
        mh = wh * 1.6
        mw = mark_width(mh)
        gap = wh * 0.6
        W = max(ww, mw)
        out[f'lockup-stacked-on-{name}.svg'] = doc(
            W, mh + gap + wh, mark((W - mw) / 2, 0, mh, th) + wm((W - ww) / 2, mh + gap, th), 'Approach Strength'
        )

        # Badge + wordmark + tagline (site hero, docs, slides).
        wm, ww, wh = wordmark(34)
        tag = Line(REG, 'Build it under the bar. Use it above the net.', 9.5, 0.02)
        D = 100
        x0 = D + 24
        tag_y = (D - (wh + 14 + tag.cap)) / 2
        body = badge(0, 0, D, th, name) + wm(x0, tag_y, th) + f'<path fill="{th["tag"]}" d="{tag.path(x0, tag_y + wh + 14 + tag.cap)}"/>'
        out[f'lockup-on-{name}.svg'] = doc(x0 + max(ww, tag.width()), D, body, 'Approach Strength. Build it under the bar. Use it above the net.')

    # Coach board signature: plain mark (24 px) + "Powered by Approach Strength" (14 px text), all Steel (brand guide §8).
    steel = dict(THEMES['dark'], chevron=C['steel'], bar=C['steel'])
    text = Line(REG, 'Powered by Approach Strength', 14 * 0.727)  # 14 px type ≈ 10.2 px caps
    mh = 24
    mw = mark_width(mh)
    gap = 8
    base = (mh + text.cap) / 2
    body = mark(0, 0, mh, steel) + f'<path fill="{C["steel"]}" d="{text.path(mw + gap, base)}"/>'
    out['powered-by-on-board.svg'] = doc(mw + gap + text.width(), mh, body, 'Powered by Approach Strength')
    return out


if __name__ == '__main__':
    for n, svg in build().items():
        (OUT / n).write_text(svg)
        print('wrote', (OUT / n).relative_to(ROOT))
