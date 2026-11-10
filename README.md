# Approach

**Build it under the bar. Use it above the net.**

An iPhone app (plus a mobile browser version) for volleyball athletes and coaches: weight training, fuel and planning built around the volleyball schedule. App Store name: **Approach: Volleyball Fitness** (set in App Store Connect; the home-screen name stays **Approach**).

The app has four tabs: **Lift** (today's training), **Fuel** (meals and hydration), **Plan** (season, week and match days) and **Progress** (touch height and strength). Coaches also get a **Team** tab.

## Brand
- Brand kit: `assets/brand/source/` (SVG originals) and `src/lib/brand-tokens.json`, the source of truth for colors and type
- Theme: `src/lib/theme.ts` builds the dark (default) and light themes from the tokens. Users switch in Settings → Appearance.
- Fonts: Inter (body) and Inter Tight 600 (display, uppercase), bundled with the app; all numbers use tabular figures
- Icons: `assets/icon.png` (iOS, from `app-icon-dark`), `assets/splash-icon.png`, `assets/favicon.png`

## What it does

**Athlete mode**
- Builds a weight-training program from your position, lifting experience, time of year (off-season, preseason, in-season or post-season) and your weekly volleyball schedule
- **Any number of lift days (1–7)**: each count gets its own split (total body, upper/lower, power days, recovery), and sessions get shorter as days go up
- **Built for your gym**: pick what you have (full weight room, dumbbells & bench, bands & bodyweight, or item by item) and every exercise fits it
- **Weekly progression**: 4-week blocks (3 building weeks, then a deload week). The workout suggests your next weight: "Last: 135 × 5, 5, 5 → Try 140 (+5)"
- **Workout view with rest timers**: one exercise at a time (or a list), big Done buttons, and a rest countdown that starts when you finish a set (−15s / +15s / Skip). Keeps the screen awake, survives closing the app, and ends with a summary and new bests
- **Exercise how-to**: tap any exercise for why it matters for volleyball, steps, coaching cues, common mistakes, equipment, and easier/harder options
- **Daily check-in**: sleep, soreness, energy and pain. It never changes your workout by itself
- Never lifts on match days, keeps heavy legs away from the day before a match, and spreads sessions out
- **Pick your lift days**: the app suggests days, and you tap the days you actually lift. Change them anytime under Plan → Edit lift days, no rebuild needed
- **Season calendar**: mark real match, tournament and day-off dates (with names like "Reno Classic"). When an event lands on a lift day, that week's lift moves to the nearest good day, or a lighter session is swapped in the day before a match, with a note saying what changed. Tap any date to choose its lift yourself
- Adds injury-prevention work for each position (shoulders for hitters, knees for middles, hands and wrists for setters, ankles and low positions for liberos)
- Today screen: today's lift, today's fuel targets and the week at a glance
- Logs workouts set by set and pre-fills the weight you used last time
- Fuel tab: carb, protein and water targets that change with the type of day (rest, lift, practice, match, tournament, day before a match), plus meal timing and food ideas. Calories are left out on purpose, since many users are teens.
- Progress tab: **Above the net**, your approach touch height minus the net height (women's 2.24 m, men's 2.43 m, or a custom youth height), plus strength gains, body weight and workout history

**Coach mode (teams)**
- Create teams (for example Varsity and JV). Each team gets a 6-character join code.
- Build one workout per team and tap **Post**. Every athlete on the roster gets it. Edit later and post again to update everyone.
- The coach sets the team's lift days and season calendar (match and tournament dates). Athletes see them read-only.
- **QR code invites**: Team → Show QR code. Athletes scan it with the iPhone Camera; it opens the app's join page with the team code filled in. Before the App Store launch it opens the browser version; afterward Safari also offers the iPhone app.
- See the roster, who trained this week, and each athlete's recent lifts and notes.
- **Position groups**: one tap makes Hitters, Middles, Setters and Liberos / DS and places athletes by position (or make your own groups). Each group gets its own workout; anyone not in a group gets the Whole team workout. The season calendar is shared.
- **Readiness**: today's check-ins at a glance (who's run down, who reported pain). When several athletes are run down, the app suggests a lighter day; **you decide**. "Lighten today" gives the whole team or a group the same exercises with fewer sets and easy effort, and can be undone.
- **Rest times**: set per exercise in 15-second steps; athletes' timers use them.

**Athletes on a team** make an account, enter the team code once, and the team workout becomes their plan. Logged workouts go to the coach. **Solo athletes** can skip accounts and build their own program.

## Team sync (Supabase)

Team sync needs a free Supabase project. Until you connect one, the app runs in **demo mode**: accounts and teams are saved on that one device, which is handy for trying the coach and athlete sides by signing out and back in.

1. Create a free account at https://supabase.com and click **New project**.
2. Open **SQL Editor → New query**, paste everything in `supabase/schema.sql`, and click **Run**.
3. Open **Authentication → Sign In / Providers → Email**. For school use, turn **Confirm email** off so students can sign in right away. If you leave it on, athletes must tap a link in an email before their first sign-in.
4. Open **Project Settings → API**. Copy the **Project URL** and the **anon public** key.
5. In the project folder, copy `.env.example` to `.env` and paste in those two values.
6. Restart the app (`npx expo start`). The demo-mode notes disappear when sync is on.

**Upgrading from 1.x?** Paste `supabase/migrations/002_approach_2.sql` into the SQL Editor and click **Run** once. It adds groups, the shared team calendar and readiness check-ins, and keeps everything you already have. (New projects don't need it; `schema.sql` includes it.)

What is stored online: name, email, role, position, team membership and group, posted team workouts and calendar, the workouts athletes log for a team, and daily check-ins (sleep, soreness, energy, pain and an optional note), which only the athlete and their coach can see. Body weight, touch height and fuel targets stay on the phone. Coaches see only their own teams; athletes see only their team's workout and their coach's name. Check with your district before collecting student data, especially for athletes under 13.

The claude.ai preview link can't reach Supabase, so it always runs in demo mode. Use the app in Expo Go or the GitHub Pages site for live sync.

## Browser version on GitHub Pages

The repository includes `.github/workflows/deploy-web.yml`, which builds the browser version and publishes it every time you push to `main`. Team QR codes point at this site.

1. Create a free GitHub account and a new repository (for example `approach`), and push this project to it.
2. In the repository: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. **Settings → Secrets and variables → Actions → New repository secret**: add `SUPABASE_URL` and `SUPABASE_ANON_KEY` (same values as your `.env`). Skip this to publish in demo mode.
4. Push to `main` (or open **Actions → Deploy web app → Run workflow**). The site appears at `https://<your-username>.github.io/approach/`.
5. Put that address in `.env` as `EXPO_PUBLIC_APP_URL` (and in the EAS build settings) so QR codes in the iPhone app point to it. The GitHub build sets it automatically.
6. After the App Store launch, add a repository **variable** `APP_STORE_ID` (the number in your App Store link) so Safari shows a "Get the app" banner on the site.

**Using your own domain** (for example `https://lift.yourschool.org`): add the domain under Settings → Pages, then add two repository variables: `APP_URL` set to the full address, and `BASE_PATH` set to `/`.

To build the site yourself: `EXPO_BASE_URL=/approach npm run build:web`, then upload `dist/`.

---

## Updating

There is one copy of the project on your Mac: `~/Projects/approach`. It tracks GitHub, so new versions arrive with a pull, not a new folder.

```bash
cd ~/Projects/approach
```

```bash
npm run go
```

`npm run go` pulls the latest code, installs anything new, and starts the app. Scan the QR code with Expo Go. (`npm run update` does the pull and install without starting.)

Your `.env` file (Supabase keys) lives only in `~/Projects/approach` on your Mac and is never uploaded.

**To run an old version:**

```bash
git checkout v2.0
```

**To come back to the latest:**

```bash
git checkout main
```

---

## Step 1: Try it on your iPhone (free)

You need a computer with **Node.js** (free from https://nodejs.org, LTS version) and the **Expo Go** app from the App Store on your iPhone.

1. Put this folder on your computer.
2. Open Terminal (Mac) or Command Prompt (Windows), go into the folder, and run:

   ```bash
   npm install
   ```

   ```bash
   npx expo start
   ```

3. A QR code appears. Scan it with the iPhone **Camera** app. It opens in Expo Go.
4. Your phone and computer must be on the same Wi-Fi. If they can't connect (common on school networks), run `npx expo start --tunnel` instead.

As you edit the code, the app on your phone refreshes on its own.

## Step 2: Publish to the App Store (when you're ready, $99/year)

1. **Join the Apple Developer Program** at https://developer.apple.com/programs/ ($99/year). Approval can take 1–2 days.
2. **Create a free Expo account** at https://expo.dev/signup.
3. **Pick a unique app ID.** In `app.json`, change `"bundleIdentifier": "com.approachvolleyball.app"` to something only you own, for example `com.yourname.approach`.
4. **Build the app in the cloud** (no Mac needed):

   ```bash
   npx eas-cli@latest login
   ```

   ```bash
   npx eas-cli@latest build --platform ios --profile production
   ```

   When asked, sign in with your Apple ID and let Expo create the certificates for you.
5. **Send it to Apple:**

   ```bash
   npx eas-cli@latest submit --platform ios --latest
   ```

6. **Test it with TestFlight.** The build appears in TestFlight in App Store Connect (https://appstoreconnect.apple.com). Install it on your phone and invite athletes to test it before the public release.
7. **Fill out the App Store listing** in App Store Connect:
   - App name: **Approach: Volleyball Fitness** (when you create the app in App Store Connect under **Apps → +**)
   - Screenshots from a 6.9" or 6.7" iPhone (take them on your phone from the TestFlight build)
   - Description, keywords and support URL
   - **Privacy policy URL** (required; a free Google Site works)
   - **App Privacy:** choose "Data Not Collected." The app stores everything on the phone and sends nothing.
   - **Age rating questionnaire**
8. Click **Submit for Review**. Apple usually responds within 1–3 days.

### Notes for school use
- If students will use it, ask your district whether the app should be published under the **district's** Apple Developer account (organization enrollment, which needs a D-U-N-S number).
- Training and nutrition content is general education. Have athletes learn new lifts with a qualified coach, and send anyone with health concerns to a doctor or registered dietitian.

---

## Project layout

```
src/app/            Screens (each file is a screen)
  (tabs)/           index = Lift (Team for coaches), fuel = Fuel, program = Plan, progress = Progress
  onboarding.tsx    First-launch setup
  calendar.tsx      Season calendar (dates, per-date lift choices)
  schedule.tsx      Edit lift days (the usual week)
  team/[id].tsx     A coach's team: code, workout, roster, recent lifts
  invite.tsx        Team QR code
  join.tsx          Join a team (opened by QR links: /join?code=…)
  builder.tsx       Build or rebuild a program
  session.tsx       Edit a session's exercises
  workout.tsx       Log a workout
  import.tsx        Paste a program from a coach
  settings.tsx
src/lib/
  generator.ts      Program-building rules (scheduling, phases, positions)
  calendar.ts       Real-date plan: calendar events, automatic lift moves, overrides
  team.tsx          Team sync (backend/ has the Supabase and demo-mode versions)
  exercises.ts      Exercise library
  nutrition.ts      Fuel guidance by day type
  store.tsx         On-device storage
  theme.ts          Brand theme built from brand-tokens.json
src/components/     Shared UI pieces (ui.tsx holds the brand Text, buttons, logo and net tape)
```

## Ideas for later
- Season phases by date (switch from preseason to in-season lifting automatically)
- Coach view of each athlete's weights over time
- Exercise demo videos
