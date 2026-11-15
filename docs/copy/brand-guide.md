# Approach Strength: Brand Guide
Owner: Branding & Marketing (04) · **v0.3** · Sat Nov 14, 2026
Replaces v0.2 (written in a chat that couldn't save to the project). Answers M1 in `product/specs/marketing-site.md` §9.
Status: **ready to act on**, except the name, which carries an accepted risk (§2). Not legal advice.
*(Repo note, 11/14 hand-off: Ryan also accepted publishing the marketing site with this name now; compliance § Accepted risks R12.)*

## 1. Decision summary
| Item | Answer |
|---|---|
| Name | **Approach Strength** (D-035). ™ at most, never ® (compliance § Name and marks) |
| Trademark check | **Conflict found:** live, allowed APPROACH application (Fullsteam, Class 42, workout scheduling for sport clubs). Ryan chose to **keep the name** (11/14), including for the public marketing site. Attorney before the App Store. Detail: `marketing/trademark-check-approach-strength.md` (project) |
| Tagline | **"Build it under the bar. Use it above the net."** Confirmed (Ryan, 11/14) |
| Wordmark | **APPROACH** large + **STRENGTH** small, same width, underneath (Ryan, 11/14). §5 |
| Palette | Monochrome + one team accent. Confirms the design system §2.1 (§6) |
| Board presets | 8 final presets (§7). Replaces the placeholders in design-system §2.4 and `user-flows.md` F9c |
| Domain / email | `approachstrength.com` (site), `app.approachstrength.com` (app), `ryan@approachstrength.com` (Zoho). Done (D-033) |

## 2. Name and trademark status
- **What was found:** USPTO Serial 97166472, **APPROACH**, Fullsteam Software Holdings LLC. Notice of Allowance Oct 7, 2025; second Statement of Use extension Oct 6, 2026. Goods include SaaS "that allow for the management and scheduling of group and individual workouts… for the health, fitness, recreation, and sport club industries." The first word matches ours and "Strength" is descriptive.
- **No one uses "Approach Strength"** (USPTO, web, app-store and social search, 11/14).
- **Accepted risk (founder, 11/14):** keep the name for the free web pilot and the marketing site. Recorded disagreement: Branding recommended an attorney read before forms print, because renaming after families sign may mean re-collecting forms.
- **Rules while the risk stands:**
  - No federal or state filing; no ®.
  - No paid ads, merch, signage, or print runs beyond the consent form and pilot handouts.
  - **Before the App Store listing (2027) or any paid promotion:** trademark attorney clearance. If the answer is "rename," do it before the next consent-form batch.
  - Bundle ID `com.approachstrength.app` (not `com.approachvolleyball.app`) **before the first iOS build**; it can't change after publishing. *(Not in 2.2.1.)*

## 3. Positioning in one line
For high school and club volleyball coaches who run their own weight room: one program fitted to every athlete's level and the team's match week, a live board for the room, and a leaderboard that ranks work, not weight.

## 4. Voice
**Elite, performance, like a good captain.** Direct. Precise. Calm under load.
| Do | Don't |
|---|---|
| Short sentences, sentence case | Hype: "crush it," "beast mode," "unleash" |
| Numbers over adjectives ("3 sets of 5," "+1.5 in") | Results promises: "jump higher in 6 weeks," "prevent ACL tears" |
| Talk to coaches as peers; to parents plainly | Talk down to a teenager, or market to one |
| Name the rule and the reason ("No one-rep max under 18. Strength checks are supervised rep-max tests.") | "Proven," "science-backed," "#1," "safe for all ages" (compliance § Claims) |
| "Ranks work, not weight." | Body weight, calories, weight loss, menstrual cycle, appearance |
| Volleyball words athletes use: approach, touch, match week, tournament weekend | Competitor names, anywhere public |

**Words we use:** testing day, strength check, effort, consistency, streak, level, your version.
**Words we never use:** max out, your max, 1RM (for athletes), failure, injury-proof, diet.

## 5. Logo and wordmark
**Mark:** barbell with a chevron above it (unchanged; `assets/brand/source/logo-mark-on-*.svg`). Plain mark below ~32 px; volleyball badge (three curved-seam faces, tone-on-tone) at 48 px and up.
**Wordmark (new):** `APPROACH` in Inter Tight 600 uppercase, `STRENGTH` beneath at ~40% of the cap height, wide-tracked, **same line width** as APPROACH. STRENGTH is Steel `#A7ABB2` on dark, Gunmetal `#3A3D42` on light; APPROACH is Chalk on dark, Carbon on light.

| File (Branding delivered these in chat as `approach-strength-brand-v0.3.zip`; if Ryan doesn't supply it, Claude Code builds them to this section, 2.2.1 §3) | Use |
|---|---|
| `lockup-on-dark.svg`, `lockup-on-light.svg` | Badge + wordmark + tagline. Site hero, docs, slides |
| `lockup-plain-on-dark.svg`, `lockup-plain-on-light.svg` | Plain mark + wordmark. Site header, app sign-in, consent form header |
| `lockup-stacked-on-dark.svg`, `lockup-stacked-on-light.svg` | Square uses: social avatar, splash, admin preview banner, site `<h1>` |
| `wordmark-on-dark.svg`, `wordmark-on-light.svg` | Wordmark alone |
| `powered-by-on-board.svg` | Coach board signature (§8) |
- Convert text to outlines (or embed the self-hosted font) before shipping, so the marketing site needs no font CDN (compliance requires self-hosting).
- The app icon is unchanged (badge only, no words).
- **Clear space:** the mark's height on every side. **Minimum size:** wordmark 96 px wide; below that, mark only.
- **Never:** stretch, recolor with a team accent, put on a photo, add effects, set STRENGTH larger than APPROACH, drop "Strength" in running text.

## 6. Color and type (confirms the design system §2–3)
Carbon `#0B0B0C` · Graphite `#1C1D20` · Gunmetal `#3A3D42` · Seam `#4A4E55` · Steel `#A7ABB2` · Chrome `#C9CDD2` · Mist `#F1F2F4` · Chalk `#FFFFFF`.
- The brand has **no hue of its own.** The only hue is the team accent; status colors (error, warning) are for real warnings only.
- Type: Inter Tight 600 uppercase for wordmark, titles, board labels; Inter for everything else; tabular numbers for every stat.
- Dark by default; the board is always dark. Flat fills, no shadows.

## 7. Board color presets (D-023; replaces design-system §2.4 placeholders and F9c)
Rules: preset ≥ 3:1 on all three board surfaces; "Done" pill text is Carbon `#0B0B0C` on every preset (≥ 4.5:1); the accent never colors body text or carries a state alone.

| Swatch | Hex | On board `#0B0B0C` | On tile `#1C1D20` | On track `#3A3D42` | Change from placeholder |
|---|---|---|---|---|---|
| Silver (default) | `#C9CDD2` | 12.3 | 10.6 | 6.8 | renamed from "Approach silver" |
| Red | `#F2555C` | 5.8 | 5.0 | 3.2 | was `#FF6B6B` |
| Orange | `#FF8A3D` | 8.4 | 7.2 | 4.6 | was `#FF9F43` |
| Gold | `#FFC53D` | 12.5 | 10.7 | 6.9 | — |
| Green | `#3DDC84` | 11.0 | 9.4 | 6.1 | — |
| Teal | `#2EC4B6` | 9.1 | 7.8 | 5.0 | — |
| Blue | `#4C8DF6` | 6.0 | 5.2 | 3.3 | was `#4DA3FF` |
| Purple | `#B78CFF` | 7.7 | 6.6 | 4.3 | — |

```ts
export const BOARD_PRESETS = [
  { id: 'silver', name: 'Silver', hex: '#C9CDD2', isDefault: true },
  { id: 'red',    name: 'Red',    hex: '#F2555C' },
  { id: 'orange', name: 'Orange', hex: '#FF8A3D' },
  { id: 'gold',   name: 'Gold',   hex: '#FFC53D' },
  { id: 'green',  name: 'Green',  hex: '#3DDC84' },
  { id: 'teal',   name: 'Teal',   hex: '#2EC4B6' },
  { id: 'blue',   name: 'Blue',   hex: '#4C8DF6' },
  { id: 'purple', name: 'Purple', hex: '#B78CFF' },
] as const;
```
**Auto-lighten test vectors** (5% steps toward white until ≥ 3:1 on `#0B0B0C`): `#000080` → `#5959AC` (7 steps, 3.23:1); `#800000` → `#A04040` (5 steps, 3.09:1). White pill text wins on both (6.1 and 6.4:1).
**Open (2.2.2):** a narrow band of mid-tone custom colors (e.g., `#787878`) can't reach 4.5:1 pill text with either Carbon or Chalk. Don't assert 4.5:1 for every custom color in acceptance tests.

## 8. Co-branding on the coach board
- Bottom-right, aligned with the ticker, 24 px from the edges at 1920 × 1080; never over tiles.
- Plain mark + **"Powered by Approach Strength"**, Steel `#A7ABB2` (8.5:1), never the team accent. 14 px text, 24 px mark.
- Clear space = mark height. Never removed, recolored, or replaced by a team logo.
- **Team logos (roadmap Next):** no district, school, or mascot artwork in mockups, demos, or marketing (R1).

## 9. Imagery
Demo-mode screenshots with fake data only. No real athletes, teams, schools, logos, or Ryan's team. No weights on any board image.
