# Approach — build snapshot

*As of November 10, 2026 (v2.1: pass 1 and pass 2). Facts only. Items marked **(unverified)** could not be confirmed from the code or from the owner.*

**What it is:** a weight-training, nutrition and planning app for volleyball athletes and coaches. App Store name (planned): "Approach: Volleyball Fitness". Home-screen name: "Approach".

---

## 1. Version and changes

**Current version:** 2.1.1 (`app.json`, `package.json`).
- Pass 1 (`docs/specs/v2.1-soft-launch.md`, S1–S11) and pass 2 (`docs/specs/v2.1-pass-2.md`, P1–P8) are both on `main` of GitHub `rparker-sudo/approach`. The owner approved and merged pass 2 on November 10, 2026, and the site deployed. The `v2.1` tag is still to be pushed from the Mac.

**History (from `CHANGELOG.md` and git):**
- Before 1.0 the app was called "Volley Strength", then "Load & Launch", then renamed "Approach".
- **1.0:** brand, four tabs, generated programs, chosen lift days, season calendar, workout logging, Fuel targets, touch-height tracking, teams with live sync (Supabase), QR invites, mobile browser version on GitHub Pages.
- **2.0:** 1–7 lift days, equipment-aware programs, 64-exercise library with how-to text, weekly progression with deloads, workout view with rest timers, position groups, shared team calendar, daily readiness check-in, migration `002`.
- **2.1 pass 1 (2.1.0):**
  - month/year age gate (under 13 blocked; birth year + is_minor only; coaches 18+);
  - parent consent on file with RLS enforcement;
  - free-text pain note removed;
  - check-in sharing notice;
  - in-app account deletion;
  - coaches see only current members;
  - legal pages;
  - copy without injury claims;
  - training safety fixes G1, G2, G5;
  - migration `003`.
- Git tags: `v1.0` and `v2.0` exist only in local clones. Tag pushes from the cloud workspace are blocked, so the owner pushes tags from the Mac.

**What changed in 2.1 pass 2 (2.1.1):**
- **P1, six permissions:** `team_members` gains `c_participation`, `c_checkins`, `c_share_checkins`, `c_boards`, `c_attendance`, `c_testing` and `consent_version`. `consent_status` is migrated, then dropped:
  - training_only → participation
  - full → participation + check-ins + sharing
  - pending → none
  - not_required (adults) → participation + check-ins + sharing; boards, attendance and testing stay off until they save "Your choices"

  The coach records form v2 in a six-box checklist (box 3 needs box 2; boxes 2–6 need box 1), with the confirm line "I have a signed parent consent form (version 2) for [name]."
  - Roster chips: Consent needed / Consent: N of 6 / Consent: all; a v1 record also shows "Form v2 needed for boards & testing". Tracker: "Consent forms: X of Y in · Print form".
  - Adults see "Your choices" once (five toggles, all on by default) and can change them in Settings → Privacy. Settings → Your data lists each permission.
  - RLS:
    - logs need participation;
    - `readiness` needs check-ins and sharing;
    - attendance, test results and live progress need their boxes;
    - only the coach (minors) or the athlete (adults) can change permissions;
    - the coach stops seeing check-ins when sharing is turned off.
  - A check-in with box 2 but not box 3 stays on the phone.
- **P2, board names:** `profiles.board_name_mode` ('short' | 'initials' | 'hidden'). "Jordan M." (default), "J.M." or hidden; one-word names stay as they are. Never a full last name. A minor without box 4 never appears.
- **P3, coach board:** `/board/[teamId]`, opened from Team → Open coach board (a new tab on the web). Only the signed-in coach of that team can view it.
  - Shows: board names, Not started / In progress / Done, sets done / total, a "PR" badge (no weight), today's session per group, a team goal bar, and an effort panel rotating every 20 s that can be hidden.
  - Controls fade after 3 s. There's a "Reconnecting…" banner, an empty state "Rest day. See you tomorrow.", and a dark projector theme.
  - New table `live_progress`. The athlete app upserts it 2 s after a set is marked done, and on finish (status done). Live updates come through Supabase Realtime, with a 15-second backup poll. Rows older than 24 h are deleted whenever progress is written.
  - `workout_logs` gains `pr_count` (from the finish summary) and `duration_min` (start to finish, capped at 120).
  - The board's queries select only names, status, sets and PR counts.
- **P4, effort board** (`src/lib/effort.ts`):
  - **Sessions:** one per scheduled lift day; extras and duplicates don't count.
  - **Consistency:** completed ÷ scheduled. Today counts once it's done; moved sessions count on their new day; testing days and mobility-only days aren't scheduled lifts.
  - **Week streak:** rest weeks never break it; a missed past session does.
  - **Practices & matches:** count of attendance.
  - **Hours:** lift plus attendance minutes, capped at 3 h a day and 15 h a week.
  - **Improvement:** average % gain in approach touch and broad jump vs. the first test in the period, computed on the server so teammates never get raw results.

  How it works:
  - Ties share a rank. The athlete's own row is pinned below the top 10. Season / This block filter.
  - Athletes see only the metric chips their permissions allow.
  - Inputs come from the RPC `team_effort`: board name, log times, session names, minutes, attendance (with permission) and improvement % (with permission). Never weights, test values, check-ins or nutrition.
  - Coach: Team → Effort tab, plus team settings: effort board on/off, effort panel on the coach board on/off, team goal (default = athletes on boards × prescribed sessions a week × weeks remaining × 0.8).
  - Athlete: Progress → Team effort card → full list. Private badges ("4-week streak", "Block complete", "New touch best") appear only on the athlete's own Progress tab.
- **P5, attendance:** new table `attendance`. Practice days come from the usual week unless the calendar says otherwise; matches and tournaments come from calendar events.
  - The athlete's Today screen has "I was there" (today and yesterday). The coach marks There / Not there from the roster, and the coach's entry wins: a coach row with 0 minutes means "not there", and the athlete can't change it.
  - Team settings: practice / match / tournament minutes (default 120 / 120 / 240).
- **P6, testing days:**
  - **Scheduling:** `CalendarEvent.test` ('full' | 'jump' | 'mid'). The coach adds a testing day in the calendar day sheet, and it's blocked within 48 h before a match or tournament ("Testing can't be within 2 days before a match"). A match added later within 48 h cancels the testing day in the plan. That day's lift becomes a Testing session.
  - **Supervision:** the coach's banner shows "Testing day: Full battery" and **Start strength check**, which needs "I'll be supervising this test, with safeties or spotters set." and records `test_sessions` (team, day, coach, time, battery). Load tests are locked by RLS until that row exists for the team and day.
  - **Athlete session:** warm-up → approach touch → broad jump → med-ball throw (best of 3; touch also goes into the device touch log) → strength checks:
    - full battery: trap bar 5RM, back squat and bench 5RM (advanced may choose 3RM);
    - dumbbell gyms: goblet squat and DB bench 8RM;
    - mid-season check: trap bar.

    Each lift shows a warm-up checklist, up to 3 attempts with a 3:00 rest timer, the cue "Your coach stops the set when form breaks. Never grind.", and "Enter your last good-form set".
  - **Eligibility for strength checks:** on a team, box 6, intermediate or advanced, and no pain or "run down" check-in today. Athletes without check-in permission are asked "Any pain today?" on the spot, and the answer isn't saved.
  - **Estimated strength:** weight × (1 + reps/30), computed in the database. Always "Estimated strength: ~233 lb (estimate)". Visible only to the athlete and coach.
  - **Starting weights:** a tested lift starts at min(e1RM × phase upper %, progression suggestion), or with no history e1RM × phase lower % (off 70–80, pre 75–85, in 70–80, post 60–70), rounded down to 5 lb (barbell) or 2.5 lb (dumbbell). A new test replaces the old estimate even if it's lower. The results screen shows "Updated your starting weights" (before → after). Untested lifts keep G5.
  - **Coach:** a Tests section in the roster with Edit / Void. Solo athletes: Progress → Jump test, kept on the phone.
- **P7, Fuel phase 1:**
  - `fuelTargets` and every numeric field (carbs/protein per kg, extra fluid ounces) are removed, along with all gram/ounce displays, the "20–30 g protein" timing lines, the onboarding body-weight step, and the Settings body-weight field. Body weight stays optional in Progress, on the phone.
  - Added the nine Fuel cards from `docs/content/fuel-cards.md`, showing today's matching cards first. Each has its source and the card note, and the tab keeps the nutrition disclaimer. Today shows the top card's title, linking to Fuel.
- **P8:** `public/privacy.html`, `terms.html`, `consent.html` (form v2, 6 boxes) regenerated from `docs/legal/` by `scripts/build-legal-pages.py`. Internal notes are left out, and the placeholders stay visible.
- **Migration:** `supabase/migrations/004_approach_2_1_pass2.sql` (one transaction, safe to re-run), folded into `schema.sql`. Tests are in `supabase/tests/rls-2.1-pass2.sql`.

**Decisions made with the owner during pass 2 (for the planning team):**
- **Touch height conflict:** `docs/compliance.md` says touch height MUST stay on the device, but the pass 2 spec (P6.5, P6.8) and Privacy Notice v2 put testing-day approach-touch results on the server. The owner chose **follow the spec**: testing-day touch results go to `test_results` (box 6 only; athlete and coach), and only the improvement % reaches boards. The everyday touch log in Progress stays on the phone. **compliance.md needs this exception added.**
- **Improvement format:** the spec and Privacy Notice say "% gain"; the design doc F10 shows "+1.5 in". The owner chose **% gain**.

**In progress / not finished:**
- Tag `v2.1` (from the Mac). Live check of the coach board's update speed on two devices.
- No iPhone build (EAS/TestFlight/App Store). Apple Developer Program not purchased.

---

## 2. Platforms and tech stack

| Layer | What's used |
|---|---|
| Platforms | iPhone (Expo Go only) and mobile web browsers (GitHub Pages). The coach board is web-first (also works on iPad). |
| Frontend | Expo SDK 58, React Native 0.88, React 19, Expo Router, TypeScript, react-native-web. |
| Backend / database | Supabase: Postgres, REST API, Realtime (now also `live_progress` and `test_sessions`), row-level security. SQL functions: `handle_new_user`, `join_team`, `record_consent` (six boxes), `set_my_choices`, `set_my_birth_year`, `delete_my_account`, `minor_from`, `has_perm`, `on_boards`, `board_name`, `board_members`, `team_effort`, `supervised`, `is_current_member`, plus triggers `set_e1rm` and `purge_live_progress`. |
| Auth | Supabase Auth, email + password ("Confirm email" on). |
| On-device storage | AsyncStorage (`localStorage` in browsers). |
| Hosting | GitHub Pages via GitHub Actions on push to `main`. Repository is public. |
| Dev tooling | TypeScript, ESLint (`eslint-config-expo`), a Python script that builds the legal pages. None of it ships in the app. |

---

## 3. User-facing features (2.1.1)

### Everyone
- **Onboarding:** age question, then role, then account (or solo), team code, name, position, experience, and (solo) week, lift days and equipment. No body-weight step.
- **Settings:** name, position, appearance, account (sign in/out, leave team, Delete my account), **Privacy** (board name; adults: five toggles), Your data (each permission on/off), Legal links, erase data on the device.

### Athletes
- **Lift tab:** consent banner (if no form yet), check-in card (with check-in permission or solo), lift-day cap notice, "I was there" (attendance permission), today's session or **Testing session**, and today's top Fuel tip.
- **Workout:** suggestions with G5 caps and strength-check starting weights; shares live sets with the coach board (boards permission); logs duration and bests.
- **Progress:** touch height, Team effort card and private badges, Jump test (solo), estimated strength per lift (labeled), optional body weight, history.
- **Fuel:** day-type guidance, plate proportions, meal timing, cited Fuel cards. No numbers.

### Coaches (18+)
- **Team screen:** Team / Effort tabs, testing-day banner and supervision confirmation, Open coach board, team code and QR, Print parent consent form, workouts by group, calendar (with testing days), and the roster. Roster rows have consent chips, the six-box sheet, attendance marks and Tests (Edit / Void). There's also the readiness card (only athletes who share check-ins) and team settings for boards, attendance lengths and med-ball weight.
- **Coach board:** `/board/[teamId]`.

---

## 4. Data model

Flags: **AGE** · **HEALTH/WELLNESS** · **BODY METRICS** · **LOCATION** · **PHOTO/VIDEO** · **CREDENTIALS** · **FREE TEXT**.

### Stored on the server (Supabase), after migrations 002–004

| Table | Fields | Who can read | Flags |
|---|---|---|---|
| `auth.users` | email, hashed password, metadata (name, role, position, birth_year, is_minor); sign-in data **(unverified)** | Supabase project owner | CREDENTIALS, AGE |
| `profiles` | id, name, role, position, birth_year, is_minor, **board_name_mode**, created_at. Users can update only name, position and board_name_mode. | the user; their coach; their athletes (coach name) | AGE |
| `teams` | id, name, join_code, coach_id, created_at, **practice_min, match_min, tournament_min, effort_board, board_effort_panel, team_goal, med_ball_lb** | coach; members | — |
| `team_members` | team_id, user_id, joined_at, group_id, **c_participation, c_checkins, c_share_checkins, c_boards, c_attendance, c_testing, consent_version**, consent_recorded_at, consent_recorded_by | the athlete (own); the coach | — |
| `team_programs`, `team_groups`, `team_calendars` | as in 2.0; calendar events may carry `test` | coach; members | FREE TEXT (coach notes) |
| `workout_logs` | id, team_id, user_id, session_name, logged_at, sets_done, note, entries, **pr_count, duration_min** | the athlete; the current coach. Teammates get only times, session names and minutes through `team_effort` (boarded members). | FREE TEXT |
| `readiness` | team_id, user_id, day, sleep, soreness, energy, pain (yes/no), created_at | the athlete; the current coach only while sharing is on | HEALTH/WELLNESS |
| `live_progress` *(new)* | team_id, user_id, day, session_id, sets_done, sets_total, status, updated_at; deleted after 24 h | the athlete; the coach (boarded, not hidden) | — |
| `attendance` *(new)* | team_id, user_id, day, kind, minutes, marked_by | the athlete; the current coach. Teammates get counts and minutes through `team_effort` (with permission). | — |
| `test_sessions` *(new)* | team_id, group_key, day, coach_id, confirmed_at, battery | coach; members | — |
| `test_results` *(new)* | id, team_id, user_id, day, test_id, value, unit, reps, e1rm (computed), entered_by, voided, created_at | the athlete; the current coach. Teammates get only jump-test improvement % (with permission). | **BODY METRICS** (approach touch; owner decision above) |

### Stored only on the device

| Key | Contents | Flags |
|---|---|---|
| `volley-strength/data/v1` | profile (name, role, position, experience, phase, lift days, week, equipment, birth year, is_minor; body weight now unused), programs, workout logs, body-weight log, touch-height log, readiness log, **last known permissions per team, strength estimates per tested lift, solo jump tests**, check-in notice seen, coach copy of team calendars, theme | BODY METRICS, HEALTH/WELLNESS, AGE, FREE TEXT |
| `approach/not-eligible/v1` | "1" if this device answered under 13 | — |
| `approach/workout-draft/…` | in-progress workout | FREE TEXT |
| Supabase session | login tokens | CREDENTIALS |
| `load-and-launch/demo-server/v1` (demo only) | demo accounts (password in plain text), teams, rosters with permissions, logs, check-ins, live progress, attendance, testing sessions and results | CREDENTIALS, HEALTH/WELLNESS, AGE |

---

## 5. Third-party services

Supabase and GitHub (Pages, Actions) only. No new services in 2.1. No analytics, ads, trackers, external fonts on the web pages, or in-app AI. Expo Go is used only for development.

---

## 6. Deployment and usage

- **Website:** https://rparker-sudo.github.io/approach/ (deploys from `main`; 2.1.1 deployed November 10, 2026).
- **Supabase:** live, Free plan; migrations 002, 003 and 004 applied November 10, 2026. The owner confirmed 004 with a check query: pass 2 columns present, `consent_status` gone, the four new tables present.
- **Users:** the owner plus fewer than 10 others, all 18+, per the owner **(unverified count)**.

---

## 7. Monthly costs

$0 now. Future: Apple Developer Program $99/year; Supabase Pro about $25/month if needed **(unverified)**.

---

## 8. Known gaps, shortcuts and checks

**Spec gaps filled with placeholders (need Training Content / planning review):**
- **Warm-up ladder** for strength checks: the spec points to §4a, which isn't in the repo. The app shows a generic checklist without numbers ("Empty bar or a light weight × 8", "About half your working weight × 5", "About 70% × 3", "About 85% × 1–2").
- **Testing-day warm-up** (before jumps): generic text ("5–10 minutes of easy movement, then a few practice jumps").
- **§4a phase date suggestions** for testing days: not built (the table isn't in the repo). The coach picks dates.
- **Season start** for effort metrics = when the team workout was built; "This block" = the current training block.
- **Weeks remaining** for the default team goal = weeks until the last match or tournament on the calendar, or 8 when none are set.
- **Supervision** is recorded per team per day (group_key 'all'), not per group.
- **Attendance "not there"** is stored as a coach row with 0 minutes (no extra field).

**Other gaps:**
- **Retention:** the notice says consent and supervision records are kept 5 years after an account closes, but account deletion cascades them away (also true in pass 1). Not built.
- **Deploy order:** run migration 004 right after merging, since the older site can't read the new columns. The new app also works on a database without 004 (it falls back to pass 1 consent; boards, attendance and testing then do nothing).
- **Per-date lift choices** on the season calendar aren't capped by G2.
- Demo mode stores passwords in plain text; "Lighten today" posts calendar edits immediately; no password reset; pounds only.

**Testing done for pass 2:**
- `tsc`, `expo lint` (with `EXPO_OFFLINE=1`; api.expo.dev is blocked here) and `build:web` pass.
- Migration 004 was run on a local Postgres 16 with a stand-in Supabase `auth` schema, both as an upgrade (v1 → 002 → 003 with pass 1 consent data → 004, run twice) and fresh from `schema.sql`. All the API/RLS checks in `supabase/tests/rls-2.1-pass2.sql` behaved as expected.
- Scripted logic checks passed: effort metric rules, testing rules (eligibility, batteries, e1RM, phase caps, re-test lowering, 48 h rule) and G1/G2/G5.
- Browser tests (demo mode) passed: no body-weight step; adult "Your choices"; Privacy names; permission list; Fuel without numbers and with sources; six-box sheet and box rules; live progress with no weights; coach board names, statuses and the forbidden-content check; effort tab; testing day scheduling, lock, confirmation record, best of 3, 200 × 5 → ~233 lb (estimate); hidden athlete off the board; legal pages v2. A pass 1 regression run (age block, check-in notice, account deletion for both roles, including the new tables) also passed.
- **Not tested:** the real Supabase project and **Realtime latency** (the "within about 3 s" criterion needs two devices on the live project), and iOS in Expo Go.

**Content review:** program rules, readiness thresholds, exercise text and the testing protocol details above were written with AI assistance. Fuel cards are from the planning team (Legal-checked, no dietitian review yet). No review by a qualified strength coach, athletic trainer or dietitian is recorded **(unverified)**.
