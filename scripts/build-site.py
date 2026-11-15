#!/usr/bin/env python3
"""Builds the website for https://approachstrength.com (2.2.1 §2) into the site repo folder.

    python3 scripts/build-site.py [--out ../approachstrength-site]

Writes: index.html (placeholder home), 404.html, privacy.html / terms.html / consent.html (from docs/legal/ via
build-legal-pages.py), site.css (from src/lib/brand-tokens.json), robots.txt (allows indexing), CNAME,
assets/ (outlined lockups from assets/brand/source/, favicon) and fonts/ (self-hosted, subset woff2).

Plain HTML and CSS: no scripts, analytics, pixels, cookies, forms, or third-party requests.
GitHub Pages serves /privacy, /terms and /consent from the .html files (the same URLs as before).
"""
import argparse
import importlib.util
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TOKENS = json.loads((ROOT / 'src/lib/brand-tokens.json').read_text())
APP_URL = 'https://app.approachstrength.com'
DOMAIN = 'approachstrength.com'
CONTACT = 'ryan@approachstrength.com'

spec = importlib.util.spec_from_file_location('legal', ROOT / 'scripts/build-legal-pages.py')
legal = importlib.util.module_from_spec(spec)
spec.loader.exec_module(legal)


def css() -> str:
    d, l, s, p = TOKENS['color']['dark'], TOKENS['color']['light'], TOKENS['color']['status'], TOKENS['color']['palette']
    return f"""/* Approach Strength website. Colors from src/lib/brand-tokens.json; fonts self-hosted (no font CDN). */
@font-face {{ font-family: 'Inter Tight'; font-weight: 600; font-style: normal; font-display: swap; src: url(/fonts/inter-tight-600.woff2) format('woff2'); }}
@font-face {{ font-family: 'Inter'; font-weight: 400; font-style: normal; font-display: swap; src: url(/fonts/inter-400.woff2) format('woff2'); }}
@font-face {{ font-family: 'Inter'; font-weight: 600; font-style: normal; font-display: swap; src: url(/fonts/inter-600.woff2) format('woff2'); }}
:root {{
  --bg: {d['background']}; --surface: {d['surface']}; --border: {d['border']}; --text: {d['textPrimary']}; --muted: {d['textSecondary']};
  --primary-bg: {d['actionPrimaryBg']}; --primary-text: {d['actionPrimaryText']}; --warn: {s['warningText']['dark']};
  color-scheme: dark light;
}}
@media (prefers-color-scheme: light) {{
  :root {{ --bg: {l['background']}; --surface: {l['surface']}; --border: {l['border']}; --text: {l['textPrimary']}; --muted: {l['textSecondary']};
    --primary-bg: {l['actionPrimaryBg']}; --primary-text: {l['actionPrimaryText']}; --warn: {s['warningText']['light']}; }}
}}
* {{ box-sizing: border-box; }}
html {{ -webkit-text-size-adjust: 100%; }}
body {{ margin: 0; background: var(--bg); color: var(--text); font: 16px/1.55 Inter, 'Helvetica Neue', Arial, sans-serif; font-variant-numeric: tabular-nums; }}
main {{ max-width: 760px; margin: 0 auto; padding: 24px 16px 64px; }}
a {{ color: inherit; }}
a:focus-visible {{ outline: 2px solid var(--text); outline-offset: 3px; border-radius: 4px; }}
.site-header {{ margin-bottom: 24px; }}
.site-header .lockup {{ display: inline-block; padding: 8px 0; }}
.site-header img {{ display: block; height: 40px; width: auto; }}
h1, h2 {{ font-family: 'Inter Tight', Inter, 'Helvetica Neue', Arial, sans-serif; font-weight: 600; }}
h1 {{ font-size: 28px; line-height: 1.25; margin: 0 0 4px; }}
h2 {{ font-size: 18px; margin: 32px 0 8px; letter-spacing: .06em; text-transform: uppercase; }}
h3 {{ font-size: 16px; margin: 24px 0 6px; }}
.muted {{ color: var(--muted); font-size: 14px; }}
ul, ol {{ padding-left: 22px; }}
li {{ margin: 6px 0; }}
li > ol, li > ul {{ margin-top: 8px; }}
:target {{ scroll-margin-top: 16px; }}
table {{ width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 14px; }}
th, td {{ border: 1px solid var(--border); padding: 8px; text-align: left; vertical-align: top; }}
th {{ background: var(--surface); }}
.table-wrap {{ overflow-x: auto; }}
.box {{ border: 1px solid var(--border); border-radius: {TOKENS['radius']['md']}px; padding: 12px 16px; margin: 12px 0; background: var(--surface); display: flex; gap: 12px; align-items: flex-start; }}
.box .sq {{ flex: none; width: 20px; height: 20px; border: 2px solid var(--text); border-radius: 3px; margin-top: 3px; }}
.box p {{ margin: 0; }}
.line {{ display: inline-block; min-width: 200px; border-bottom: 1px solid var(--muted); height: 1.2em; vertical-align: bottom; }}
.print {{ font-size: 14px; color: var(--muted); }}
.site-footer {{ margin-top: 48px; padding-top: 16px; border-top: 1px solid var(--border); }}
.site-footer nav {{ display: flex; flex-wrap: wrap; gap: 0 20px; font-size: 14px; color: var(--muted); }}
.site-footer a {{ display: inline-flex; align-items: center; min-height: 44px; }}
/* Placeholder home */
.home {{ min-height: 100vh; display: flex; flex-direction: column; }}
.home .hero {{ flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 24px; padding: 48px 0; }}
.home h1 {{ margin: 0; }}
.home h1 img {{ display: block; width: 260px; max-width: 70vw; height: auto; }}
.home .line-intro {{ font-size: 18px; color: var(--muted); margin: 0; max-width: 28em; }}
.button {{ display: inline-flex; align-items: center; justify-content: center; min-height: 56px; min-width: 200px; padding: 0 28px; border-radius: {TOKENS['radius']['md']}px;
  background: var(--primary-bg); color: var(--primary-text); font-weight: 600; font-size: 17px; text-decoration: none; }}
.home .site-footer nav {{ justify-content: center; }}
@media print {{
  :root {{ --bg: #FFFFFF; --surface: #FFFFFF; --border: #000000; --text: #000000; --muted: #333333; }}
  body {{ font-size: 11pt; }}
  main {{ padding: 0; max-width: none; }}
  .site-footer, .print {{ display: none; }}
  h2 {{ margin-top: 16px; }}
}}
"""


PICTURE = """<picture>
          <source srcset="/assets/{name}-on-light.svg" media="(prefers-color-scheme: light)" />
          <img src="/assets/{name}-on-dark.svg" alt="Approach Strength" />
        </picture>"""


def index_html() -> str:
    # 2.2.1 §2: the name, one line, Log in, and links to Privacy, Terms, the consent form and the email. Nothing else.
    body = f"""    <section class="hero">
      <h1>
        {PICTURE.format(name='lockup-stacked')}
      </h1>
      <p class="line-intro">Strength training for volleyball athletes and their coaches.</p>
      <a class="button" href="{APP_URL}">Log in</a>
    </section>"""
    html = legal.page('Home', body, cls='home').replace('<title>Home · Approach Strength</title>', '<title>Approach Strength</title>')
    return html.replace(legal.HEADER + '\n', '', 1)  # the hero already shows the lockup


def not_found_html() -> str:
    body = """    <h1>Page not found</h1>
    <p><a href="/">Go to the home page</a></p>"""
    return legal.page('Page not found', body)


FAVICON = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#0B0B0C"/>
<polyline points="18,34 32,16 46,34" fill="none" stroke="#C9CDD2" stroke-width="5" stroke-linecap="square"/>
<line x1="6" y1="48" x2="58" y2="48" stroke="#FFFFFF" stroke-width="3"/>
<rect x="11" y="39" width="5" height="18" fill="#FFFFFF"/><rect x="17" y="42" width="3" height="12" fill="#FFFFFF"/>
<rect x="48" y="39" width="5" height="18" fill="#FFFFFF"/><rect x="44" y="42" width="3" height="12" fill="#FFFFFF"/></svg>
"""

FONTS = ROOT / 'node_modules/@expo-google-fonts'
SUBSET = 'U+0000-00FF,U+0131,U+0152-0153,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,U+2122,U+2190-2193,U+2212,U+2215'


def fonts(out: Path) -> None:
    from fontTools import subset

    (out / 'fonts').mkdir(exist_ok=True)
    for src, name in (
        ('inter-tight/600SemiBold/InterTight_600SemiBold.ttf', 'inter-tight-600'),
        ('inter/400Regular/Inter_400Regular.ttf', 'inter-400'),
        ('inter/600SemiBold/Inter_600SemiBold.ttf', 'inter-600'),
    ):
        subset.main([str(FONTS / src), f'--unicodes={SUBSET}', '--flavor=woff2', '--layout-features=kern,liga,tnum', f'--output-file={out / "fonts" / (name + ".woff2")}'])
    shutil.copy(FONTS / 'inter/LICENSE_FONT', out / 'fonts/OFL-Inter.txt')
    shutil.copy(FONTS / 'inter-tight/LICENSE_FONT', out / 'fonts/OFL-InterTight.txt')


def build(out: Path) -> None:
    out.mkdir(parents=True, exist_ok=True)
    (out / 'assets').mkdir(exist_ok=True)
    for n in ('lockup-plain', 'lockup-stacked', 'lockup', 'wordmark'):
        for t in ('dark', 'light'):
            shutil.copy(ROOT / f'assets/brand/source/{n}-on-{t}.svg', out / 'assets')
    (out / 'assets/favicon.svg').write_text(FAVICON)
    fonts(out)
    (out / 'site.css').write_text(css())
    files = {'index.html': index_html(), '404.html': not_found_html(), **legal.build()}
    for name, text in files.items():
        (out / name).write_text(text)
    (out / 'robots.txt').write_text('User-agent: *\nAllow: /\n')
    (out / 'CNAME').write_text(DOMAIN + '\n')
    (out / '.nojekyll').write_text('')
    readme = out / 'README.md'
    if not readme.exists():
        readme.write_text(
            '# approachstrength.com\n\nThe Approach Strength website (GitHub Pages, custom domain `approachstrength.com`).\n\n'
            'Generated by `scripts/build-site.py` in `rparker-sudo/approach`; legal pages come only from that repo\'s `docs/legal/`. '
            "Don't edit the HTML here by hand.\n\nPlain HTML and CSS: no scripts, analytics, cookies, forms, or third-party requests. "
            'Fonts are self-hosted (Inter and Inter Tight, SIL Open Font License, see `fonts/`).\n'
        )
    print('built', out)


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', default=str(ROOT.parent / 'approachstrength-site'))
    build(Path(ap.parse_args().out))
