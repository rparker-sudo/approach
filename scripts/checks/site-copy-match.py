#!/usr/bin/env python3
"""Marketing-site acceptance: published words match docs/copy/website-copy.md v1.1 (spec §10).

    python3 scripts/checks/site-copy-match.py [site folder]

For each page:
  1. Every copy sentence for that page (and the header/footer, copy §1) appears in the page's visible text.
  2. Every visible text fragment on the page comes from the copy (or, on /admin-preview, from the design doc's
     sample data and UI labels, design §5): nothing invented.
  3. <title> and meta description match the copy.
Also checks: prices match pricing.json, which matches the spec §6 block; never-shown items and claim words
(copy §9) are absent; no <script>, <form>, <input>; footer owner line; figure captions end "Sample data.".
Exits 1 on any failure.
"""
import html
import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SITE = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT.parent / 'approachstrength-site'
COPY = (ROOT / 'docs/copy/website-copy.md').read_text()
DESIGN = (ROOT / 'docs/design/marketing-site.md').read_text()
SPEC = (ROOT / 'docs/specs/marketing-site.md').read_text()
fails = 0


def fail(msg: str) -> None:
    global fails
    fails += 1
    print('FAIL', msg)


def norm(t: str) -> str:
    t = html.unescape(t).replace('’', "'").replace('‘', "'").replace('“', '"').replace('”', '"')
    return ' '.join(t.split())


def strip_md(t: str) -> str:
    t = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', t)  # links
    t = re.sub(r'\s*`\[?(Live|Coming soon|Later)\]?`', '', t)  # status labels are checked separately
    t = t.replace('**', '').replace('<small>', '').replace('</small>', '')
    t = re.sub(r'(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?!\w)', r'\1', t)
    return norm(t)


def section(md: str, start: str, end: str | None) -> str:
    a = md.index(start)
    return md[a : md.index(end, a) if end else len(md)]


SKIP_LINE = re.compile(r'^\s*(\*\*`<title>`\*\*|\*\*Meta description:\*\*|\*\*Image rule:\*\*|\*\*Not shown:\*\*|> |\*\*Under each tier:\*\*|\|[-| ]+\||\| (Feature|Button|Panel) \||- Sample (team|coach) names|---|\*\*Header:\*\*|\*\*Footer:\*\*|\*\*Panel titles and captions)')
PREFIX = re.compile(r'^(H1( \(MUST\))?|Intro|Top banner \(MUST\)|Body|Bottom of page|One link back):\s*')


def sentences(md: str) -> list[str]:
    out = []
    for line in md.splitlines():
        if not line.strip() or line.startswith('#') or SKIP_LINE.match(line):
            continue
        cells = [c for c in line.strip().strip('|').split('|')] if line.strip().startswith('|') else [line]
        if line.strip().startswith('|') and cells and cells[0].strip() in ('Programs', 'Coaches', 'Consent', 'Activity', 'Effort', 'Testing'):
            cells = cells[1:]  # admin-preview panel keys (not shown)
        for c in cells:
            c = re.sub(r'^\s*(-|\d+\.)\s+', '', c)
            c = re.sub(r'\*\("([^"]+)" → `?/[a-z-]*`?\)\*', '', c)  # "(See all features → /features)" link hints
            c = re.sub(r'`https?://[^`]+`|`/[a-z-]*`', '', c)  # link targets in tables
            c = re.sub(r'\s*→\s*$', '', c)
            s = PREFIX.sub('', strip_md(c))
            s = re.sub(r'^→\s*', '', s)
            if not s or s in ('Live', 'Coming soon', 'Later'):
                continue
            for part in [x for chunk in s.split(' · ') for x in re.split(r'(?<=[.!?])\s+(?=[A-Z$"])', chunk)]:
                part = part.strip(' ·')
                if len(part) > 2:
                    out.append(part)
    return out


class Text(HTMLParser):
    """Visible text fragments inside <main> (or the whole body), plus title/description/figcaptions."""

    def __init__(self):
        super().__init__()
        self.stack, self.frags, self.title, self.desc, self.caps, self.scripts = [], [], '', '', [], 0
        self.region = None
        self.buf = ''

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'script':
            self.scripts += 1
        if tag == 'img' and a.get('alt') and self.region:
            self.frags.append((self.region, norm(a['alt'])))
        if tag == 'meta' and a.get('name') == 'description':
            self.desc = a.get('content', '')
        if tag in ('main', 'header', 'footer'):
            self.region = tag
        self.stack.append(tag)
        if tag in ('p', 'li', 'h1', 'h2', 'h3', 'td', 'th', 'figcaption', 'summary', 'a', 'span', 'strong', 'em', 'small', 'div', 'section', 'article', 'ul', 'ol', 'tr', 'table', 'svg', 'text', 'title', 'nav', 'br'):
            self.flush()

    def handle_endtag(self, tag):
        self.flush()
        if self.stack:
            self.stack.pop()
        if tag in ('main', 'header', 'footer'):
            self.region = None

    def handle_data(self, data):
        if self.stack and self.stack[-1] == 'title' and 'svg' not in self.stack:
            self.title += data
            return
        if self.stack and self.stack[-1] in ('style', 'script'):
            return
        if 'figcaption' in self.stack and 'svg' not in self.stack and self.stack[-1] == 'figcaption':
            self.caps.append(norm(data))
        self.buf += data

    def flush(self):
        t = norm(self.buf)
        self.buf = ''
        if t and self.region:
            self.frags.append((self.region, t))


def parse(name: str) -> Text:
    p = Text()
    p.feed((SITE / name).read_text())
    p.flush()
    return p


COPY_ALL = norm(strip_md(COPY))
_g = section(COPY, '## 1. Every page', '## 2. Home')
GLOBAL = ['Features', 'Pricing', 'Safety', 'For administrators', 'Log in'] + [strip_md(x) for l in _g.splitlines() if l.startswith('> ') for x in l[2:].split(' · ')]
ALT = [strip_md(re.sub(r'^- [^:]+: "|"$', '', l)) for l in section(COPY, '## 8. Alt text', '## 9.').splitlines() if l.startswith('- ')]
# UI labels the design doc names (design §1.4, §5.2, §5.3, §9) and data-table vocabulary on /admin-preview.
UI = ['Skip to content', 'Menu', 'Log in', 'Show the numbers', 'Sample data', 'Preview', 'Sample organization', 'teams', 'coaches', 'athletes',
      'Team', 'Athletes', 'Season phase', 'Program', 'Volleyball program', 'Example only', 'coach account', 'coach accounts', 'Consistency',
      'Team goal', 'sessions', 'Testing days run', 'Supervision confirmations on file', 'Week', 'of', '%', '/', '·', '→', '✓', 'i', 'Approach Strength',
      # 2.3.0: the one website text change allowed this release, the footer link compliance T10 requires (Legal's words).
      'Consumer health data']
DESIGN_ALL = norm(section(DESIGN, '## 5. Administrator preview', '## 6. Screenshots'))
PAGES = {
    'index.html': ('## 2. Home', '## 3. Features'),
    'features.html': ('## 3. Features', '## 4. Pricing'),
    'pricing.html': ('## 4. Pricing', '## 5. Administrator preview'),
    'admin-preview.html': ('## 5. Administrator preview', '## 6. Safety'),
    'safety.html': ('## 6. Safety', '## 7. 404'),
    '404.html': ('## 7. 404', '## 8. Alt text'),
}

pricing = json.loads((SITE / 'pricing.json').read_text())
spec_json = json.loads(re.search(r'```json\n(.*?)```', SPEC, re.S).group(1))
if pricing != spec_json:
    fail('pricing.json differs from the spec §6 block')
else:
    print('pass pricing.json = spec §6')

for page, (a, b) in PAGES.items():
    sec = section(COPY, a, b)
    p = parse(page)
    text = norm(' '.join(t for _, t in p.frags))
    # 3. title + description
    want_title = re.search(r'\*\*`<title>`\*\* (.+)', sec)
    if want_title and norm(p.title) != strip_md(want_title.group(1)):
        fail(f'{page}: <title> "{norm(p.title)}" ≠ copy "{strip_md(want_title.group(1))}"')
    want_desc = re.search(r'\*\*Meta description:\*\* (.+)', sec)
    if want_desc and norm(p.desc) != strip_md(want_desc.group(1)):
        fail(f'{page}: meta description differs from the copy')
    # 1. every copy sentence appears
    missing = [s for s in sentences(sec) + GLOBAL if norm(s).rstrip('.').lower() not in text.lower()]
    for s in missing:
        fail(f'{page}: copy sentence not on the page: "{s}"')
    # 2. nothing invented
    corpus = COPY_ALL + ' ' + ' '.join(ALT) + (' ' + DESIGN_ALL if page == 'admin-preview.html' else '')
    extra = []
    for region, frag in p.frags:
        f = frag.strip(' ·')
        if not f or f in UI or re.fullmatch(r'[\d.,%$ /·:—–-]+', f) or re.fullmatch(r'Week \d', f) or f in ('Live', 'Coming soon', 'Later'):
            continue
        # Admin preview: rows built from the design §5.2 data set (numbers checked against the design table below).
        if page == 'admin-preview.html' and re.fullmatch(r'1 coach account · Coach [A-D]\.|Consistency \d+%|Team goal \d+ / \d+ sessions|.+ sessions logged per week, weeks 1 to 6: [\d, ]+|\d+ of \d+ · \d+%', f):
            continue
        if page == 'pricing.html' and any(f in pr for t in pricing['tiers'] for pr in [' or '.join(t['prices'])] + t['prices'] + [t.get('limits', '')]):
            continue
        if f not in corpus:
            extra.append(f)
    for f in extra:
        fail(f'{page}: text not in the copy: "{f}"')
    # Captions end "Sample data." and match copy §8.
    for c in p.caps:
        if c and not c.endswith('Sample data.') and page != 'admin-preview.html':
            fail(f'{page}: figcaption does not end "Sample data.": "{c}"')
    if p.scripts:
        fail(f'{page}: <script> found')
    raw = (SITE / page).read_text().lower()
    if '<form' in raw or '<input' in raw:
        fail(f'{page}: <form> or <input> found')
    if '© 2026 ryan parker · approach strength™ · free during the pilot.' not in raw:
        fail(f'{page}: footer owner line missing')
    if not missing and not extra:
        print(f'pass {page}: {len(sentences(sec))} copy sentences present, nothing extra')

# Admin preview data = design §5.2 (team table + panel table).
admin = json.loads((SITE / 'admin-preview.json').read_text())
d52 = section(DESIGN, '### 5.2 Sample data set', '### 5.3')
teams_tbl = [[c.strip(' *') for c in l.strip().strip('|').split('|')] for l in d52.splitlines() if l.startswith('| ') and not l.startswith('| Team') and not l.startswith('|---') and 'Total' not in l and l.count('|') == 6]
for row, t in zip(teams_tbl, admin['teams']):
    if [row[0], int(row[2]), row[3], row[4]] != [t['name'], t['athletes'], t['coach'], t['phase']]:
        fail(f'admin-preview.json team row differs from design §5.2: {row} vs {t["name"]}')
panel_rows = {l.split('|')[1].strip(): [c.strip() for c in l.strip().strip('|').split('|')[1:]] for l in d52.splitlines() if l.startswith('| ') and l.count('|') == 6}
ap = (SITE / 'admin-preview.html').read_text()
for i, t in enumerate(admin['teams']):
    exp = {
        'Parent consent on file': f'{t["consent"][0]} of {t["consent"][1]} · {round(100 * t["consent"][0] / t["consent"][1])}%',
        'Sessions logged, weeks 1–6': ', '.join(map(str, t['weeks'])),
        'Team consistency': f'{t["consistency"]}%',
        'Testing days run': str(t['testing_days']),
        'Supervision confirmations on file': str(t['supervision']),
    }
    for k, v in exp.items():
        if panel_rows.get(k, [''] * 4)[i] != v:
            fail(f'admin-preview {t["name"]} {k}: {v} ≠ design {panel_rows.get(k)}')
    goal = panel_rows['Team goal'][i].replace(' sessions', '')
    if goal != f'{t["goal"][0]} / {t["goal"][1]}':
        fail(f'admin-preview {t["name"]} team goal {t["goal"]} ≠ design {goal}')
    if exp['Parent consent on file'] not in html.unescape(ap):
        fail(f'admin-preview page lacks {exp["Parent consent on file"]}')
if not fails:
    print('pass admin-preview numbers = design §5.2')
if ap.count('class="tags"') < 7 or 'Basketball (example)' not in ap or 'Preview with sample data. The organization view' not in html.unescape(ap):
    fail('admin-preview: tags on every panel and the summary, Basketball (example), or the banner missing')
if re.search(r'Jordan|Ava|Maya|<a [^>]*href="(?!https://app\.approachstrength\.com|mailto:|/|#main)', ap):
    fail('admin-preview: an athlete name or an unexpected link')

# Prices on /pricing come from pricing.json; the per-price label is under every price block.
pp = (SITE / 'pricing.html').read_text()
for t in pricing['tiers']:
    for pr in t['prices']:
        if html.escape(pr) not in pp and pr not in pp:
            fail(f'pricing.html: {pr} missing')
if pp.count('class="price-label"') != len(pricing['tiers']) or pp.count(pricing['label']) < len(pricing['tiers']):
    fail('pricing.html: per-price label not under every price block')
if re.search(r'family|recommended|most popular|<button|subscribe|trial|checkout', pp, re.I):
    fail('pricing.html: family-pay, recommended styling, or a buy button found')

# Never-shown items and claim words (spec §5, copy §9) across all marketing pages.
CLAIMS = r'\b(prevent|injury-proof|safe for|guarantee|proven|science-backed|clinically|#1|max out|your max|1RM|results in|weight loss|calorie|diet|AI|chat|social feed)\b'
for page in PAGES:
    vis = norm(' '.join(t for _, t in parse(page).frags))
    for m in re.finditer(CLAIMS, vis, re.I):
        fail(f'{page}: claim/never-shown word "{m.group(0)}"')
    if re.search(r'\bbest\b', vis, re.I):
        fail(f'{page}: "best"')
print(f'{fails} FAIL' if fails else 'ALL PASS')
sys.exit(1 if fails else 0)
