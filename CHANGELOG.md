# Approach Strength versions

Version numbers: whole numbers (1.0, 2.0) for big changes, decimals (1.1, 1.2) for smaller features and fixes.
The number is in `app.json` (`expo.version`, written as 1.1.0 for 1.1) and shows in the app under Settings.
Each version has a matching GitHub tag (`v1.0`, `v1.1`, …) and download (`approach-1.0.zip`).

## 2.4.0 — Training v3 (not deployed yet)
Built from `docs/specs/training-v3.md` v1.0 on branch `v2.4.0`, Part 1 → Part 2 → Part 3. Migrations `011`–`013` (run in order after 010; each safe to re-run). Acceptance report: `reports/training-v3-acceptance.md`.

### Part 1 — coach freedom, level toggle, warm-ups, session length (migration 011)
- **No builder blocks (D-045, F45).** Coaches and trainers can save any effort (RPE 10, "to failure," "max," AMRAP, for time), any rest (including 0:00; the auto value shows as an "Auto 3:00" chip), any grouping (any exercises, any number), any station, any order, and any number of days. The trainer post screen shows each client's combined weekly count as information; Post is always enabled except for the team gate (TM-19, Trainer Terms). Removed copy: the D-028 effort clamp, the rest-floor messages, the blocked-pair and circuit reasons, the stations Part 1 refusal, the trainer A1/A3 effort block, the 60-min cardio block, the trainer caps/day-off/deload messages, and `trainer-mode.md` §S1b "Effort clamp" and "Circuit clamp."
- **Generated sessions keep the rules (§0.1).** Every session has a source: `'approach'` (from the generator, the home-week builder, or trainer goal defaults) or `'coach'` (built or edited by a coach). `resolveSession` applies the effort ceilings, rest floors, the beginner circuit rule, the light home day cap and the trainer RPE 8 cap to Approach Strength's sessions only; lift-day caps apply to generated weeks only. Editing any exercise, set, rep, effort, rest, grouping, order or station makes a session the coach's; warm-up, length and level-toggle changes don't. Sessions saved before 2.4.0 count as the coach's when they were posted to a team.
- **"Adjust exercises to each athlete's level" (D-044, F46).** Program setting (default on), a per-session override in the session editor, and a per-athlete toggle in athlete detail ("Exact program" roster tag). Most specific wins: athlete off → session → program. Off means exactly what the coach wrote: no "Your version," no easing-back-in changes. Testing eligibility doesn't change.
- **Session-specific warm-ups (D-046, F47–F50).** Every session (except light home days, recovery sessions and testing days) gets a RAMP warm-up (Raise, Activate, Potentiate) built from its primary patterns and power work, rotated across the week, fitted to equipment, home, limited space and the position; trainer warm-ups start with easy cardio from the gym profile (replaces W1–W3). The athlete's Warm-up card has a Done per part; the board tile shows "Warming up" only. **Ramp-up sets** before each loaded tier A/P lift are logged apart from work sets (`warmup: true`) and never count or drive suggestions. Coaches edit, swap, reorder, add, remove, save as template, use a template, or regenerate; Team settings → Warm-up sets the default (Approach Strength / My template / None) and Limited space.
- **Session length and Fit to time (D-047, F51).** Program default (20–120 min, quick picks), per weekday, and per date (calendar "Weight room time"). The estimate (warm-up + ramp-ups + work and rest + transitions) shows against the target in the builder, the week grid and the athlete's Today ("About 52 min (planned for 45)"). Approach Strength's sessions fit automatically in Training's trim order (never shortening rest or removing the main lift or the warm-up; Express under about 25 min), with one line per trim and Undo. Coach-built sessions get **Fit to time** suggestions only. Station time comes from the session length.
- **Catalog v3 Part 1:** the 15 movement-prep and warm-up drills (A-Skip, Lateral Shuffle, Carioca, High Knees, Walking Knee Hug, Walking Quad Stretch, Push-Up Plus, Wall Slide, 90/90 External Rotation Hold, Band Lateral Walk, Short-Lever Copenhagen, Bent-Knee Calf Raise, Countermovement Jump, Line Hops, Skater Hop). The 2.3.0 generator doesn't pick them.
- Checks: `scripts/checks/v240-p1-check.ts`, `scripts/checks/browser-v240-p1.js`, `supabase/tests/rls-2.4.0-p1.sql`; earlier checks that tested removed builder blocks are marked "SUPERSEDED (§0.3)" and now test the new behavior.

### Part 2 — catalog v3 and rack rotation (migration 012; flags `catalogV3`, `rackRotation`)
- **Catalog v3:** the other 51 exercises (Olympic derivatives, plyometrics, throws, squat/single-leg/posterior-chain/push/pull/core and care work), 5 equipment items (Safety squat bar, GHD, Suspension trainer opt-in; Sliders and Mini hurdles in "Full weight room"), the §3 link updates, holds and distance notation, and the 7 general-library exercises now used by volleyball programs. Olympic derivatives are gated by their own level (a level 2 athlete can get Hang High Pull, never Hang Power Clean), and athletes get their rung of each movement ladder (program-design §8a; beginners in an Olympic slot get a level 1 jump, as safety §2a requires). Legal's line for Safety Bar Squat: "Heavy squatting with your hands on the handles in front."
- **Rack rotation (program-design §4b, F52–F55):** a third session format for groups sharing a rack. Approach Strength suggests each block's positions (rack lift first, a "Spot" position after barbell squat or bench at RPE 7+, no same-muscle work right before the rack lift), the rotation time (longest position + about 20 s), the rest it gives each position, rounds with a build-up round for heavy and power lifts, and the block time, which feeds the session estimate. Coaches change anything; nothing blocks. Coaches start the rotation from the team screen (one clock for the room: Rotate now, +15 s, End block). Athletes see "Rack 1 · B · Round 2 of 4," their position and "Rotate in 0:42 → Position 4 (Dead Bug)"; Today shows where they start. The board shows a ring per rack with board names, the RACK node, Spot and Open nodes, and the countdown; never loads, RPE, levels or check-ins.
- Also from Part 1's UX list: Start stations is never blocked (athletes not on a rack follow the standard order), and "more racks than stations" is an info line.
- Checks: `scripts/checks/v240-p2-check.ts`, `scripts/checks/v240-flags-check.ts`, `scripts/checks/browser-v240-p2.js`; `rls-2.4.0-p1.sql` covers 012.

### Part 3 — generator v3 (migration 013, no schema change; flag `generatorV3` **off**)
- Built behind `generatorV3` (program-design §1–§9): the annual plan (Restore; Accumulation → Strength → Strength-Power, repeating from Strength; Power; Maintain, including the club-season switch from the combined calendar), 4-week blocks with a deload, sessions in A → B → C → D → E order, prescriptions by block and week (% of e1RM for tested lifts only, capped at 85% for minors and 90% for adults), loading methods (contrast, clusters and waves only for advanced athletes with a coach-confirmed level; beginners straight or tempo, one RPE lower), the §7 weekly templates with in-season placement rules, position emphasis (§8b, including setter −20% and libero/DS −30% vertical contacts), plyo contact caps, depth jumps for advanced + confirmed only (≤ 20 contacts, box ≤ 18 in), and the R6 lift-day caps.
- **Ships off.** With it on, some earlier checks still fail (the 2.1 G1 rule that the stored plan never exceeds the athlete's level, the G8 "same sets × reps after a swap" check on plyo slots, and the school + home week's light home day and home defaults), so the 2.3.0 generator stays live and unchanged. Details: `reports/training-v3-acceptance.md`.
- Checks: `scripts/checks/v240-p3-check.ts` (runs v3 with the flag on).

## 2.3.1 — custom exercises
Owner request (Ryan, November 16, 2026), outside the planning specs. No migration (custom exercises are saved inside the existing program JSON). Report: `reports/v2.3.1-acceptance.md`.

- **Create custom exercise** in every program's session editor (volleyball teams, trainer teams, and personal programs): name, one-line cue, type (Power, Heavy, Compound, Accessory, Care/mobility), movement, level, equipment, weighted or not, and optional how-to steps. Edit from the picker's "Your exercises" list.
- **Same safety handling as the library:** the type sets the demand tier (rest floors, pairing rules, effort caps for minors, the RPE 8 cap in trainer teams); athletes below the level get the closest library exercise of the same movement, with the usual "Your version" note. Custom exercises never join the library or the generator, and cardio and Olympic lifts aren't offered.
- Athletes and clients see them like library exercises; the how-to screen says "A custom exercise from the coach" (or trainer).
- Checks: `scripts/checks/v231-check.ts`, `scripts/checks/browser-v231.js`.

## 2.3.0 — trainer mode (adult clients), no AI
Built from `docs/specs/trainer-mode.md` v0.3 (Phase A, then Phase B). Supabase migrations `009_trainer_a.sql` and `010_trainer_b.sql` (run once each, in order, after 008; both safe to re-run). Acceptance report: `reports/v2.3.0-acceptance.md`. **Volleyball teams don't change.**

- **Two kinds of team.** Create team asks **Volleyball team** or **Training clients (adults 18+)**. A training-clients ("general") team needs three separate confirmations (Trainer Terms §4T, adults and responsibility, no co-branding), recorded with the Terms version and time. The type can't change once a team has members.
- **TM-19 gate.** A new general team is closed until Ryan verifies the trainer (service-role SQL in the README; no in-app control). While closed, clients can't join and the trainer can't post (the server enforces both); she can build programs. Clearing verification pauses the team; existing clients keep training.
- **Adults only.** Minors can't join a general team (server and app). No parent consent, testing days, touch, jump tests, "Above the net," Jump gains, positions, Fuel, practices/matches, or the volleyball generator in general teams.
- **Programs for one client, a group, or everyone.** Free-named groups (one per client); multi-week programs (1–16 weeks) with goals **Strength, Muscle, General fitness, Back after a break**, a week strip, per-week effort (capped at RPE 8), deloads, copy to days/weeks, templates (on the trainer's phone), duplicate to another client, program-end banner. Posting checks every client's combined weekly total (caps 4/5/6 by level, a day off) and blocks over-cap posts.
- **Adult rules** in the builder and `resolveSession`: RPE 8 ceiling; failure, max, AMRAP and "for time" blocked in heavy/compound rows; beginners one RPE lower by default; the Back after a break ramp (level 1 in week 1, no power in weeks 1–2, starting weights about 20% lower); youth pairing/station rules become warnings.
- **General library:** 39 exercises (machines, cables, barbell basics, isolation, 7 cardio), 13 gym equipment items, sport-neutral "why" text, warm-ups W1–W3. The **gym equipment profile** limits the builder and each client's version. **Cardio** is duration only (5–60 min, Easy or Moderate); logs keep minutes only.
- **Trainer screens:** Clients dashboard (program and week, sessions done/planned, last session, shared check-in, text flags; sorted by name, date or flags, never ranked), client detail, Class board, racks and stations as built, calendar with sessions and breaks only.
- **Client screens:** Today lists every session due from all their programs, with goal and week; "Your choices" with check-ins, sharing and the class board **off** by default; notes helper text; Delete my check-ins; turning sharing off hides past check-ins from the trainer.
- **Wording:** Trainer/Client in general teams; neutral sign-up cards ("I'm a coach or trainer," "I'm an athlete or client").
- **Website:** `/privacy` (Part A2 at `#health-data`) and `/terms` (§4T at `#trainer-terms`) regenerated from the v2.5 notice; footer link **Consumer health data** on every page.
- **Trainer versions of the G3 pain card and G4 head-injury line** (Legal approved as written).
- Checks: `scripts/checks/v230-check.ts`, `supabase/tests/rls-2.3.0-a.sql`, `rls-2.3.0-b.sql`.

## 2.2.1 — app.approachstrength.com, Approach Strength, Coach Terms, Log in
Built from `docs/specs/v2.2.1.md` v1.1. Supabase migration `008` (run once, after 007). Acceptance report: `reports/v2.2.1-acceptance.md`.

- **New addresses:** the app moves to **https://app.approachstrength.com**; **https://approachstrength.com** becomes the website (new repo `rparker-sudo/approachstrength-site`, built by `scripts/build-site.py`) with a placeholder home page and the Privacy Notice, Terms and parent consent form at the same URLs as before. Every link comes from `APP_URL` / `SITE_URL`; the app's old legal pages redirect to the website.
- **Renamed to Approach Strength:** app name and title, onboarding, Settings, share texts, the board's "Powered by Approach Strength" (bottom-right, Steel). New outlined wordmark and lockups (`assets/brand/source/`). Board color presets from the brand guide (Silver default; existing teams keep their color).
- **Welcome, Log in, Create an account:** the first screen offers Log in or Create an account. Logging in never asks the age question or role (pre-2.1 accounts answer the age question once). The age question comes first only when creating an account or a solo profile. `sign-in?role=coach|athlete` opens Log in. "Forgot password?" sends a reset link. Log out returns to Welcome; an expired session goes to Log in.
- **Coach Terms:** coaches tick a separate "I agree to the Coach Terms (Terms §4)" box at sign-up; existing coaches see it once. Until accepted, recording parent consent and starting a strength check are blocked (in the app and on the server). Stores the version and time on the coach's profile.
- **Set level** shows Training's level descriptions and a read-only "See the full checklist".
- **Accessibility:** error and warning text use darker text colors on light screens (≥ 4.5:1); every tap target is at least 44 pt, and in-workout actions 56 pt.
- **Privacy:** coaches no longer receive another team's level number (only the adjusted exercises), and teammates' effort boards no longer get a `ranked` flag or athletes ranked on another team.
- **Housekeeping:** legal pages are built only from `docs/legal/` (no find-and-replace); `scripts/checks/run-all.sh` fails when a check can't run; new `v221-check.ts`, `legal-pages-match.py`, `supabase/tests/rls-2.2.1.sql`.

## 2.2.0 — levels, boards and racks, home workouts and stations
One release, built in three passes (`docs/specs/v2.2.md`). Supabase migrations `005`, `006`, `007` (run once each, in order, after 004).

### Pass 1 — safety gates
- **Coach-set levels** (beginner / intermediate / advanced) per team. Self-reported until the coach confirms; roster chip, "Level not confirmed", Review filter, set-level sheet. Athletes see their level per team in Settings → Program.
- **Every athlete session goes through one function (`resolveSession`):** exercises resolve to the athlete's level (the lower one across their teams), Olympic lifts become a jump below advanced, effort is capped (beginner 7, intermediate/advanced 8, in-season 7), and rest and a session estimate are added. "Your version (team: …)" line with a why sheet; coach athlete detail shows "N exercises adjusted to level" and "Adjusted for this athlete" (never another team's level).
- **Strength checks for minors** need a coach-confirmed intermediate/advanced level (and no coach-set beginner on another team); checked on the server (`can_load_test`) with the union of all teams' calendars, breaks, and pain/run-down check-ins.
- **Two teams, one lifting program:** choose on joining a second team, switch in Settings → Teams, fall back when leaving. Plan and Today show every team's practices and matches with the team name. The other coach sees "Following another team's lift program" (no team name).
- **Break weeks** on the team calendar (no lifting for that program; another team's break doesn't stop lifting) and **easing back in** after 14+ days without a log (RPE 6 cap and about 10% lighter suggestions for 7 days).
- **Rest times by demand tier** (P/A/B/C/D) with floors (heavy lifts ≥ 2:00, power ≥ 1:30); the coach's rest wins within the floors; session estimates in the builder and on Today.
- **Effort clamp** in the builder: for teams with a minor, strength effort above RPE 8 (7 in-season), "failure" and "max" are blocked (a warning on adult-only teams); posting is blocked too.
- **Pain and head-injury copy** (Legal final): Today card after a pain = yes check-in; roster "Check in with [name] in person"; Settings → Safety head-injury line.
- **Library:** 22 copy fixes and 2 data fixes, claim-word search clean, 6 mobility exercises, `nordic` partner/anchor note.
- **Lift-day caps on the final week** so no path (onboarding, schedule, calendar, coach lift days, automatic moves) exceeds the cap or removes the rest day.
- **Testing days:** coach checklist before the first strength check (read on the device), Training's testing warm-up, suggested testing dates per phase, break and spacing checks.
- **Retention fix (C12):** minimal consent and supervision proof records kept 5 years after an account or team is deleted (no results), monthly purge; delete-dialog line.

### Pass 2 — boards and racks
- **Live coach board:** current (resolved) exercise, set x of y, last-set reps, rest countdown, header stats, live ticker, paging; testing-day mode with jump-test changes only (inches/feet) and "Strength check ✓"; team accent color with an automatic contrast fix; "Use a personal device and network" note.
- **Season view:** team goal with pace, Overall leaderboard (top 10) and the points legend.
- **Effort board:** Overall points (session 10, extra recovery 5 up to 2 a week, full week 5), Extra recovery tab, **Jump gains** in inches (never %), two-team rules, break weeks never count against anyone.
- **Extra recovery sessions** ER1–ER5 from Today (optional, no equipment, no weight suggestions).
- **Rack groups:** count or size, here-today filter, four auto-assign methods, rename, tap-to-move, Unassigned tray; board "Arrange by rack"; athlete Today card "You're on Rack 2 · with 2 teammates" (names off until Legal confirms).
- **Change since last test** for athletes and coaches (private).

### Pass 3 — home workouts, supersets, circuits, stations
- **School + home weeks:** coach picks weight-room days and a total (or Recommend); home sessions use their own prescriptions and a home exercise pool; per-athlete caps with one light home day; 4 new home exercises.
- **Home equipment** set by the athlete, stored only on the phone; each athlete gets their version for the same home slot.
- **Supersets and circuits:** pairing and circuit rules with one-line reasons, 15 s transitions and rest after the round, auto-pairing only until a session fits its length target, fillers during heavy rest; A1/A2 labels and rounds in the workout and on the board.
- **Stations:** Part 1 together, 2–6 stations, checks and estimate; Start stations needs everyone on a rack (one-tap balanced fill); Rotate now / +1 min / End; athletes see their station and countdown; board station grid.

## 2.1.1 — boards, testing days, Fuel phase 1 (2.1 pass 2)
- Consent becomes six permissions (parent consent form v2): participation, check-ins, sharing check-ins, team boards, attendance & hours, testing days. Coach six-box checklist with box rules; roster chips (Consent needed / Consent: N of 6 / Consent: all / Form v2 needed for boards & testing) and a consent tracker. Adults choose for themselves ("Your choices", Settings → Privacy). Enforced on the server.
- Board names: "Jordan M." by default, or initials, or hidden. Never a full last name.
- Coach board (`/board/[teamId]`): coach-only full-screen live view with board names, status, sets done, PR badge, team goal and a rotating effort panel. Never weights, test results, check-ins, body weight or nutrition.
- Team effort board: consistency, sessions, week streak, attendance, hours (capped 3 h/day, 15 h/week) and jump-test improvement %. Ranks work, not weight. Coach Effort tab, athlete Progress card, private badges; coach can turn it off.
- Attendance: athletes tap "I was there"; coaches mark there / not there (coach wins); practice and match lengths per team.
- Testing days: coach schedules (never within 2 days before a match); a Testing session replaces that day's lift; strength checks locked until the coach confirms supervision (recorded); eligibility rules; estimated strength (always labeled an estimate) sets starting weights within the phase range; coach can edit or void results; solo jump tests stay on the phone.
- Fuel phase 1: no grams, ounces, calories or body-weight targets anywhere; nine cited Fuel cards; body weight step removed from onboarding (still optional in Progress, on the phone only).
- Privacy Notice, Terms and consent form v2 pages regenerated (`scripts/build-legal-pages.py`).
- Supabase migration `supabase/migrations/004_approach_2_1_pass2.sql` (run once after 003).

## 2.1 — soft-launch safety (pass 1)
- Age question first for everyone ("When were you born?", month and year, empty to start). Under 13: a neutral "not eligible" screen, and only a local flag is kept. Only the birth year and under-18 are stored. Coach accounts are for adults 18+. Existing accounts answer once.
- Parent consent on file for athletes under 18: they join a team as "waiting", can view the plan, and can't log or check in until the coach records a signed form (Training only, or Training and check-ins). Coach roster chips and a record/change/clear sheet. Enforced on the server (row-level security).
- Check-ins: the free-text pain note is gone (pain yes/no stays, with a reminder to tell a coach, parent or athletic trainer in person). One-time notice: "Your coach sees your check-ins. Teammates never do."
- Delete my account in Settings (type DELETE to confirm), in team sync and demo mode
- Coaches lose access to an athlete's logs and check-ins as soon as the athlete leaves or is removed
- Privacy Notice, Terms and a printable parent consent form (`privacy.html`, `terms.html`, `consent.html`), linked from sign-up, Settings → Legal and the coach team screen
- Training safety: never an exercise above the athlete's level; lift-day caps (beginner 3, intermediate 4, advanced 5, in-season 3) with a day fully off and mobility-only extra days; smaller weight steps (about 10%, max +10 lb barbell / +5 lb dumbbell) and none for bands or holds
- Copy: no injury-prevention or medical claims ("Injury prevention" category is now "Prehab")
- Supabase migration `supabase/migrations/003_approach_2_1.sql` (run once after 002)
- README: App Privacy and email-confirmation guidance, "Upgrading from 2.0"; LICENSE is now proprietary

## 2.0 — coach customization and training depth
- Any number of lift days (1–7); each count builds a different split, with shorter sessions as days go up
- Equipment-aware programs: full weight room, dumbbells & bench, bands & bodyweight, or pick items
- Exercise library v2: 64 exercises with equipment options, difficulty levels and full how-to text (why it matters, steps, cues, mistakes, easier/harder)
- Weekly progression: 4-week blocks with a deload week; suggested weights from your last session
- New workout view: one exercise at a time or a list, rest timers per exercise (coach-adjustable), draft auto-save, finish summary with new bests
- Position groups inside a team, each with its own workout; auto-create by position
- Shared team calendar for all groups
- Daily readiness check-in for athletes; coaches see a team snapshot and a suggestion, and decide whether to lighten the day
- Supabase migration `supabase/migrations/002_approach_2.sql` (run once on existing projects)

## 1.0 — first Approach release
- Name and brand: Approach, monochrome dark/light theme, Inter fonts, app icon and logo
- Tabs: Lift, Fuel, Plan, Progress (coaches also get Team)
- Training programs built around the volleyball week, by position, phase and experience
- Pick your lift days; edit them anytime without rebuilding
- Season calendar with real match and tournament dates; lifts move automatically, any date can be overridden
- Workout logging, strength progress, body weight, and the "Above the net" touch-height stat
- Fuel targets by day type (rest, practice, match, tournament, day before a match)
- Teams with live sync (Supabase): join codes, QR invites, posted team workouts, roster and recent lifts
- Mobile browser version on GitHub Pages: https://rparker-sudo.github.io/approach/
- Fixes: Supabase address pasted with extra text; loading a team's coach name
