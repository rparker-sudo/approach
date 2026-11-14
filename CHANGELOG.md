# Approach versions

Version numbers: whole numbers (1.0, 2.0) for big changes, decimals (1.1, 1.2) for smaller features and fixes.
The number is in `app.json` (`expo.version`, written as 1.1.0 for 1.1) and shows in the app under Settings.
Each version has a matching GitHub tag (`v1.0`, `v1.1`, …) and download (`approach-1.0.zip`).

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
