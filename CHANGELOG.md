# Approach versions

Version numbers: whole numbers (1.0, 2.0) for big changes, decimals (1.1, 1.2) for smaller features and fixes.
The number is in `app.json` (`expo.version`, written as 1.1.0 for 1.1) and shows in the app under Settings.
Each version has a matching GitHub tag (`v1.0`, `v1.1`, …) and download (`approach-1.0.zip`).

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
