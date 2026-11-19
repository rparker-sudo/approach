# Approach Strength — build snapshot

*As of November 19, 2026: **v2.4.0 (Training v3) deployed November 19, 2026** with the website's `/terms` v2.6 (Legal ruling #7); `generatorV3` off, `catalogV3` and `rackRotation` on.*

**What it is:** a weight-training, nutrition and planning app for volleyball athletes and coaches, and (from 2.3.0) for personal trainers with adult clients ("general" teams). Product name **Approach Strength** (since 2.2.1, D-035). Home-screen short name: "Approach". App: https://app.approachstrength.com. Website: https://approachstrength.com.

---

## 1. Version and changes

**2.4.0 (Training v3, `docs/specs/training-v3.md` v1.0):** branch `v2.4.0` from hand-off `632a16e` (docs of Wed Nov 18, 2026). Part 1 → 2 → 3, a commit per part (`c13dddd`, `525bb49`, `c29897c`). Migrations `011_training_v3_p1.sql`, `012_training_v3_p2.sql`, `013_training_v3_p3.sql` (013 is a no-op: Part 3 keeps its keys in the program JSON). Report: `reports/training-v3-acceptance.md`. Finished 11/19 for Legal's rulings (`a84cc6e`). **Deployed November 19, 2026** (see §6). Version 2.4.0 in `app.json`/`package.json`.
- **Flags** (`src/lib/flags.ts`, build-time constants): `catalogV3` **on**, `rackRotation` **on**, `generatorV3` **off** (some earlier checks fail with it on; see §8 "2.4.0"). With `generatorV3` off the 2.3.0 generator is unchanged (it never picks catalog v3 exercises).

**2.3.1 (custom exercises, owner request 11/16):** branch `v2.3.1`. Coaches and trainers can create their own exercises inside any program (saved in the existing program JSON, no migration). Each one carries a type (sets the tier), a movement (pattern) and a level, so resolveSession, rest floors, pairing rules and effort caps treat it like a library exercise. Report: `reports/v2.3.1-acceptance.md`. **Deployed November 16, 2026** (Ryan approved; `v2.3.1` merged into `main`; no migration; website unchanged). Tag `v2.3.1`: Ryan pushes it from his Mac.

**2.3.0 (trainer mode, no AI):** built on branch `v2.3.0` (app) and `v2.3.0` (site repo) from the hand-off `e034bdb` (docs of Sun Nov 15, 2026). Acceptance report: `reports/v2.3.0-acceptance.md`. Ryan approved the deploy on November 16, 2026, and confirmed Legal approved the G3/G4 wording. **Deployed November 16, 2026:** Ryan ran migrations 009 and 010 on the live project (column check returned 4); `v2.3.0` was merged into `main` in both repos (app and website); tag `v2.3.0` pushed by Ryan from his Mac (app repo; the website repo has no tag yet). Ryan confirmed the live checks (legal pages, anchors, footer link, app version and type picker). Migrations `009_trainer_a.sql`, `010_trainer_b.sql`. Summary in `CHANGELOG.md`; details and every judgment call in §8 ("2.3.0").

**Current version:** 2.2.1 (`app.json`, `package.json`). Branch `v2.2.1` from the hand-off commit `e2bde34` (docs of Sat Nov 14, 2026). Acceptance report: `reports/v2.2.1-acceptance.md`. **Deployed November 15, 2026** (owner approved; tag `v2.2.1`).

**2.2.1 in short** (details in §3a):
- The app moves to `app.approachstrength.com`; a placeholder website (new repo `rparker-sudo/approachstrength-site`) takes the apex with `/privacy`, `/terms`, `/consent` at the same URLs.
- Renamed to Approach Strength: outlined wordmark/lockups built to brand guide v0.3 §5 (Branding's zip wasn't supplied), board presets from §7, "Powered by Approach Strength" on the board.
- Coach Terms checkbox (sign-up and a one-time sheet), enforced on the server. New fields `profiles.coach_terms_version`, `profiles.coach_terms_accepted_at` (Legal approved).
- Welcome → Log in / Create an account; the age question only on the Create path; `sign-in?role=`; password reset.
- Level card text and the full checklist; F-2 text tokens; F-7 tap targets; J1 and J3 privacy fixes.
- Legal pages built only from `docs/legal/` (the email find-and-replace is gone); `run-all.sh` fails when a check can't run.
- Migration `008_approach_2_2_1.sql`.

**2.2.0:**
- Built on branch `v2.2` from the hand-off commit (`d9fa6ec`, docs of Fri Nov 13, 2026), following `docs/specs/v2.2.md` v1.3 (pass 1 → 2 → 3).
- **Deployed November 14, 2026:** the owner ran migrations 005–007 on the live project and approved the merge. `v2.2` was fast-forwarded into `main`, and the GitHub Pages deploy succeeded. The `v2.2` tag was made locally; the owner pushes it from the Mac.
  - C13 is done: `public/privacy.html`, `terms.html` and `consent.html` were regenerated from the v2.2 legal docs with the new contact email **ryan@approachstrength.com** (owner, TM-10), dated November 14, 2026.
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
- **2.2.1:** see §3a. Migration `008`.
- Git tags `v1.0`, `v2.0`, `v2.1` were made locally. Tag pushes from the cloud are blocked, so the owner pushes them from the Mac.

## 2. Platforms and tech stack

| Layer | What's used |
|---|---|
| Platforms | iPhone (Expo Go only) and mobile web browsers (GitHub Pages). The coach board is web-first (also works on iPad). |
| Frontend | Expo SDK 58, React Native 0.88, React 19, Expo Router, TypeScript, react-native-web. |
| Backend / database | Supabase: Postgres, REST API, Realtime (`live_progress`, `test_sessions`, `test_results`, `rack_groups`, `rack_group_members`, `station_runs`), row-level security, security-definer RPCs, `pg_cron` for the monthly archive purge. |
| Auth | Supabase Auth, email + password ("Confirm email" on). |
| On-device storage | AsyncStorage (`localStorage` in browsers). |
| Hosting | App: GitHub Pages via GitHub Actions on push to `main` (custom domain `app.approachstrength.com`). Website: GitHub Pages from `main` of `rparker-sudo/approachstrength-site` (custom domain `approachstrength.com`). Both repositories are public. |
| Dev tooling | TypeScript, ESLint, the Python site and legal-page builders (`scripts/build-site.py`, `scripts/build-legal-pages.py`), the brand SVG builder (`scripts/build-brand-svgs.py`, fontTools), logic checks in `scripts/checks/` (run with `sh scripts/checks/run-all.sh`), SQL tests in `supabase/tests/`. None of it ships in the app. |

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

## 3a. What 2.2.1 changed (user-facing)

- **Addresses (§1, §2):** the app at `https://app.approachstrength.com` (base path `/`). All links come from `EXPO_PUBLIC_APP_URL` / `EXPO_PUBLIC_SITE_URL` (`src/lib/links.ts`; no github.io fallback). Settings → Legal, the sign-up agreement line, "Print parent consent form" and the Coach Terms link open `SITE_URL/privacy`, `/terms`, `/consent`, `/terms#coach-terms`. QR invites and join links use `APP_URL/join?code=…`. The app's old `privacy.html`, `terms.html`, `consent.html` are generated redirect pages (meta refresh, no script). The app sends `noindex`.
- **Website (placeholder until the marketing site):** `/` (name, "Strength training for volleyball athletes and their coaches.", **Log in** → app, links to Privacy, Terms, Parent consent form, the email), `/privacy`, `/terms`, `/consent`, `404.html`, `robots.txt` (allows indexing), `CNAME`. Plain HTML/CSS, self-hosted Inter / Inter Tight (subset woff2, OFL), outlined logos, no scripts, cookies, forms or third-party requests.
- **Rename (§3):** app name, web title, manifest ("Approach Strength" / "Approach"), onboarding, Settings, share texts, board signature, README, `brand-tokens.json`. Bundle ID, repo and database names, and the tagline are unchanged. iOS `CFBundleDisplayName` stays "Approach" (the short home-screen name).
- **Brand assets:** `assets/brand/source/` now has `wordmark-on-dark|light.svg`, `lockup-plain-on-dark|light.svg`, `lockup-stacked-on-dark|light.svg`, `lockup-on-dark|light.svg` (badge + wordmark + tagline, rebuilt) and `powered-by-on-board.svg`, all text converted to outlines (Inter Tight from `@expo-google-fonts`). The app uses PNG renders: `assets/brand/wordmark-dark|light.png`, `powered-by-board.png`.
- **Board:** presets Silver (default), Red, Orange, Gold, Green, Teal, Blue, Purple (brand guide §7); existing teams keep their saved hex; "Done" pill text is Carbon on every preset. "Powered by Approach Strength" (plain mark + 14 px text, Steel) bottom-right in the footer row with the ticker, 24 px from the edges.
- **Level cards (§4):** Training's three descriptions in Set level; "See the full checklist" opens Appendix B read-only (`src/lib/levelChecklist.ts`).
- **F-2:** tokens `errorText` / `warningText` (dark = `error` / `warning`; light `#C42B30` / `#8A5A00`) for all error/warning text and icons (StatusChip "Consent needed", forms, builder checks). `error` / `warning` stay for borders and fills.
- **F-7:** buttons, chips, links, checkboxes, switches (new 44 pt `Toggle` wrapper), steppers and inputs ≥ 44 px; in-workout set check, Previous/Next, rest −15s/+15s/Skip and Finish ≥ 56 px. Audit: 29 screens, 0 targets under 44 (inline links inside sentences exempt).
- **J1:** `member_levels` returns only `adjusted` (program exercise → the exercise this athlete gets) for athletes whose exercises resolve lower because of another team. No level value, team, coach or reason. The coach app sends the table of what each of its program's exercises becomes at levels 1/2/3.
- **J3:** `team_effort` no longer returns `ranked`. Teammates don't receive athletes who follow another team's program (they still get their own row); the coach gets every row and marks them with `members_following_other`.
- **Coach Terms (§8):** separate unchecked checkbox "I agree to the Coach Terms (Terms §4)" on coach sign-up (sign-up blocked until checked). Existing coaches see a one-time sheet; until they accept, "Record parent consent" (and the consent sheet's Save/Clear) and "Start strength check" are blocked with "Accept the Coach Terms first." (tap it to open the sheet). The server rejects `record_consent` and supervision confirmation without the current version (`2026-11-14`).
- **Welcome / Log in (§9):** Welcome (lockup, tagline, **Log in** and **Create an account**, 56 pt). Log in: email + password, "Signing in…", inline error "That email and password don't match. Try again.", "Forgot password?", "New here? Create an account". Create path: age → role (coach card off under 18; the `role` param preselects after the age question) → sign-up form (+ Coach Terms for coaches; "Already have an account? Log in.") → athlete steps as before; "Train solo" only after the age question. Pre-2.1 accounts answer the age question once after log in (under 13 → deletion request + block). The block screen hides Log in. Log out → Welcome; an expired session → Log in. `autoComplete` email / current-password / new-password.
- **Password reset (new, needed for "Forgot password?"):** sends a Supabase reset link to `APP_URL/reset-password`; that screen sets the new password. Demo mode says it can't send email.

## 4. Data model

Flags: **AGE** · **HEALTH/WELLNESS** · **BODY METRICS** · **LOCATION** · **PHOTO/VIDEO** · **CREDENTIALS** · **FREE TEXT**.

### Stored on the server (Supabase), after migrations 002–013

**2.4.0 (migrations 011–013).** Every new field maps to a compliance V4 row (Training v3 review) or CLAUDE.md known conflict 7:

| New field / object | V4 row | Who can read / write |
|---|---|---|
| `warmup_templates` (id, team_id, created_by, name ≤ 60, items jsonb {raise, activate, potentiate}, created_at) | warm-up templates (coach-private) | only the team's coach, only their own rows (RLS); athletes never read it (a template is copied into the session when used) |
| `teams.default_warmup` ('approach' / 'template' / 'none'), `teams.default_warmup_template_id` (must be this team's template; on delete set null), `teams.limited_space` | team "Default warm-up" setting, "Limited space" setting | members read (no personal data); the coach writes |
| `live_progress.state` may be `warming_up` (constraint change, no new column) | the tile state "Warming up" | as `live_progress` (box 4 / boards toggle) |
| `live_progress.position_index` (0–11) | `live_progress.position_index` (+ existing `rotate_at`) | as `live_progress`; never joined with load, RPE, level or check-ins |
| `teams.gym_equipment` may hold `ssb`, `ghd`, `suspension`, `sliders`, `hurdles` (constraint change) | catalog v3 equipment (program content) | as before |
| `my_rack` returns `my_index` (the athlete's order in their rack group by user id; derived, nothing stored) | rack rotation start position (program-design §4b data) | the athlete, own rack only |
| `team_programs.program` JSON: session `source`, `levelAdjust`, `warmup` (raise/activate/potentiate, `edited`, `template`, `limitedSpace`, `compact`, `teamDefault`), `targetMinutes`, `fitLog` (`undo:<step>`), `format: 'rack_rotation'`, `rotation` (positions, rotationSec, rounds, buildUpRound); program `levelAdjust`, `levelAdjustOffFor` (opaque per-team keys, never user ids), `sessionMinutes`, `minutesByWeekday`, `block`; exercise `method`, `pct`, `customName` (warm-up item) | a V4 row for each, except `session.source` (CLAUDE.md known conflict 7: ask Ryan before deploy) | as `team_programs` |
| `team_calendars` events: `roomMinutes` | `CalendarEvent.roomMinutes` | the team's coach and members; another team's events reach an athlete without it (V4) |
| `workout_logs.entries` JSON: `warmupSets` (each `warmup: true`) | ramp-up sets in logs | as `workout_logs`; never counted as work sets (`setsDone`), suggestions or bests |

Not on the server: warm-up Done states (`warmupDone` on the device log only); the session estimate and fit lines are computed.

**2.3.0 (migrations 009, 010).** Every new field maps to a compliance T4 row:

| New field / object | T4 row | Who can read / write |
|---|---|---|
| `teams.kind` ('volleyball' \| 'general', default volleyball) | `teams.kind` | members read; set only at creation (general only via `create_general_team`); a trigger blocks changes once the team has members |
| `teams.trainer_terms_version`, `trainer_terms_accepted_at`, `trainer_terms_accepted_by`, `trainer_confirmations` (jsonb: the three confirmations, each with a timestamp) | `teams.trainer_terms_*`, `teams.trainer_confirmations` | no column grant; the trainer reads them via `my_team_status`; written by `create_general_team` / `accept_trainer_terms` |
| `teams.trainer_verified_at`, `trainer_verified_by` (text) | `teams.trainer_verified_at/_by` | no grant; a trigger allows changes only from the service role (README SQL); the trainer reads them via `my_team_status` |
| `team_programs.target_user_id` (uuid, nullable; `group_key = 'client:<uid>'`) | `programs.target_user_id` | general-team clients read only team-wide, their group's, or their own targeted program |
| `team_groups.name` (existing) in general teams | free-named groups | a general-team client reads only their own group |
| `team_programs.program` JSON: `general`, `goal`, `weeks` (rpe, deload, schedule), `startDate`, `templateOf`; session `warmup`; exercise `cardio` {minutes, intensity} | program goal; cardio | as `team_programs` |
| `workout_logs.entries` JSON: `minutesDone` for cardio (no sets, HR, pace, distance or calories) | cardio logs: minutes only | as `workout_logs` |
| `teams.gym_equipment` (text[], known equipment ids only; general teams only) | gym equipment profile | members read; the trainer writes |
| policy "athlete deletes own check-ins" + `delete_my_checkins()` | (T5 MUST: delete check-in history) | own rows only |

New RPCs: `create_general_team`, `my_team_status`, `accept_trainer_terms`, `current_trainer_terms`, `general_team_open`, `general_team_can_post`, `team_kind`, `my_group`, `delete_my_checkins`. Changed: `join_team` (adults only and verified for general teams; returns `kind`), `team_programs`/`team_groups` select policies (general scoping), program insert/update (general: verified, current Terms, target is a member), `test_sessions`/`test_results` inserts (volleyball only), `record_consent` (not in general teams). Templates are **not** on the server (device only). No `ai_assisted` column.

**2.2.1 (migration 008):** `profiles` adds **`coach_terms_version`** (text, `2026-11-14`) and **`coach_terms_accepted_at`** (timestamptz): written only by `accept_coach_terms` (own row, coach accounts) or at coach sign-up from the checkbox (`handle_new_user`); not in the column select grant (others can't read them; the user reads them with `my_coach_terms`); a trigger stops anyone clearing them. New RPCs `current_coach_terms`, `coach_terms_ok`, `my_coach_terms`, `accept_coach_terms`. Changed: `record_consent` and the `test_sessions` insert policy need the current Coach Terms; `member_levels(t, ex)` returns `adjusted` instead of `swap_level`; `team_effort` drops `ranked`. No other new tables or fields.


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
| `volley-strength/data/v1` (2.2.1 additions) | `profile.hasAccount` (this device was signed in, so an expired session goes to Log in), `coachTermsPrompted` (account ids shown the one-time Coach Terms sheet) | — |
| `volley-strength/data/v1` (2.3.0 additions) | `templates` (trainer's program templates: plan only, never logs), `openSeen` (general teams already shown "Your team is open") | — |
| `volley-strength/data/v1` (2.4.0 additions) | logs: `warmupDone` (warm-up parts checked; device only); `entries[].warmupSets` (ramp-up sets, also synced inside `entries`) | — |
| `load-and-launch/demo-server/v1` (demo only) | demo server, now also levels, lift program, racks, station runs; 2.4.0: `warmupTemplates`, team warm-up settings | CREDENTIALS, HEALTH/WELLNESS, AGE |

---

## 5. Third-party services

Supabase and GitHub (Pages, Actions) only. `pg_cron` is a built-in Supabase extension, not a new vendor. No new services in 2.2 or 2.2.1, and no analytics, ads, trackers, external fonts, or in-app AI. The website is a second GitHub Pages site (same vendor) with self-hosted fonts. Zoho Mail (the owner's email) is listed in the Privacy Notice; the app doesn't call it.

---

## 6. Deployment and usage

- **App:** https://app.approachstrength.com (Pages custom domain moved 11/15). 2.2.1 deployed from `main` on November 15, 2026.
- **Website:** https://approachstrength.com from `rparker-sudo/approachstrength-site` (placeholder + legal pages, live 11/15). When the owner set the custom domain, GitHub added `CNAME` to that repo.
- **2.4.0 deployed (November 19, 2026, about 10:25 AM PST; Ryan ran the SQL and pushed from his Mac):**
  - **Supabase (live):** Ryan ran migrations `011` → `012` → `013` (SQL Editor). Check after: `current_coach_terms()` = 2026-11-19, `current_trainer_terms()` = 2026-11-19, Vault secret `level_adjust_key` present (1). The first 011 run didn't take (check showed 2026-11-14 / 2026-11-15 / 0); re-run succeeded.
  - **App:** `v2.4.0` fast-forwarded into `main` at `a84cc6e`; GitHub Actions deploys `main` to `app.approachstrength.com`. Tag `v2.4.0` pushed by Ryan (app repo).
  - **Website:** branch `v2.4.0` fast-forwarded into `main` at `78850ba` (`/terms` from notice v2.6; `/privacy`, `/consent` unchanged). Live `/terms` checked: §4.1/§4T.3 v2.6 wording present.
  - **Settings changed (old → new):** Coach Terms version 2026-11-14 → 2026-11-19; Trainer Terms version 2026-11-15 → 2026-11-19; new Supabase Vault secret `level_adjust_key` (F2). Flags unchanged (`generatorV3` off; `catalogV3`, `rackRotation` on). No domain, DNS, repo-variable or Pages change.
- **Training v3 Step 0.3 (11/19):** 2.3.0 (trainer mode) and 2.3.1 (custom exercises) are **deployed** (both November 16, 2026). The C31 G3/G4 blocker is **closed**: Ryan confirmed on 11/16 that Legal approved the trainer wording as written (§8). Training v3 (2.4.0) doesn't change it. 2.4.0 is built on branch `v2.4.0` from hand-off `632a16e` (docs of Wed Nov 18, 2026).
- **2.3.1:** app deployed from `main` on November 16, 2026 (custom exercises). No migration and no setting changes.
- **2.3.0:** app and website deployed from `main` on November 16, 2026. Migrations 009 and 010 applied by Ryan (Supabase SQL Editor) the same day. No domain, DNS, repo-variable, Pages or Supabase setting changes.
- **Supabase:** live, Free plan. 002–007 applied (005–007 on November 14, 2026, with pg_cron enabled, per the owner). 008 applied November 15, 2026 (owner). Auth Site URL and Redirect URLs moved to `app.` 11/15.

### Marketing site (Part C, spec `docs/specs/marketing-site.md` v1.1)
- Built by `scripts/build-site.py` into `rparker-sudo/approachstrength-site`: `/`, `/features`, `/pricing`, `/admin-preview`, `/safety`, the legal pages (unchanged words, new site header and footer), and 404.
- Words come only from copy v1.1; prices only from the site repo's `pricing.json` (= spec §6); admin-preview sample data from `admin-preview.json` (= design §5.2).
- Screenshots S1–S6 are in `assets/screens/` (demo mode, sample data, approved by the owner 11/15; seed and capture scripts were scratch only, not in the repo).
- No JavaScript, forms, cookies, or third-party requests; self-hosted fonts.
- Checks: `scripts/checks/site-copy-match.py` and `legal-pages-match.py` (both in `run-all.sh`), plus a browser pass (tap targets, 320 px, 200% zoom, menu without JS).
- Report: `reports/marketing-site-acceptance.md`. **Published November 15, 2026** (site commit `d66444b`); the owner confirmed the live checks on 11/16. All rows pass.

### Settings changes (old → new), 2.2.1 §1–§3, §8
Every change listed in the spec, made by the owner in a dashboard. Filled in as each step is done.

| Where | Setting | Old | New | Done |
|---|---|---|---|---|
| `rparker-sudo/approach` → Actions variables | `APP_URL` | `https://approachstrength.com` | `https://app.approachstrength.com` | 11/15 |
| same | `BASE_PATH` | `/` | `/` (unchanged) | 11/15 (checked) |
| same | `SITE_URL` | not set | `https://approachstrength.com` | 11/15 |
| `rparker-sudo/approach` → Pages | Custom domain | `approachstrength.com` | `app.approachstrength.com`, Enforce HTTPS | 11/15 |
| `rparker-sudo/approachstrength-site` → Pages | Source / custom domain | (repo didn't exist) | Repo created 11/15; Pages from `main` / root; custom domain `approachstrength.com`, Enforce HTTPS; `www` redirects to the apex | 11/15 (owner checked: home, `/privacy`, `/terms`, `/consent`, `www`, `app.`) |
| Supabase → Auth → URL Configuration | Site URL | `http://localhost:3000` | `https://app.approachstrength.com` | 11/15 |
| same | Redirect URLs | none | `https://app.approachstrength.com/**`, `http://localhost:*/**` | 11/15 (no old github.io or apex entries existed, so nothing to remove later) |
| Supabase → Auth → Email templates | Subjects | "Confirm your email address", "Reset your password" | **not changed** | Gap accepted by the owner 11/15: the Free plan with default SMTP can't edit templates. The default emails don't name the product (no old name shown). Deferred to 2.2.2 (custom SMTP needs planning approval, or Pro). |
| Supabase → Auth → SMTP | Sender name | default SMTP | not changeable on default SMTP | — |
| Supabase → SQL | Migration | 002–007 | + `008_approach_2_2_1.sql` | 11/15 (owner) |
| Cloudflare DNS | `app` CNAME, apex A/AAAA, `www` CNAME, GitHub TXT | done by the owner 11/14 | unchanged; verified by the owner 11/15 (all DNS only) | 11/15 |
- **Users:** the owner plus fewer than 10 others, all 18+, per the owner **(unverified count)**.

---

## 7. Monthly costs

$0 now. Future: Apple Developer Program $99/year; Supabase Pro about $25/month if needed **(unverified)**.

---

## 8. Known gaps, judgment calls and checks

**2.4.0 judgment calls, gaps and questions (Training v3; also in `reports/training-v3-acceptance.md`):**
- **`session.source` (Legal ruling #1, 11/19):** approved and added to V4 as program metadata. #1a any coach or trainer edit sets `'coach'` (`coachEdit`); #1c never on boards.
- **Spec inconsistency (§1.2 vs the Part 1 criterion):** §1.2 says turning "Adjust to level" off on a generated session makes it `'coach'`; the Part 1 criterion says the level toggle doesn't change the source. Built: no flip; "off" is honored on generated sessions too (athletes get the written exercises; Approach Strength's limits still apply). Product to confirm.
- **Level toggle precedence** (known conflict 3, for UX): athlete off → session → program; the session toggle stays enabled with "Program setting: Off".
- **Not built (known conflict 5):** the dismiss-once RPE 9–10 note and the confirm when turning level adjust off for a minor (Legal TR3-1). **TR3-2** built as the spec says; Legal's stricter interim recommendation not adopted (founder's call). TR3-2 content only reaches athletes once `generatorV3` is on.
- **Migration rule for `source` (Legal ruling #1b, 11/19; `src/lib/source.ts`, used by `resolveSession` and `generatedWeek`):** a session saved before 2.4.0 (no `source` in the stored JSON) is `'coach'` only when the stored program shows a coach's hand; otherwise `'approach'` (generated limits apply, the safer direction when we can't tell). Personal programs (not posted, not a trainer program) are always `'approach'`. The 2.3.x generators (`generateProgram`, trainer `starterSessions`) never write any of these traces, so a posted, unedited generated program reads as `'approach'` (checked over 216 generated programs and every trainer goal/size). The traces:
  1. a row with `restSetByCoach: true` (the coach set the rest);
  2. a row grouped by hand: `autoGroup === false`, or a `group` letter without `autoGroup: true` (the generator's auto-pairing always sets `autoGroup: true`);
  3. a row using one of the program's 2.3.1 custom exercises (D-058: coach-built content);
  4. a row note the generator never writes (the generator writes only three fixed notes);
  5. a stations session (`format: 'stations'`);
  6. a trainer session added with Add session (`Session N`, focus "Full body"; the starter templates never use that name).
  Sets, reps or effort typed over generator values leave no trace; those sessions stay `'approach'` (#1b: "if unknown, use 'approach'"). The earlier rule ("`'coach'` whenever posted") is replaced.
- **R7 match-day moves** (a lift on a match day moves to a free day) still run for every program: they aren't in spec §0.3 and the v2.2 calendar checks still expect them. Product to confirm whether coach-built weeks should keep them.
- **Back after a break ramp** (trainer goal) still applies to trainer-built sessions in that program: it's part of the goal the trainer chose, and its 2.3.0 check isn't in §0.3. Product to confirm.
- **Product name in new UX copy:** UX v1.0 draws "Approach" (tag, chip, "Approach fits its sessions"). The 2.2.1 rename (D-035) requires "Approach Strength" in user-facing text, so the app says "Approach Strength." UX to update the doc.
- **Effort explainer:** the session editor's "Strength sets stop with about 2 reps left: RPE 8 or below" sentence was removed (it read as a builder rule); the RPE definition stays.
- **Per-athlete level-adjust flag (Legal ruling #2, 11/19):** the posted program lists athletes with adjustment off only as keys `'k' + first 32 hex of HMAC-SHA256(secret, team id : user id)`. **Secret:** Supabase **Vault**, secret name `level_adjust_key`, a random 32-byte value (hex) created once by migration 011 (`vault.create_secret`, skipped if it exists). Members can't read Vault. `level_off_keys(team_ids)` (migration 011, `security definer`) gives the team's coach or trainer every member's key and an athlete only their own; `level_off_key()` isn't callable by anon or authenticated. The app keeps the keys it was given in memory (`src/lib/levelKeys.ts`) and on the device (`approach.levelKeys.<account id>`, for offline starts); it never computes a key. Without the key, the coach's per-athlete toggle reads "Connect to change …". Demo mode mirrors it with a device-only secret. No new table or column. The earlier plain client hash is gone.
- **Terms v2.6 (Legal ruling #7, 11/19):** Coach Terms and Trainer Terms versions **2026-11-14 / 2026-11-15 → 2026-11-19** (`COACH_TERMS_VERSION`, `TRAINER_TERMS_VERSION`; `current_coach_terms()`, `current_trainer_terms()` in migration 011). Existing coaches re-accept through the existing Coach Terms sheet before recording consent or confirming supervision; trainers re-accept before posting (`general_team_can_post`). `/terms` regenerated from notice v2.6 with `scripts/build-legal-pages.py` unchanged (only §4.1 and §4T.3 differ; `/privacy` and `/consent` regenerate byte-identical). The generator's fixed `PUBLISH_DATE` still reads November 16, 2026 (no script edits; question for Ryan).
- **`my_index` (Legal ruling #3):** `my_rack` returns one row, the caller's own; `my_index` counts members ordered before `auth.uid()`. No partner index is returned (SQL check in `rls-2.4.0-legal.sql`).
- **Warm-ups:** team default and Limited space are stamped into each session's warm-up when the coach posts (marked `teamDefault`); sessions the coach edited keep theirs. Session-level Limited space lives inside the `warmup` key. Warm-up minutes are an estimate (drills, items, potentiation steps + 1 min). Ramp-ups skip throws (potentiated with light throws). "Bar" = 45 lb.
- **Fit to time:** generated sessions fit to the day's target (date → weekday → program → top of the phase range); undone trims are stored in `fitLog` as `undo:<step>`. Editing a generated session makes it the coach's and the automatic fit stops. The under-target add-back covers the care round and accessory sets, not the extra position accessory.
- **Catalog:** the §4b worked example matches the table except the beginner's Copenhagen: catalog §3 tags Short-Lever Copenhagen bench-only and the example room has a box (the beginner gets Side Plank). Training to fix the tag or the example. `er-90-90-iso` and `lateral-hurdle-hop` got sport-neutral general-team "why" lines (judgment calls).
- **Olympic resolution conflict (catalogV3 on):** safety-guidelines §2a step 5 ("Olympic lifts resolve to a jump for anyone below advanced") vs spec §2.1/§3 and program-design §8a (L2 derivatives for intermediates). Built per the spec; beginners still get a level 1 jump (keeps the §2a criterion). The v2.2 check "Hang Power Clean → jump for intermediate" passes with `catalogV3` off and is replaced while it's on. **Ryan to confirm** (or ship `catalogV3` off).
- **Ladders:** Inverted Row sits after the band pulldown in the vertical-pull entry rung (the §4b worked example's beginner pick).
- **Rack rotation:** one clock for the room (the existing station-run row, block letter in its session id). **Not built:** Pause and per-rack controls (F55a), which need a per-rack clock on the server, a new field (G-5): ask before building. Partner names stay off (`rack_partner_names` flag), so the spot line reads "Spot the next lifter." The start order in a rack is by user id (`my_index`).
- **generatorV3 off:** with it on, these earlier checks fail: the 2.1 G1 rule that the stored plan never exceeds the athlete's level (v3 writes at the top rung on purpose), G8 "same sets × reps after a swap" on plyo slots, and the school + home week's light home day and bodyweight home defaults (H2). Also not built in v3: the practice-load adjustment of plyo contacts, wave loading, and the bye-week Day 3 from the calendar.
- **Trainer:** per-week effort takes any RPE (5–10); cardio stepper 5–180 (UX F41, Product to confirm).
- **Known conflict 10** (built as drawn; Product to confirm): F41 5–180 min; F55a one room clock (built) with per-rack override (not built, above); F46c per-athlete toggle stored per program.

**2.3.1 judgment calls (custom exercises; for the planning team and Legal):**
- **Owner decision outside the specs:** Ryan asked for custom exercises in all programs (volleyball and trainer teams) on 11/16 and chose: stored inside each program, coach sets type and level, name/cue/equipment/how-to/weighted, version 2.3.1. CLAUDE.md says volleyball teams don't change; this is a deliberate owner-approved change for volleyball coaches (athletes see more exercises only when their coach adds them).
- **Version number:** the trainer spec reserves **2.3.1** for the AI assistant (B10). Ryan chose 2.3.1 for this; the AI release will need another number. **Planning team to renumber.**
- **G-5 / Legal:** no new table or column. The coach's exercise definitions (name, cue, steps, equipment, tags) travel inside `team_programs.program`, like coach notes already do. They're program content, not data about users. **Legal to confirm** this needs no T4 row.
- **G-6:** custom names, cues and steps are the coach's own words, shown to athletes (including minors) as written. The claim-word rule covers our copy, not coach content (same as coach notes). **Legal to confirm.**
- **Safety:** the coach picks a type and a level. Athletes below the level get the closest library exercise of the same movement, and minors' rules (effort clamp, circuit/pairing, testing) work off the tier. A coach could still mislabel a heavy lift as "Accessory": noted for Training (a CSCS review could add a confirmation line).
- **Not offered:** cardio (duration-only stays with the library) and Olympic lifts. Custom exercises aren't used in home sessions (each athlete gets a library exercise of the same movement for their home equipment).
- **History:** the device keeps a copy of every custom exercise it has seen (`customSeen`, device only), so logged history keeps the name after a program changes.

**2.3.0 judgment calls and gaps (for the planning team; also in `reports/v2.3.0-acceptance.md`):**
- **G3/G4 for general teams:** the pain card (`PAIN_TRAINER`) and head-injury line (`HEAD_INJURY_TRAINER`) use the design §S1b text, one constant each in `src/lib/general.ts`. Legal approved both as written (Ryan, November 16, 2026).
- **Known conflicts built as settled in CLAUDE.md:** class board **off** by default for clients (compliance T6 over F33); combined-cap block across all programs posted to a client (Product to confirm); an unverified trainer can build but not post; removing gym equipment warns and each client switches to the closest exercise (Product to confirm); "lowest level among targets" for a group's weekly cap; youth pairing/station rules are warnings in general teams.
- **General library kept apart from the volleyball library:** the 32 non-cardio general exercises are `scope: 'all'` as the doc says, but volleyball teams keep their 2.2.1 library (generator, picker, resolution) so volleyball programs don't change. Flag for Training/Product: decide whether volleyball pickers should show them.
- **Doorframe Row:** its "why" mentions hitting and has no `whyGeneral`; general teams show no "why" line for it until Training supplies one.
- **Neutral strings (design §S2) changed for everyone:** "I'm a coach or trainer", "I'm an athlete or client", "Coach and trainer accounts are for adults 18 and older.", the signed-out Team card, the delete-account body. Strings inside volleyball team screens are unchanged.
- **Create team** now asks the type first (F31), so volleyball coaches have one extra tap ("Volleyball team", Next).
- **Templates and drafts** live on the trainer's phone (T4 allows a server table; device storage collects less). Logging out removes team drafts from the device (as team programs always were).
- **Multi-team clients:** a client who is also on a volleyball team follows one team's program (TM-2 as built); "Your choices" saves apply to every team (as built). General-team defaults are all off.
- **Calendar for general teams:** next 2 weeks (sessions from each program's week view) and breaks; Add → Session opens the program's week view. Date-specific extra sessions aren't built.
- **Combined checks** compare programs week by week from each program's own week 1 (not by calendar overlap): conservative.
- **Demo mode** has no service role: tests open a demo general team by setting `verifiedAt` in demo storage.
- **"Paused" vs "not open"** on the trainer's screen: a team that was open on this device and is now cleared shows "paused" (the server doesn't keep a history).
- **New UX copy not in the docs (Branding to review):** Today "No session today / Rest, move easy…", progress "Personal bests / Only you and your trainer see these.", settings safety line for adults, "Tell your trainer in person about any pain.", trainer board/calendar/racks lines, the ClientsScreen programs helper, gym equipment save toast as designed.

**2.2.1 judgment calls (for the planning team / Legal):**
- **Legal pages:** published from `docs/legal/` with no wording changes. The script leaves out Legal's drafting notes (after "### Drafting notes") and the two italic review markers "(Attorney to finalize.)" and "(Attorney to review; see the drafting note below.)", as 2.2.0 did for the first. It fills "[publish date]" with November 15, 2026 and adds `id="coach-terms"` to Terms §4. `scripts/checks/legal-pages-match.py` compares every published word with the docs (whitespace normalized). **Legal to confirm that leaving out the review markers is right.**
- **Emails on the legal pages** are plain text, not mailto links (a link would need a pattern match on legal wording). The site footer has a mailto link.
- **Wordmark (D3):** Branding's zip wasn't supplied, so `scripts/build-brand-svgs.py` builds the SVGs to brand guide §5: STRENGTH caps are 40% of APPROACH's, and STRENGTH is tracked so its ink is exactly as wide. The existing `lockup-on-*.svg` files (badge + wordmark + tagline) were rebuilt in place rather than deleted, because the brand guide still lists them.
- **Welcome lockup:** the app's existing badge lockup (badge, wordmark, tagline). The brand guide suggests the plain lockup for "app sign-in"; easy to swap.
- **New copy not in the docs (please review):**
  - Coach Terms sheet: title "Coach Terms", buttons "Continue" and "Not now".
  - Password reset: "Reset your password", "Enter your account email. We'll send a link to set a new password.", "Send link", "If that email has an account, a link is on its way. Open it on this device.", "Set a new password", "Save password", expired-link line.
  - Demo note "Demo mode: accounts are saved on this device only."
  - Settings "Sign out" renamed "Log out".
- **Log out** removes this device's profile (so Welcome shows) but keeps on-device history (programs, logs, body weight). Logging in again rebuilds the profile from the account. On a shared device, the next person's log-in replaces the profile but the history remains: **known gap**.
- **Log in on a new device** sets experience to beginner on the device profile (the server doesn't store experience). It only matters if they later join a team with no level set (self-reported beginner, coach confirms).
- **Expired session vs offline:** only a session that is gone (no error) sends the user to Log in. An offline token refresh keeps them in the app with on-device data.
- **Sign-up confirmation link** opens the app (`emailRedirectTo` = `APP_URL`); the user then logs in (the app doesn't sign in from that link automatically). Reset links do sign in, on `/reset-password` only.
- **F-2 dark theme:** dark `errorText` keeps the existing `#E5484D`, which is 4.31:1 on Graphite and 3.77:1 on raised surfaces (≥ 4.5 on the background). The spec says dark = existing; noted for design-system F-1 (2.2.2).
- **F-7 week editor:** day cells are 44+ px by tightening the gap to 2 px; the in-workout primaries use the new `large` button size (56).

**2.2.0 judgment calls (still true unless noted):**
- **Self-reported level:** the server doesn't know an athlete's experience, so there's no server backfill. Each athlete's app fills `team_members.level` once from onboarding experience (`set_my_self_level`, only while it's empty). Existing athletes get a level the next time they open 2.2.
- **Q-7 / J1 (2.2.1):** `member_levels` no longer sends a level number. It returns only the adjusted exercises, computed from a table the coach app sends (what each of its program's exercises becomes at levels 1, 2 and 3). The adjusted exercise itself still hints at a lower level elsewhere (as "Adjusted for this athlete" always did), and a coach could send a crafted table to narrow it down. The resolution rules live in the app, not the database, so this was the smallest change that keeps the numeric value off the wire. **Legal to confirm.**
- **J3 (2.2.1):** teammates no longer get a `ranked` flag or any athlete who follows another team's program. Such athletes still get their own row (so they see their attendance, hours and jump gains). Side effect: teammates no longer see those athletes on the Attendance, Hours or Jump-gains tabs either (the spec asks for the rows to be omitted).
- **`station_runs`:** a new team-level table for the shared rotation timer. Athletes without board consent also need the timer, so it can't live in `live_progress`. It holds no athlete data. Listed for Legal (G-5) because the spec named only `live_progress.station_id` and `rotate_at`.
- **Rack partner names flag:** SQL function `rack_partner_names()` returns false. Replacing it with `true` turns on names without an app build (B5).
- **Breaks:** `CalendarEvent.type 'break'` with `endDate`. Other teams' breaks show only as a band. Other teams' testing days aren't copied into the athlete's combined schedule.
- **Easing back in** ignores extra-recovery logs (gentle mobility doesn't end a break from lifting; the safer reading).
- **Testing-date suggestions:**
  - "In-season" spans the team's first to last match on the calendar.
  - Preseason "no prior block in Approach" means the block start is the program's creation day.
  - In-season with no matches on the calendar shows "No good date in this phase."
- **Board "Up first":** the athlete's resolved first exercise, from this team's level plus the server's adjusted list (2.2.1 J1). Never labeled.
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
- ~~Contact email in the source docs~~: fixed in the 11/14 docs; the find-and-replace is removed (2.2.1 §7.1).
- **Auth email templates not renamed (accepted gap, 11/15):** Supabase Free + default SMTP can't edit templates. The emails keep Supabase's wording, which doesn't name the product. Deferred to 2.2.2.
- **Live checks (2.2.1): passed 11/15 (owner):** HTTPS and deep links on `app.`, the github.io redirect, the auth emails end to end, the apex and `www`, the two-device board test on `app.`, Settings → Legal links. Tag `v2.2.1` pushed.
- **F19b week grid:** no drag-to-move and no "Switch to home / weight room" per day. The coach builds school + home weeks from Week setup and edits sessions.
- **F28e:** "Run jump tests as stations" isn't built (load tests correctly can't be stations).
- **F27c/F27d:** no "Timed" work toggle or work timer for tier C/D rows. Reps and holds are typed as text.
- **F22:** a filler shows "During rest" in the builder, but the rest-timer screen doesn't show the filler row.
- **Rest field:** no "Reset to auto" link (the floor note and coach override work).
- **Effort per-athlete caps:** Consistency/Overall use the team schedule. A beginner whose team week exceeds their cap by more than the one light home day can't reach 100%.
- **Demo mode** still stores passwords in plain text (C16, out of scope).
- **iOS in Expo Go** not tested.

**Testing done for 2.2.1 (branch `v2.2.1`):** see `reports/v2.2.1-acceptance.md` for each criterion.
- `tsc`, `expo lint`, `build:web` pass; `run-all.sh` 13 checks pass (new: `v221-check.ts`, `legal-pages-match.py`) and fails when a runner breaks.
- SQL: upgrade path v1 → 002 … 008 (008 run twice) and fresh `schema.sql`; `rls-2.2-pass1/2/3.sql` give the expected 7/7/1 errors (coach fixtures now accept the Coach Terms at sign-up; the old `swap_level`/`ranked` lines use the new shape); new `rls-2.2.1.sql` gives the expected 7.
- Browser (demo mode): new `test-v221` (Welcome, Create path, Log in, pre-2.1 age, under 13, `role` param, Coach Terms, level sheet), the tap-target audit, and the v2.2 suites (pass 1/2/3, 2.1 regression) with their sign-in helpers updated for the new Log in screen.

**Testing done for 2.2.0 (branch `v2.2`):**
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
