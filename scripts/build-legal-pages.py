#!/usr/bin/env python3
"""Builds public/privacy.html, terms.html and consent.html from docs/legal/ (spec P8).

    python3 scripts/build-legal-pages.py

Plain HTML with the brand colors: no scripts, no external fonts, no trackers.
Internal notes (owner lines, "Notes for the attorney", "Attorney to finalize") are left out.
Contact email and publish date come from the settings below (docs/legal keeps its placeholders);
an empty setting leaves the visible placeholder.
"""
import html
import re
from pathlib import Path

# Owner-supplied (founder checklist): personal or business, never a district address.
CONTACT_EMAIL = 'ryan@thehbcvbc.com'
PUBLISH_DATE = 'November 10, 2026'

ROOT = Path(__file__).resolve().parent.parent
NOTICE = (ROOT / 'docs/legal/soft-launch-notice.md').read_text()
FORM = (ROOT / 'docs/legal/parent-consent-form.md').read_text()

CSS = """    :root { --bg:#0B0B0C; --surface:#1C1D20; --border:#3A3D42; --text:#FFFFFF; --muted:#A7ABB2; --warn:#E2A336; }
    @media (prefers-color-scheme: light) { :root { --bg:#FFFFFF; --surface:#F1F2F4; --border:#C9CDD2; --text:#0B0B0C; --muted:#3A3D42; } }
    * { box-sizing: border-box; }
    body { margin:0; background:var(--bg); color:var(--text); font: 16px/1.55 Inter, -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif; }
    main { max-width: 760px; margin: 0 auto; padding: 32px 16px 64px; }
    header { display:flex; align-items:center; gap:12px; margin-bottom: 24px; }
    header img { width:40px; height:40px; border-radius:10px; }
    .brand { font-weight:600; letter-spacing:.18em; text-transform:uppercase; font-size:14px; }
    h1 { font-size:26px; line-height:1.25; margin:0 0 4px; }
    h2 { font-size:18px; margin:32px 0 8px; letter-spacing:.06em; text-transform:uppercase; }
    h3 { font-size:16px; margin:24px 0 6px; }
    .muted { color:var(--muted); font-size:14px; }
    ul, ol { padding-left: 22px; }
    li { margin: 6px 0; }
    a { color:inherit; }
    table { width:100%; border-collapse: collapse; margin: 12px 0; font-size:14px; }
    th, td { border:1px solid var(--border); padding:8px; text-align:left; vertical-align: top; }
    th { background: var(--surface); }
    .table-wrap { overflow-x:auto; }
    .placeholder { background: var(--surface); border:1px dashed var(--warn); padding: 0 4px; border-radius:4px; }
    .box { border:1px solid var(--border); border-radius:12px; padding:12px 16px; margin:12px 0; background:var(--surface); display:flex; gap:12px; align-items:flex-start; }
    .box .sq { flex:none; width:20px; height:20px; border:2px solid var(--text); border-radius:3px; margin-top:3px; }
    .box p { margin:0; }
    .line { display:inline-block; min-width: 200px; border-bottom:1px solid var(--muted); height: 1.2em; vertical-align: bottom; }
    .print { font-size:14px; color:var(--muted); }
    nav { margin-top: 40px; font-size:14px; color:var(--muted); }
    nav a { margin-right: 16px; }
    @media print {
      :root { --bg:#FFFFFF; --surface:#FFFFFF; --border:#000000; --text:#000000; --muted:#333333; }
      body { font-size: 11pt; }
      main { padding: 0; max-width: none; }
      nav, .print { display:none; }
      .placeholder { border: none; padding: 0; }
      h2 { margin-top: 16px; }
    }
"""


def inline(text: str) -> str:
    t = html.escape(text, quote=False)
    # Fill-ins (internal notes inside the placeholders are dropped); empty settings stay visible placeholders.
    email = f'<a href="mailto:{CONTACT_EMAIL}">{CONTACT_EMAIL}</a>' if CONTACT_EMAIL else '<span class="placeholder">[CONTACT EMAIL]</span>'
    t = re.sub(r'\[CONTACT EMAIL[^\]]*\]', email, t)
    t = re.sub(r'\[publish date\]', PUBLISH_DATE or '<span class="placeholder">[publish date]</span>', t)
    t = re.sub(r'_{4,}', '<span class="line"></span>', t)
    t = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', t)
    t = re.sub(r'(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?!\w)', r'<em>\1</em>', t)
    t = re.sub(r'`([^`]+)`', r'\1', t)
    # Link the Terms and Privacy Notice mentioned in the consent form.
    t = t.replace('Approach Terms and Privacy Notice', 'Approach <a href="terms.html">Terms</a> and <a href="privacy.html">Privacy Notice</a>')
    return t


def md_to_html(md: str) -> str:
    out: list[str] = []
    lines = md.strip('\n').split('\n')
    i = 0
    para: list[str] = []

    def flush():
        if para:
            out.append('    <p>' + '<br />'.join(inline(x) for x in para) + '</p>')
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
            out.append(f'    <h{level}>{inline(s[level:].strip())}</h{level}>')
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
            out.append('    <div class="table-wrap"><table>')
            out.append('      <tr>' + ''.join(f'<th>{inline(c)}</th>' for c in head) + '</tr>')
            for r in body:
                out.append('      <tr>' + ''.join(f'<td>{inline(c)}</td>' for c in r) + '</tr>')
            out.append('    </table></div>')
            continue
        if s.startswith('☐'):
            flush()
            out.append(f'    <div class="box"><span class="sq"></span><p>{inline(s[1:].strip())}</p></div>')
            i += 1
            continue
        m = re.match(r'^(\d+)\.\s+(.*)$', s)
        if m or s.startswith('- '):
            flush()
            ordered = bool(m)
            tag = 'ol' if ordered else 'ul'
            out.append(f'    <{tag}>')
            while i < len(lines):
                cur = lines[i]
                cs = cur.strip()
                mm = re.match(r'^(\d+)\.\s+(.*)$', cs) if ordered else None
                if (ordered and mm and not cur.startswith(' ')) or (not ordered and cs.startswith('- ') and not cur.startswith(' ')):
                    item = mm.group(2) if ordered else cs[2:]
                    sub = []
                    i += 1
                    while i < len(lines) and lines[i].startswith('   ') and lines[i].strip().startswith('- '):
                        sub.append(lines[i].strip()[2:])
                        i += 1
                    li = f'      <li>{inline(item)}'
                    if sub:
                        li += '<ul>' + ''.join(f'<li>{inline(x)}</li>' for x in sub) + '</ul>'
                    out.append(li + '</li>')
                else:
                    break
            out.append(f'    </{tag}>')
            continue
        para.append(s)
        i += 1
    flush()
    return '\n'.join(out)


def strip_internal(md: str) -> str:
    md = re.sub(r'\s*\*\(Attorney to finalize\.\)\*', '', md)
    return md


def page(title: str, body: str) -> str:
    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex" />
  <title>{title} · Approach</title>
  <style>
{CSS}  </style>
</head>
<body>
  <main>
    <header><img src="icon-192.png" alt="" /><span class="brand">Approach</span></header>
{body}
    <nav><a href="privacy.html">Privacy Notice</a><a href="terms.html">Terms</a><a href="consent.html">Parent consent form</a></nav>
  </main>
</body>
</html>
"""


def section(md: str, start: str, end: str | None) -> str:
    a = md.index(start)
    b = md.index(end, a) if end else len(md)
    return md[a:b]


# Privacy Notice: Part A. Terms: Part B.
part_a = section(NOTICE, '## Part A: Privacy Notice', '## Part B')
part_b = section(NOTICE, '## Part B: Terms (Soft Launch)', None)
part_a = part_a.replace('## Part A: Privacy Notice', '# Privacy Notice', 1)
part_b = part_b.replace('## Part B: Terms (Soft Launch)', '# Terms (Soft Launch)', 1)

# Consent form: the printable form, without the attorney notes.
form = section(FORM, '## Approach: Volleyball Fitness', '## Notes for the attorney')
form = form.replace('## Approach: Volleyball Fitness\n', '', 1).replace('### Parent/Guardian Consent', '# Parent/Guardian Consent', 1)
form_html = md_to_html(strip_internal(form))
form_html = (
    '    <p class="print">Print this page (or save it as a PDF), have a parent or guardian check the boxes and sign, and give it to the coach.</p>\n'
    '    <p class="muted">Approach: Volleyball Fitness</p>\n' + form_html
)

pages = {
    'privacy.html': page('Privacy Notice', md_to_html(strip_internal(part_a))),
    'terms.html': page('Terms', md_to_html(strip_internal(part_b))),
    'consent.html': page('Parent consent form', form_html),
}
for name, text in pages.items():
    (ROOT / 'public' / name).write_text(text)
    print('wrote public/' + name)
