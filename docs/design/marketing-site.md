# Marketing Site and Administrator Preview: Design
Owner: UX/UI Design (03) · v1.0 · Sat Nov 14, 2026
Source of truth: Approach project → `design/marketing-site.md`. Answers **M5** in `product/specs/marketing-site.md` §9.
Built from: marketing-site spec, `docs/copy/website-copy.md` (all words come from there; use **v1.1**), `docs/copy/brand-guide.md` v0.3, `docs/compliance.md` § Marketing site, the design system v1.1.
**This doc owns layout, components, and the sample data. It doesn't own words.** Where a layout needs text, it points to the copy doc section (e.g., "copy §2 Hero"). The only text written here is in the fake data and in UI labels the copy doc already uses.
*(Repo note, 11/14 hand-off: Product confirmed U2, U7, and S6; all flags in §11 are closed. Self-hosted fonts are required.)*

---

## 0. UX decisions in this doc
| # | Decision | Why |
|---|---|---|
| U1 | **Dark theme only**, plus a light print stylesheet for the legal pages | Brand is dark by default. A theme toggle would need JavaScript. Printed consent forms need white paper. |
| U2 | **Images only for Live features.** Coming soon and Later features are text cards with no image. | Unbuilt features have no real screens to capture. Drawing them would be inventing UI. |
| U3 | **The admin preview is real HTML and inline SVG, not screenshots.** Every number is in a visible table as well. | The data is fake and fixed. HTML is accessible, sharp at any size, and needs no image tooling. |
| U4 | **Small multiples instead of a multi-color chart** for training activity | The brand has no hues for series (monochrome). One small bar chart per team needs no legend and no color. |
| U5 | **Mobile menu = `<details>` disclosure** | Works with no JavaScript and by keyboard. |
| U6 | **The whole entry card is the link** for Coach / Athlete / Administrator | Bigger target (≥ 96 px tall on desktop, ≥ 72 px on phone). |
| U7 | **Footer:** "© 2026 Ryan Parker · Approach Strength™" | Follows compliance (copy §1). |

---

## 1. Global system

### 1.1 Tokens (dark theme)
| Use | Token | Value | Contrast on page |
|---|---|---|---|
| Page background | background | `#0B0B0C` | — |
| Cards, panels | surface | `#1C1D20` | — |
| Raised (banner, tags) | surfaceRaised | `#26282C` | — |
| Body and headings | textPrimary | `#FFFFFF` | 19.7 (16.9 on cards) |
| Supporting text | textSecondary (`muted`) | `#A7ABB2` | 8.5 (7.3 on cards) |
| Dividers | border | `#3A3D42` | decorative only |
| Card and button outlines | inputBorder | `#6B7078` | 3.95 (≥ 3:1 for UI parts) |
| Chart bars, progress | achievement | `#C9CDD2` | 12.3 (10.6 on cards) |
| Primary button | actionPrimary | `#FFFFFF` bg, `#0B0B0C` text | 19.7 |
| Focus ring | focusRing | 2 px `#FFFFFF`, 2 px offset | — |

**No team accent and no status colors on the site.** There's no team, and nothing is an error or warning.
**Never:** `faint` (`#6B7078`) for readable text.

### 1.2 Type (web, px)
Fonts are self-hosted WOFF2. Line length for reading is at most 680 px.

| Style | Font | Desktop | Phone (< 768) | Use |
|---|---|---|---|---|
| Label | Inter Tight 600, uppercase, 0.12 em tracking | 12 / 16 | 12 / 16 | Status labels, tags, section kickers |
| Small | Inter 400 | 14 / 20 | 14 / 20 | Captions, per-price labels, footer |
| Body | Inter 400 | 17 / 28 | 16 / 26 | Paragraphs, lists |
| Lead | Inter 400 | 20 / 30 | 18 / 28 | Hero subline, page intros |
| H3 | Inter 600 | 20 / 28 | 18 / 26 | Card and panel titles |
| H2 | Inter 600 | 32 / 40 | 26 / 32 | Section titles |
| H1 | Inter 600 | 48 / 56 | 34 / 42 | Page titles |
| Tagline | Inter 600 | 28 / 36 | 22 / 30 | Home hero only |
| Price | Inter 600, tabular | 32 / 40 | 28 / 36 | Pricing cards |
| Stat | Inter 600, tabular | 40 / 44 | 32 / 36 | Admin preview numbers |

Inter Tight is used **only** in uppercase labels and the logo, as in the app.

### 1.3 Layout
| Breakpoint | Width | Container | Side gutter | Columns |
|---|---|---|---|---|
| Phone | 320–767 | full | 16 | 1 |
| Tablet | 768–1199 | full | 24 | 2 |
| Desktop | ≥ 1200 | max 1120, centered | 32 | 3–4 |

- Section padding (top and bottom): 96 desktop, 64 phone.
- Card gap: 24 desktop, 16 phone.
- Radius: cards 16, buttons 12, chips and tags 999.
- No shadows.
- Must work at **320 px wide** and at **200% zoom** with no horizontal scroll.

### 1.4 Components (site only)
| Component | Anatomy | States |
|---|---|---|
| **SiteHeader** | Plain lockup (`lockup-plain-on-dark.svg`, 40 px tall, link to `/`, `alt="Approach Strength"`) · nav links (Features, Pricing, Safety, For administrators) · **Log in** primary button (44 px tall) | Current page: link text `ink` + 2 px underline. Others: `muted`, `ink` on hover/focus |
| **MobileMenu** (< 768) | `<details>`. Summary = 44 × 44 button with a "Menu" text label and icon. Panel = full-width stacked links, each 48 px tall, then **Log in** full width | Closed / open (keyboard: Enter or Space on the summary) |
| **SiteFooter** | Links row (Privacy · Terms · Parent consent form · mailto) and an owner line (copy §1). Each link 44 px tall | — |
| **EntryCard** | Whole card is one `<a>`. Title (H3), one line (Body, `muted`), optional **StatusLabel**, → arrow. Surface fill, 1 px `inputBorder`, radius 16, padding 24 | Hover: border `ink`. Focus: focus ring. Active: surface `raised` |
| **StatusLabel** | Pill, Label type, always with text | **Live:** chalk fill, carbon text. **Coming soon:** 1 px steel outline, `ink` text. **Later:** 1 px **dashed** steel outline, `muted` text. Fill vs. outline vs. dashed means the style differs even without color. |
| **FeatureCard** | H3 + StatusLabel on one line, Body below. Optional link | — |
| **FeatureRow** | Screenshot (figure) on one side, FeatureCard on the other. Sides alternate on desktop; image on top on phone | — |
| **Figure** | Image in a surface frame, radius 12, 1 px `line`. `<figcaption>` (Small, `muted`) always ends with "Sample data." Explicit `width`/`height`, `loading="lazy"` | — |
| **PriceCard** | Tier name (H3) + optional StatusLabel · who it's for (Body) · price lines (Price) · **per-price label** directly under each price block (Small, `muted`) · feature list · mailto line | Organization card: dashed border (matches "Later") |
| **PreviewBanner** | Full-width band, `raised` fill, 3 px `ink` left bar, info icon, copy text + **Coming soon** StatusLabel | — |
| **SamplePanel** | Surface card. Header: H3 title + caption (Small, `muted`). Top-right: two tags, **SAMPLE DATA** and **PREVIEW** (Label type, `raised` fill, 1 px steel border). Diagonal watermark (§5.3). Body: chart and/or table. Footer: `<details>` "Show the numbers" with a table, when the body is a chart | — |
| **TextLink** | Underlined, `ink`. Standalone links are 44 px tall | Hover: no underline. Focus: ring |

**Buttons on the site:** only **Log in** (header), the EntryCards, and "See all…" links. No buy, sign-up, trial, waitlist, or contact buttons, and no `<form>` or `<input>` anywhere.

---

## 2. Home (`/`)
Copy: `website-copy.md` §2.

**Desktop (≥ 1200):**
```
┌───────────────────────────────────────────────────────────────────────────┐
│ [mark APPROACH/STRENGTH]   Features  Pricing  Safety  For administrators  [Log in] │
├───────────────────────────────────────────────────────────────────────────┤
│                            [stacked lockup, 200 w]  ← H1                    │
│              Build it under the bar. Use it above the net.  (Tagline)       │
│        Strength training for volleyball athletes and their coaches. (Lead)  │
│                         ( Free during the pilot. )  (Label pill, outline)   │
│                                                                             │
│  ┌──────────────────────┐ ┌──────────────────────┐ ┌──────────────────────┐ │
│  │ Coach              → │ │ Athlete            → │ │ Administrator      → │ │
│  │ Build your team's    │ │ See today's workout  │ │ [COMING SOON]        │ │
│  │ program and run the  │ │ and log your sets.   │ │ Preview the organi-  │ │
│  │ weight room.         │ │                      │ │ zation view. …       │ │
│  └──────────────────────┘ └──────────────────────┘ └──────────────────────┘ │
├───────────────────────────────────────────────────────────────────────────┤
│ HOW IT WORKS (kicker)                                                       │
│  ① Build the season      ② Athletes log on their phones   ③ Run the room… │
│  [ S1: live board screenshot, full container width, figcaption ]            │
├───────────────────────────────────────────────────────────────────────────┤
│ WHAT'S IN IT                                                                │
│  [FeatureCard] [FeatureCard] [FeatureCard]                                  │
│  [FeatureCard] [FeatureCard] [FeatureCard]          See all features →      │
├───────────────────────────────────────────────────────────────────────────┤
│ SAFETY AND PRIVACY   │  paragraph (copy §2)            How we handle safety →│
├───────────────────────────────────────────────────────────────────────────┤
│ PRICING              │  Free during the pilot. + summary line + label  See planned prices → │
├───────────────────────────────────────────────────────────────────────────┤
│ Privacy · Terms · Parent consent form · ryan@…    © 2026 Ryan Parker · …   │
└───────────────────────────────────────────────────────────────────────────┘
```
- **H1** is the stacked lockup image inside `<h1>`, with `alt="Approach Strength"`.
- **Entry cards:** 3 equal columns, min height 96, same style. The Administrator card has the Coming soon label above its line. Links per copy §2.
- **How it works:** 3 columns. Each has a numbered circle (40 px, 1 px steel outline, tabular number), an H3, and Body. Below the steps, screenshot **S1** (§6) at container width.
- **What's in it:** 3 × 2 FeatureCards with Live labels (copy §2). "See all features →" right-aligned below.
- **Safety and pricing bands:** two columns on desktop: a kicker label on the left (240 px) and content on the right. One column on phone.

**Phone (< 768):**
```
┌──────────────────────────────┐
│ [mark + wordmark]   [☰ Menu] │
├──────────────────────────────┤
│   [stacked lockup, 160 w]    │
│ Build it under the bar.      │
│ Use it above the net.        │
│ Strength training for …      │
│ ( Free during the pilot. )   │
│ ┌──────────────────────────┐ │
│ │ Coach                  → │ │  ← each card full width, min 72 tall,
│ │ Build your team's …      │ │     16 apart
│ └──────────────────────────┘ │
│ ┌──────────────────────────┐ │
│ │ Athlete                → │ │
│ └──────────────────────────┘ │
│ ┌──────────────────────────┐ │
│ │ Administrator [COMING S.]│ │
│ └──────────────────────────┘ │
│ How it works: steps stacked  │
│ S1 screenshot (full width)   │
│ Feature cards stacked        │
│ Safety · Pricing · Footer    │
└──────────────────────────────┘
```
Tablet: entry cards stay in 3 columns down to 900 px, then stack. Feature cards go to 2 columns.

---

## 3. Features (`/features`)
Copy: `website-copy.md` §3.

- **Header block:** H1, intro (Lead). Then a **label legend** row: the three StatusLabels, each followed by its one-line meaning (from the intro).
- **Live section** (H2 "Live"):
  - **FeatureRows with screenshots** (alternating sides on desktop):

    | Feature | Screenshot |
    |---|---|
    | Live coach board | S1 |
    | Effort board | S3 |
    | Volleyball program builder | S4 |
    | Rack groups and station rotation | S2 |
    | Testing days | S6 |
    | Every athlete at their level | S5 |

  - The remaining Live features (Supersets and circuits, Home workouts, School and club in one schedule, Parent consent tracking, Fuel tips) are **FeatureCards in a 3-column grid** (2 on tablet, 1 on phone), with no image.
- **Coming soon section** (H2): FeatureCards in a grid, Coming soon labels, **no images** (U2).
- **Later section** (H2): FeatureCards, Later labels, no images. The Organization view card's link "See the preview" → `/admin-preview`.
- Every FeatureCard shows its label **next to the title** (same line on desktop, wrapping under on phone).

---

## 4. Pricing (`/pricing`)
Copy: `website-copy.md` §4. Prices come from `pricing.json` (spec §6). The layout reads them; nothing is typed into HTML by hand.

- **H1** (the required headline) and intro (Lead).
- **Four PriceCards:** 4 columns ≥ 1200, 2 × 2 on tablet, stacked on phone. Order: Athlete · Coach Starter · Coach Pro · Organization.

**PriceCard anatomy (top to bottom):**
1. Tier name (H3). The Organization card has a **Later** StatusLabel beside its name.
2. Who it's for (Body, `muted`).
3. Price lines (Price style). Multiple options separate with a line break (not " · ") on phone, so each fits:
   - Athlete: three lines, "$9.99/month," "$29.99 per 4-month season," "$69.99/year."
   - Coach plans: annual price large, monthly on a second line in Body, then the team/athlete limits in Small.
4. **Per-price label**, directly under the price block, Small `muted`: "Planned price. May change. Free during the pilot." It's never collapsed or hidden behind a tooltip.
5. Feature list (Body, check glyph per item as decoration only, `aria-hidden`). Items that aren't built carry an inline Coming soon StatusLabel (e.g., Assistant coaches).
6. "Questions? ryan@approachstrength.com" (mailto TextLink), pinned to the card bottom so cards align.

- **Equal height** cards on desktop. The Organization card has a dashed 1 px border.
- **No highlighted "recommended" tier,** no badges like "Most popular," no strike-through prices, no buttons.

---

## 5. Administrator preview (`/admin-preview`)
Copy: `website-copy.md` §5. **Every number on this page is invented.** The page shows **team totals only.** No individual athlete appears anywhere, not even as a fake name.

### 5.1 Layout (desktop)
```
┌──────────────────────────────────────────────────────────────────────────┐
│ SiteHeader                                                               │
├──────────────────────────────────────────────────────────────────────────┤
│ ▌ⓘ Preview with sample data. The organization view isn't available yet. [COMING SOON] │  ← PreviewBanner, full width, static
├──────────────────────────────────────────────────────────────────────────┤
│ H1 Where we're headed for schools and clubs                              │
│ Intro (Lead)                                                             │
│ ┌ Sample organization ─────────────────────────────────────────────────┐ │
│ │  4 teams        4 coaches        60 athletes        [SAMPLE DATA]     │ │  ← summary strip
│ └───────────────────────────────────────────────────────────────────────┘ │
│ ┌──────────────── Panel 1 ───────────────┐ ┌──────────── Panel 2 ───────┐ │
│ │ Programs at a glance                   │ │ Coaches                    │ │
│ └────────────────────────────────────────┘ └────────────────────────────┘ │
│ ┌──────────────── Panel 3 ───────────────┐ ┌──────────── Panel 4 ───────┐ │
│ │ Parent consent on file                 │ │ Training activity          │ │
│ └────────────────────────────────────────┘ └────────────────────────────┘ │
│ ┌──────────────── Panel 5 ───────────────┐ ┌──────────── Panel 6 ───────┐ │
│ │ Team effort                            │ │ Testing days               │ │
│ └────────────────────────────────────────┘ └────────────────────────────┘ │
│ Interested in this for your school or club? Email ryan@approachstrength.com. │
│ Coaches and athletes: Log in                                             │
├──────────────────────────────────────────────────────────────────────────┤
│ SiteFooter                                                               │
└──────────────────────────────────────────────────────────────────────────┘
```
- 2 columns ≥ 1200; 1 column below 1200. Panel 4 (Training activity) spans both columns on desktop, because it holds four small charts.
- The page has **no buttons** except the header's Log in. Nothing is clickable inside the panels.
- The PreviewBanner is static (not sticky), so it never covers content at 200% zoom. Each panel also carries its own SAMPLE DATA and PREVIEW tags, so the warning is never off screen.

### 5.2 Sample data set (fixed; Claude Code copies it into `admin-preview.json` or straight into HTML)
**Sample teams:**
| Team | Sport label | Athletes | Coach | Season phase |
|---|---|---|---|---|
| Varsity Volleyball | Volleyball | 16 | Coach A. | In-season |
| JV Volleyball | Volleyball | 18 | Coach B. | In-season |
| Boys Volleyball | Volleyball | 14 | Coach C. | Preseason |
| **Basketball (example)** | **Example sport** | 12 | Coach D. | — |
| **Total** | | **60** | **4 coaches** | |

**Panel data:**
| Panel | Varsity Volleyball | JV Volleyball | Boys Volleyball | Basketball (example) |
|---|---|---|---|---|
| Parent consent on file | 15 of 16 · 94% | 16 of 18 · 89% | 12 of 14 · 86% | 10 of 12 · 83% |
| Sessions logged, weeks 1–6 | 52, 58, 61, 55, 63, 60 | 48, 54, 57, 60, 56, 62 | 40, 43, 47, 45, 49, 51 | 30, 34, 33, 38, 36, 40 |
| Team consistency | 88% | 82% | 79% | 75% |
| Team goal | 412 / 500 sessions | 386 / 480 | 301 / 400 | 210 / 300 |
| Testing days run | 2 | 2 | 1 | 0 |
| Supervision confirmations on file | 2 | 2 | 1 | 0 |

- **Weeks** are "Week 1 … Week 6," with no dates, so the sample never looks dated or real.
- **Coach names** are exactly "Coach A." to "Coach D." No first names, no schools, no mascots, no towns.
- The Basketball row is always labeled **"(example)"**, and the Programs panel caption carries "Example: volleyball today, more sports later." (copy §5).

### 5.3 Panel designs
Every panel has the SamplePanel chrome (§1.4): title + caption from copy §5, and the **SAMPLE DATA** and **PREVIEW** tags top-right.

**Watermark:** the words "SAMPLE DATA" repeated diagonally (−20°) across the panel body.
- Inter Tight 600, 40 px, chalk at **5% opacity**, behind content, `aria-hidden="true"`, as a CSS background (inline SVG data URI). That's allowed; it's not a script.
- It must not lower any text below its contrast target. 5% chalk on graphite moves the background from `#1C1D20` to about `#27282B`, and `muted` text still measures ≥ 6.4:1.

| # | Panel | Body |
|---|---|---|
| 1 | **Programs at a glance** | A table: Team · Athletes · Season phase · Program. Program cells read "Volleyball program" for the three volleyball teams and "Example only" for Basketball (example). Athletes are tabular numbers. |
| 2 | **Coaches** | Four rows: team name, then "1 coach account · Coach A." Summary line at the top: "4 coach accounts" (Stat style). |
| 3 | **Parent consent on file** | Four horizontal bars (achievement fill on a `line` track, 12 px tall), each with the team name above and "15 of 16 · 94%" at the right end in tabular numbers. The bar is decoration; the text carries the value. |
| 4 | **Training activity** | **Small multiples (U4):** four mini column charts in a row (2 × 2 on tablet, 1 per row on phone). Each is labeled with its team name and shows 6 columns (Week 1–6), the latest value printed above the last column. Same y-scale (0–70) for all four so they compare fairly. Axis: week numbers only, no gridlines. `<details>` "Show the numbers" opens the weeks table. |
| 5 | **Team effort** | Two blocks per team: "Consistency 88%" with a bar, and "Team goal 412 / 500 sessions" with a progress bar. Tabular numbers. |
| 6 | **Testing days** | A table: Team · Testing days run · Supervision confirmations on file. The caption says "No results." No result columns, ever. |

**Charts:** inline `<svg>` with `role="img"` and a `<title>` that states the numbers in words (e.g., "Varsity Volleyball sessions logged per week, weeks 1 to 6: 52, 58, 61, 55, 63, 60"). Bars use `achievement` `#C9CDD2` (10.6:1 on cards). No color carries meaning.

**Never on this page, even as fake data:**
- individual athletes' names, rows, initials, or profiles
- per-athlete anything: check-ins, pain, bodyweight, nutrition, level, loads, test values, estimated strength
- leaderboards or "top athletes"
- login, account, or "request access" controls
- a real school, district, club, town, mascot, or logo

### 5.4 Phone
- One column: banner, H1, intro, summary strip (3 stats stacked), then panels 1–6 in order.
- Tables keep 2–3 columns at 320 px by wrapping long team names. Tables never scroll sideways: at < 400 px, Panel 1 drops the Season phase column into a second line under the team name.

---

## 6. Screenshots (demo mode, fake data)
**Rules for every image:**
- Captured from the app's **demo mode** (on-device data, no Supabase), dark theme, **after the 2.2.1 rename** (board shows "Powered by Approach Strength").
- Use the demo team below. No real person, team, school, district, logo, or Ryan's team.
- **No load or weight numbers in any image.** Weight fields are empty or cropped out. No RPE, check-ins, pain, or levels on any board image.
- Export as WebP at 2× with a PNG fallback.
- Alt text from copy §8. Each `<figcaption>` ends with "Sample data."

**Demo team:**
- Team: **"Demo Varsity"**. Board color: **Blue** `#4C8DF6`.
- Groups: Hitters, Setters, Liberos.
- Board names (12): Jordan M., Ava R., Maya T., Riley K., Sofia L., Chloe P., Emma W., Grace H., Lily S., Nora B., Zoe C., Hannah D.
- Coach: "Coach A."
- Calendar: practices Mon–Thu, tournament Saturday.

| ID | Screen | Size | What must be visible | Must not be visible |
|---|---|---|---|---|
| **S1** | Coach board, live view (F9) | 1920 × 1080 → 1600 × 900 | Header stats, 12 tiles in mixed states (lifting, resting with countdown, not started, done), a PR badge, the ticker, "Powered by Approach Strength" | Weights, levels |
| **S2** | Coach board, station grid (F30) | 1920 × 1080 → 1600 × 900 | 4 stations, rack lines current → next, shared "Rotate in" countdown | Weights, levels |
| **S3** | Effort board, Overall tab (F10, coach web) | 1440 × 900, crop to the board | Top 10 with points, the points line, tab chips | Any highlighted own row (coach view) |
| **S4** | Program builder week grid (F19) | 1440 × 900 | Week with weight-room and home days around a Saturday tournament, estimates | — |
| **S5** | Athlete Today (phone) | 390 × 844 | Rack card ("You're on Rack 2 · with 2 teammates"), session list with one "Your version (team: Back Squat)" line | Weight suggestions, check-in details |
| **S6** | Testing day, approach-touch entry (phone) | 390 × 844 | 3 attempt fields in inches, best highlighted | Strength-check screens, any lift value |

**No screenshots** of Coming soon or Later features (U2). The Organization view is linked, not pictured.

---

## 7. Safety, 404, legal pages

**Safety (`/safety`):**
- Copy §6, in a single column (max 680 px).
- H2 per section, lists in Body.
- No images.
- The closing "What Approach Strength is, and isn't" block sits in a surface card with a 3 px `ink` left bar (the info style).

**404:**
- H1 and links from copy §7, centered, with the plain mark (48 px) above.

**Legal pages (`/privacy`, `/terms`, `/consent`):**
- Same SiteHeader and SiteFooter. The content column is 680 px.
- Text is generated only from `docs/legal/` (2.2.1 rule).
- **Print stylesheet** (`@media print`), for all three, since the consent form is printed:
  - White background, carbon text.
  - Hide the nav and footer links.
  - Show the plain lockup in its light version.
  - Expand link URLs after link text.
  - The checkbox squares stay outlined.
  - Page breaks avoid splitting a numbered box.

---

## 8. States and behavior
| State | Behavior |
|---|---|
| Hover (pointer) | Cards: border `ink`. Links: underline removed. Nav: `muted` → `ink` |
| Focus (keyboard) | 2 px chalk ring, 2 px offset, on every link, card, and the menu summary. Never removed. |
| Active / pressed | Card background `raised` |
| Current page | Nav item `ink` + 2 px underline, `aria-current="page"` |
| Menu closed / open (phone) | `<details>` default. Open shows a full-width panel below the header. Content isn't covered. |
| Image fails to load | Frame stays at its fixed size (no layout shift), alt text shows, and the caption is still there |
| Reduced motion | No transitions anywhere (drop the 150 ms hover color fades) |
| JavaScript off | No change (there is none) |

---

## 9. Accessibility checklist
- [ ] Text contrast ≥ 4.5:1 (all text tokens on page and card are ≥ 7.3:1). UI outlines ≥ 3:1 (`inputBorder`).
- [ ] Tap targets ≥ 44 px (links, menu, cards). Entry cards ≥ 72 px tall on phone.
- [ ] One `<h1>` per page. Headings in order. Landmarks: `header`, `nav`, `main`, `footer`.
- [ ] Status labels are text. They never rely on fill or color alone.
- [ ] Every chart has a `<title>` with the numbers, plus a "Show the numbers" table.
- [ ] Watermarks and decorative glyphs are `aria-hidden`.
- [ ] 320 px and 200% zoom: no horizontal scroll, no overlap.
- [ ] Skip link "Skip to content" as the first focusable element.
- [ ] `lang="en"`. Page titles and meta descriptions per copy.

---

## 10. UX sign-off checks (for the marketing-site acceptance report)
- [ ] Every page matches the layouts in §2–§7 at 1440, 1024, 768, 375, and 320 px wide.
- [ ] The header uses `lockup-plain-on-dark.svg` with outlined text; the hero uses the stacked lockup in `<h1>`.
- [ ] Every feature has a StatusLabel matching copy §3. No images on Coming soon or Later features.
- [ ] Screenshots S1–S6 follow §6. Each image checked for weights, levels, real names, and logos before publish.
- [ ] `/admin-preview` shows the PreviewBanner, the SAMPLE DATA and PREVIEW tags on every panel and the summary strip, and the watermark. All numbers match §5.2. Basketball is labeled "(example)." No individual athlete anywhere.
- [ ] Pricing cards show the per-price label under every price block, with no buttons and no "recommended" styling.
- [ ] §9 checklist passes.

## 11. Flags (all closed 11/14)
- Product confirmed U2 (no images for unbuilt features), U7 (footer), and S6 (athlete's own fake touch entry on a public page).
- Branding: if the v0.3 zip isn't supplied, Claude Code builds the lockups per brand guide §5 (2.2.1 §3).
- Legal signed off the copy (v1.1); the watermark and tags need no extra wording.
- Finance confirmed prices.
