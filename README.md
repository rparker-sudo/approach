# Volley Strength

An iPhone app for volleyball athletes and coaches: weight-training programs and fuel plans built around the volleyball schedule.

## What it does

**Athlete mode**
- Builds a weight-training program from your position, lifting experience, time of year (off-season, preseason, in-season or post-season) and your weekly volleyball schedule
- Never lifts on match days, keeps heavy legs away from the day before a match, and spreads sessions out
- Adds injury-prevention work for each position (shoulders for hitters, knees for middles, hands and wrists for setters, ankles and low positions for liberos)
- Today screen: today's lift, today's fuel targets and the week at a glance
- Logs workouts set by set and pre-fills the weight you used last time
- Fuel tab: carb, protein and water targets that change with the type of day (rest, lift, practice, match, tournament, day before a match), plus meal timing and food ideas. Calories are left out on purpose, since many users are teens.
- Progress tab: estimated strength gains, body weight and workout history

**Coach mode**
- Add athletes and build a program for each athlete or for a group
- Edit any session: swap, add, remove or reorder exercises and change sets, reps and effort
- Tap **Send** to share a program by text, email or AirDrop. Athletes paste it in under **Program → Import from coach**.

All data stays on the phone. There are no accounts, no servers and no data collection.

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
3. **Pick a unique app ID.** In `app.json`, change `"bundleIdentifier": "com.volleystrength.app"` to something only you own, for example `com.yourname.volleystrength`. If you plan to rename the app, change `"name"` too.
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
  (tabs)/           Today/Team, Program(s), Fuel, Progress tabs
  onboarding.tsx    First-launch setup
  builder.tsx       Build or rebuild a program
  session.tsx       Edit a session's exercises
  workout.tsx       Log a workout
  import.tsx        Paste a program from a coach
  settings.tsx
src/lib/
  generator.ts      Program-building rules (scheduling, phases, positions)
  exercises.ts      Exercise library
  nutrition.ts      Fuel guidance by day type
  store.tsx         On-device storage
src/components/     Shared UI pieces
```

## Ideas for version 2
- Accounts and live sync, so coaches see athletes' logs (would need a free Supabase or Firebase backend)
- Multi-week progression (for example, adding weight automatically week to week)
- Exercise demo videos
- Calendar with real dates for matches and tournaments
