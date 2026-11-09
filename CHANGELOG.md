# Approach versions

Version numbers: whole numbers (1.0, 2.0) for big changes, decimals (1.1, 1.2) for smaller features and fixes.
The number is in `app.json` (`expo.version`, written as 1.1.0 for 1.1) and shows in the app under Settings.
Each version has a matching GitHub tag (`v1.0`, `v1.1`, …) and download (`approach-1.0.zip`).

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
