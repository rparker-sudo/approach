#!/usr/bin/env python3
"""Builds privacy.html, terms.html and consent.html for the website from docs/legal/ (2.2.1 §2, §7.1).

    python3 scripts/build-legal-pages.py [--out ../approachstrength-site]

The pages are published on https://approachstrength.com/privacy, /terms and /consent (the site repo
rparker-sudo/approachstrength-site). The app's own public/privacy.html etc. are redirects to them.

Rules (Legal; docs/legal/soft-launch-notice.md): the build publishes Legal's text exactly. There is
no find-and-replace on legal wording here. The script only:
  - converts the Markdown to HTML (headings, lists, tables, bold, italics, signature lines),
  - picks the published sections (Part A with Part A2, Part B, the printable form) and leaves out Legal's
    drafting notes and the "(Attorney to ...)" review markers, which are internal notes,
  - fills the "[publish date]" placeholder,
  - adds an id="coach-terms" anchor on Terms §4 (markup only) for the in-app Coach Terms link,
  - turns Legal's anchor markup {#health-data} (Part A2) and {#trainer-terms} (§4T) into id attributes (2.3.0;
    markup only, the words around it are untouched).
It stops if the sources fail the 2.2.1 stop rules (contact email and the "Approach Strength" name).
Plain HTML and CSS: no scripts, no third-party requests, self-hosted fonts.
"""
import argparse
import html
import re
import sys
from pathlib import Path

# The date the current text goes live (2.3.0: Privacy Part A2 and Terms §4T, notice v2.5).
PUBLISH_DATE = 'November 16, 2026'
CONTACT = 'ryan@approachstrength.com'

ROOT = Path(__file__).resolve().parent.parent
NOTICE = (ROOT / 'docs/legal/soft-launch-notice.md').read_text()
FORM = (ROOT / 'docs/legal/parent-consent-form.md').read_text()


def stop(msg: str) -> None:
    print('STOP: ' + msg, file=sys.stderr)
    sys.exit(2)


def inline(text: str) -> str:
    t = html.escape(text, quote=False)
    t = t.replace('[publish date]', PUBLISH_DATE)
    t = re.sub(r'_{4,}', '<span class="line"></span>', t)
    t = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', t)
    t = re.sub(r'(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?!\w)', r'<em>\1</em>', t)
    t = re.sub(r'`([^`]+)`', r'\1', t)
    return t


ITEM = re.compile(r'^(\d+)\.\s+(.*)$')

# Legal's anchor markup, e.g. "## Part A2: ... {#health-data}" or "**4T. Trainer Terms** {#trainer-terms}." (markup only).
ANCHOR = re.compile(r'\s*\{#([a-z0-9-]+)\}')


def take_anchor(text: str) -> tuple[str, str]:
    m = ANCHOR.search(text)
    if not m:
        return text, ''
    return text[: m.start()] + text[m.end():], f' id="{m.group(1)}"'


def md_to_html(md: str, indent: str = '    ') -> str:
    out: list[str] = []
    lines = md.strip('\n').split('\n')
    i = 0
    para: list[str] = []

    def flush():
        if para:
            parts = []
            for x in para:
                # The anchor goes where Legal put it: at the start of that line (an empty span, markup only).
                x, a = take_anchor(x)
                parts.append((f'<span{a}></span>' if a else '') + inline(x))
            out.append(indent + '<p>' + '<br />'.join(parts) + '</p>')
            para.clear()

    while i < len(lines):
        line = lines[i]
        s = line.strip()
        if not s or s == '---':
            flush()
            i += 1
            continue
        if s.startswith('#'):
            flush()
            level = len(s) - len(s.lstrip('#'))
            text, ids = take_anchor(s[level:].strip())
            out.append(f'{indent}<h{level}{ids}>{inline(text)}</h{level}>')
            i += 1
            continue
        if s.startswith('|'):
            flush()
            rows = []
            while i < len(lines) and lines[i].strip().startswith('|'):
                cells = [c.strip() for c in lines[i].strip().strip('|').split('|')]
                if not all(re.fullmatch(r':?-{3,}:?', c) for c in cells):
                    rows.append(cells)
                i += 1
            head, body = rows[0], rows[1:]
            out.append(f'{indent}<div class="table-wrap"><table>')
            out.append(f'{indent}  <tr>' + ''.join(f'<th>{inline(c)}</th>' for c in head) + '</tr>')
            for r in body:
                out.append(f'{indent}  <tr>' + ''.join(f'<td>{inline(c)}</td>' for c in r) + '</tr>')
            out.append(f'{indent}</table></div>')
            continue
        if s.startswith('☐'):
            flush()
            out.append(f'{indent}<div class="box"><span class="sq"></span><p>{inline(s[1:].strip())}</p></div>')
            i += 1
            continue
        if ITEM.match(s) or s.startswith('- '):
            flush()
            ordered = bool(ITEM.match(s))
            tag = 'ol' if ordered else 'ul'
            out.append(f'{indent}<{tag}>')
            while i < len(lines):
                cur = lines[i]
                cs = cur.strip()
                top = not cur.startswith(' ')
                mm = ITEM.match(cs) if ordered else None
                if not (top and ((ordered and mm) or (not ordered and cs.startswith('- ')))):
                    break
                item = mm.group(2) if ordered else cs[2:]
                i += 1
                # Indented lines (and blank lines followed by indented lines) belong to this item.
                nested: list[str] = []
                while i < len(lines):
                    nxt = lines[i]
                    if nxt.startswith('   '):
                        nested.append(nxt[3:])
                        i += 1
                    elif not nxt.strip():
                        j = i
                        while j < len(lines) and not lines[j].strip():
                            j += 1
                        if j < len(lines) and lines[j].startswith('   '):
                            nested.extend([''] * (j - i))
                            i = j
                        else:
                            break
                    else:
                        break
                # Anchor for in-app links (2.2.1 §8). Markup only; the item's wording is untouched.
                item, anchor = take_anchor(item)
                anchor = anchor or (' id="coach-terms"' if item.startswith('**Coach Terms.**') else '')
                li = f'{indent}  <li{anchor}>{inline(item)}'
                if nested:
                    li += '\n' + md_to_html('\n'.join(nested), indent + '    ') + '\n' + indent + '  '
                out.append(li + '</li>')
                # A blank line between items keeps the same list.
                j = i
                while j < len(lines) and not lines[j].strip():
                    j += 1
                if j < len(lines) and not lines[j].startswith(' ') and (ITEM.match(lines[j].strip()) if ordered else lines[j].strip().startswith('- ')):
                    i = j
            out.append(f'{indent}</{tag}>')
            continue
        para.append(s)
        i += 1
    flush()
    return '\n'.join(out)


# Legal's internal review markers, e.g. "*(Attorney to finalize.)*" (not published; see the docstring).
ATTORNEY_NOTE = re.compile(r'\s*\*\(Attorney to [^)]*\)\*')


def strip_internal(md: str) -> str:
    return ATTORNEY_NOTE.sub('', md)


def section(md: str, start: str, end: str | None) -> str:
    a = md.index(start)
    b = md.index(end, a) if end else len(md)
    return md[a:b]


APP_URL = 'https://app.approachstrength.com'
# Site chrome (marketing-site spec §2, copy §1, design §1.4). Shared by the marketing pages and the legal pages.
NAV = [('/features', 'Features'), ('/pricing', 'Pricing'), ('/safety', 'Safety'), ('/admin-preview', 'For administrators')]


def nav_links(current: str | None) -> str:
    out = []
    for href, label in NAV:
        cur = ' aria-current="page"' if href == current else ''
        out.append(f'<a href="{href}"{cur}>{label}</a>')
    return ''.join(out)


def header(current: str | None = None) -> str:
    return f"""  <header class="site-header">
    <div class="wrap header-row">
      <a href="/" class="lockup"><img class="lockup-screen" src="/assets/lockup-plain-on-dark.svg" alt="Approach Strength" width="206" height="40" /><img class="lockup-print" src="/assets/lockup-plain-on-light.svg" alt="" width="206" height="40" /></a>
      <nav class="nav-desktop" aria-label="Main">{nav_links(current)}<a class="button" href="{APP_URL}">Log in</a></nav>
      <details class="menu">
        <summary><span class="menu-icon" aria-hidden="true"></span>Menu</summary>
        <nav class="menu-panel" aria-label="Main">{nav_links(current)}<a class="button" href="{APP_URL}">Log in</a></nav>
      </details>
    </div>
  </header>"""


HEADER = header()

FOOTER = """  <footer class="site-footer">
    <div class="wrap">
      <nav aria-label="Footer"><a href="/privacy">Privacy</a><span aria-hidden="true"> · </span><a href="/privacy#health-data">Consumer health data</a><span aria-hidden="true"> · </span><a href="/terms">Terms</a><span aria-hidden="true"> · </span><a href="/consent">Parent consent form</a><span aria-hidden="true"> · </span><a href="mailto:{email}">{email}</a></nav>
      <p class="owner">© 2026 Ryan Parker · Approach Strength™ · Free during the pilot.</p>
    </div>
  </footer>""".format(email=CONTACT)


def page(title: str, body: str, cls: str = 'legal', current: str | None = None, description: str | None = None, full_title: str | None = None) -> str:
    desc = f'\n  <meta name="description" content="{html.escape(description)}" />' if description else ''
    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="dark" />
  <title>{full_title or f'{title} · Approach Strength'}</title>{desc}
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml" />
  <link rel="stylesheet" href="/site.css" />
</head>
<body>
  <a class="skip" href="#main">Skip to content</a>
{header(current)}
  <main id="main" class="{cls}">
    <div class="wrap{' wrap-read' if cls == 'legal' else ''}">
{body}
    </div>
  </main>
{FOOTER}
</body>
</html>
"""


def build() -> dict[str, str]:
    # Stop rules (2.2.1 process rule 5; CLAUDE.md hard stops).
    compliance = (ROOT / 'docs/compliance.md').read_text()
    if CONTACT not in compliance:
        stop('docs/compliance.md does not name ' + CONTACT)
    for name, src in (('soft-launch-notice.md', NOTICE), ('parent-consent-form.md', FORM)):
        if 'Approach Strength' not in src:
            stop(f'docs/legal/{name} does not say "Approach Strength"')

    part_a = section(NOTICE, '## Part A: Privacy Notice', '## Part B')
    part_b = section(NOTICE, '## Part B: Terms (Soft Launch)', '### Drafting notes')
    part_a = '# Privacy Notice' + part_a[len('## Part A: Privacy Notice'):]
    part_b = '# Terms (Soft Launch)' + part_b[len('## Part B: Terms (Soft Launch)'):]

    # Consent form: the printable form, without the attorney notes. Its "## <name>: Volleyball Fitness" line
    # becomes the small line above the H1.
    m = re.search(r'^## (.+: Volleyball Fitness)\n', FORM, re.M)
    if not m:
        stop('consent form heading not found')
    form = section(FORM, m.group(0), '## Notes for the attorney')[len(m.group(0)):]
    form = re.sub(r'^### (Parent/Guardian Consent)', r'# \1', form, count=1, flags=re.M)
    form_html = (
        '    <p class="print">Print this page (or save it as a PDF), have a parent or guardian check the boxes and sign, and give it to the coach.</p>\n'
        f'    <p class="muted">{inline(m.group(1))}</p>\n' + md_to_html(strip_internal(form))
    )
    pages = {
        'privacy.html': page('Privacy Notice', md_to_html(strip_internal(part_a))),
        'terms.html': page('Terms', md_to_html(strip_internal(part_b))),
        'consent.html': page('Parent consent form', form_html),
    }
    for name, text in pages.items():
        if 'thehbcvbc' in text.lower():
            stop(f'{name} contains the old club address')
        if CONTACT not in text:
            stop(f'{name} does not contain {CONTACT}')
    return pages


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', default=str(ROOT.parent / 'approachstrength-site'), help='the site repo folder')
    args = ap.parse_args()
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    for name, text in build().items():
        (out / name).write_text(text)
        print(f'wrote {out / name}')
