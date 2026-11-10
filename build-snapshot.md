# Approach — build snapshot

*As of November 10, 2026. Facts only. Items marked **(unverified)** could not be confirmed from the code or from the owner.*

**What it is:** a weight-training, nutrition and planning app for volleyball athletes and coaches. App Store name (planned): "Approach: Volleyball Fitness". Home-screen name: "Approach".

---

## 1. Version and changes

**Current version:** 2.0.0 (`app.json`, `package.json`). Latest commit on `main`: `e5e5349` "Approach 2.0", pushed to GitHub `rparker-sudo/approach`.

**History (from `CHANGELOG.md` and git):**
- Before 1.0 the app was called "Volley Strength", then "Load & Launch", then renamed "Approach".
- **1.0:** brand, four tabs (Lift, Fuel, Plan, Progress) plus Team for coaches, generated programs, chosen lift days, season calendar with automatic lift moves, workout logging, Fuel targets, touch-height tracking, teams with live sync (Supabase), QR invites, and the mobile browser version on GitHub Pages.
- 1.0 is labeled in `CHANGELOG.md` only; the `v1.0` git tag was created locally but never reached GitHub.

**What changed from 1.0 to 2.0:**
- Lift days: any number from 1 to 7 (was capped at 4). Each count builds a different split, and sessions get shorter as days go up.
- Equipment-aware programs: full weight room, dumbbells & bench, bands & bodyweight, or individual items.
- Exercise library grew from 40 to 64 exercises, each with equipment options, a difficulty level and how-to text (why it matters, steps, cues, mistakes, easier/harder).
- Weekly progression: 4-week blocks with a deload week, and suggested weights based on the last logged session.
- New workout screen: one exercise at a time or a list, a rest timer per exercise (coach-adjustable), in-progress draft saved on the device, and a summary with new estimated bests.
- Position groups inside a team, each with its own workout, plus "auto-create by position".
- Shared team calendar for all groups.
- Daily readiness check-in for athletes; coaches see a snapshot and a suggestion and decide whether to "lighten" a day.
- New Supabase migration: `supabase/migrations/002_approach_2.sql`.

**In progress / not finished:**
- **The 2.0 database migration has not been run** on the live Supabase project. On the live site, groups, the shared team calendar and readiness don't sync between phones; the app falls back to 1.0 behavior and shows coaches a note.
- No iPhone build (EAS/TestFlight/App Store) has been made. The Apple Developer Program has not been purchased.
- No other features are partially built.

---

## 2. Platforms and tech stack

| Layer | What's used |
|---|---|
| Platforms | iPhone (run through the **Expo Go** app only; no standalone build yet) and mobile web browsers (GitHub Pages). Android removed from the config (`"platforms": ["ios", "web"]`). |
| Frontend | Expo SDK 58, React Native 0.88, React 19, Expo Router (file-based navigation), TypeScript, react-native-web for the browser version. |
| Backend / database | Supabase: hosted Postgres with an auto-generated REST API, Realtime (live updates), and row-level security policies (`supabase/schema.sql`). No custom server code beyond SQL functions (`join_team`, `handle_new_user`, access-check helpers). |
| Auth | Supabase Auth, email + password. |
| On-device storage | AsyncStorage (device storage on iPhone; `localStorage` in browsers). |
| Hosting | GitHub Pages, built and deployed by a GitHub Actions workflow on every push to `main` (`.github/workflows/deploy-web.yml`). Repository is public. |
| Other | A private claude.ai preview page of the web build exists; it runs in demo mode only. |
| Build service | Expo EAS is configured (`eas.json`) but has never been run. |
| Supabase region | West US (North California) was the suggested choice **(unverified)**. |

**Modes:**
- **Live sync:** when the Supabase URL and key are set at build time.
- **Demo mode:** everything is stored on one device, and several accounts can exist on that device.

---

## 3. User-facing features

### Athletes (solo, or on a team)
- **Onboarding:** choose athlete, then create an account (or "Train solo, no account"), enter a team code (optional), and set name, position, lifting experience, season phase, usual practice week, lift days, gym equipment and body weight (optional).
- **Generated program** based on position, experience, phase, lift days (1–7) and equipment. Includes position-specific injury-prevention exercises.
- **Lift tab (home):** date, a one-line daily message, the daily check-in card, today's session with block week ("Week 2 of 4" / deload) and lightened-day notes, the Fuel summary, and this week's lift dots.
- **Workout screen:** one exercise at a time or a list; weight and reps per set; Done buttons; a rest timer with −15s/+15s/Skip, a vibration at zero and the screen kept awake; suggested weight ("Last: 135 × 5 → Try 140 (+5)"); an in-progress draft kept on the device; a finish summary with sets, minutes and new estimated bests.
- **Plan tab:** this week's real-date plan, season calendar (month view; mark match, tournament or day off with an optional label; per-date lift choice), edit lift days, rebuild program, import a program code, other saved programs.
- **Exercise how-to** for every exercise.
- **Fuel tab:** carbohydrate, protein and fluid targets by day type (rest, lift, practice, match, tournament, day before a match), using body weight if given; plate guide; meal timing. Calories are not shown.
- **Progress tab:** "Above the net" (approach touch height minus net height, with a selectable net height), touch history, estimated one-rep maxes over time, body-weight log, recent check-ins, workout history.
- **Daily readiness check-in:** sleep, soreness and energy (1–5), "anything hurting?" (yes/no plus an optional note).
- **Teams:** join with a 6-character code or a QR link. A team athlete's plan is the coach's posted workout for their group (or the whole team), shown read-only; logged workouts and check-ins go to the coach.
- **Settings:** name, body weight, position, Dark/Light appearance, account (sign in/out, leave team), team sync status, erase all data on the device.

### Coaches
- **Teams:** create, rename and delete teams; join code; QR code screen; shareable invite link.
- **Position groups:** add or delete groups; "Groups by position" creates Hitters, Middles, Setters and Liberos / DS and assigns athletes by position; manually move athletes between groups.
- **Workouts:** build one workout per group plus a "Whole team" workout; edit exercises, sets, reps, effort, notes and rest time; rebuild; post (changes stay marked "not posted" until posted).
- **Season calendar** shared by all groups; per-workout lift days and per-date lift choices.
- **Roster:** position, group, last lift, workouts this week, today's check-in values.
- **Recent lifts feed**, including athletes' workout notes.
- **Readiness card:** check-ins out of roster size, how many are run down, how many reported pain, and names with their scores and pain notes. When at least 3 athletes, or at least 30% of those checked in, are "run down", a suggestion appears. "Lighten today" (team or group) cuts sets and effort for that date, posts immediately, and can be undone.
- **Send a program as a code** to athletes without accounts.

### Other
- **Demo mode** (no Supabase): accounts and teams live on one device.
- **Browser version** can be added to the iPhone home screen (web manifest and icons).
- **Dark (default) and Light themes.**

---

## 4. Data model

Flags: **AGE** · **HEALTH/WELLNESS** · **BODY METRICS** · **LOCATION** · **PHOTO/VIDEO** · **CREDENTIALS** · **FREE TEXT** (may contain anything the user types).

### Stored on the server (Supabase), live-sync mode only

| Table | Fields | Who can read | Flags |
|---|---|---|---|
| `auth.users` (Supabase-managed) | email, password (hashed by Supabase), user metadata: name, role, position; Supabase also records sign-in timestamps and may log request metadata such as IP address and user agent **(unverified)** | Supabase project owner | CREDENTIALS |
| `profiles` | id, name, role (`coach`/`athlete`), position, created_at | the user; their coach (for athletes); their athletes (coach name) | — |
| `teams` | id, name, join_code, coach_id, created_at | coach; team members | — |
| `team_members` | team_id, user_id, joined_at, group_id (group_id only after the 2.0 migration) | the athlete (own rows); the team coach | — |
| `team_programs` | team_id, program (JSON: sessions, exercises, sets/reps/effort/notes/rest, lift schedule, phase, position, equipment, per-date choices, author name, team name), updated_at, group_key (after migration) | coach; team members | FREE TEXT (coach notes) |
| `workout_logs` | id, team_id, user_id, session_name, logged_at, sets_done, note, entries (JSON: exercise, weight, reps, done per set) | the athlete; the team coach | FREE TEXT (note; the app's placeholder suggests things like "sore knee") |
| `team_groups` *(after migration)* | id, team_id, name, position_hint, created_at | coach; team members | — |
| `team_calendars` *(after migration)* | team_id, events (date, type, label), light_dates, updated_at | coach; team members | — |
| `readiness` *(after migration)* | team_id, user_id, day, sleep (1–5), soreness (1–5), energy (1–5), pain (yes/no), pain_note (≤200 chars), created_at | the athlete; the team coach | **HEALTH/WELLNESS**, FREE TEXT |

Not stored on the server: body weight, touch height, net height, fuel targets, solo programs, theme, workout drafts.

### Stored only on the device (AsyncStorage / browser localStorage)

| Key | Contents | Flags |
|---|---|---|
| `volley-strength/data/v1` | **profile:** name, role, position, experience, season phase, **body weight (lb)**, lift days, usual volleyball week, default equipment. **programs** (incl. calendar events). **workout logs** (weights, reps, notes). **body-weight log** (date, lb). **touch-height log** (date, inches) and net height. **readiness log** (sleep, soreness, energy, pain, pain note, which teams it was sent to). Coach copy of team calendars. Theme. Unused legacy `athletes` list. | **BODY METRICS**, **HEALTH/WELLNESS**, FREE TEXT |
| `approach/workout-draft/…` | in-progress workout sets and note for today's session | FREE TEXT |
| Supabase session (written by `supabase-js`) | login session tokens for the signed-in account | CREDENTIALS |
| `load-and-launch/demo-server/v1` (demo mode only) | demo accounts: email, name, role, position and **password in plain text**; demo teams, rosters, workouts, logs, groups, calendars, check-ins | CREDENTIALS, HEALTH/WELLNESS |

### Flag summary
- **AGE:** no age, date of birth, grade or school field anywhere.
- **HEALTH/WELLNESS:** readiness check-ins (sleep, soreness, energy, pain yes/no, pain note), synced to the coach once the migration is run. Free-text workout notes can also contain health information.
- **BODY METRICS:** body weight and approach touch height. Both stay on the device; neither is sent to the server.
- **LOCATION:** none collected; no location permission is used.
- **PHOTO/VIDEO:** none collected; no camera or photo-library access is used.
- Other personal data on the server: name and email (auth), position, team membership, workout weights/reps.

---

## 5. Signup and age checks today

**Signup flow:**
1. Choose **I'm an athlete** or **I'm a coach**. The role is self-selected; anyone can register as a coach. A coach can only see teams they created.
2. Enter name, email and password (minimum 6 characters), or "I have an account". Athletes can instead choose "Train solo, no account", which keeps everything on the device.
3. Athletes on a team enter the 6-character team code. Opening a QR link (`…/join?code=XXXXXX`) pre-fills the code and joins automatically after signup.
4. Supabase **"Confirm email" is still ON** (owner confirmed): a new user must click the link Supabase emails before signing in for the first time, and the app shows "Check your email and tap the confirm link, then sign in."

**Age checks:** none. There is no age question, age gate, parental or guardian consent step, or school/district verification.

**Missing account flows:**
- No terms of service or privacy policy screen or acceptance step; no privacy policy exists.
- No "forgot password" / password reset flow in the app.
- No in-app account deletion. "Erase all data" clears the device and signs out; the Supabase account and server data remain.

---

## 6. Third-party services and SDKs

| Service | Role | Data it receives |
|---|---|---|
| **Supabase** | Database, auth, realtime, auth emails | Everything in the server tables in section 4; email and password (hashed); request metadata such as IP **(unverified)**. Sends confirmation emails through Supabase's built-in email sender, so it receives email addresses. |
| **GitHub** (repo, Actions, Pages) | Source code, builds, website hosting | Full source code (public repository); Supabase URL and public key as Actions secrets; website visitors' standard request data such as IP address **(unverified detail)**. |
| **Expo** (Expo Go app, Expo account, tunnel) | Running the app on the owner's iPhone during development | The owner's Expo account; development bundles served through Expo's tunnel. What Expo logs is **(unverified)**. |
| **Apple** | Planned App Store distribution | Nothing yet (no developer account). |
| **Google Fonts** (Inter, Inter Tight) and Material Symbols | Typography and web icons | Nothing at runtime: font files are bundled into the app, not downloaded from Google. |
| **qrcode** (npm library) | Draws QR codes on the device | Nothing (runs locally). |

**Not used:** analytics, crash reporting, advertising, payments, push notifications, AI/LLM services inside the app, maps/location.

Anthropic's Claude was used to write the code. It is not part of the running app.

`@expo/vector-icons` is listed in dependencies but is not imported anywhere in `src/`.

---

## 7. Deployment and usage

**Deployments:**
- **Website (live sync):** https://rparker-sudo.github.io/approach/ (GitHub Pages; automatic deploy on push to `main`; last deploy succeeded with Supabase keys present).
- **Supabase project:** live, Free plan; 1.0 schema applied, 2.0 migration not applied.
- **Expo Go:** run from the owner's Mac.
- **claude.ai preview:** demo mode, private to the owner.
- **App Store / TestFlight:** none.

**Who has used it:**
- The owner, plus **a few other people (fewer than 10)**, all **18 or older**, according to the owner. Exact number and dates **(unverified)**.
- No known use by minors.

---

## 8. Monthly costs

**Current:** $0/month.
- Supabase: Free plan.
- GitHub: free (public repository, GitHub Pages, Actions minutes).
- Expo / Expo Go: free.
- The Claude subscription used to build the app is outside the app's running costs.

**Expected / known future costs:**
- **Apple Developer Program:** $99 per year (about $8.25/month), required for TestFlight and the App Store.
- **Supabase Pro:** about $25/month if the project needs to avoid pausing on inactivity, or needs daily backups or higher limits. Current pricing and limits **(unverified)**.
- **Expo EAS builds:** free tier with limited builds per month; exact limits **(unverified)**.
- **Optional:** a custom domain (about $10–20/year, **unverified**).
- No other paid services are in use.

---

## 9. Known bugs, shortcuts and TODOs

**Setup state**
- 2.0 database migration not run; groups, shared calendar and readiness don't sync on the live site.
- The `SUPABASE_URL` GitHub secret contains extra path text after `.supabase.co`. The app trims it at runtime, and the build logs a warning.
- Supabase "Confirm email" is ON, so new accounts must confirm by email first.
- Free-tier Supabase projects pause after about a week without activity.

**Testing gaps**
- The development environment could not reach Supabase, so the Supabase code was never tested from there. 1.0 team sync was tested live by the owner. The 2.0 server features (groups, calendars, readiness) have not been tested live, and the 2.0 SQL was only syntax-checked.
- The linter (`expo lint`) has never been run, because its setup needed network access that wasn't available.
- No automated test suite is committed to the repo. Logic and UI were checked with one-off scripts and browser tests that are not in the repository.

**Missing features**
- No password reset flow.
- No in-app account deletion.
- No privacy policy, terms, age gate or parental consent.
- Anyone can create a coach account.
- No swipe gesture between exercises (Previous/Next buttons only).
- Units are pounds only.

**Security and data handling**
- Demo mode stores account passwords in plain text in device storage.
- "Lighten today" posts the team calendar immediately, which also publishes any unposted calendar edits.

**Behavior that differs from earlier plans**
- Lift days are set per group workout, not team-wide.

**Hosting and release quirks**
- The single-file claude.ai preview shows "not found" if refreshed while on a deep link.
- Git version tags (`v1.0`) are not on GitHub.

**Code leftovers**
- Internal storage keys still use old names (`volley-strength/…`, `load-and-launch/…`).
- An unused legacy `athletes` field remains in local data.
- `@expo/vector-icons` is an unused dependency.

**Content review**
- Program rules (splits, sets, reps, rest), nutrition targets, readiness thresholds and all exercise how-to text were written with AI assistance. No review by a qualified strength coach, athletic trainer or dietitian is recorded **(unverified)**.
