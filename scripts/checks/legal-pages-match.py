#!/usr/bin/env python3
"""2.2.1 acceptance: the website's /privacy, /terms and /consent match docs/legal/ word for word.

    python3 scripts/checks/legal-pages-match.py [site folder]

Compares the visible text of each page (between the site header and footer) with the matching section of
docs/legal/, after removing Markdown syntax and normalizing whitespace. Allowed differences, and only these:
"[publish date]" is filled in, Legal's "(Attorney to ...)" review markers are left out, and the consent page's
printing instruction line is site chrome. Exits 1 on any mismatch and prints where it starts.
"""
import html
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SITE = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT.parent / 'approachstrength-site'
NOTICE = (ROOT / 'docs/legal/soft-launch-notice.md').read_text()
FORM = (ROOT / 'docs/legal/parent-consent-form.md').read_text()
PRINT_LINE = 'Print this page (or save it as a PDF), have a parent or guardian check the boxes and sign, and give it to the coach.'


def md_words(md: str, date: str) -> str:
    md = re.sub(r'\s*\*\(Attorney to [^)]*\)\*', '', md)
    md = md.replace('[publish date]', date)
    md = re.sub(r'^\s*---\s*$', ' ', md, flags=re.M)
    md = re.sub(r'^\s*\|?\s*:?-{3,}.*$', ' ', md, flags=re.M)  # table separator rows
    md = re.sub(r'^\s*#+\s*', ' ', md, flags=re.M)
    md = re.sub(r'^\s*(\d+\.|-)\s+', ' ', md, flags=re.M)  # list markers (HTML renders numbers itself)
    md = md.replace('☐', ' ').replace('|', ' ').replace('**', '').replace('`', '')
    md = re.sub(r'(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?!\w)', r'\1', md)
    md = re.sub(r'_{4,}', ' ', md)
    return ' '.join(md.split())


def page_words(path: Path) -> tuple[str, str]:
    h = path.read_text()
    body = h.split('</header>', 1)[1].split('<footer', 1)[0]
    body = body.replace(PRINT_LINE, ' ')
    body = re.sub(r'</?(strong|em|a|span)\b[^>]*>', '', body)  # inline tags add no space
    text = html.unescape(re.sub(r'<[^>]+>', ' ', body))
    date = re.search(r'Last updated: ([A-Z][a-z]+ \d+, \d{4})', text)
    return ' '.join(text.split()), date.group(1) if date else ''


def section(md: str, start: str, end: str | None) -> str:
    a = md.index(start)
    return md[a : md.index(end, a) if end else len(md)]


def compare(name: str, md: str, title_from: str, title_to: str) -> bool:
    got, date = page_words(SITE / name)
    want = md_words(md.replace(title_from, title_to, 1), date)
    if got == want:
        print(f'PASS {name}: {len(want.split())} words match docs/legal/')
        return True
    k = next((i for i, (a, b) in enumerate(zip(got, want)) if a != b), min(len(got), len(want)))
    print(f'FAIL {name}: first difference at character {k}')
    print('  page: …' + got[max(0, k - 80) : k + 80])
    print('  docs: …' + want[max(0, k - 80) : k + 80])
    return False


ok = True
ok &= compare('privacy.html', section(NOTICE, '## Part A: Privacy Notice', '## Part B'), '## Part A: Privacy Notice', '# Privacy Notice')
ok &= compare('terms.html', section(NOTICE, '## Part B: Terms (Soft Launch)', '### Drafting notes'), '## Part B: Terms (Soft Launch)', '# Terms (Soft Launch)')
form = section(FORM, '## Approach Strength: Volleyball Fitness', '## Notes for the attorney')
ok &= compare('consent.html', form, '', '')
for n in ('privacy.html', 'terms.html', 'consent.html', 'index.html', '404.html'):
    t = (SITE / n).read_text().lower()
    if 'thehbcvbc' in t or '<script' in t or '<form' in t or '<input' in t:
        print(f'FAIL {n}: old address, script, or form found')
        ok = False
sys.exit(0 if ok else 1)
