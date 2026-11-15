#!/usr/bin/env python3
"""Builds the Approach Strength website (https://approachstrength.com) into the site repo folder.

    python3 scripts/build-site.py [--out ../approachstrength-site]

Marketing site: docs/specs/marketing-site.md v1.1. Every visible word comes from docs/copy/website-copy.md v1.1
(Legal and Training signed off); layout, components and the admin-preview sample data come from
docs/design/marketing-site.md v1.0; prices come only from pricing.json in the site repo (spec §6).

Pages: / · /features · /pricing · /admin-preview · /safety · /privacy · /terms · /consent · 404.
Legal pages are generated only from docs/legal/ (scripts/build-legal-pages.py).

Plain HTML and CSS: no JavaScript, no forms or inputs, no cookies, no third-party requests (fonts are self-hosted,
lockups are outlined SVGs). The phone menu is a <details> element.

Also writes site.css, robots.txt (allows indexing), assets/ (lockups, mark, favicon) and fonts/ (subset woff2).
Screenshots S1–S6 live in the site repo under assets/screens/ (captured from demo mode; see build-snapshot.md).
"""
import argparse
import html
import importlib.util
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
APP_URL = 'https://app.approachstrength.com'
DOMAIN = 'approachstrength.com'
CONTACT = 'ryan@approachstrength.com'
MAILTO = f'<a href="mailto:{CONTACT}">{CONTACT}</a>'

spec = importlib.util.spec_from_file_location('legal', ROOT / 'scripts/build-legal-pages.py')
legal = importlib.util.module_from_spec(spec)
spec.loader.exec_module(legal)

E = html.escape


# ---------------------------------------------------------------- components (design §1.4)
def label(kind: str) -> str:
    """StatusLabel: always text; Live = fill, Coming soon = outline, Later = dashed outline."""
    cls = {'Live': 'live', 'Coming soon': 'soon', 'Later': 'later'}[kind]
    return f'<span class="status status-{cls}">{kind}</span>'


def feature_card(title: str, kind: str, body: str, extra: str = '', tag: str = 'h3') -> str:
    return f"""<article class="feature-card">
        <{tag} class="feature-title"><span>{title}</span> {label(kind)}</{tag}>
        <p>{body}</p>{extra}
      </article>"""


SHOTS = {
    # id: (file base, width, height, alt from copy §8)
    'S1': ('s1-coach-board', 1600, 900, 'Coach board on a weight-room screen showing athlete tiles with current exercise, set count, and rest timers. Sample data.'),
    'S2': ('s2-station-grid', 1600, 900, 'Board showing four racks rotating through stations with a shared countdown. Sample data.'),
    'S3': ('s3-effort-board', 1424, 572, 'Team effort leaderboard ranked by points and consistency. Sample data.'),
    'S4': ('s4-week-grid', 1440, 698, 'Program builder with a week of volleyball strength sessions around a Saturday tournament. Sample data.'),
    'S5': ('s5-athlete-today', 390, 844, "Athlete's phone showing today's workout and their rack card. Sample data."),
    'S6': ('s6-touch-entry', 390, 844, "Athlete's phone entering approach-touch attempts in inches on a testing day. Sample data."),
}


def figure(sid: str, cls: str = '') -> str:
    base, w, h, alt = SHOTS[sid]
    phone = ' figure-phone' if w < 500 else ''
    return f"""<figure class="figure{phone} {cls}">
        <picture>
          <source type="image/webp" srcset="/assets/screens/{base}.webp" />
          <img src="/assets/screens/{base}.png" width="{w}" height="{h}" alt="{E(alt)}" loading="lazy" decoding="async" />
        </picture>
        <figcaption>{E(alt)}</figcaption>
      </figure>"""


def see_link(href: str, text: str) -> str:
    return f'<p class="see"><a class="text-link" href="{href}">{text} <span aria-hidden="true">→</span></a></p>'


# ---------------------------------------------------------------- Home (copy §2, design §2)
HOME_FEATURES = [
    ('Volleyball program builder', 'Built around positions, season phase, and match week.'),
    ('Every athlete at their level', 'One team program; each athlete gets the version that fits.'),
    ('Live coach board', 'Current exercise, sets, and rest timers for the whole room.'),
    ('Effort board', 'Ranks work, not weight.'),
    ('Racks and station rotation', 'Group athletes by rack and rotate stations on a timer.'),
    ('Testing days', 'Jump tests and coach-supervised strength checks. No one-rep max under 18.'),
]


def entry_card(title: str, line: str, href: str, soon: bool = False) -> str:
    lab = f'<span class="entry-label">{label("Coming soon")}</span>' if soon else ''
    return f"""<a class="entry-card" href="{href}">
          <span class="entry-title">{title} <span class="arrow" aria-hidden="true">→</span></span>
          {lab}<span class="entry-line">{line}</span>
        </a>"""


def home(pricing: dict) -> str:
    starter = next(t for t in pricing['tiers'] if t['id'] == 'coach-starter')
    assert starter['prices'][0] == '$399/year', 'home summary says $399 a year; pricing.json must match'
    steps = [
        ('Build the season.', 'Pick positions, season phase, and match days. Approach Strength builds the program from your choices, and you can change any of it. Every athlete gets their level\'s version of each exercise.'),
        ('Athletes log on their phones.', "Today's workout, sets, reps, and rest timers, at school or at home."),
        ('Run the room from the board.', "Put the live board on a screen: who's lifting, who's resting, who's done. Never weights."),
    ]
    steps_html = ''.join(
        f'<li class="step"><span class="step-num" aria-hidden="true">{i}</span><h3>{E(t)}</h3><p>{E(b)}</p></li>' for i, (t, b) in enumerate(steps, 1)
    )
    feats = ''.join(feature_card(t, 'Live', E(b)) for t, b in HOME_FEATURES)
    body = f"""      <section class="hero">
        <h1><img src="/assets/lockup-stacked-on-dark.svg" alt="Approach Strength" width="200" height="181" /></h1>
        <p class="tagline">Build it under the bar. Use it above the net.</p>
        <p class="lead">Strength training for volleyball athletes and their coaches.</p>
        <p><small class="pill">Free during the pilot.</small></p>
        <div class="entry-grid">
        {entry_card('Coach', "Build your team's program and run the weight room.", f'{APP_URL}/sign-in?role=coach')}
        {entry_card('Athlete', "See today's workout and log your sets.", f'{APP_URL}/sign-in?role=athlete')}
        {entry_card('Administrator', 'Preview the organization view. Coming soon.', '/admin-preview', soon=True)}
        </div>
      </section>
      <section class="band" aria-labelledby="how">
        <h2 class="kicker" id="how">How it works</h2>
        <ol class="steps">{steps_html}</ol>
        {figure('S1', 'figure-wide')}
      </section>
      <section class="band" aria-labelledby="whats">
        <h2 class="kicker" id="whats">What's in it</h2>
        <div class="card-grid">
      {feats}
        </div>
        {see_link('/features', 'See all features')}
      </section>
      <section class="band band-split" aria-labelledby="safety">
        <h2 class="kicker" id="safety">Safety and privacy</h2>
        <div>
          <p>Every athlete under 18 needs a signed parent consent form before they log anything. No one-rep-max tests for minors. Team boards show effort, never weights. No ads, no tracking, no selling data.</p>
          {see_link('/safety', 'How we handle safety')}
        </div>
      </section>
      <section class="band band-split" aria-labelledby="pricing">
        <h2 class="kicker" id="pricing">Pricing</h2>
        <div>
          <p><strong>Free during the pilot.</strong> Planned coach plans start at $399 a year. <em class="price-label">{E(pricing['label'])}</em></p>
          {see_link('/pricing', 'See planned prices')}
        </div>
      </section>"""
    return legal.page(
        'Home', body, cls='home', current=None, full_title='Approach Strength · Strength training for volleyball',
        description='Volleyball strength training for high school and club teams. Coaches build the program, athletes log on their phones, and the live board runs the weight room. Free during the pilot.',
    )


# ---------------------------------------------------------------- Features (copy §3, design §3)
LIVE_WITH_IMAGES = [
    ('Live coach board', 'Mirror it to a screen in the weight room. Each athlete\'s tile shows the current exercise, set, and rest countdown. Team totals across the top. Never weights.', 'S1'),
    ('Effort board', 'Effort, consistency, and streaks. Never weights. Points come from doing the plan, and rest days never break a streak. Athletes appear as "Jordan M." or initials, or can hide.', 'S3'),
    ('Volleyball program builder', 'Set positions, season phase, and match days. The program fits around matches and tournament weekends, with lighter weeks built in.', 'S4'),
    ('Rack groups and station rotation', "Split the team into racks by hand or automatically. Run stations, and the racks rotate on sets or a timer. The board shows each rack's current and next station.", 'S2'),
    ('Testing days', 'Approach touch, broad jump, and med-ball throw, plus coach-supervised strength checks for intermediate and advanced athletes. No one-rep max for athletes under 18. Strength checks are supervised rep-max tests the coach confirms that day. Strength-check results stay private to the athlete and coach. With parent permission, team boards can show jump-test improvement in inches.', 'S6'),
    ('Every athlete at their level', "Coaches set each athlete's level: beginner, intermediate, or advanced. Each athlete gets their level's version of every exercise, so one team program fits the whole roster.", 'S5'),
]
LIVE_TEXT = [
    ('Supersets and circuits', 'Pair or group exercises with set rest times. Heavy lifts keep full rest.'),
    ('Home workouts', "Mix weight-room days with home days when the room isn't available. Home sessions count like any other session."),
    ('School and club in one schedule', "An athlete on a school team and a club team sees both teams' practices and matches in one place, and follows one lifting program. Each coach sees only their own team."),
    ('Parent consent tracking', "Coaches record each family's signed consent form and see who's still missing. Optional features stay off until a parent agrees."),
    ('Fuel tips', 'General guidance on eating around practices and matches, with sources. General guidance, not individual advice.'),
]
SOON = [
    ('Keep training after the season', "At season's end, athletes keep their level and history and keep training on their own."),
    ('Digital parent consent', 'Parents review and sign online instead of on paper.'),
    ('Team logos on the board', "Add your team's logo next to its color on the board."),
    ('Post a 4-week block in one tap', 'Publish a full training block at once.'),
    ('Offline logging', "Log sets with no signal; they sync when you're back online."),
]
LATER = [
    ('iPhone app', 'A native iPhone app in the App Store. Today Approach Strength runs in any phone or computer browser.', ''),
    ('Organization view', 'A team-totals view for athletic directors and club directors.', '/admin-preview'),
    ('Effort from heart-rate straps', 'Effort zones and points from heart-rate straps. Effort only, never heart-rate numbers on a shared screen.', ''),
]


def features() -> str:
    rows = []
    for i, (t, b, sid) in enumerate(LIVE_WITH_IMAGES):
        side = ' feature-row-flip' if i % 2 else ''
        rows.append(f"""<div class="feature-row{side}">
        {figure(sid)}
        {feature_card(t, 'Live', E(b))}
      </div>""")
    live_text = ''.join(feature_card(t, 'Live', E(b)) for t, b in LIVE_TEXT)
    soon = ''.join(feature_card(t, 'Coming soon', E(b)) for t, b in SOON)
    later = ''.join(
        feature_card(t, 'Later', E(b), extra=f'\n        <p class="see"><a class="text-link" href="{href}"><span aria-hidden="true">→ </span>See the preview</a></p>' if href else '')
        for t, b, href in LATER
    )
    body = f"""      <section class="page-head">
        <h1>What it does</h1>
        <p class="lead">Built for the volleyball coach who also runs the weight room. Each feature is labeled: <strong>Live</strong> is in the app today. <strong>Coming soon</strong> is next on our roadmap. <strong>Later</strong> is planned for after that. Screenshots use sample data.</p>
        <ul class="legend" aria-label="Labels">
          <li>{label('Live')} is in the app today.</li>
          <li>{label('Coming soon')} is next on our roadmap.</li>
          <li>{label('Later')} is planned for after that.</li>
        </ul>
      </section>
      <section class="band" aria-labelledby="live">
        <h2 id="live">Live</h2>
      {''.join(rows)}
        <div class="card-grid">
      {live_text}
        </div>
      </section>
      <section class="band" aria-labelledby="soon">
        <h2 id="soon">Coming soon</h2>
        <div class="card-grid">
      {soon}
        </div>
      </section>
      <section class="band" aria-labelledby="later">
        <h2 id="later">Later</h2>
        <div class="card-grid">
      {later}
        </div>
      </section>"""
    return legal.page(
        'Features', body, cls='features', current='/features',
        description="What Approach Strength does today and what's coming: program builder, live coach board, effort board, racks and stations, testing days, and more.",
    )


# ---------------------------------------------------------------- Pricing (copy §4, design §4; prices from pricing.json)
TIER_COPY = {
    'athlete': {
        'for': 'For parents of athletes training on their own.',
        'items': [('Your athlete\'s program, workout log, and progress', None), ('Personal programs for training on their own', 'Coming soon'),
                  ("Athletes on a coach's paid team get these free while they're on the roster.", None)],
    },
    'coach-starter': {
        'for': 'For one team.',
        'items': [('Volleyball program builder', None), ('Live coach board and effort board', None), ('Racks and station rotation', None), ('Testing days', None), ('Parent consent tracking', None)],
    },
    'coach-pro': {
        'for': 'For coaches with several teams.',
        'items': [('Everything in Starter, across up to 5 teams', None), ('Assistant coaches', 'Coming soon')],
    },
    'organization': {
        'for': 'For schools and clubs.',
        'items': [('Organization view with team totals', 'preview'), ('Multiple coaches', None)],
    },
}


def price_card(tier: dict, lab: str) -> str:
    c = TIER_COPY[tier['id']]
    status = f' {label(tier["status"])}' if tier.get('status') else ''
    prices = tier['prices']
    if tier['id'] == 'athlete':
        price_html = ''.join(f'<span class="price">{E(p)}</span>' for p in prices)
    elif tier['id'].startswith('coach'):
        price_html = f'<span class="price">{E(prices[0])}</span><span class="price-alt">or {E(prices[1])}</span><span class="price-limits">{E(tier["limits"])}</span>'
    else:
        price_html = ''.join(f'<span class="price">{E(p)}</span>' for p in prices)
    items = []
    for text, kind in c['items']:
        if kind == 'preview':
            items.append(f'<li><span class="check" aria-hidden="true">✓</span><span>{E(text)} <a class="text-link" href="/admin-preview"><span aria-hidden="true">→ </span>Preview</a></span></li>')
        elif kind:
            items.append(f'<li><span class="check" aria-hidden="true">✓</span><span>{E(text)} {label(kind)}</span></li>')
        else:
            items.append(f'<li><span class="check" aria-hidden="true">✓</span><span>{E(text)}</span></li>')
    later = ' price-card-later' if tier.get('status') == 'Later' else ''
    return f"""<article class="price-card{later}">
        <h2 class="tier"><span>{E(tier['name'])}</span>{status}</h2>
        <p class="tier-for">{E(c['for'])}</p>
        <p class="price-block">{price_html}</p>
        <p class="price-label">{E(lab)}</p>
        <ul class="tier-items">{''.join(items)}</ul>
        <p class="questions">Questions? {MAILTO}</p>
      </article>"""


def pricing_page(pricing: dict) -> str:
    cards = ''.join(price_card(t, pricing['label']) for t in pricing['tiers'])
    body = f"""      <section class="page-head">
        <h1>Free during the pilot. Planned prices, may change.</h1>
        <p class="lead">Nothing to buy today. These are the prices we plan to charge after the pilot. We'll update this page if they change.</p>
      </section>
      <section class="price-grid" aria-label="Planned prices">
      {cards}
      </section>"""
    return legal.page(
        'Planned pricing', body, cls='pricing', current='/pricing',
        description='Approach Strength is free during the pilot. See planned prices for athlete, coach, and organization plans. Prices may change.',
    )


# ---------------------------------------------------------------- Administrator preview (copy §5, design §5)
def tags() -> str:
    return '<span class="tags"><span class="tag">Sample data</span><span class="tag">Preview</span></span>'


def panel(title: str, caption: str, inner: str, wide: bool = False) -> str:
    return f"""<section class="sample-panel{' sample-panel-wide' if wide else ''}" aria-label="{E(title)}">
          <div class="panel-head"><div><h2 class="panel-title">{E(title)}</h2><p class="panel-caption">{E(caption)}</p></div>{tags()}</div>
          <div class="panel-body">{inner}</div>
        </section>"""


def bar(pct: float) -> str:
    return f'<span class="bar" aria-hidden="true"><span style="width:{pct:.0f}%"></span></span>'


def mini_chart(team: str, weeks: list[int]) -> str:
    w, h, top = 216, 120, 16
    col = 24
    gap = (w - 6 * col) / 5
    bars = []
    for i, v in enumerate(weeks):
        bh = (h - top - 18) * v / 70
        x = i * (col + gap)
        y = h - 18 - bh
        bars.append(f'<rect x="{x:.1f}" y="{y:.1f}" width="{col}" height="{bh:.1f}" rx="3" />')
        bars.append(f'<text x="{x + col / 2:.1f}" y="{h - 4}" class="axis">{i + 1}</text>')
        if i == 5:
            bars.append(f'<text x="{x + col / 2:.1f}" y="{y - 4:.1f}" class="val">{v}</text>')
    words = ', '.join(str(v) for v in weeks)
    return f"""<figure class="mini">
              <figcaption>{E(team)}</figcaption>
              <svg viewBox="0 0 {w} {h}" role="img" width="{w}" height="{h}"><title>{E(team)} sessions logged per week, weeks 1 to 6: {words}</title>{''.join(bars)}</svg>
            </figure>"""


def admin_preview(data: dict) -> str:
    teams = data['teams']
    total = sum(t['athletes'] for t in teams)
    # Panel 1: programs.
    rows = ''.join(
        f'<tr><th scope="row">{E(t["name"])}<span class="cell-sub">{E(t["phase"])}</span></th><td class="num">{t["athletes"]}</td><td class="col-phase">{E(t["phase"])}</td><td>{E(t["program"])}</td></tr>'
        for t in teams
    )
    p1 = f"""<table class="data"><thead><tr><th scope="col">Team</th><th scope="col">Athletes</th><th scope="col" class="col-phase">Season phase</th><th scope="col">Program</th></tr></thead><tbody>{rows}</tbody></table>
            <p class="note">Example: volleyball today, more sports later.</p>"""
    # Panel 2: coaches.
    p2 = f'<p class="stat">{len(teams)} coach accounts</p><ul class="rows">' + ''.join(
        f'<li><span>{E(t["name"])}</span><span class="muted">1 coach account · {E(t["coach"])}</span></li>' for t in teams
    ) + '</ul>'
    # Panel 3: consent.
    p3 = '<ul class="bars">' + ''.join(
        f'<li><span class="bar-label">{E(t["name"])}</span><span class="bar-row">{bar(100 * t["consent"][0] / t["consent"][1])}<span class="num">{t["consent"][0]} of {t["consent"][1]} · {round(100 * t["consent"][0] / t["consent"][1])}%</span></span></li>'
        for t in teams
    ) + '</ul>'
    # Panel 4: activity (small multiples + numbers table).
    charts = ''.join(mini_chart(t['name'], t['weeks']) for t in teams)
    head = ''.join(f'<th scope="col">Week {i}</th>' for i in range(1, 7))
    trs = ''.join(f'<tr><th scope="row">{E(t["name"])}</th>' + ''.join(f'<td class="num">{v}</td>' for v in t['weeks']) + '</tr>' for t in teams)
    p4 = f"""<div class="minis">{charts}</div>
            <details class="numbers"><summary>Show the numbers</summary><div class="table-wrap"><table class="data"><thead><tr><th scope="col">Team</th>{head}</tr></thead><tbody>{trs}</tbody></table></div></details>"""
    # Panel 5: effort.
    p5 = '<ul class="effort">' + ''.join(
        f'<li><span class="bar-label">{E(t["name"])}</span>'
        f'<span class="bar-row"><span class="num">Consistency {t["consistency"]}%</span>{bar(t["consistency"])}</span>'
        f'<span class="bar-row"><span class="num">Team goal {t["goal"][0]} / {t["goal"][1]} sessions</span>{bar(100 * t["goal"][0] / t["goal"][1])}</span></li>'
        for t in teams
    ) + '</ul>'
    # Panel 6: testing (no results, ever).
    trs6 = ''.join(f'<tr><th scope="row">{E(t["name"])}</th><td class="num">{t["testing_days"]}</td><td class="num">{t["supervision"]}</td></tr>' for t in teams)
    p6 = f'<table class="data"><thead><tr><th scope="col">Team</th><th scope="col">Testing days run</th><th scope="col">Supervision confirmations on file</th></tr></thead><tbody>{trs6}</tbody></table>'
    body = f"""      <div class="preview-banner"><span class="info" aria-hidden="true">i</span><p><strong>Preview with sample data. The organization view isn't available yet.</strong> {label('Coming soon')}</p></div>
      <section class="page-head">
        <h1>Where we're headed for schools and clubs</h1>
        <p class="lead">This is a sample, built with made-up teams and numbers. It shows team totals only. Approach Strength is for coaches and their teams today.</p>
      </section>
      <section class="summary-strip sample-panel" aria-label="Sample organization">
        <div class="panel-head"><h2 class="panel-title">Sample organization</h2>{tags()}</div>
        <div class="panel-body stats"><p><span class="stat">{len(teams)}</span> teams</p><p><span class="stat">{len(teams)}</span> coaches</p><p><span class="stat">{total}</span> athletes</p></div>
      </section>
      <div class="panel-grid">
        {panel('Programs at a glance', 'Four sample teams. Volleyball is the only sport programmed today.', p1)}
        {panel('Coaches', 'Coach accounts per team. Names are samples.', p2)}
        {panel('Parent consent on file', 'Share of athletes with a signed form, per team.', p3)}
        {panel('Training activity', 'Sessions logged per team, per week.', p4, wide=True)}
        {panel('Team effort', 'Team consistency and progress toward the team goal.', p5)}
        {panel('Testing days', 'Testing days run and supervision confirmations on file. No results.', p6)}
      </div>
      <p class="closing">Interested in this for your school or club? Email {MAILTO}.</p>
      <p class="closing">Coaches and athletes: <a class="text-link" href="{APP_URL}">Log in</a></p>"""
    return legal.page(
        'Organization view preview', body, cls='admin', current='/admin-preview',
        description='A preview of a future organization view for athletic directors, built with sample data. Not available yet.',
    )


# ---------------------------------------------------------------- Safety (copy §6, design §7)
def ul(items: list[str]) -> str:
    return '<ul>' + ''.join(f'<li>{i}</li>' for i in items) + '</ul>'


def safety() -> str:
    body = f"""      <section class="page-head">
        <h1>How we handle safety and privacy</h1>
        <p class="lead">Most of our athletes are teenagers. These rules are built into the app, not left to settings.</p>
      </section>
      <section>
        <h2>Parent consent comes first</h2>
        {ul([
            'Every athlete under 18 needs a signed parent consent form, recorded by their coach, before they can log anything.',
            'The form has six separate permissions. Each optional feature (like team boards or testing days) stays off unless the parent agrees to it.',
            "Athletes under 18 can't change their own permissions.",
            'A form covers one team. An athlete on a second team needs a second form.',
        ])}
      </section>
      <section>
        <h2>Training rules for athletes under 18</h2>
        {ul([
            'No one-rep-max tests. Strength checks are supervised rep-max tests for intermediate and advanced athletes, and the coach confirms supervision that day.',
            'No testing within 48 hours of a match.',
            'Effort limits so no one trains to failure, and at least one day a week with no lifting.',
            'Each athlete gets the version of each exercise that fits their level. If an athlete is on two teams, the lower level wins.',
            'If an athlete reports pain, the app tells them not to train through it and to talk to their coach, a parent, or an athletic trainer.',
        ])}
      </section>
      <section>
        <h2>Team boards show effort</h2>
        <p>Boards show first name and last initial (or initials, or nothing), sessions, streaks, and progress. With parent permission, they can also show jump-test improvement in inches. Never weights, strength-check results, body weight, check-ins, or levels.</p>
      </section>
      <section>
        <h2>What we collect, and what we don't</h2>
        {ul([
            '<strong>We collect</strong> what the app needs to work: name, email, birth year, team, position, experience level, workouts, and the check-ins, attendance, and test results a parent has agreed to. Full list in the <a href="/privacy">Privacy Notice</a>.',
            '<strong>We never collect</strong> location, photos, video, contacts, or full birth dates.',
            '<strong>No ads, no tracking, and we never sell data.</strong> This website sets no cookies and uses no analytics.',
            '<strong>Delete anytime.</strong> Athletes and coaches can delete their account in the app. Data is removed within 30 days. We keep a short record of parent consent and coach supervision for 5 years, with no workout, check-in, or test results, as the Privacy Notice explains.',
        ])}
      </section>
      <section class="info-card">
        <h2>What Approach Strength is, and isn't</h2>
        <p>Approach Strength gives general training education to healthy athletes. It doesn't diagnose, treat, or clear anyone to play. Questions about an injury, pain, or a head injury go to a parent, athletic trainer, or doctor.</p>
      </section>
      <p class="closing">Questions? {MAILTO}</p>"""
    return legal.page('Safety and privacy', body, cls='safety', current='/safety', description='How Approach Strength handles parent consent, testing, team boards, and athlete data.')


# ---------------------------------------------------------------- 404 (copy §7, design §7)
def not_found() -> str:
    body = f"""      <section class="not-found">
        <img src="/assets/mark-on-dark.svg" alt="" width="48" height="48" />
        <h1>That page isn't here.</h1>
        <p><a class="text-link" href="/">Go to the home page</a> · Coaches and athletes: <a class="text-link" href="{APP_URL}">Log in</a></p>
      </section>"""
    return legal.page('Page not found', body, cls='nf')


# ---------------------------------------------------------------- CSS (design §1)
CSS = """/* Approach Strength website (docs/design/marketing-site.md §1). Dark only; light print styles for the legal pages.
   Fonts are self-hosted (no font CDN). No JavaScript. */
@font-face { font-family: 'Inter Tight'; font-weight: 600; font-style: normal; font-display: swap; src: url(/fonts/inter-tight-600.woff2) format('woff2'); }
@font-face { font-family: 'Inter'; font-weight: 400; font-style: normal; font-display: swap; src: url(/fonts/inter-400.woff2) format('woff2'); }
@font-face { font-family: 'Inter'; font-weight: 600; font-style: normal; font-display: swap; src: url(/fonts/inter-600.woff2) format('woff2'); }
:root {
  --bg: #0B0B0C; --surface: #1C1D20; --raised: #26282C; --ink: #FFFFFF; --muted: #A7ABB2; --line: #3A3D42;
  --outline: #6B7078; --achieve: #C9CDD2; --steel: #A7ABB2;
  --gutter: 16px; --pad: 64px; --gap: 16px;
  color-scheme: dark;
}
@media (min-width: 768px) { :root { --gutter: 24px; --gap: 24px; } }
@media (min-width: 1200px) { :root { --gutter: 32px; --pad: 96px; } }
* { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body { margin: 0; background: var(--bg); color: var(--ink); font: 400 16px/26px Inter, 'Helvetica Neue', Arial, sans-serif; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
@media (min-width: 768px) { body { font-size: 17px; line-height: 28px; } }
img, svg { max-width: 100%; height: auto; }
a { color: var(--ink); }
a:hover { text-decoration: none; }
:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; border-radius: 4px; }
h1, h2, h3 { font-weight: 600; margin: 0; }
h1 { font-size: 34px; line-height: 42px; }
h2 { font-size: 26px; line-height: 32px; }
h3 { font-size: 18px; line-height: 26px; }
@media (min-width: 768px) { h1 { font-size: 48px; line-height: 56px; } h2 { font-size: 32px; line-height: 40px; } h3 { font-size: 20px; line-height: 28px; } }
p { margin: 0 0 16px; }
.wrap { max-width: 1184px; margin: 0 auto; padding: 0 var(--gutter); }
.wrap-read { max-width: calc(680px + 2 * var(--gutter)); }
.lead { font-size: 18px; line-height: 28px; color: var(--muted); max-width: 680px; }
@media (min-width: 768px) { .lead { font-size: 20px; line-height: 30px; } }
.muted { color: var(--muted); }
.skip { position: absolute; left: 8px; top: -100px; background: var(--ink); color: var(--bg); padding: 12px 16px; border-radius: 12px; z-index: 10; font-weight: 600; }
.skip:focus { top: 8px; }
/* Labels and pills (Inter Tight only here and in the logo) */
.status, .kicker, .tag, .pill { font-family: 'Inter Tight', Inter, sans-serif; font-weight: 600; font-size: 12px; line-height: 16px; letter-spacing: .12em; text-transform: uppercase; }
.status { display: inline-block; padding: 4px 10px; border-radius: 999px; white-space: nowrap; vertical-align: middle; }
.status-live { background: #FFFFFF; color: #0B0B0C; border: 1px solid #FFFFFF; }
.status-soon { border: 1px solid var(--steel); color: var(--ink); }
.status-later { border: 1px dashed var(--steel); color: var(--muted); }
.pill { display: inline-block; border: 1px solid var(--steel); border-radius: 999px; padding: 6px 14px; color: var(--ink); }
.kicker { color: var(--muted); margin: 0 0 24px; }
/* Header */
.site-header { border-bottom: 1px solid var(--line); }
.header-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; min-height: 72px; position: relative; }
.lockup { display: inline-flex; align-items: center; min-height: 44px; }
.lockup img { height: 40px; width: auto; display: block; }
.lockup-print { display: none !important; }
@media (max-width: 399px) { .lockup img { height: 32px; } }
.header-row > .lockup { min-width: 0; flex: 0 1 auto; }
.nav-desktop { display: none; align-items: center; gap: 4px; }
.nav-desktop a:not(.button), .menu-panel a:not(.button) { color: var(--muted); text-decoration: none; display: inline-flex; align-items: center; min-height: 44px; padding: 0 12px; border-bottom: 2px solid transparent; }
.nav-desktop a:not(.button):hover, .menu-panel a:not(.button):hover { color: var(--ink); }
.nav-desktop a[aria-current], .menu-panel a[aria-current] { color: var(--ink); border-bottom-color: var(--ink); }
.button { display: inline-flex; align-items: center; justify-content: center; min-height: 44px; padding: 0 20px; border-radius: 12px; background: #FFFFFF; color: #0B0B0C; font-weight: 600; text-decoration: none; margin-left: 8px; }
.menu { position: static; }
.menu summary { white-space: nowrap; flex: none; list-style: none; display: inline-flex; align-items: center; gap: 8px; min-height: 44px; min-width: 44px; padding: 0 12px; border: 1px solid var(--outline); border-radius: 12px; cursor: pointer; font-weight: 600; }
.menu summary::-webkit-details-marker { display: none; }
.menu-icon { width: 18px; height: 12px; border-top: 2px solid var(--ink); border-bottom: 2px solid var(--ink); position: relative; }
.menu-icon::after { content: ''; position: absolute; left: 0; right: 0; top: 3px; border-top: 2px solid var(--ink); }
.menu-panel { position: absolute; left: 0; right: 0; top: 100%; background: var(--bg); border-bottom: 1px solid var(--line); padding: 8px var(--gutter) 16px; display: flex; flex-direction: column; z-index: 5; }
.menu-panel a:not(.button) { min-height: 48px; padding: 0; }
.menu-panel .button { margin: 8px 0 0; min-height: 48px; }
@media (min-width: 768px) { .nav-desktop { display: flex; } .menu { display: none; } }
/* Footer */
.site-footer { border-top: 1px solid var(--line); margin-top: var(--pad); padding: 16px 0 32px; font-size: 14px; line-height: 20px; color: var(--muted); }
.site-footer nav { display: flex; flex-wrap: wrap; align-items: center; }
.site-footer nav a { color: var(--muted); display: inline-flex; align-items: center; justify-content: center; min-height: 44px; min-width: 44px; }
.site-footer nav a:hover { color: var(--ink); }
.site-footer nav span { padding: 0 8px; }
.owner { margin: 8px 0 0; }
/* Sections */
main { display: block; }
.band { padding: var(--pad) 0 0; }
.page-head { padding: 48px 0 0; }
.page-head h1 { margin-bottom: 16px; }
.band > h2:not(.kicker) { margin-bottom: 24px; }
@media (min-width: 900px) { .band-split { display: grid; grid-template-columns: 240px 1fr; gap: 24px; align-items: start; } .band-split .kicker { margin: 6px 0 0; } }
.see { margin: 16px 0 0; }
.band .see { text-align: right; }
.band-split .see { text-align: left; }
.text-link { display: inline-flex; align-items: center; gap: 6px; min-height: 44px; font-weight: 600; }
.closing { margin-top: 24px; }
/* Hero and entry cards */
.hero { text-align: center; padding: 48px 0 0; }
.hero h1 img { width: 160px; margin: 0 auto; display: block; }
@media (min-width: 768px) { .hero h1 img { width: 200px; } }
.tagline { font-weight: 600; font-size: 22px; line-height: 30px; margin: 24px 0 8px; }
@media (min-width: 768px) { .tagline { font-size: 28px; line-height: 36px; } }
.hero .lead { margin: 0 auto 16px; }
.entry-grid { display: grid; gap: var(--gap); margin-top: 32px; text-align: left; }
@media (min-width: 900px) { .entry-grid { grid-template-columns: repeat(3, 1fr); } }
.entry-card { display: flex; flex-direction: column; gap: 8px; min-height: 72px; padding: 24px; background: var(--surface); border: 1px solid var(--outline); border-radius: 16px; text-decoration: none; color: var(--ink); }
@media (min-width: 900px) { .entry-card { min-height: 96px; } }
.entry-card:hover { border-color: var(--ink); }
.entry-card:active { background: var(--raised); }
.entry-title { display: flex; justify-content: space-between; font-weight: 600; font-size: 20px; line-height: 28px; }
.entry-line { color: var(--muted); }
/* How it works */
.steps { list-style: none; margin: 0 0 32px; padding: 0; display: grid; gap: var(--gap); }
@media (min-width: 900px) { .steps { grid-template-columns: repeat(3, 1fr); } }
.step-num { display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; border: 1px solid var(--steel); border-radius: 50%; font-weight: 600; margin-bottom: 12px; }
.step h3 { margin-bottom: 8px; }
.step p { color: var(--muted); }
/* Cards */
.card-grid { display: grid; gap: var(--gap); }
@media (min-width: 768px) { .card-grid { grid-template-columns: repeat(2, 1fr); } }
@media (min-width: 1200px) { .card-grid { grid-template-columns: repeat(3, 1fr); } }
.feature-card { background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 24px; }
.feature-title { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; margin-bottom: 8px; }
.feature-card p { color: var(--muted); margin: 0; }
.feature-card .see { text-align: left; margin-top: 8px; }
.feature-row { display: grid; gap: var(--gap); align-items: center; margin-bottom: 48px; }
@media (min-width: 1000px) { .feature-row { grid-template-columns: 3fr 2fr; } .feature-row-flip > .figure { order: 2; } }
.legend { list-style: none; padding: 0; margin: 8px 0 0; display: flex; flex-wrap: wrap; gap: 8px 24px; color: var(--muted); }
/* Figures */
.figure { margin: 0; }
.figure picture { display: block; background: var(--surface); border: 1px solid var(--line); border-radius: 12px; overflow: hidden; }
.figure img { display: block; width: 100%; height: auto; }
.figure-phone picture { max-width: 320px; margin: 0 auto; }
.figure figcaption { font-size: 14px; line-height: 20px; color: var(--muted); margin-top: 8px; }
.figure-phone figcaption { max-width: 320px; margin-left: auto; margin-right: auto; }
/* Pricing */
.price-grid { display: grid; gap: var(--gap); padding-top: 32px; }
@media (min-width: 768px) { .price-grid { grid-template-columns: repeat(2, 1fr); } }
@media (min-width: 1200px) { .price-grid { grid-template-columns: repeat(4, 1fr); } }
.price-card { display: flex; flex-direction: column; background: var(--surface); border: 1px solid var(--outline); border-radius: 16px; padding: 24px; }
.price-card-later { border-style: dashed; }
.tier { font-size: 20px; line-height: 28px; display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 8px; }
.tier-for { color: var(--muted); }
.price-block { margin: 0 0 4px; display: flex; flex-direction: column; }
.price { font-weight: 600; font-size: 28px; line-height: 36px; }
@media (min-width: 768px) { .price { font-size: 32px; line-height: 40px; } }
.price-card .price + .price { font-size: 22px; line-height: 32px; }
.price-alt { color: var(--ink); }
.price-limits, .price-label { font-size: 14px; line-height: 20px; color: var(--muted); }
.price-label { margin: 4px 0 16px; font-style: normal; }
.tier-items { list-style: none; padding: 0; margin: 0 0 16px; }
.tier-items li { display: flex; gap: 8px; margin: 6px 0; }
.check { color: var(--achieve); }
.questions { margin: auto 0 0; padding-top: 8px; font-size: 14px; line-height: 20px; color: var(--muted); }
.questions a { display: inline-flex; align-items: center; min-height: 44px; }
/* Admin preview */
.preview-banner { display: flex; gap: 12px; align-items: flex-start; background: var(--raised); border-left: 3px solid var(--ink); border-radius: 0 12px 12px 0; padding: 16px; margin-top: 24px; }
.preview-banner p { margin: 0; }
.info { flex: none; display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; border: 1px solid var(--ink); border-radius: 50%; font-weight: 600; font-size: 14px; }
.sample-panel { position: relative; background-color: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 24px; overflow: hidden;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='420' height='220'%3E%3Ctext x='10' y='150' transform='rotate(-20 210 110)' font-family='Inter Tight, Inter, sans-serif' font-weight='600' font-size='40' fill='%23FFFFFF' fill-opacity='0.05' letter-spacing='4'%3ESAMPLE DATA%3C/text%3E%3C/svg%3E"); }
.panel-head { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
.panel-title { font-size: 20px; line-height: 28px; }
.panel-caption { font-size: 14px; line-height: 20px; color: var(--muted); margin: 4px 0 0; }
.tags { display: flex; gap: 8px; align-items: flex-start; }
.tag { background: var(--raised); border: 1px solid var(--steel); border-radius: 999px; padding: 4px 10px; white-space: nowrap; }
.summary-strip { margin-top: 32px; }
.stats { display: flex; flex-wrap: wrap; gap: 8px 48px; }
.stats p { margin: 0; color: var(--muted); }
.stat { font-weight: 600; font-size: 32px; line-height: 36px; color: var(--ink); }
@media (min-width: 768px) { .stat { font-size: 40px; line-height: 44px; } }
.stats .stat { display: block; }
.panel-grid { display: grid; gap: var(--gap); margin-top: var(--gap); }
@media (min-width: 1200px) { .panel-grid { grid-template-columns: repeat(2, 1fr); } .sample-panel-wide { grid-column: 1 / -1; } }
.data { width: 100%; border-collapse: collapse; font-size: 15px; line-height: 22px; }
.data th, .data td { text-align: left; padding: 8px 8px 8px 0; border-bottom: 1px solid var(--line); vertical-align: top; }
.data thead th { color: var(--muted); font-weight: 600; font-size: 14px; overflow-wrap: normal; word-break: normal; hyphens: manual; }
@media (max-width: 399px) { .data { font-size: 14px; } .data thead th { font-size: 12px; } }
.data .num { font-variant-numeric: tabular-nums; }
.cell-sub { display: none; color: var(--muted); font-weight: 400; font-size: 14px; }
@media (max-width: 399px) { .col-phase { display: none; } .cell-sub { display: block; } }
.note { font-size: 14px; line-height: 20px; color: var(--muted); margin: 12px 0 0; }
.rows { list-style: none; padding: 0; margin: 12px 0 0; }
.rows li { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 4px 16px; padding: 8px 0; border-bottom: 1px solid var(--line); }
.bars, .effort { list-style: none; padding: 0; margin: 0; }
.bars li, .effort li { margin: 0 0 16px; }
.bar-label { display: block; font-weight: 600; margin-bottom: 4px; }
.bar-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.bar { flex: 1 1 120px; height: 12px; background: var(--line); border-radius: 999px; overflow: hidden; }
.bar > span { display: block; height: 100%; background: var(--achieve); }
.effort .bar-row { margin-top: 6px; }
.effort .num { min-width: 220px; }
.minis { display: grid; gap: var(--gap); }
@media (min-width: 768px) { .minis { grid-template-columns: repeat(2, 1fr); } }
@media (min-width: 1200px) { .minis { grid-template-columns: repeat(4, 1fr); } }
.mini { margin: 0; }
.mini figcaption { font-weight: 600; margin-bottom: 8px; }
.mini svg { width: 100%; max-width: 280px; }
.mini rect { fill: #C9CDD2; }
.mini text { fill: #A7ABB2; font: 12px Inter, sans-serif; text-anchor: middle; }
.mini text.val { fill: #FFFFFF; font-weight: 600; }
.numbers { margin-top: 16px; }
.numbers summary { display: inline-flex; align-items: center; min-height: 44px; cursor: pointer; font-weight: 600; }
.table-wrap { max-width: 100%; }
.numbers .data th, .numbers .data td { padding-right: 6px; font-size: 14px; }
/* Safety, 404, legal */
.safety section { margin-top: 32px; }
.safety h2 { font-size: 22px; line-height: 30px; margin-bottom: 12px; }
@media (min-width: 768px) { .safety h2 { font-size: 26px; line-height: 34px; } }
.safety ul { padding-left: 22px; }
.safety li { margin: 8px 0; }
.safety .wrap, .legal .wrap { max-width: calc(680px + 2 * var(--gutter)); }
.info-card { background: var(--surface); border-left: 3px solid var(--ink); border-radius: 0 16px 16px 0; padding: 24px; }
.info-card p { margin: 0; }
.not-found { text-align: center; padding: 96px 0 0; }
.not-found img { width: 48px; margin: 0 auto 24px; display: block; }
.not-found h1 { margin-bottom: 16px; }
.legal h1 { font-size: 28px; line-height: 36px; margin: 32px 0 4px; }
.legal h2 { font-size: 18px; line-height: 26px; margin: 32px 0 8px; letter-spacing: .06em; text-transform: uppercase; }
.legal h3 { font-size: 16px; margin: 24px 0 6px; }
.legal ul, .legal ol { padding-left: 22px; }
.legal li { margin: 6px 0; }
.legal :target { scroll-margin-top: 16px; }
.legal table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 14px; line-height: 20px; }
.legal th, .legal td { border: 1px solid var(--line); padding: 8px; text-align: left; vertical-align: top; }
.legal th { background: var(--surface); }
.box { border: 1px solid var(--line); border-radius: 12px; padding: 12px 16px; margin: 12px 0; background: var(--surface); display: flex; gap: 12px; align-items: flex-start; break-inside: avoid; }
.box .sq { flex: none; width: 20px; height: 20px; border: 2px solid var(--ink); border-radius: 3px; margin-top: 3px; }
.box p { margin: 0; }
.line { display: inline-block; min-width: 200px; border-bottom: 1px solid var(--muted); height: 1.2em; vertical-align: bottom; }
.print { font-size: 14px; color: var(--muted); }
@media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
@media print {
  :root { --bg: #FFFFFF; --surface: #FFFFFF; --line: #000000; --ink: #000000; --muted: #333333; }
  body { background: #FFFFFF; color: #000000; font-size: 11pt; line-height: 1.45; }
  a { color: #000000; }
  .skip, .nav-desktop, .menu, .site-footer, .print { display: none !important; }
  .lockup-screen { display: none !important; }
  .lockup-print { display: block !important; }
  .site-header { border: none; }
  .wrap { max-width: none; padding: 0; }
  .legal a[href^="http"]::after, .legal a[href^="mailto"]::after, .legal a[href^="/"]::after { content: " (" attr(href) ")"; font-size: 9pt; }
  .box { background: #FFFFFF; }
  .box .sq { border-color: #000000; }
  .legal h2 { margin-top: 16px; }
}
"""

FONTS = ROOT / 'node_modules/@expo-google-fonts'
SUBSET = 'U+0000-00FF,U+0131,U+0152-0153,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,U+2122,U+2190-2193,U+2212,U+2215,U+2713'

MARK = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="Approach Strength"><title>Approach Strength</title>
<polyline points="18,34 32,16 46,34" fill="none" stroke="#C9CDD2" stroke-width="5" stroke-linecap="square"/>
<line x1="6" y1="48" x2="58" y2="48" stroke="#FFFFFF" stroke-width="3"/>
<rect x="11" y="39" width="5" height="18" fill="#FFFFFF"/><rect x="17" y="42" width="3" height="12" fill="#FFFFFF"/>
<rect x="48" y="39" width="5" height="18" fill="#FFFFFF"/><rect x="44" y="42" width="3" height="12" fill="#FFFFFF"/></svg>
"""
FAVICON = MARK.replace('role="img" aria-label="Approach Strength"><title>Approach Strength</title>', '><rect width="64" height="64" rx="14" fill="#0B0B0C"/>')


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
    pricing = json.loads((out / 'pricing.json').read_text())
    admin = json.loads((out / 'admin-preview.json').read_text())
    (out / 'assets').mkdir(exist_ok=True)
    for n in ('lockup-plain', 'lockup-stacked', 'lockup', 'wordmark'):
        for t in ('dark', 'light'):
            shutil.copy(ROOT / f'assets/brand/source/{n}-on-{t}.svg', out / 'assets')
    (out / 'assets/favicon.svg').write_text(FAVICON)
    (out / 'assets/mark-on-dark.svg').write_text(MARK)
    for sid, (base, *_rest) in SHOTS.items():
        for ext in ('webp', 'png'):
            if not (out / 'assets/screens' / f'{base}.{ext}').exists():
                raise SystemExit(f'missing screenshot assets/screens/{base}.{ext} ({sid})')
    fonts(out)
    (out / 'site.css').write_text(CSS)
    files = {
        'index.html': home(pricing),
        'features.html': features(),
        'pricing.html': pricing_page(pricing),
        'admin-preview.html': admin_preview(admin),
        'safety.html': safety(),
        '404.html': not_found(),
        **legal.build(),
    }
    for name, text in files.items():
        (out / name).write_text(text)
    (out / 'robots.txt').write_text('User-agent: *\nAllow: /\n')
    (out / 'CNAME').write_text(DOMAIN + '\n')
    (out / '.nojekyll').write_text('')
    (out / 'README.md').write_text(
        '# approachstrength.com\n\nThe Approach Strength website (GitHub Pages, custom domain `approachstrength.com`).\n\n'
        'Generated by `scripts/build-site.py` in `rparker-sudo/approach`. Words come only from that repo\'s `docs/copy/website-copy.md`; '
        'legal pages only from its `docs/legal/`; prices only from `pricing.json` here; the administrator-preview sample data from '
        '`admin-preview.json` here (design doc §5.2). Screenshots in `assets/screens/` are demo-mode captures with sample data. '
        "Don't edit the HTML by hand.\n\nPlain HTML and CSS: no scripts, analytics, cookies, forms, or third-party requests. "
        'Fonts are self-hosted (Inter and Inter Tight, SIL Open Font License, see `fonts/`).\n'
    )
    print('built', out, '·', ', '.join(sorted(files)))


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', default=str(ROOT.parent / 'approachstrength-site'))
    build(Path(ap.parse_args().out))
