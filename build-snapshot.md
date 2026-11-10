# Approach — build snapshot

*As of November 10, 2026 (v2.1, pass 1). Facts only. Items marked **(unverified)** could not be confirmed from the code or from the owner.*

**What it is:** a weight-training, nutrition and planning app for volleyball athletes and coaches. App Store name (planned): "Approach: Volleyball Fitness". Home-screen name: "Approach".

---

## 1. Version and changes

**Current version:** 2.1.0 (`app.json`, `package.json`), built on branch `main` of GitHub `rparker-sudo/approach`. Built from `docs/specs/v2.1-soft-launch.md`, pass 1 (S1–S11). Pass 2 (coach board, effort board, Fuel phase 1, testing days, expanded consent form) is **not started**; its spec isn't in the repo yet.

**History (from `CHANGELOG.md` and git):**
- Before 1.0 the app was called "Volley Strength", then "Load & Launch", then renamed "Approach".
- **1.0:** brand, four tabs, generated programs, chosen lift days, season calendar, workout logging, Fuel targets, touch-height tracking, teams with live sync (Supabase), QR invites, mobile browser version on GitHub Pages.
- **2.0:** 1–7 lift days, equipment-aware programs, 64-exercise library with how-to text, weekly progression with deloads, workout view with rest timers, position groups, shared team calendar, daily readiness check-in, migration `002_approach_2.sql`.
- Git tags: `v1.0` and `v2.0` exist only in local clones; tag pushes from the cloud workspace are blocked, so the owner pushes tags from the Mac.

**What changed from 2.0 to 2.1:**
- **Age question (S1):** first onboarding screen for everyone, including solo users: "When were you born?" with empty month and year pickers. Under 13 → "Sorry, you're not eligible to use Approach right now." and a local flag (`approach/not-eligible/v1`) that survives reloads and "Erase all data". Nothing else is saved. Only birth year and is_minor are kept (local profile and `profiles`); the month is used once and discarded. If the birth month is the current month, the younger age is assumed. Coach option disabled under 18 ("Coach accounts are for adults 18 and older."); the server also refuses coach role for minors. Existing accounts with no birth year answer once before the tabs; an under-13 answer deletes the account (RPC) and shows the block screen.
- **Parent consent (S2):** `team_members.consent_status` (`not_required` / `pending` / `training_only` / `full`) plus `consent_recorded_at` and `consent_recorded_by`. Minors (and anyone with unknown age) join as `pending`; adults as `not_required`. Pending: banner with "See the form", Start workout replaced by "Logging unlocks after consent.", check-in hidden, team logs and check-ins not sent, workout screen blocked. Training only: logging works, check-in hidden and not sent. Coach roster chips (Consent needed / Training only / Full) and a sheet to record, change or clear consent with the "I have a signed parent consent form for [name]." checkbox. Readiness counts only athletes with check-in consent ("X of Y checked in · Z without check-in consent"). Settings → Your data shows "Parent consent: waiting / training only / training and check-ins".
- **Server enforcement (S2.6, S6):** RLS: `workout_logs` insert needs consent in (training_only, full, not_required); `readiness` insert/update needs (full, not_required). Athletes can't update consent (column-level grants; only `record_consent()` by the team coach). Coaches can read `workout_logs` and `readiness` only for **current** members.
- **Pain note removed (S3):** gone from the card, types, both backends, displays and the database (`readiness.pain_note` nulled then dropped). Old notes on the device are stripped on load. Pain yes/no stays, with "Tell your coach, parent, or athletic trainer in person about any pain."
- **Check-in notice (S4):** "Your coach sees your check-ins. Teammates never do." with "Got it." once (saved locally as `checkinNoticeSeen`), then as small footer text.
- **Account deletion (S5):** Settings → Account → Delete my account; typed DELETE; coach text adds "Your teams and every athlete's logs for those teams are deleted too." Supabase: `delete_my_account()` deletes `auth.users` and cascades. Demo mode: removes the local account, its teams and rows. Local data is erased; the app returns to the age screen.
- **Legal pages (S7):** `public/privacy.html`, `terms.html`, `consent.html` (printable). Plain HTML, brand colors, no scripts, no external fonts. Linked from the sign-up step, Settings → Legal, the coach team screen ("Print parent consent form") and the consent sheet. They open in a new tab (web) or the system browser (iOS; needs `EXPO_PUBLIC_APP_URL`).
- **Copy (S8):** all items in the spec table, plus the same rule applied to other "protects/keeps … safe/healthy" exercise text (list in the commit message). Category label is "Prehab".
- **Repo hygiene (S9):** README (App Privacy, Confirm email on, no district/school-domain suggestions, "Upgrading from 2.0"), proprietary LICENSE, version 2.1.0, CHANGELOG. ESLint config added (`eslint.config.js`, `eslint` + `eslint-config-expo` dev dependencies, `npm run lint`); several existing files were changed only to satisfy it (escaped apostrophes, refs updated in effects).
- **Migration (S10):** `supabase/migrations/003_approach_2_1.sql`, also folded into `supabase/schema.sql`. Test scripts in `supabase/tests/`.
- **Training safety (S11):** G1 no exercise above the athlete's level (falls back to an at-or-below-level bodyweight option or skips the slot). G2 caps: beginner 3, intermediate 4, advanced 5, in-season 3; at least one day with nothing; extra chosen days become a mobility-only session; pickers show "Max N lift days for your level. Add mobility days instead."; the schedule screen gains a "Mobility" choice; over-cap programs show a rebuild offer. G5: increase = 10% of last weight rounded down to 2.5 lb (min 2.5), max +10 lb barbell / +5 lb dumbbell, kettlebell or cable; no suggestions for band-only setups or holds.

**In progress / not finished:**
- Pass 2 of v2.1 (waiting for its spec).
- Migrations 002 and 003 were run on the live Supabase project on November 10, 2026 (owner confirmed; the check query showed the 2.0 tables and 2.1 consent column present and `readiness.pain_note` gone). Live account deletion and consent flows haven't been tried on the real project yet **(unverified)**.
- No iPhone build (EAS/TestFlight/App Store). Apple Developer Program not purchased.

---

## 2. Platforms and tech stack

| Layer | What's used |
|---|---|
| Platforms | iPhone (Expo Go only; no standalone build yet) and mobile web browsers (GitHub Pages). Android removed from the config. |
| Frontend | Expo SDK 58, React Native 0.88, React 19, Expo Router, TypeScript, react-native-web. |
| Backend / database | Supabase: Postgres, auto REST API, Realtime, row-level security (`supabase/schema.sql`). SQL functions: `handle_new_user`, `join_team`, `record_consent`, `set_my_birth_year`, `delete_my_account`, `minor_from`, `member_consent`, `is_current_member`, plus access-check helpers. |
| Auth | Supabase Auth, email + password ("Confirm email" on). |
| On-device storage | AsyncStorage (`localStorage` in browsers). |
| Hosting | GitHub Pages via GitHub Actions on push to `main`. Repository is public. |
| Build service | Expo EAS configured (`eas.json`), never run. |
| Dev tooling | TypeScript, ESLint (`eslint-config-expo`). Not shipped in the app. |

**Modes:** live sync (Supabase URL and key set at build time) or demo mode (one device, several accounts).

---

## 3. User-facing features

### Everyone
- **Onboarding:** age question → role → account (or "Train solo, no account" for athletes) → team code (optional) → name, position, experience, phase, practice week, lift days (capped), equipment, body weight (optional).
- **Settings:** name, body weight, position, appearance, account (sign in/out, leave team, **Delete my account**), team sync status, **parent consent status** (athletes), **Legal** links, erase data on the device. Switching a solo profile to coach mode is disabled unless the profile is 18+.

### Athletes (solo, or on a team)
- **Generated program** from position, experience, phase, lift days (within the cap) and equipment, with position-specific prehab exercises.
- **Lift tab:** daily message, consent banner (pending minors), check-in card (when allowed), lift-day cap notice (solo plans over the cap), today's session, Fuel summary, week dots.
- **Workout screen:** one exercise at a time or a list, rest timer, suggested weight with the G5 caps, draft kept on the device, finish summary.
- **Plan tab, Exercise how-to, Fuel tab, Progress tab:** as in 2.0.
- **Daily check-in:** sleep, soreness, energy (1–5), "Anything hurting?" yes/no. No free text. Team check-ins go only to teams with check-in consent (or adults).
- **Teams:** join with a code or QR link; the coach's posted workout becomes the plan (read-only).

### Coaches (18+)
- Teams, groups, workouts, shared calendar, roster, recent lifts, readiness and "Lighten today" as in 2.0.
- **Consent:** roster chips, record/change/clear sheet, "Print parent consent form" on the team screen, readiness counts only athletes with check-in consent.
- Lift-day caps apply to team workouts too (the program's level and phase).

### Other
- Demo mode, home-screen web app, dark and light themes.
- Static pages: `/privacy.html`, `/terms.html`, `/consent.html`.

---

## 4. Data model

Flags: **AGE** · **HEALTH/WELLNESS** · **BODY METRICS** · **LOCATION** · **PHOTO/VIDEO** · **CREDENTIALS** · **FREE TEXT**.

### Stored on the server (Supabase), live-sync mode only (after migrations 002 + 003)

| Table | Fields | Who can read | Flags |
|---|---|---|---|
| `auth.users` (Supabase-managed) | email, password (hashed), user metadata: name, role, position, **birth_year, is_minor**; sign-in timestamps and request metadata such as IP **(unverified)** | Supabase project owner | CREDENTIALS, **AGE** |
| `profiles` | id, name, role, position, **birth_year**, **is_minor**, created_at. Users can update only name and position. | the user; their coach (for athletes); their athletes (coach name) | **AGE** |
| `teams` | id, name, join_code, coach_id, created_at | coach; team members | — |
| `team_members` | team_id, user_id, joined_at, group_id, **consent_status, consent_recorded_at, consent_recorded_by** | the athlete (own rows); the team coach | — |
| `team_programs` | team_id, group_key, program (JSON: sessions incl. optional `mobility` flag, exercises, lift schedule, phase, position, equipment, per-date choices, author name, team name), updated_at | coach; team members | FREE TEXT (coach notes) |
| `workout_logs` | id, team_id, user_id, session_name, logged_at, sets_done, note, entries | the athlete; the team coach **while the athlete is a member** | FREE TEXT (note) |
| `team_groups` | id, team_id, name, position_hint, created_at | coach; team members | — |
| `team_calendars` | team_id, events, light_dates, updated_at | coach; team members | — |
| `readiness` | team_id, user_id, day, sleep, soreness, energy (1–5), pain (yes/no), created_at. **No pain note.** | the athlete; the team coach **while the athlete is a member** | **HEALTH/WELLNESS** |

Not stored on the server: body weight, touch height, net height, fuel targets, solo programs, theme, workout drafts, birth month.

### Stored only on the device

| Key | Contents | Flags |
|---|---|---|
| `volley-strength/data/v1` | profile (name, role, position, experience, phase, **body weight**, lift days, week, equipment, **birth year, is_minor**), programs, workout logs, body-weight log, touch-height log, readiness log (sleep, soreness, energy, pain yes/no, sent-to teams), last known consent per team, check-in notice seen, coach copy of team calendars, theme, unused legacy `athletes` list | **BODY METRICS**, **HEALTH/WELLNESS**, **AGE**, FREE TEXT |
| `approach/not-eligible/v1` | `"1"` if this device answered under 13 (nothing else) | — |
| `approach/workout-draft/…` | in-progress workout sets and note | FREE TEXT |
| Supabase session | login tokens | CREDENTIALS |
| `load-and-launch/demo-server/v1` (demo mode only) | demo accounts (email, name, role, position, birth year, is_minor, **password in plain text**), teams, rosters with consent, workouts, logs, groups, calendars, check-ins | CREDENTIALS, HEALTH/WELLNESS, AGE |

### Flag summary
- **AGE:** birth year and is_minor only (server and device). No full date, no month, no grade or school.
- **HEALTH/WELLNESS:** check-ins (sleep, soreness, energy, pain yes/no), sent only with check-in consent or for adults. Free-text workout notes can still contain anything.
- **BODY METRICS:** body weight and touch height stay on the device.
- **LOCATION, PHOTO/VIDEO:** none.

---

## 5. Signup, age and consent

1. Age question (month + year, empty pickers). Under 13 → block screen.
2. Role (coach needs 18+).
3. Name, email, password, or "I have an account"; agreement line links Terms and Privacy Notice. Athletes can train solo without an account.
4. Team code (or QR link). Minors join as `pending` until the coach records consent.
5. Supabase "Confirm email" is ON.

**Consent records:** which option, when, and which coach (`team_members`). The signed paper/e-sign form itself stays with the coach (the form asks coaches to send a copy to the contact email). The app doesn't store form images.

**Missing account flows:** no password reset in the app.

---

## 6. Third-party services and SDKs

| Service | Role | Data it receives |
|---|---|---|
| **Supabase** | Database, auth, realtime, auth emails | Server tables in section 4; email and hashed password; request metadata **(unverified)**. |
| **GitHub** (repo, Actions, Pages) | Source, builds, hosting of the app and legal pages | Public source code; Supabase URL and public key as Actions secrets; visitors' standard request data **(unverified detail)**. |
| **Expo** (Expo Go, tunnel) | Running the app on the owner's iPhone during development | Owner's Expo account; dev bundles. Logging **(unverified)**. |
| **Apple** | Planned App Store distribution | Nothing yet. |
| Fonts (Inter, Inter Tight) and Material Symbols | Typography and web icons | Nothing at runtime (bundled). The legal pages use system fonts. |
| **qrcode** (npm) | QR codes on the device | Nothing. |

**Not used:** analytics, crash reporting, advertising, payments, push notifications, in-app AI, maps/location. No new services in 2.1. ESLint is dev-only.

---

## 7. Deployment and usage

- **Website:** https://rparker-sudo.github.io/approach/ (deploys on push to `main`). Legal pages at `/approach/privacy.html`, `/terms.html`, `/consent.html` after the 2.1 deploy.
- **Supabase project:** live, Free plan; 1.0 schema plus migrations 002 and 003 applied (November 10, 2026).
- **Who has used it:** the owner plus fewer than 10 others, all 18+, per the owner **(unverified count)**. No known use by minors.

---

## 8. Monthly costs

$0/month now (Supabase Free, GitHub free, Expo free). Future: Apple Developer Program $99/year; Supabase Pro about $25/month if needed **(unverified)**; EAS free tier limits **(unverified)**.

---

## 9. Known bugs, shortcuts and TODOs

**Before real athletes (founder checklist from the spec)**
- ~~Run migrations 002 and 003 on the live project.~~ Done November 10, 2026.
- Fill in `[CONTACT EMAIL]` and `[publish date]` in `public/privacy.html`, `terms.html` and `consent.html` (they come from `docs/legal/`, which also has the placeholder). Use a personal or business address, not a district one.
- Attorney review of the consent form and notice; R1 policy check; soft-launch team outside the owner's district.

**Testing done for 2.1**
- `npx tsc --noEmit` passes. `npx expo lint` passes (run with `EXPO_OFFLINE=1`, because the workspace can't reach api.expo.dev). `npm run build:web` succeeds.
- Migration 003 and `schema.sql` were run on a local Postgres 16 with a stand-in for Supabase's `auth` schema and roles (fresh install, and v1 → 002 → 003 upgrade, run twice). Scripted API checks passed: under-13 signup rejected; pending minor's log and check-in inserts rejected; athlete can't update consent or role/birth year; adult joins as `not_required`; training_only check-in rejected while logs work; full allows both; coach loses access to a removed athlete's rows; `delete_my_account()` cascades for athletes and coaches; `pain_note` dropped. Scripts: `supabase/tests/`.
- Browser tests (demo mode, iPhone viewport) passed for the age gate, block screen and reload, minor coach restriction, pending/training-only/full flows, consent sheet, check-in notice and no free-text field, coach removal, beginner 4th-day refusal, account deletion (coach and athlete), and the three legal pages.
- Scripted checks passed for G1 (all levels × equipment sets × 1–7 days), G2 caps, rest day and mobility-only extras, and G5 steps.
- **Not tested:** the real Supabase project (unreachable from the workspace), iOS (Expo Go), and the "Logging unlocks after consent." button on a lift day (the test date had no lift; the blocked workout screen was tested).

**Behavior choices worth reviewing**
- Unknown age (accounts before 2.1, or the database without 003) counts as a minor: read-only on teams until answered or migrated.
- If the birth month is the current month, the younger age is assumed (affects the 13 and 18 lines).
- UI copy follows `docs/design/user-flows.md` where it differs from the spec (consent banner, chips "Training only"/"Full", coach deletion sentence).
- An existing coach account that answers "under 18" on the one-time age question keeps the coach role (the spec doesn't say what to do). New sign-ups can't get it.
- Per-date lift choices on the season calendar aren't capped by G2 (the spec lists the day pickers and schedule only).
- Legal links on iPhone need `EXPO_PUBLIC_APP_URL`; without it the app shows a note instead.

**Setup state**
- The `SUPABASE_URL` GitHub secret has extra path text (the app trims it).
- Free-tier Supabase projects pause after about a week without activity.

**Missing features**
- No password reset. No swipe between exercises. Pounds only.

**Security and data handling**
- Demo mode stores passwords in plain text on the device.
- "Lighten today" posts the team calendar immediately, including unposted calendar edits.

**Code leftovers**
- Old storage key names (`volley-strength/…`, `load-and-launch/…`). Unused `athletes` field. Unused `@expo/vector-icons` dependency.

**Content review**
- Program rules, nutrition targets, readiness thresholds and exercise text were written with AI assistance. G1/G2/G5 come from Training Content's safety guidelines; no review by a qualified strength coach, athletic trainer or dietitian is recorded **(unverified)**.
