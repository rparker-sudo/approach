# Program: Home Workouts (school + home weeks)
Owner: Training Content / Sports Science (02) · v1.0 · Tue Nov 10, 2026
Status: **Draft for founder approval → v2.2.** Founder decisions (11/10): coaches can mix weight-room days and home days, and the app can recommend the mix or the coach can choose it. **Full home days count toward the lift-day caps, plus one light home day is allowed beyond the cap.** **Each athlete sets their own home equipment** (bodyweight by default, stored on the device only).
Related: `safety-guidelines.md` (R5, R6, §2a), `drill-library.md`, `v2.2-training-handoff.md` (I1 athlete layer, I7 local-only data). Separate from extra recovery sessions (`extra-recovery-sessions.md`).

---

## 1. What the coach can do
In the team program builder (UX to design):
1. **Weight-room days:** pick the weekdays the school weight room is available (e.g., Tue, Thu).
2. **Training days per week:** pick a total (e.g., 4), **or** tap **"Recommend for me."**
3. The app builds the week: weight-room days get **school sessions** (full equipment, as today), and the rest become **home sessions**. The coach can move any day or switch it between school and home.
4. The coach sees the result in one line, e.g. *"2 weight-room days + 2 home days."* If caps limit it: *"Beginners: 2 weight-room + 1 home + 1 light home day (max 3 full lift days for their level)."*

Caps are applied **per athlete**, because one team has mixed levels (same idea as G8). A team week of 2 school + 2 home turns into 2 school + 1 home + 1 light home for a beginner. Intermediate and advanced athletes off-season keep all 4.

## 2. Rules (MUST)
| # | Rule |
|---|---|
| H1 | **Full home sessions count as lift days** toward R6 caps: beginner 3, intermediate 4, advanced 5, in-season 3 for everyone. |
| H2 | **Light home day:** at most **1 per week** beyond the cap. 15–20 min, bodyweight only (even if the athlete has gear), RPE ≤ 6, no jumps, no weight suggestions. It's mobility + prehab + core + one easy single-leg movement (§5). |
| H3 | **At least 1 day with no training** every week (R5). A light home day doesn't count as that rest day. |
| H4 | No home sessions on match or tournament days. The day before a match, a home session can only be upper body or the light day. |
| H5 | **No two lower-body-heavy days in a row** across school and home (e.g., school squat day then home lunge day). The scheduler swaps in Home Upper or moves the day. |
| H6 | **Home exercise pool excludes** barbell, trap bar, cable, Olympic lifts, box jumps, Nordic curls (they need a partner or anchor), and testing. No load tests at home, ever. |
| H7 | **Jumps at home are off by default.** The coach can turn them on for off/pre-season only: level 1 jumps (pogo, squat jump, broad jump), ≤ 20 ground contacts, on a forgiving surface, with the cue "Clear space, no low ceilings, sneakers on." |
| H8 | All existing rules still apply: level gates and G8 resolution, R2 effort ceilings, the beginner effort shift, deload weeks (home sessions lighten the same way), and coach lighten-day. |

## 3. Recommendation logic ("Recommend for me")
Inputs: the volleyball week (practice/match days), weight-room weekdays, desired total (default: the team's level cap for the phase), and the phase.

1. **School days** = the weight-room weekdays, minus match/tournament days, up to the cap. If the weight room is available on the day before a match, that school day gets the non-heavy-leg session (existing `generateProgram` logic).
2. **Home days**: fill the remaining total using the existing `pickLiftDays` scoring (avoid match days and the day before a match, prefer days with no volleyball, spread sessions out), plus H5.
3. **Assign sessions** (§4 table). Then check per athlete: anything over the athlete's cap becomes **one** light home day (H2). More than that is dropped, and the coach sees which athletes got fewer days and why.
4. **Check the week:** ≥ 1 day with no training (H3), or drop the lowest-priority home day.

**Recommended totals** when the coach taps "Recommend":
| Phase | Recommended total (intermediate/advanced) | Beginners |
|---|---|---|
| Off-season | 4 | 3 + 1 light |
| Preseason | 3–4 | 3 (+ 1 light if total is 4) |
| In-season | 3 (2 school + 1 home ideal) | 2 + 1 light, or 3 |
| Post-season | 2–3 | 2 + 1 light |

## 4. How the week is split
School days use the existing `splitFor(schoolDays)`: barbell main lifts and power stay in the weight room. Home days get new **home archetypes** that fill in what the school days don't cover:

| School days | Home days | School sessions | Home sessions |
|---|---|---|---|
| 1 | 1 | Total Body | Home Total |
| 1 | 2 | Total Body | Home Lower, Home Upper |
| 1 | 3 | Total Body | Home Lower, Home Upper, Home Total |
| 2 | 1 | Total Body A, B | Home Upper |
| 2 | 2 | Total Body A, B | Home Lower, Home Upper |
| 2 | 3 | Total Body A, B | Home Lower, Home Upper, Home Total |
| 3 | 1 | Lower + Power, Upper, Total Body | Home Upper |
| 3 | 2 | Lower + Power, Upper, Total Body | Home Lower, Home Upper |
| 4 | 1 | Lower, Upper, Lower Power, Upper Volume | Home Total (light-leaning: no single-leg main) |

**Home archetypes (slot lists, same format as `generator.ts`):**
| Archetype | Focus | Slots |
|---|---|---|
| **Home Lower** | Single-leg strength, hamstrings, ankles | main `single-leg` · secondary `hinge` · accessory `single-leg` · care `ankle-care` · core `core-rot` · care (position) |
| **Home Upper** | Push, pull, shoulders | main `h-push` · secondary `h-pull` · secondary `v-push` · accessory `v-pull` · care `shoulder-care` · core `core-ext` |
| **Home Total** | A bit of everything | main `single-leg` · secondary `h-push` · secondary `h-pull` · accessory `hinge` · core `core-ext` · care (position) |
| **Light Home** (H2) | Easy movement | mobility · mobility · care (position) · care `ankle-care` · core `core-ext` · accessory `single-leg` at RPE ≤ 6 |

If jumps are turned on (H7), Home Lower and Home Total add a power `jump` slot first.

**Exercise picks happen per athlete** through the athlete layer (handoff I1): the coach's home session stores slots with a **bodyweight default** exercise, and each athlete's app picks the best exercise for that slot from **their home equipment** and **their level**, using the existing `pickExercise` scoring. The coach's sets, reps, effort, and notes stay the same.

## 5. Prescription at home
Bodyweight strength needs more reps to reach the same effort, so home sessions use their own table (`HOME_RX`):
| Role | Off / Pre | In-season | Post | Effort |
|---|---|---|---|---|
| main | 3 × 8–12 | 2 × 8–10 | 3 × 10–12 | Loaded: RPE 7 (beginner 6). Bodyweight: "Leave 2–3 reps in the tank" |
| secondary | 3 × 10–12 | 2 × 10 | 3 × 12 | Same |
| accessory | 2 × 12–15 | 2 × 12 | 2 × 15 | RPE 6 |
| core | 3 × 8 / 30s | 2 × 8 / 30s | 3 × 8 | Controlled |
| care | 2 × 15 | 2 × 15 | 2 × 15 | Light |
| mobility | 2 × 5 each | 2 × 5 each | 2 × 5 each | Easy |
| power (H7 only) | 3 × 3 | — | — | Fast, land soft |
| **Light Home** | all slots 1–2 sets, RPE ≤ 6 | same | same | Easy |

Rest: main 90s, secondary 60s, accessory/core 45s, care/mobility 30s. **Target length: 25–35 min** (light day 15–20 min).

**Progression at home:**
- Loaded exercises (athlete has dumbbells/kettlebells): same G5 double progression.
- Bodyweight exercises: add reps within the range. When the athlete hits the top of the range on every set for **2 sessions in a row**, the app suggests: *"Ready for a harder version? [harder exercise]"*. Suggestion only, and only to an exercise at or below the athlete's level (e.g., Incline Push-Up → Push-Up → Pike Push-Up for intermediate).

## 6. Athlete side
- **Home equipment** (Settings → Home equipment, and once the first time a home day comes up): checkboxes for **Dumbbells, Kettlebells, Bands, Pull-up bar, Bench, Sturdy step or stairs (`box`), Med ball**. Default: none (bodyweight only). No barbell, trap bar, or cable options (H6). **Stored on the device only** (I7, D-007 pattern). Nothing goes to the server or the coach.
- **Today screen:** *"Home workout · about 30 min."* A first-time line: *"Clear some space, wear sneakers, and stop if anything hurts."*
- Logging works the same as school sessions. The log records `location: 'home'` and the exercises actually done.

## 7. Coach side and boards
- The coach sees home days on the team calendar with a house icon, and in compliance views as normal sessions ("Home Upper: done").
- **Effort board:** full and light home days are **prescribed sessions**, so they count toward Sessions, Consistency, Streak, and Overall points like school days. (Founder/Product: confirm the light day earns full points. I'm fine with it because it's the coach's plan, and the board rewards following the plan.)
- **Coach board:** home sessions appear in the ticker ("Jordan M. finished Home Upper") if the board is open, but the live board is mainly for the weight room.

## 8. New exercises needed for home (fills drill-library §2 gaps)
Home training today has no bodyweight horizontal pull, vertical pull, or carry, and no easier push-up. Four additions (all `level: 1`, `weighted: false` except the carry):

```ts
x('incline-pushup', 'Incline Push-Up', 'upper', 'h-push', false, 1, NONE, 'Hands on a counter or couch, body straight, chest to the edge.',
  h('Builds pushing strength until full push-ups feel easy.',
    ['Put your hands on a sturdy counter, table edge, or couch arm, slightly wider than your shoulders.', 'Walk your feet back until your body is one straight line.', 'Lower your chest to the edge, then press away.'],
    ['Squeeze glutes, ribs down.', 'Elbows about 45° from your body.', 'Lower the surface as you get stronger.'],
    ['Sagging hips.', 'Flaring elbows straight out.', 'Using a surface that slides or tips.']),
  { harder: 'pushup' }),
x('doorframe-row', 'Doorframe Row', 'upper', 'h-pull', false, 1, NONE, 'Hold the frame, lean back, pull your chest to your hands.',
  h('Upper-back pulling with no equipment, to balance all the pushing and hitting.',
    ['Stand in a doorway and grip both sides of the frame at chest height (or one side with one hand).', 'Walk your feet forward and lean back with straight arms.', 'Pull your chest toward the frame, squeezing your shoulder blades, then lower slowly.'],
    ['Body stays straight.', 'Squeeze the shoulder blades together.', 'Walk your feet closer to make it easier.'],
    ['Shrugging the shoulders up.', 'Bending at the hips.', 'Using a door that can swing; use the frame.'])),
x('prone-pulldown', 'Prone Floor Pulldown', 'upper', 'v-pull', false, 1, NONE, 'Face down, arms overhead, pull elbows to your ribs.',
  h('Trains the pulling-down muscles of the back without a bar.',
    ['Lie face down, arms reaching overhead, thumbs up, forehead just off the floor.', 'Lift your arms slightly and pull your elbows down toward your ribs, squeezing your back.', 'Reach back overhead slowly. Hold the squeeze for 2 seconds each rep.'],
    ['Shoulders down away from ears.', 'Squeeze and hold.', 'Slow on the way back.'],
    ['Arching the lower back hard.', 'Shrugging.', 'Rushing the reps.'])),
x('backpack-carry', 'Backpack Suitcase Carry', 'core', 'carry', true, 1, NONE, 'Loaded backpack in one hand, walk tall without leaning.',
  h('Core and grip strength with something every athlete has at home.',
    ['Load a backpack with books or water bottles (start around 10–20 lb).', 'Hold it by the top handle in one hand at your side.', 'Walk tall for the distance, then switch hands.'],
    ['Stand tall, no leaning.', 'Shoulders level.', 'Slow, steady steps.'],
    ['Leaning toward or away from the bag.', 'Shrugging the loaded shoulder.', 'Overloading the bag so the straps strain.'])),
```
Also set `pushup.easier = 'incline-pushup'`. Add `doorframe-row`, `prone-pulldown`, and `incline-pushup` to the home pool. `backpack-carry` gets weight logging (the athlete enters the bag weight) and G5 progression, capped at +5 lb.

**Data fix:** `nordic` is listed as `equipment: NONE`, but it needs a partner or anchor. Add a note in its steps and exclude it from home sessions (H6). A proper `partner` equipment item is optional.

## 9. Worked examples
**Intermediate, off-season, weight room Tue/Thu, coach asks for 4 days; practices Mon–Thu, Sat tournament:**
Mon Home Upper · **Tue School Total A** · Wed off · **Thu School Total B** · Fri off (day before the tournament) · Sat tournament · **Sun Home Lower**.
Why: Total A and B both load the legs, so Home Lower can't sit next to them (H5), and Friday is the day before a tournament (H4). Sunday is the only lower-friendly day left. Wednesday stays as the full rest day (H3).

**Beginner on the same team:** Mon Home Upper · **Tue School Total A** · **Thu School Total B** · Sun **Light Home** (cap 3 + 1 light).

**In-season, everyone, weight room Mon/Wed, match Thu:** Mon School Total A · Tue Home Upper · Wed School Total B (upper-leaning, since Thursday is a match) → 3 lift days (cap). A 4th request becomes Sat or Sun **Light Home**.

## 10. Acceptance criteria (for Product)
- [ ] The coach can set weight-room weekdays and a total, or tap "Recommend," and gets school + home days per §3.
- [ ] Per athlete, full lift days (school + home) never exceed R6 caps; at most one light home day is added beyond the cap; every week has ≥ 1 day with no training.
- [ ] No home sessions on match/tournament days; the day before a match is upper or light only; no lower-heavy days back to back (school or home).
- [ ] Home sessions never contain barbell, trap bar, cable, Olympic, box jump, Nordic, or testing; jumps appear only if the coach enabled them (off/pre-season, level 1, ≤ 20 contacts).
- [ ] Two athletes with different home equipment get different exercises for the same home slot, with the coach's sets/reps/effort unchanged; a beginner never gets a level 2–3 exercise.
- [ ] Home equipment is stored only on the device (no server write; network check).
- [ ] Light home day: bodyweight only, RPE ≤ 6, no jumps, no weight suggestions, 15–20 min.
- [ ] Bodyweight progression suggests a harder version only after 2 sessions at the top of the range, and only at or below the athlete's level.
