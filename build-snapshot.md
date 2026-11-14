# Approach — build snapshot

*As of November 14, 2026 (v2.2.0: passes 1, 2 and 3, built in one session). Facts only. Items marked **(unverified)** could not be confirmed from the code or from the owner.*

**What it is:** a weight-training, nutrition and planning app for volleyball athletes and coaches. App Store name (planned): "Approach: Volleyball Fitness". Home-screen name: "Approach".

---

## 1. Version and changes

**Current version:** 2.2.0 (`app.json`, `package.json`).
- Built on branch `v2.2` from the hand-off commit (`d9fa6ec`, docs of Fri Nov 13, 2026), following `docs/specs/v2.2.md` v1.3 (pass 1 → 2 → 3).
- **Not deployed yet.**
  - C13 is done: `public/privacy.html`, `terms.html` and `consent.html` were regenerated from the v2.2 legal docs with the new contact email **ryan@approachstrength.com** (owner, TM-10), dated November 14, 2026.
  - Migrations 005–007 aren't applied to the live project yet.
  - Merge to `main` (which deploys the site) and the local `v2.2` tag come after the owner approves.

**History (from `CHANGELOG.md` and git):**
- Before 1.0 the app was called "Volley Strength", then "Load & Launch", then "Approach".
- **1.0:** brand, four tabs, generated programs, season calendar, logging, teams with live sync (Supabase), QR invites, mobile web on GitHub Pages.
- **2.0:**
  - 1–7 lift days, equipment-aware programs, 64-exercise library.
  - Progression with deloads, rest timers.
  - Position groups, shared team calendar, readiness check-in.
  - Migration `002`.
- **2.1.0 (pass 1):**
  - Age gate, parent consent with RLS, no pain note.
  - Account deletion; coaches see only current members.
  - Legal pages, G1/G2/G5.
  - Migration `003`.
- **2.1.1 (pass 2):**
  - Six consent permissions (form v2) and board names.
  - Coach board v1 and effort board v1.
  - Attendance, testing days, Fuel phase 1.
  - Migration `004`.
  - Touch-height exception, as decided with the owner.
- **2.2.0:** see §3. Migrations `005`, `006`, `007`.
- Git tags `v1.0`, `v2.0`, `v2.1` were made locally. Tag pushes from the cloud are blocked, so the owner pushes them from the Mac.

## 2. Platforms and tech stack

| Layer | What's used |
|---|---|
| Platforms | iPhone (Expo Go only) and mobile web browsers (GitHub Pages). The coach board is web-first (also works on iPad). |
| Frontend | Expo SDK 58, React Native 0.88, React 19, Expo Router, TypeScript, react-native-web. |
| Backend / database | Supabase: Postgres, REST API, Realtime (`live_progress`, `test_sessions`, `test_results`, `rack_groups`, `rack_group_members`, `station_runs`), row-level security, security-definer RPCs, `pg_cron` for the monthly archive purge. |
| Auth | Supabase Auth, email + password ("Confirm email" on). |
| On-device storage | AsyncStorage (`localStorage` in browsers). |
| Hosting | GitHub Pages via GitHub Actions on push to `main`. Repository is public. |
| Dev tooling | TypeScript, ESLint, the Python legal-page builder, logic checks in `scripts/checks/` (run with `sh scripts/checks/run-all.sh`), SQL tests in `supabase/tests/`. None of it ships in the app. |

---

## 3. User-facing features (2.2.0)

### Pass 1: safety gates
- **One athlete layer (G-1):** `resolveSession` in `src/lib/resolve.ts` builds every session an athlete sees: Today, workout, session view, extra recovery, home and stations. It applies, in order:
  - the day's version;
  - level resolution (lower level across teams; Olympic → jump below advanced);
  - beginner effort shift and effort ceilings (beginner 7, intermediate/advanced 8, in-season 7, easing 6, light home day 6);
  - home-equipment picks;
  - harder versions the athlete accepted;
  - beginner circuit cap of 3;
  - block rests;
  - station ids;
  - the length estimate.
- **Levels:**
  - Roster level chip (solid = coach-set, dotted plus "Level not confirmed"), "N levels not confirmed · Review", and the set-level sheet (F24b copy).
  - Athlete Settings → Program shows one line per team, plus "Your exercises follow the lower of your teams' levels."
  - "Your version (team: …)" line with the why sheet. A muted line counts slots dropped for the athlete's level.
  - Coach athlete detail shows "N exercises adjusted to level" and "Adjusted for this athlete" (no reason, no level name).
- **Two teams:** the F15a sheet on joining a second team; Settings → Teams has the "Lift program" tag and a switch with confirm; a one-time notice on leaving. The combined schedule shows the other teams' events with team names. The other coach's roster shows "Following another team's lift program."
- **Breaks and easing:**
  - Calendar Add break / Edit / Delete, with a summary line and a striped band.
  - Today shows "Break week. Extra recovery is optional." Another team's break is shown only as a band.
  - "Easing back in this week" banner and sheet; coach chip "Returning from a break: lighter week."
- **Rest:**
  - Tiers P/A/B/C/D for all 74 exercises, with the §3 table, floors (A ≥ 2:00, P ≥ 1:30) and the builder note.
  - The coach's rest wins within the floors.
  - Estimates in the builder and on Today.
- **Effort clamp:** builder error (teams with a minor) or warning (adult-only), with a posting backstop. "Max effort" is allowed on power slots.
- **Copy:** G3 Today card and roster line; G4 in Settings → Safety (copy review §3 wording); 22 + 2 library fixes; 6 mobility exercises.
- **C14:**
  - Lift-day cap and rest day enforced on the final week (`weekPlan`, athlete level).
  - Testing warm-up (Part 2); date suggestions (Part 3) with the spacing and break notes.
  - Coach checklist (Part 1) with "I've read this" stored on the device, per team; "Testing checklist" link.
  - Testing banner: "N athletes under 18 need a confirmed level."
  - Coach roster: "Not eligible for testing today."
- **C12:** proof-record archives, delete-dialog line.

### Pass 2: boards and racks
- **Live coach board (F9):**
  - Accent band; header with today's stats; tile anatomy (resolved exercise, set x of y, last-set reps, rest countdown, "Up first", "Finished").
  - Order lifting/resting → not started → done.
  - Ticker (finishes, PRs by exercise name only, group milestones). Paging every 15 s.
  - Arrange by rack, with "Other athletes".
  - Testing-day mode: "Jump tests x / 3", "Strength check ✓", change chips in inches/feet.
  - States: rest day, break, nobody to show, reconnecting with last update. "Powered by Approach."
  - District line under Open coach board.
- **Season view:** goal, "N to go", projected finish week, points legend, top-10 leaderboard with the top 3 outlined, "Leaderboard off".
- **Board color:** 8 presets, hex field, live preview, automatic contrast fix with the "Adjusted" note, original color stored, Reset.
- **Effort board v2:**
  - Overall (10 / 5 up to 2 a week / 5) first; Sessions, Extra recovery, Consistency, Streak, Attendance, Hours, **Jump gains (inches)**.
  - Own row with accent bar and tint; two-team line; break-week note.
  - Athlete team switcher.
- **Extra recovery:** ER1–ER5 exactly as Training wrote them (suggested one first; pain day shows the G3 line instead of a suggestion). Logged as `kind: 'extra_recovery'`, with no weight suggestions.
- **Racks:**
  - Count or size, hints (§6), here-today filter (not stored), four methods, preview with coach-only level/position, rename, tap-to-move, Unassigned with "Add Riley to a rack?".
  - Athlete Today card, count only ("with 2 teammates"), with a "Moved to Rack 3" note.
- **P6.10:** private "change since last test" for athlete and coach ("Baseline set", "−5 lb", "Strength checks go up and down…").

### Pass 3: home, supersets, circuits, stations
- **Home weeks:**
  - Builder "Weight room + home": weight-room days, total or Recommend, Jumps at home (off/pre only), Save time with supersets.
  - Result line, beginners line, and "Who gets fewer days?".
  - Home archetypes, `HOME_RX`, the H6 pool, H3–H5 placement (matches the §9 worked example), a Light Home session given per athlete beyond the cap.
  - 4 new home exercises and `pushup.easier`.
  - Backpack carry bag weight (+5 lb max).
  - Harder-version card (Try it / Not yet).
- **Home equipment:** the F20 sheet (opens once, and from Settings), stored on the device only. The Today home card has the first-time line. No rack card and no live board presence on home days.
- **Supersets/circuits:**
  - Pair and group rows, with blocked reasons (F19c/F27b).
  - Rests: 15 s transitions; after the pair, the longer rest minus 15 s; after a circuit round, the longest rest minus 15 s per extra exercise (minimum 45 s).
  - Auto-pairing to fit the length target (never tier P/A); fillers "During rest".
  - Clock-racing block for tier B in circuits.
  - Workout view: A1/A2 labels, "Superset · Round 2 of 3", alternating flow, transition labels. Board tile: "A1 … · A2 …" and "Round 2 of 3".
- **Stations:**
  - Editor: Format Standard/Stations, Part 1 auto, station cards (neutral-name helper, one block each, auto/override time, reorder), Add station, Suggest order, F28c checks, F28d estimate.
  - Coach: Start stations, blocked until everyone is on a rack ("Add the rest to racks (balanced)"); then Round x of N, Rotate now (asks once), +1 min, End.
  - Athlete: Today "Part 1: together" and "Stations: you start at Station 2 (DB bench)"; workout station header, countdown, rotation banner, "N sets not done at …".
  - Board: station grid with a shared countdown.

---

## 4. Data model

Flags: **AGE** · **HEALTH/WELLNESS** · **BODY METRICS** · **LOCATION** · **PHOTO/VIDEO** · **CREDENTIALS** · **FREE TEXT**.

### Stored on the server (Supabase), after migrations 002–007

| Table | Fields (new in 2.2 in **bold**) | Who can read | Flags |
|---|---|---|---|
| `auth.users` | email, hashed password, metadata (name, role, position, birth_year, is_minor) | Supabase project owner | CREDENTIALS, AGE |
| `profiles` | id, name, role, position, birth_year, is_minor, board_name_mode, created_at, **lift_program_team_id** (column-level grants hide it from everyone; read only through RPCs) | the user; their coach; their athletes (coach name) | AGE |
| `teams` | …2.1 settings, **accent_color** | coach; members | — |
| `team_members` | …2.1 permissions, **level** (1–3), **level_set_by**, **level_set_at** | the athlete (own); the coach. Athletes fill their self-reported level once (`set_my_self_level`); only the coach changes it after. | — |
| `team_programs`, `team_groups`, `team_calendars` | as in 2.1. Program JSON may now carry `weightRoomDays`, `homeJumps`, `supersets`, session `location`/`light`/`format`/`stations`, exercise `group`/`filler`; calendar events may be `type: 'break'` with `endDate` | coach; members | FREE TEXT (coach notes, station names) |
| `workout_logs` | …, **kind** ('lift' \| 'extra_recovery'); `entries` JSON may carry `stationId` per exercise | the athlete; the current coach. Teammates get only times, session names, minutes and kind (`team_effort`). | FREE TEXT |
| `readiness` | as in 2.1 | the athlete; the coach while sharing | HEALTH/WELLNESS |
| `live_progress` | …, **state, exercise_name, set_index, set_count, last_reps, rest_ends_at, pr_today, finished_at, group_label, station_id, rotate_at**; deleted after 24 h; never loads or RPE | the athlete; the coach (boarded, not hidden) | — |
| `attendance`, `test_sessions`, `test_results` | as in 2.1; load rows also need `can_load_test` | as in 2.1. Boards get only jump-test changes (`board_tests`, coach only) and jump gains in inches (`team_effort`). | BODY METRICS (touch) |
| **`consent_archive`** | athlete id and name, birth year, team id and name, coach id and name, consent version, six boxes, recorded_at, account_closed_at, purge_after. No foreign keys. | nobody from the app (RLS on, no policies, no grants); service role only | AGE |
| **`supervision_archive`** | team id and name, coach id and name, day, battery, confirmed_at, ids and names of athletes who entered a load test (no results), account_closed_at, purge_after | nobody from the app; service role only | — |
| **`rack_groups`**, **`rack_group_members`** | id, team_id, name (≤ 20), sort_order; group_id, user_id, team_id, unique (team, user) | coach writes; members read rack names and their own membership; partners only via `my_rack` (count only until the flag is on) | — |
| **`station_runs`** | team_id, day, session_id, round, rounds, station_sec, transition_sec, rotate_at, ended_at, started_by. No athlete data. | coach writes; members read | — |

**New RPCs:**
- Levels and lift program: `set_my_self_level`, `set_member_level`, `member_levels` (team level, confirmed, set_at, and `swap_level` only when another team's level is lower), `my_lift_program`, `set_lift_program`, `members_following_other`, `members_returning`.
- Testing: `testing_eligibility`, `can_load_test`, `has_match_within_48h`, `on_break`.
- Archives: `close_archives`, `purge_archives` (no grants; pg_cron monthly).
- Boards: `team_effort` v2 (adds `ranked`, log `kind`, `jump_gain`), `board_tests`, `board_members` (adds the D-027 filter).
- Racks: `save_racks`, `my_rack`, `rack_partner_names()` (flag).

### Stored only on the device

| Key | Contents | Flags |
|---|---|---|
| `volley-strength/data/v1` | profile, programs, logs (now with `kind`, `location`, per-exercise `stationId`), body weight, touch log, readiness log, last known permissions, strength estimates, solo jump tests, theme; **new:** last known level per team, lift-program team, home equipment, harder-version answers, testing checklist read (coach, per team), last rack name, leave notice, home hint seen | BODY METRICS, HEALTH/WELLNESS, AGE, FREE TEXT |
| `approach/not-eligible/v1`, `approach/workout-draft/…`, Supabase session | as in 2.1 | — / FREE TEXT / CREDENTIALS |
| `load-and-launch/demo-server/v1` (demo only) | demo server, now also levels, lift program, racks, station runs | CREDENTIALS, HEALTH/WELLNESS, AGE |

---

## 5. Third-party services

Supabase and GitHub (Pages, Actions) only. `pg_cron` is a built-in Supabase extension, not a new vendor. No new services in 2.2, and no analytics, ads, trackers, external fonts, or in-app AI.

---

## 6. Deployment and usage

- **Website:** https://rparker-sudo.github.io/approach/ (deploys from `main`; still 2.1.1).
- **Supabase:** live, Free plan, with 002–004 applied. **005–007 are not applied yet.** Steps are in README "Upgrading from 2.1 (to 2.2)" (enable pg_cron first).
- **Users:** the owner plus fewer than 10 others, all 18+, per the owner **(unverified count)**.

---

## 7. Monthly costs

$0 now. Future: Apple Developer Program $99/year; Supabase Pro about $25/month if needed **(unverified)**.

---

## 8. Known gaps, judgment calls and checks

**Judgment calls (for the planning team / Legal):**
- **Self-reported level:** the server doesn't know an athlete's experience, so there's no server backfill. Each athlete's app fills `team_members.level` once from onboarding experience (`set_my_self_level`, only while it's empty). Existing athletes get a level the next time they open 2.2.
- **Q-7 data:**
  - `member_levels` gives the coach a numeric `swap_level` only when another team's level is lower. The coach app uses it only to list the swaps under "Adjusted for this athlete" and never shows it.
  - The UI and API never return a team or coach name. But the number tells the coach that a lower level exists elsewhere. **Legal to confirm this meets copy review §4.1**; the alternative is to drop the swap list.
- **`team_effort.ranked`:** a boolean that tells teammates whether an athlete follows this team's program. It's needed to leave them off Overall, Sessions and similar tabs (D-027).
- **`station_runs`:** a new team-level table for the shared rotation timer. Athletes without board consent also need the timer, so it can't live in `live_progress`. It holds no athlete data. Listed for Legal (G-5) because the spec named only `live_progress.station_id` and `rotate_at`.
- **Rack partner names flag:** SQL function `rack_partner_names()` returns false. Replacing it with `true` turns on names without an app build (B5).
- **Breaks:** `CalendarEvent.type 'break'` with `endDate`. Other teams' breaks show only as a band. Other teams' testing days aren't copied into the athlete's combined schedule.
- **Easing back in** ignores extra-recovery logs (gentle mobility doesn't end a break from lifting; the safer reading).
- **Testing-date suggestions:**
  - "In-season" spans the team's first to last match on the calendar.
  - Preseason "no prior block in Approach" means the block start is the program's creation day.
  - In-season with no matches on the calendar shows "No good date in this phase."
- **Board "Up first":** the athlete's resolved first exercise, worked out from the coach-side level numbers. Never labeled.
- **Board paging** pages whole rack lines in rack mode, so a section is never cut.
- **Home-day exclusion on the live board** is per group program, not per athlete.
- **"Add the rest to racks (balanced)"** places only the unassigned athletes (balanced auto-assign) into the existing racks, instead of reshuffling everyone.
- **Auto-pairing:** "Save time with supersets" off and on behave the same as the spec reads (pair only when over the target, only until it fits). The toggle is kept and stored.
- **Station order:** rack sort order k starts at station k. Extra stations sit empty; more racks than stations blocks the start.
- **PR ticker:** when an athlete finishes with a new best, `live_progress.exercise_name` carries that exercise's name for the "hit a PR on [exercise]" line. No number, ever.

**[UX proposal] items built as drawn, for Product to keep or cut:**
- F9a board paging.
- F9b "Other athletes" rack section.
- F13 dropped-slot line.
- F16a no break over a testing day.
- F29a "Rotate now" confirm, once per session.

**Left out (conflict with spec 3.1):** F23 "At home 4" count and home-day ticker lines.

**Not built / partial (honest list):**
- **Contact email in the source docs:** `docs/compliance.md`, `docs/legal/soft-launch-notice.md` and `docs/legal/parent-consent-form.md` still name the old club address. `scripts/build-legal-pages.py` swaps it for ryan@approachstrength.com in the published pages. **The planning team should update their source docs.**
- **F19b week grid:** no drag-to-move and no "Switch to home / weight room" per day. The coach builds school + home weeks from Week setup and edits sessions.
- **F28e:** "Run jump tests as stations" isn't built (load tests correctly can't be stations).
- **F27c/F27d:** no "Timed" work toggle or work timer for tier C/D rows. Reps and holds are typed as text.
- **F22:** a filler shows "During rest" in the builder, but the rest-timer screen doesn't show the filler row.
- **Rest field:** no "Reset to auto" link (the floor note and coach override work).
- **Effort per-athlete caps:** Consistency/Overall use the team schedule. A beginner whose team week exceeds their cap by more than the one light home day can't reach 100%.
- **Demo mode** still stores passwords in plain text (C16, out of scope).
- **iOS in Expo Go** not tested.

**Testing done (all on branch `v2.2`):**
- `tsc`, `expo lint` (`EXPO_OFFLINE=1`) and `build:web` pass.
- **SQL**, on local Postgres 16 with a stand-in Supabase auth schema:
  - Upgrade path 1.x → 002 → 003 → 004 → 005 → 006 → 007, each migration run twice with no errors. A fresh `schema.sql` gives 0 errors.
  - `rls-2.2-pass1.sql`, `-pass2.sql` and `-pass3.sql` each give exactly the expected errors.
  - Pass 1 covers: levels, Q-7, union 48 h, break, self-reported minors, C11, the four C12 tests, G-2 fallback.
  - Pass 2 covers: select-list checks, live fields, D-027, kind, jump gains in inches, board chips coach-only, racks RLS and constraint, leaving drops the rack, accent check.
  - Pass 3 covers: station timer RLS, live group/station fields.
  - The 2.1 tests still pass (one updated to confirm the minor's level before a load test).
- **Logic checks:** `scripts/checks/`, 11 files, all pass.
  - Pass 1: §2a resolution, caps per writer (onboarding, schedule, calendar overrides, coach days, in-season, automatic moves), break/union.
  - Part 3 date acceptance; rest table, floors and estimates.
  - Pass 2: ER1–ER5 criteria, Overall points and limits, D-027, break streaks; rack methods (sizes ±1, balanced, shuffled experience racks); accent contrast with navy and maroon.
  - Pass 3: home §9 example, caps with the light day, equipment-driven picks, H6/H7; pairing/circuit rules and rests; beginner circuit cap; stations checks and rotation timing.
- **Browser (demo mode):**
  - The 2.1 regression, updated for 2.2.
  - Pass 1: levels, why sheet, Settings, two-team sheet, other coach view, break.
  - Pass 2: board color, racks, rack card, extra recovery and points.
  - Pass 3: home sheet and card, device-only equipment, no live progress at home, stations start/fill/board grid/athlete station.
  - All pass. The only page error seen is headless Chromium's wake-lock warning.

**Content review:** program rules, home and station logic follow the planning team's docs. No review by a qualified strength coach, athletic trainer or dietitian is recorded **(unverified)**.
