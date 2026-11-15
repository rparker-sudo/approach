# Spec: Marketing site (approachstrength.com)
Owner: Product Strategy (01), with Branding & Marketing (04), UX/UI (03), Legal (07), Finance (05), Training Content (02) · **Draft v1.1** · Sat Nov 14, 2026
Source of truth: Approach project → `product/specs/marketing-site.md`.
Decisions: D-033 (domain layout), D-034 (marketing site, sign-in routing, admin preview), D-035 (name), D-036 (planned pricing), D-006 (no schools at launch), D-011 (no billing), D-013 (volleyball first). R12 accepted by Ryan 11/14 (publish with the name).
**Status: ready for hand-off.** Built in the same Claude Code session as 2.2.1, **after** 2.2.1 deploys and the screenshots are captured (`CLAUDE.md` holds the order).

> **Changes in v1.1 (11/14, hand-off session):**
> - Aligned to compliance § Marketing site: footer "© 2026 Ryan Parker · Approach Strength™"; **self-hosted fonts, no font CDN, no third-party requests at all**; no JavaScript; per-price label is exactly "Planned price. May change. Free during the pilot."
> - Words come only from `docs/copy/website-copy.md` **v1.1** (Legal and Training signed off); layout, components, and sample data from `docs/design/marketing-site.md` v1.0.
> - UX U2 confirmed: **images only for Live features.** UX S6 confirmed: the athlete's own touch-height entry with fake data is fine on a public page (it's not a board).
> - **Screenshots S1–S6 are captured by Claude Code** from demo mode after the 2.2.1 rename (Ryan chose to wait for them rather than launch text-first).
> - Trademark: Ryan accepted R12 on 11/14. The publish gate in §8 is met.
> - The app's `sign-in?role=` links land on the new **Log in** screen from 2.2.1 §9.

## 1. Goal and audiences
**Goal:** a coach who hears about Approach Strength can understand what it does, see what's live vs. coming, see what it will cost later, and get to sign-in in one click. Nobody can buy, sign up, or leave data on this site.

| Audience | What they need | Primary action |
|---|---|---|
| **Coaches** (primary; mostly high school and club volleyball) | What it does in the weight room, what's live, safety approach, planned price | **Coach** button → Log in on `app.` |
| **Athletes** (already on a team) | A way into the app | **Athlete** button → Log in on `app.` |
| **Parents** | Privacy, consent, safety; athlete plan prices are **aimed at parents**, never at minors | Read Privacy / Consent / Safety |
| **Athletic directors / administrators** | A look at the future organization view | **Administrator** button → fake-data preview |

## 2. Site map
All on `https://approachstrength.com`, in the `approachstrength-site` repo (created in 2.2.1; this replaces its placeholder `/`).
| Path | Page |
|---|---|
| `/` | Home (hero, three entry buttons, how it works, feature summary, safety and privacy, pricing summary, footer) |
| `/features` | Full feature showcase with status labels (§5) |
| `/pricing` | All tiers with planned prices (§6) |
| `/admin-preview` | Administrator preview dashboard, fake data (§4) |
| `/safety` | How Approach Strength handles safety and privacy (§7) |
| `/privacy`, `/terms`, `/consent` | Legal pages (unchanged URLs; generated from `docs/legal/` in the app repo, as in 2.2.1) |
| `/404` | Not found, links home |
Header and footer: `website-copy.md` §1; components: `marketing-site.md` (design) §1.4.

## 3. Home page and entry buttons
Copy: `website-copy.md` §2. Layout: design §2.
- **Three entry cards** (Coach, Athlete, Administrator). Coach and Athlete link to `https://app.approachstrength.com/sign-in?role=coach|athlete`; Administrator links to `/admin-preview`.
- **The sign-in form never lives on the marketing site.** The buttons only route.
- No "Sign up," "Get started free," "Join the waitlist," or email capture.

## 4. Administrator preview (`/admin-preview`)
Copy: `website-copy.md` §5. Layout and the fixed sample data set: design §5.
**MUST:** the banner "Preview with sample data. The organization view isn't available yet." with a **Coming soon** label; SAMPLE DATA and PREVIEW tags and the watermark on every panel; **team totals only** (no individual athletes, even fake); "Basketball (example)" labeled; no login, account, or "request access" control; one mailto line and one "Log in" link back.

## 5. Feature showcase (`/features`, summarized on `/`)
Copy: `website-copy.md` §3. Layout: design §3.
- **Labels (MUST, next to every feature, text plus style, never color alone):** Live · Coming soon · Later.
- **Images only for Live features** (design U2), from demo mode with fake data only (design §6).
- **Labels stay true:** when a feature ships, its label changes in the same release (Coordinator adds this to each hand-off checklist). A feature dropped from the roadmap comes off the site.
- **Never shown (MUST):** AI-generated programs, chat or social feeds, true 1RM testing for minors, personalized nutrition, public lift numbers, heart-rate data presented as available.

## 6. Pricing (`/pricing`, summarized on `/`) (D-036)
Copy: `website-copy.md` §4. Layout: design §4.
- **Headline (MUST):** "Free during the pilot. Planned prices, may change."
- **Per-price label (MUST), directly under every price block:** "Planned price. May change. Free during the pilot."
- **Values** (Finance confirmed, `finance/pricing-model.md` v0.2) live in `pricing.json` in the site repo; the HTML is generated from it:

```json
{
  "label": "Planned price. May change. Free during the pilot.",
  "tiers": [
    { "id": "athlete", "name": "Athlete", "prices": ["$9.99/month", "$29.99 per 4-month season", "$69.99/year"] },
    { "id": "coach-starter", "name": "Coach Starter", "prices": ["$399/year", "$49/month"], "limits": "1 team, up to 35 athletes" },
    { "id": "coach-pro", "name": "Coach Pro", "prices": ["$799/year", "$99/month"], "limits": "up to 5 teams, 120 athletes" },
    { "id": "organization", "name": "Organization", "status": "Later", "prices": ["$2,995/year"] }
  ]
}
```
- **No buy, subscribe, trial, reserve, or sign-up buttons; no "Contact sales" form; no "recommended" tier styling.** Each tier has a plain "Questions? ryan@approachstrength.com" mailto line.
- Family-pay is **not shown**.

## 7. Safety and privacy (`/safety`)
Copy: `website-copy.md` §6 (Legal and Training signed off). Layout: design §7. No claims that the app prevents injuries or improves performance by a set amount.

## 8. Technical and Legal rules (MUST)
- **Static site:** plain HTML and CSS in `approachstrength-site`, GitHub Pages with HTTPS. **No JavaScript.** The phone menu is a `<details>` element.
- **No third-party requests of any kind:** no analytics, pixels, tag managers, chat widgets, embedded players, font CDNs, or cookie banners (none needed: no cookies). **Fonts (Inter, Inter Tight) are self-hosted WOFF2** in the site repo, with their license file. Lockups use outlined SVGs (2.2.1 §3).
- **No `<form>` or `<input>` anywhere.**
- Brand tokens per design §1.1. Contrast and tap-target rules apply. Works at 320 px wide and at 200% zoom.
- `robots.txt` allows indexing; a `<title>` and meta description per page from the copy; no Open Graph images of real people.
- **Legal pages** keep their URLs and are generated only from `docs/legal/` (2.2.1 process rule).
- **Name:** "Approach Strength" everywhere, ™ in the footer only, never ®. Trademark gate met (R12 accepted 11/14).
- **Marketing to minors:** no targeting of under-18s; athlete-plan copy speaks to parents.

## 9. Inputs (all met 11/14)
| # | Input | Owner | Status |
|---|---|---|---|
| M1 | Trademark check; tagline; wordmark; palette | Branding (04) | **Done** (`docs/copy/brand-guide.md` v0.3; R12 accepted) |
| M2 | Copy | Branding (04), Legal (07), Training (02) | **Done** (`website-copy.md` v1.1, signed off) |
| M3 | § Marketing site rules | Legal (07) | **Done** (`docs/compliance.md`) |
| M4 | Prices confirmed | Finance (05) | **Done** (pricing model v0.2; §6 above) |
| M5 | Layouts, admin preview data, screenshot rules | UX (03) | **Done** (`docs/design/marketing-site.md` v1.0) |
| M6 | 2.2.1 live (site repo exists; app on `app.`) | Claude Code | **In this session**, before the site |
| M7 | Screenshots S1–S6 | Claude Code (from demo mode, design §6) | **In this session**, after 2.2.1 |

## 10. Acceptance criteria (save to `reports/marketing-site-acceptance.md`)
- [ ] `/`, `/features`, `/pricing`, `/admin-preview`, `/safety`, and the three legal pages load over HTTPS on `approachstrength.com`; `www` redirects; 404 page works.
- [ ] Coach and Athlete buttons go to `https://app.approachstrength.com/sign-in?role=…` and open the app's **Log in** screen (2.2.1 §9); the header Log in goes to the app; **no `<form` or `<input` anywhere** (source check).
- [ ] **No `<script>` tags, no cookies, no third-party requests** (source check plus a headless-browser network log showing only `approachstrength.com`).
- [ ] Every feature on `/` and `/features` shows a text label that matches `website-copy.md` v1.1 (and the roadmap on the publish date); only Live features have images.
- [ ] Published text matches `website-copy.md` v1.1 (diff of visible text per page, normalized whitespace).
- [ ] None of the never-shown items appear; claim-word search is clean (list in copy §9).
- [ ] `/admin-preview` shows the banner, SAMPLE DATA and PREVIEW tags, and watermark on every panel; numbers match design §5.2; team totals only; "Basketball (example)" labeled; no login or account link other than the app link.
- [ ] `/pricing` shows the headline and the per-price label under **every** price block; values match `pricing.json`, which matches §6; no family-pay tier; no buttons.
- [ ] Screenshots S1–S6 follow design §6: demo team only, no weights, levels, RPE, check-ins, real names, schools, or logos; each `<figcaption>` ends "Sample data."; Ryan looks at all six before publish.
- [ ] Legal pages match `docs/legal/` word for word (diff check).
- [ ] Contrast ≥ 4.5:1 for text; tap targets ≥ 44 px; usable at 320 px and 200% zoom (screenshots at 1440, 768, 375, 320); menu works without JavaScript and by keyboard; skip link present.
- [ ] "Approach Strength" appears as the name everywhere; contact is `ryan@approachstrength.com`; footer reads "© 2026 Ryan Parker · Approach Strength™."

## 11. Not in this spec
Real administrator or organization accounts · billing or checkout · sign-up, waitlist, or contact forms · blog or SEO content · testimonials (none exist; never invented) · competitor comparisons · videos · analytics of any kind.
