# Approach: Drill & Exercise Library
Owner: Training Content / Sports Science (02) · v1.0 · Tue Nov 10, 2026
Status: **Draft for founder approval.** Generated from `src/lib/exercises.ts` (v2.0, 64 exercises) so it matches the code exactly. Tags are defined in `content/tagging-taxonomy.md`; safety rules are in `content/safety-guidelines.md`.
**Source of truth:** `exercises.ts` stays the canonical data. This doc is the readable index plus the change list for v2.2. Any JSON for the app should be generated from `EXERCISES`, not maintained by hand.

Legend: **Lvl** 1 = beginner, 2 = intermediate, 3 = advanced (a hard ceiling per safety R3/G1/G8) · **·BW** = no load is logged · Flags in the Why column: **[S8]** already being fixed by the v2.1 S8 copy change · **[A]** protection/health claim to reword in v2.2 (§3) · **[B]** "safe/safest" wording to soften in v2.2 (§3).

No on-court volleyball drills or skill work, by design (founder decision, 11/9).

---

## 1. Library (64 exercises)

### Power (12)

| id | Name | Lvl | Pattern | Equipment (any one setup) | Easier → Harder | Why (current copy) |
|---|---|---|---|---|---|---|
| `kb-swing` | Kettlebell Swing | 2 | hinge | Kettlebells | Dumbbell Romanian Deadlift → — | Teaches a fast, powerful hip snap, the same one you use in your approach. |
| `pogo` | Pogo Hops ·BW | 1 | jump | Bodyweight | — → Squat Jump | Teaches springy ankles and quick ground contact, the base of a fast jump. |
| `squat-jump` | Squat Jump ·BW | 1 | jump | Bodyweight | Pogo Hops → Box Jump | Builds raw jump power from a stop, like a block jump. |
| `broad-jump` | Broad Jump ·BW | 1 | jump | Bodyweight | Squat Jump → — | Horizontal power that carries into a faster approach. |
| `box-jump` | Box Jump ·BW | 1 | jump | Plyo boxes | Squat Jump → Trap Bar Jump | Jump power with an easy-on-the-joints landing. |
| `lateral-bound` | Lateral Bound ·BW | 2 | jump | Bodyweight | Single-Leg Balance Reach → — | Side-to-side power and landing control for defense and blocking footwork. |
| `trap-bar-jump` | Trap Bar Jump | 2 | jump | Trap bar | Squat Jump → — | Adds load to jumping to build explosive strength. |
| `hang-clean` | Hang Power Clean | 3 | olympic | Barbell & rack | Kettlebell Swing → — | Trains full-body explosive power. Learn it with a coach first. |
| `mb-slam` | Med Ball Slam | 1 | throw | Med balls | — → — | Full-body power, similar to the arm swing in an attack. |
| `mb-overhead` | Med Ball Overhead Throw | 1 | throw | Med balls | — → — | Trains the overhead power used in serving and attacking. |
| `mb-rotational` | Med Ball Rotational Throw | 1 | throw | Med balls | — → — | Rotational power for hitting and serving. |
| `mb-chest-pass` | Med Ball Chest Pass | 1 | throw | Med balls | — → — | Upper-body explosive power. |

### Lower body (17)

| id | Name | Lvl | Pattern | Equipment (any one setup) | Easier → Harder | Why (current copy) |
|---|---|---|---|---|---|---|
| `bodyweight-squat` | Bodyweight Squat ·BW | 1 | squat | Bodyweight | — → Goblet Squat | Builds the basic squat pattern every jump and landing depends on. |
| `goblet-squat` | Goblet Squat | 1 | squat | Dumbbells / Kettlebells | Bodyweight Squat → Back Squat | The safest way to load a squat while learning; builds leg strength for jumping. **[B]** |
| `back-squat` | Back Squat | 2 | squat | Barbell & rack | Goblet Squat → Front Squat | The best overall builder of leg strength, which carries into a higher jump. |
| `front-squat` | Front Squat | 3 | squat | Barbell & rack | Goblet Squat → — | Strong legs with a very upright torso, easier on the lower back than a back squat. |
| `glute-bridge` | Single-Leg Glute Bridge ·BW | 1 | hinge | Bodyweight | — → Hip Thrust | Wakes up the glutes, which power your approach and protect your knees and back. **[A]** |
| `hip-thrust` | Hip Thrust | 1 | hinge | Barbell & rack + Bench / Dumbbells + Bench / Bench | Single-Leg Glute Bridge → — | Builds the glute strength that drives every jump and lateral move. |
| `db-rdl2` | Dumbbell Romanian Deadlift | 1 | hinge | Dumbbells / Kettlebells | Single-Leg Glute Bridge → Romanian Deadlift | Strong hamstrings and glutes for jumping and for protecting your knees on landings. **[A]** |
| `rdl` | Romanian Deadlift | 2 | hinge | Barbell & rack | Dumbbell Romanian Deadlift → — | The best hamstring builder: helps jumping and lowers hamstring and knee injury risk. **[S8]** |
| `trap-bar-deadlift` | Trap Bar Deadlift | 2 | hinge | Trap bar | Dumbbell Romanian Deadlift → Trap Bar Jump | Lets athletes lift heavy safely; builds the whole-body strength behind a big jump. **[B]** |
| `nordic` | Nordic Hamstring Curl ·BW | 3 | hinge | Bodyweight | Single-Leg Glute Bridge → — | One of the most proven exercises for preventing hamstring injuries. **[S8]** |
| `band-good-morning` | Band Good Morning | 1 | hinge | Bands | — → Dumbbell Romanian Deadlift | Trains the hip hinge with almost no equipment. |
| `reverse-lunge` | Reverse Lunge | 1 | single-leg | Dumbbells / Kettlebells / Bodyweight | — → Rear-Foot Elevated Split Squat | Single-leg strength for jumping off one foot and for knee control. |
| `split-squat` | Rear-Foot Elevated Split Squat | 2 | single-leg | Dumbbells + Bench / Kettlebells + Bench / Bench | Reverse Lunge → — | Builds single-leg strength and balance, key for approach jumps and landings. |
| `step-up` | Step-Up | 1 | single-leg | Dumbbells + Plyo boxes / Kettlebells + Plyo boxes / Plyo boxes / Bench | Reverse Lunge → Rear-Foot Elevated Split Squat | Single-leg power and control that transfers straight to jumping. |
| `db-rdl` | Single-Leg RDL | 2 | single-leg | Dumbbells / Kettlebells / Bodyweight | Dumbbell Romanian Deadlift → — | Balance plus hamstring strength; protects ankles and knees on one-foot landings. **[A]** |
| `lateral-lunge` | Lateral Lunge | 1 | single-leg | Dumbbells / Kettlebells / Bodyweight | Bodyweight Squat → — | Strength in low, wide positions used in defense and lateral movement. |
| `calf-raise` | Single-Leg Calf Raise | 1 | ankle-care | Dumbbells / Bodyweight | — → — | Strong calves and Achilles tendons absorb landings and add pop to jumps. |

### Upper body (14)

| id | Name | Lvl | Pattern | Equipment (any one setup) | Easier → Harder | Why (current copy) |
|---|---|---|---|---|---|---|
| `pushup` | Push-Up ·BW | 1 | h-push | Bodyweight | — → Dumbbell Bench Press | Upper-body pushing strength and core control with no equipment. |
| `db-floor-press` | Dumbbell Floor Press | 1 | h-push | Dumbbells | Push-Up → Dumbbell Bench Press | Safe pressing strength; the floor protects the shoulders. **[A]** |
| `db-bench` | Dumbbell Bench Press | 1 | h-push | Dumbbells + Bench | Dumbbell Floor Press → Bench Press | Pressing strength with each arm working on its own, good for shoulder balance. |
| `bench` | Bench Press | 2 | h-push | Barbell & rack + Bench | Dumbbell Bench Press → — | Builds upper-body strength that supports blocking and arm swing durability. |
| `db-shoulder-press` | Half-Kneeling Dumbbell Press | 1 | v-push | Dumbbells / Kettlebells | — → Half-Kneeling Landmine Press | Overhead strength with core control, without loading the lower back. |
| `landmine-press` | Half-Kneeling Landmine Press | 2 | v-push | Barbell & rack | Half-Kneeling Dumbbell Press → — | Shoulder-friendly pressing for overhead athletes who hit and serve a lot. |
| `pike-pushup` | Pike Push-Up ·BW | 2 | v-push | Bodyweight | Push-Up → — | Overhead pressing strength with only bodyweight. |
| `db-row` | One-Arm Dumbbell Row | 1 | h-pull | Dumbbells / Kettlebells / Dumbbells + Bench | Band Row → Inverted Row | Upper-back strength balances all the hitting and keeps shoulders healthy. **[A]** |
| `band-row` | Band Row | 1 | h-pull | Bands | — → One-Arm Dumbbell Row | Upper-back and shoulder health with just a band. **[A]** |
| `cable-row` | Cable Row | 1 | h-pull | Cable / machines | — → One-Arm Dumbbell Row | Steady upper-back strength for posture and shoulder health. **[A]** |
| `inverted-row` | Inverted Row ·BW | 1 | h-pull | Barbell & rack / Pull-up bar | Band Row → Pull-Up / Chin-Up | Pulling strength using bodyweight, a bridge to pull-ups. |
| `band-pulldown` | Band Pulldown | 1 | v-pull | Bands | — → Lat Pulldown | Lat strength for arm swing power and shoulder stability, band only. |
| `lat-pulldown` | Lat Pulldown | 1 | v-pull | Cable / machines | Band Pulldown → Pull-Up / Chin-Up | Builds the lats used in arm swing and blocking. |
| `pullup` | Pull-Up / Chin-Up ·BW | 2 | v-pull | Pull-up bar | Lat Pulldown → — | The classic upper-body strength test; builds arm swing and shoulder durability. |

### Core (7)

| id | Name | Lvl | Pattern | Equipment (any one setup) | Easier → Harder | Why (current copy) |
|---|---|---|---|---|---|---|
| `dead-bug` | Dead Bug ·BW | 1 | core-ext | Bodyweight | — → Ab Wheel Rollout | Core control that keeps your back safe when you jump and hit. **[A]** |
| `plank` | Plank ·BW | 1 | core-ext | Bodyweight | — → Ab Wheel Rollout | Basic trunk stiffness for landings and hitting. |
| `ab-rollout` | Ab Wheel Rollout ·BW | 2 | core-ext | Bodyweight | Dead Bug → — | Strong anti-extension core for powerful, safe arm swings. Use an ab wheel or a barbell. **[A]** |
| `side-plank` | Side Plank ·BW | 1 | core-rot | Bodyweight | — → — | Side core strength for stable landings and lateral moves. |
| `pallof` | Pallof Press | 1 | core-rot | Cable / machines / Bands | — → — | Anti-rotation strength that transfers force from legs to arm in an attack. |
| `suitcase-carry` | Suitcase Carry | 1 | carry | Dumbbells / Kettlebells | — → — | Grip and side-core strength for stable landings. |
| `farmer-carry` | Farmer Carry | 1 | carry | Dumbbells / Kettlebells | — → — | Grip, posture and whole-body stiffness. |

### Prehab & mobility (14)

| id | Name | Lvl | Pattern | Equipment (any one setup) | Easier → Harder | Why (current copy) |
|---|---|---|---|---|---|---|
| `tib-raise` | Tibialis Raise ·BW | 1 | ankle-care | Bodyweight | — → — | Strengthens the front of the shin; helps shin splints and ankle stability. |
| `ankle-balance` | Single-Leg Balance Reach ·BW | 1 | ankle-care | Bodyweight | — → — | Trains ankle control to reduce ankle sprains, the most common volleyball injury. **[S8]** |
| `band-er` | Band External Rotation ·BW | 1 | shoulder-care | Bands / Cable / machines | — → — | Strengthens the rotator cuff that slows your arm after every attack and serve. |
| `band-pull-apart` | Band Pull-Apart ·BW | 1 | shoulder-care | Bands | — → — | Upper-back and rear-shoulder strength to balance all the hitting. |
| `face-pull` | Face Pull | 1 | shoulder-care | Cable / machines / Bands | — → — | Shoulder health for overhead athletes: rotator cuff plus upper back. **[A]** |
| `ytw` | Prone Y-T-W Raises | 1 | shoulder-care | Dumbbells / Bodyweight | — → — | Strengthens the small muscles around the shoulder blade. |
| `scap-pushup` | Scap Push-Up ·BW | 1 | shoulder-care | Bodyweight | — → — | Keeps the shoulder blade moving well for healthy overhead motion. **[A]** |
| `spanish-squat` | Spanish Squat Hold ·BW | 1 | knee-care | Bands | — → — | Loads the patellar tendon safely; helps prevent and manage jumper's knee. **[S8]** |
| `wall-sit` | Wall Sit ·BW | 1 | knee-care | Bodyweight | — → — | Tendon-friendly knee strength when you have no bands. |
| `copenhagen` | Copenhagen Plank ·BW | 2 | knee-care | Bench | Side Plank → — | Strengthens the inner thigh; reduces groin strains from lateral moves. |
| `wrist-roller` | Wrist & Finger Strength | 1 | hand-care | Dumbbells / Bands / Bodyweight | — → — | Strong hands and wrists for setting and blocking, and fewer jammed fingers. |
| `worlds-greatest` | World's Greatest Stretch ·BW | 1 | mobility | Bodyweight | — → — | Opens hips and upper back for a better approach and arm swing. |
| `hip-90-90` | 90/90 Hip Switch ·BW | 1 | mobility | Bodyweight | — → — | Hip rotation for landing and changing direction. |
| `thoracic-rotation` | Open Book ·BW | 1 | mobility | Bodyweight | — → — | Upper-back rotation for a full, healthy arm swing. **[A]** |

## 2. Coverage check
| Pattern | L1 | L2 | L3 | Has a bodyweight option |
|---|---|---|---|---|
| squat | 2 | 1 | 1 | 1 |
| hinge | 4 | 3 | 1 | 2 |
| single-leg | 3 | 2 | 0 | 3 |
| ankle-care | 3 | 0 | 0 | 3 |
| h-push | 3 | 1 | 0 | 1 |
| v-push | 1 | 2 | 0 | 1 |
| h-pull | 4 | 0 | 0 | 0 |
| v-pull | 2 | 1 | 0 | 0 |
| jump | 4 | 2 | 0 | 4 |
| olympic | 0 | 0 | 1 | 0 |
| throw | 4 | 0 | 0 | 0 |
| core-ext | 2 | 1 | 0 | 3 |
| core-rot | 2 | 0 | 0 | 1 |
| carry | 2 | 0 | 0 | 0 |
| shoulder-care | 5 | 0 | 0 | 2 |
| knee-care | 2 | 1 | 0 | 1 |
| hand-care | 1 | 0 | 0 | 1 |
| mobility | 3 | 0 | 0 | 3 |

**What this means**
- **Every level 2–3 exercise has an "easier" link**, so the G8 swap-down (safety guidelines §2a) always has somewhere to go.
- **No-equipment gaps:** horizontal pull, vertical pull, throws, and carries have **no bodyweight option**. With the "Bands & bodyweight" preset, bands cover pulling, but throw and carry slots get skipped. Not a safety issue. It matters for home and solo training (see the v2.2 hand-off, individual-athlete groundwork).
- **Mobility is thin (3 exercises).** I'm adding 6 for the extra recovery sessions (§4).
- 22 exercises have no easier/harder link at all (mostly level 1 accessories and prehab). That's fine because they're already the bottom of their pattern.

## 3. Copy fixes for v2.2 (beyond v2.1 S8)
S8 covered the explicit injury claims. These lines still imply protection or medical benefit (safety guidelines R11). Replace the **why** text as follows:

| id | Current | New |
|---|---|---|
| `glute-bridge` | "…which power your approach and protect your knees and back." | "Wakes up the glutes, which power your approach and jumps." |
| `db-rdl2` | "…and for protecting your knees on landings." | "Strong hamstrings and glutes for jumping and landing." |
| `db-rdl` | "…protects ankles and knees on one-foot landings." | "Balance plus hamstring strength for one-foot landings." |
| `db-floor-press` | "Safe pressing strength; the floor protects the shoulders." | "Pressing strength with a built-in stopping point at the floor." |
| `db-row` | "…balances all the hitting and keeps shoulders healthy." | "Upper-back strength to balance all the hitting." |
| `band-row` | "Upper-back and shoulder health with just a band." | "Upper-back and shoulder strength with just a band." |
| `cable-row` | "…for posture and shoulder health." | "Steady upper-back strength for posture and pulling." |
| `dead-bug` | "Core control that keeps your back safe when you jump and hit." | "Core control for jumping and hitting." |
| `ab-rollout` | "…for powerful, safe arm swings." | "Strong anti-extension core for powerful arm swings." |
| `face-pull` | "Shoulder health for overhead athletes: rotator cuff plus upper back." | "Rotator cuff and upper-back strength for overhead athletes." |
| `scap-pushup` | "…for healthy overhead motion." | "Keeps the shoulder blades moving well overhead." |
| `thoracic-rotation` | "…for a full, healthy arm swing." | "Upper-back rotation for a full arm swing." |
| `goblet-squat` **[B]** | "The safest way to load a squat while learning…" | "The easiest way to load a squat while learning; builds leg strength for jumping." |
| `trap-bar-deadlift` **[B]** | "Lets athletes lift heavy safely…" | "A beginner-friendly way to lift heavy; builds the whole-body strength behind a big jump." |

**Keep as is:** safety *instructions* ("Squatting without safety bars set," "Always use a spotter or safety bars"). Those are setup instructions, not claims.

Two data fixes also carry forward from the taxonomy (§A8): `ab-rollout` equipment (it needs a wheel or barbell) and the `ytw` cue ("Light dumbbells or no weight").

## 4. New exercises for v2.2 (6 mobility, for extra recovery sessions)
All are `category: 'prehab'`, `pattern: 'mobility'`, `weighted: false`, `level: 1`. They also join the generator's existing mobility slots (the Recovery/Mobility days), which helps because that pool has only 3 exercises today. Code-ready:

```ts
x('crocodile-breathing', 'Crocodile Breathing', 'prehab', 'mobility', false, 1, NONE, 'Face down, breathe into your lower back and sides.',
  h('Slow breathing to downshift after hard training days.',
    ['Lie face down, forehead resting on your stacked hands.', 'Breathe in through your nose for 4 seconds, feeling your lower back and sides rise.', 'Breathe out slowly for 6 seconds.'],
    ['Belly presses into the floor.', 'Shoulders stay relaxed.', 'Long, slow exhale.'],
    ['Breathing only into the chest.', 'Rushing the breaths.', 'Tensing the neck.'])),
x('cat-camel', 'Cat-Camel', 'prehab', 'mobility', false, 1, NONE, 'On hands and knees, round then arch your back slowly.',
  h('Gentle spine movement to loosen up after jumping and lifting.',
    ['Start on hands and knees, hands under shoulders, knees under hips.', 'Round your back up toward the ceiling and tuck your chin.', 'Slowly let your belly drop and lift your chest and eyes.'],
    ['Move one segment at a time.', 'Breathe out as you round.', 'Stay in a comfortable range.'],
    ['Rushing.', 'Forcing the arch.', 'Locking the elbows hard.'])),
x('hip-flexor-stretch', 'Half-Kneeling Hip Flexor Stretch', 'prehab', 'mobility', false, 1, NONE, 'Squeeze the back glute, shift forward a little.',
  h('Opens the front of the hip, which gets tight from sitting and jumping.',
    ['Kneel on one knee (use a pad), other foot flat in front.', 'Squeeze the glute of the down leg and tuck your hips under slightly.', 'Shift forward a few inches until you feel a stretch at the front of the hip. Hold.'],
    ['Glute squeezed the whole time.', 'Tall chest.', 'Small shift, big stretch.'],
    ['Arching the lower back.', 'Lunging too far forward.', 'Letting the front knee cave in.'])),
x('ankle-rock', 'Knee-to-Wall Ankle Rock', 'prehab', 'mobility', false, 1, NONE, 'Heel down, rock the knee toward the wall.',
  h('Ankle range of motion for deep landings and quick footwork.',
    ['Face a wall in a split stance, front toes a few inches from the wall.', 'Keeping the front heel down, rock your knee forward toward the wall.', 'Rock back. Move your foot back as it gets easier.'],
    ['Heel stays glued down.', 'Knee tracks over the middle toes.', 'Smooth rocking.'],
    ['Heel lifting.', 'Knee caving inward.', 'Bouncing.'])),
x('lat-reach', "Child's Pose Lat Reach", 'prehab', 'mobility', false, 1, NONE, 'Sit back, walk both hands to one side, breathe.',
  h('Stretches the lats and upper back that work hard in every arm swing.',
    ["Kneel and sit your hips back toward your heels, arms reaching forward on the floor.", 'Walk both hands to the left until you feel a stretch along your right side. Hold and breathe.', 'Walk to the other side.'],
    ['Hips stay back.', 'Breathe into the stretched side.', 'Relax the neck.'],
    ['Hips rising off the heels.', 'Holding your breath.', 'Forcing the range.'])),
x('band-hamstring', 'Lying Hamstring Stretch', 'prehab', 'mobility', false, 1, [['bands'], []], 'Strap around the foot, straight leg up, relax.',
  h('Loosens the hamstrings after jumping and lifting days.',
    ['Lie on your back with a band, towel, or strap around one foot.', 'Keep that leg straight and gently pull it up until you feel a stretch behind the thigh.', 'Hold, breathing slowly. Keep the other leg flat.'],
    ['Knee straight but not locked.', 'Gentle pull.', 'Low back stays down.'],
    ['Yanking the leg up.', 'Bending the knee to get higher.', 'Holding your breath.'])),
```

`REP_OVERRIDE` additions in `generator.ts` (so generated mobility days read correctly): `crocodile-breathing: '5 breaths'`, `cat-camel: '8'`, `hip-flexor-stretch: '30s each'`, `ankle-rock: '10 each'`, `lat-reach: '20s each'`, `band-hamstring: '30s each'`. Also add `hip-flexor-stretch`, `lat-reach`, and `band-hamstring` to `HOLDS` so they get no weight suggestion.

## 5. More v2.2 additions (defined in other docs)
- **4 home exercises** (`incline-pushup`, `doorframe-row`, `prone-pulldown`, `backpack-carry`) plus `pushup.easier = 'incline-pushup'`: code-ready in `programs/home-workouts.md` §8.
- **Demand tier** (`P`/`A`/`B`/`C`/`D`) for all 74 exercises, which sets rest times and superset rules: `programs/rest-and-supersets.md` §7.
- **Data fix:** `nordic` needs a partner or anchor (currently `NONE`); excluded from home sessions.
