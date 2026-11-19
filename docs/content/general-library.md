# Approach: General Exercise Library (trainer mode)
Owner: Training Content / Sports Science (02) · v1.0 · Sun Nov 15, 2026
Status: **Ready for the 2.3.0 build (T-B1). Unreviewed by a CSCS** (recorded risk TM-17). Items marked **[CSCS]** are the ones I most want reviewed (§7).
For: general (adult) teams in trainer mode, `product/specs/trainer-mode.md` §B4. Rules: `content/adult-training-rules.md` (T-B3). Goals: `content/programs/adult-goals.md` (T-B2). Tags: `content/tagging-taxonomy.md` (Part C).

## 1. What this adds
- **39 exercises**: 12 lower body (including a sled push), 14 upper body, 3 core, 3 mobility/warm-up, 7 cardio. Machines, cables, barbell basics, isolation work, and cardio equipment that a commercial gym has and the volleyball library doesn't.
- **13 equipment items** for the trainer's **gym equipment profile** (§2).
- **6 new movement patterns** and **1 new category** (`cardio`) (§3).
- **Sport-neutral "why" text** for the 27 existing exercises whose copy talks about volleyball (§5), shown in general teams.
- **3 general warm-ups** (§6).

All copy follows the claim rules (`safety-guidelines.md` §7): no injury prevention, health, fat-loss, or results claims. Every new exercise has `tier`, `level`, `pattern`, `equipment`, cue, and how-to.

## 2. New equipment (gym profile, general teams only)
Volleyball teams' equipment picker doesn't change. In general teams the trainer's **gym equipment profile** shows the existing 10 items plus these 13, in two new groups:
| id | Label | Group |
|---|---|---|
| `leg-press` | Leg press | Machines |
| `leg-curl-machine` | Leg curl machine | Machines |
| `leg-extension-machine` | Leg extension machine | Machines |
| `chest-press-machine` | Chest press machine | Machines |
| `shoulder-press-machine` | Shoulder press machine | Machines |
| `assisted-pullup-machine` | Assisted pull-up machine | Machines |
| `sled` | Push sled | Machines |
| `bike` | Stationary bike | Cardio |
| `rower` | Rowing machine | Cardio |
| `treadmill` | Treadmill | Cardio |
| `elliptical` | Elliptical | Cardio |
| `stair-climber` | Stair climber | Cardio |
| `jump-rope` | Jump rope | Cardio |
In general teams, relabel `cable` as **"Cable station"** (same id). Clients' home equipment (device only) doesn't change.

## 3. New patterns, category, and scope
- **Patterns:** `knee-ext` (leg extension), `knee-flex` (leg curl), `shoulder-iso` (raises), `arm-flex` (curls), `arm-ext` (triceps), `cardio`.
- **Category:** `cardio`. Cardio exercises are **logged by duration only** (adult rules §6): no sets, reps, weight, heart rate, pace, distance, or calories.
- **Scope tag** (new, T-A1): `scope: 'all' | 'general' | 'volleyball'`, default `'all'`. **All 7 cardio exercises are `'general'`** (conditioning is undecided for volleyball teams). Everything else is `'all'` (and since 11/18 the warm-up, incline press, rows, and rear delt fly are used by volleyball programs too): volleyball coaches can use it if their equipment fits (the new machines only fit if a volleyball coach's picker had them, and it doesn't, so they won't appear there).

## 4. The 39 exercises
### 4a. Summary
| id | Name | Cat | Pattern | Lvl | Tier | Equipment (any one setup) | Weighted |
|---|---|---|---|---|---|---|---|
| `leg-press` | Leg Press | lower | squat | 1 | B | leg-press | yes |
| `walking-lunge` | Walking Lunge | lower | single-leg | 1 | B | dumbbells / kettlebells / bodyweight | yes |
| `conventional-deadlift` | Deadlift | lower | hinge | 2 | A | barbell | yes |
| `cable-pull-through` | Cable Pull-Through | lower | hinge | 1 | C | cable | yes |
| `leg-curl` | Machine Leg Curl | lower | knee-flex | 1 | C | leg-curl-machine | yes |
| `leg-extension` | Machine Leg Extension | lower | knee-ext | 1 | C | leg-extension-machine | yes |
| `goblet-box-squat` | Goblet Box Squat | lower | squat | 1 | B | dumbbells + bench / kettlebells + bench / box | yes |
| `sled-push` | Sled Push | lower | carry | 1 | B | sled | yes (sled load) |
| `glute-kickback` | Cable Glute Kickback | lower | hinge | 1 | C | cable / bands | yes |
| `seated-calf-raise` | Seated Calf Raise | lower | ankle-care | 1 | C | dumbbells + bench | yes |
| `db-sumo-squat` | Dumbbell Sumo Squat | lower | squat | 1 | B | dumbbells / kettlebells | yes |
| `side-lying-hip-raise` | Side-Lying Hip Raise | lower | knee-care | 1 | D | bodyweight | no |
| `machine-chest-press` | Machine Chest Press | upper | h-push | 1 | B | chest-press-machine | yes |
| `db-incline-press` | Incline Dumbbell Press | upper | h-push | 1 | B | dumbbells + bench | yes |
| `barbell-ohp` | Overhead Press | upper | v-push | 2 | A | barbell | yes |
| `seated-db-press` | Seated Dumbbell Shoulder Press | upper | v-push | 1 | B | dumbbells + bench | yes |
| `machine-shoulder-press` | Machine Shoulder Press | upper | v-push | 1 | B | shoulder-press-machine | yes |
| `barbell-row` | Bent-Over Barbell Row | upper | h-pull | 2 | B | barbell | yes |
| `chest-supported-row` | Chest-Supported Dumbbell Row | upper | h-pull | 1 | B | dumbbells + bench | yes |
| `assisted-pullup` | Assisted Pull-Up | upper | v-pull | 1 | B | assisted-pullup-machine / pull-up bar + bands | yes (assist weight) |
| `db-lateral-raise` | Lateral Raise | upper | shoulder-iso | 1 | C | dumbbells / cable / bands | yes |
| `rear-delt-fly` | Rear Delt Fly | upper | shoulder-care | 1 | C | dumbbells / cable / bands | yes |
| `db-curl` | Biceps Curl | upper | arm-flex | 1 | C | dumbbells / cable / bands | yes |
| `hammer-curl` | Hammer Curl | upper | arm-flex | 1 | C | dumbbells | yes |
| `triceps-pushdown` | Triceps Pushdown | upper | arm-ext | 1 | C | cable / bands | yes |
| `db-overhead-triceps` | Overhead Triceps Extension | upper | arm-ext | 1 | C | dumbbells | yes |
| `bird-dog` | Bird Dog | core | core-ext | 1 | C | bodyweight | no |
| `cable-woodchop` | Cable Woodchop | core | core-rot | 1 | C | cable / bands | yes |
| `hanging-knee-raise` | Hanging Knee Raise | core | core-ext | 2 | C | pull-up bar | no |
| `leg-swings` | Leg Swings | prehab | mobility | 1 | D | bodyweight | no |
| `arm-circles` | Arm Circles | prehab | mobility | 1 | D | bodyweight | no |
| `inchworm` | Inchworm | prehab | mobility | 1 | D | bodyweight | no |
| `bike` | Stationary Bike | cardio | cardio | 1 | D | bike | duration |
| `rower` | Rowing Machine | cardio | cardio | 1 | D | rower | duration |
| `treadmill-walk` | Treadmill Walk or Jog | cardio | cardio | 1 | D | treadmill | duration |
| `elliptical` | Elliptical | cardio | cardio | 1 | D | elliptical | duration |
| `stair-climber` | Stair Climber | cardio | cardio | 1 | D | stair-climber | duration |
| `walk-jog` | Walk or Jog | cardio | cardio | 1 | D | bodyweight | duration |
| `jump-rope` | Jump Rope | cardio | cardio | 2 | D | jump-rope | duration |

**Chains (`easier` → `harder`):** `goblet-box-squat` → `goblet-squat`; `leg-press.easier = 'goblet-box-squat'` (no harder link; it's a machine alternative to squats); `assisted-pullup` → `pullup`; `chest-supported-row` → `barbell-row`; `seated-db-press` → `barbell-ohp`; `machine-shoulder-press` → `seated-db-press`; `machine-chest-press` → `db-bench`; `cable-pull-through` → `db-rdl2`; `db-rdl2` → `conventional-deadlift` is **not** linked (the existing chain `db-rdl2` → `rdl` stays); `conventional-deadlift.easier = 'trap-bar-deadlift'`. Also set **`pullup.easier = 'assisted-pullup'`** only when the athlete's equipment fits it (G8 resolution already checks fit).

**Weight logging:** `assisted-pullup` logs the **assist** weight; progression goes **down** (less assist = harder). G5 doesn't handle this, so for 2.3.0: **no weight suggestions for `assisted-pullup`** (the trainer sets it). `sled-push` logs sled load and uses `"20 yd"` reps like carries; G5 applies with the +5 lb cap.

**Rest:** tiers above feed the existing rest table (`rest-and-supersets.md` §3). Cardio has no rest table: after a cardio block, a 60 s transition.

### 4b. Code-ready entries
Same helper format as `exercises.ts`. Cardio entries have empty `steps` for load and use a `durationOnly` flag (§6 of the adult rules).

```ts
// ---------- Lower ----------
x('leg-press', 'Leg Press', 'lower', 'squat', true, 1, [['leg-press']], 'Feet mid-platform, lower under control, press through the whole foot.',
  h('Builds leg strength with the back supported, so it\'s easy to learn and load.',
    ['Sit with your back and hips flat against the pad, feet shoulder-width in the middle of the platform.', 'Release the safety handles and lower the platform until your knees are bent about 90 degrees, or as far as your hips stay down.', 'Press back up through your whole foot without locking your knees hard.'],
    ['Hips stay on the seat.', 'Knees track over your toes.', 'Smooth on the way down.'],
    ['Lowering so far your hips curl off the pad.', 'Locking the knees hard at the top.', 'Pushing through the toes only.']),
  { easier: 'goblet-box-squat' }),
x('walking-lunge', 'Walking Lunge', 'lower', 'single-leg', true, 1, [['dumbbells'], ['kettlebells'], []], 'Long step, back knee drops straight down, stand tall.',
  h('Single-leg strength and balance for everyday movement and sport.',
    ['Stand tall, holding weights at your sides (or no weight).', 'Take a long step forward and lower until your back knee is just above the floor.', 'Push through the front foot to bring the back leg forward into the next step.'],
    ['Torso tall.', 'Front knee over the middle of the foot.', 'Controlled, not bouncy.'],
    ['Short steps that drive the knee past the toes.', 'Front knee caving in.', 'Slamming the back knee down.']),
  { easier: 'reverse-lunge' }),
x('conventional-deadlift', 'Deadlift', 'lower', 'hinge', true, 2, [['barbell']], 'Bar over mid-foot, brace, push the floor away, stand tall.',
  h('Whole-body strength from the floor: legs, hips, back, and grip.',
    ['Stand with the bar over the middle of your feet, feet about hip-width.', 'Hinge down and grip the bar just outside your legs. Shins touch the bar, back flat.', 'Big breath, brace, and push the floor away until you\'re standing tall.', 'Lower by pushing your hips back, keeping the bar close.'],
    ['Bar stays against your legs.', 'Chest up, back flat.', 'Reset and brace before each rep.'],
    ['Rounding the lower back.', 'Bar drifting away from the body.', 'Leaning back at the top.']),
  { easier: 'trap-bar-deadlift' }),
x('cable-pull-through', 'Cable Pull-Through', 'lower', 'hinge', true, 1, [['cable']], 'Face away from the cable, hips back, squeeze glutes to stand.',
  h('Teaches the hip hinge with light, steady resistance.',
    ['Set a rope on the low cable. Face away and hold the rope between your legs.', 'Walk out a few steps. Push your hips back with soft knees until you feel your hamstrings.', 'Squeeze your glutes to stand tall.'],
    ['Hips back, not down.', 'Flat back.', 'Arms just hold the rope.'],
    ['Squatting instead of hinging.', 'Pulling with the arms.', 'Leaning back at the top.']),
  { harder: 'db-rdl2' }),
x('leg-curl', 'Machine Leg Curl', 'lower', 'knee-flex', true, 1, [['leg-curl-machine']], 'Curl the pad toward you, slow on the way back.',
  h('Isolates the hamstrings with a simple machine setup.',
    ['Set the machine so your knees line up with its pivot point and the pad sits just above your heels.', 'Curl your heels toward your hips.', 'Return slowly to the start.'],
    ['Hips stay down on the pad.', 'Slow lowering, about 3 seconds.', 'Full range you can control.'],
    ['Hips lifting off the pad.', 'Swinging the weight.', 'Letting the stack slam.'])),
x('leg-extension', 'Machine Leg Extension', 'lower', 'knee-ext', true, 1, [['leg-extension-machine']], 'Straighten the knees smoothly, lower slowly.',
  h('Isolates the quads with a simple machine setup.',
    ['Set the seat so your knees line up with the machine\'s pivot and the pad sits on your lower shins.', 'Straighten your legs until your knees are nearly straight.', 'Lower slowly.'],
    ['Back against the pad.', 'Smooth, no kicking.', 'Slow on the way down.'],
    ['Kicking the weight up.', 'Lifting the hips off the seat.', 'Letting the stack slam.'])),
x('goblet-box-squat', 'Goblet Box Squat', 'lower', 'squat', true, 1, [['dumbbells', 'bench'], ['kettlebells', 'bench'], ['box']], 'Sit back to the box, stay tight, stand up.',
  h('A squat with a set depth target, good for learning the movement.',
    ['Stand in front of a bench or box, holding a weight at your chest (or no weight).', 'Sit back and down until you lightly touch the box.', 'Stand up without rocking.'],
    ['Touch, don\'t flop.', 'Knees track over toes.', 'Chest stays up.'],
    ['Dropping onto the box.', 'Rocking forward to stand.', 'Knees caving in.']),
  { harder: 'goblet-squat' }),
x('sled-push', 'Sled Push', 'lower', 'carry', true, 1, [['sled']], 'Lean in, arms long, drive with short, powerful steps.',
  h('Leg drive and whole-body effort with no lowering phase.',
    ['Load the sled lightly to start. Grip the high or low handles with your arms extended.', 'Lean in so your body makes a straight line from head to back foot.', 'Drive forward with short, quick steps for the distance.'],
    ['Straight line from head to heel.', 'Push through the balls of the feet.', 'Steady pace.'],
    ['Standing too upright.', 'Long, reaching steps.', 'Loading so heavy the sled barely moves.'])),
x('glute-kickback', 'Cable Glute Kickback', 'lower', 'hinge', true, 1, [['cable'], ['bands']], 'Hips square, push the heel back, squeeze.',
  h('Isolates the glutes with light resistance.',
    ['Attach an ankle strap on the low cable (or loop a band around your ankle and anchor it low).', 'Hold the machine for balance, slight lean forward.', 'Push the working leg straight back, squeezing your glute. Return slowly.'],
    ['Hips stay square.', 'Squeeze at the end.', 'Slow return.'],
    ['Arching the lower back to get height.', 'Swinging the leg.', 'Twisting the hips.'])),
x('seated-calf-raise', 'Seated Calf Raise', 'lower', 'ankle-care', true, 1, [['dumbbells', 'bench']], 'Weight on the knees, full stretch, pause at the top.',
  h('Calf strength with the knee bent, which works the lower calf.',
    ['Sit on a bench with the balls of your feet on a plate or step and a dumbbell on each knee.', 'Lower your heels for a full stretch.', 'Rise as high as you can and pause.'],
    ['Full range.', 'Pause at the top.', 'Slow lowering.'],
    ['Bouncing.', 'Half reps.', 'Rushing.'])),
x('db-sumo-squat', 'Dumbbell Sumo Squat', 'lower', 'squat', true, 1, [['dumbbells'], ['kettlebells']], 'Wide stance, toes out, sit straight down.',
  h('A wide-stance squat that works the legs and inner thighs.',
    ['Stand wide with toes turned out, holding one weight between your legs with both hands.', 'Sit straight down, knees pushing out over your toes.', 'Stand back up tall.'],
    ['Chest up.', 'Knees out.', 'Weight stays under your chest.'],
    ['Knees caving in.', 'Leaning forward.', 'Heels lifting.']),
  { harder: 'goblet-squat' }),
x('side-lying-hip-raise', 'Side-Lying Hip Raise', 'lower', 'knee-care', false, 1, NONE, 'Lie on your side, lift the top leg slightly back, slow.',
  h('Wakes up the side-hip muscles before lower-body work.',
    ['Lie on your side, bottom knee bent, top leg straight in line with your body.', 'Turn the top toes slightly down and lift the leg a little behind you.', 'Lower slowly.'],
    ['Hips stacked.', 'Leg slightly behind you.', 'Slow and controlled.'],
    ['Rolling backward.', 'Swinging the leg forward.', 'Lifting too high.'])),

// ---------- Upper ----------
x('machine-chest-press', 'Machine Chest Press', 'upper', 'h-push', true, 1, [['chest-press-machine']], 'Handles at mid-chest, press out, slow return.',
  h('Pressing strength on a guided path, easy to learn and load.',
    ['Set the seat so the handles line up with the middle of your chest.', 'Press the handles forward until your arms are nearly straight.', 'Return slowly until you feel a light stretch across your chest.'],
    ['Shoulder blades back against the pad.', 'Elbows about 45 degrees from your body.', 'Slow return.'],
    ['Shoulders shrugging up.', 'Locking the elbows hard.', 'Letting the stack slam.']),
  { harder: 'db-bench' }),
x('db-incline-press', 'Incline Dumbbell Press', 'upper', 'h-push', true, 1, [['dumbbells', 'bench']], 'Bench at a low incline, press up over the upper chest.',
  h('Pressing strength for the chest and front of the shoulders.',
    ['Set a bench to a low incline (about 30 degrees). Lie back with a dumbbell in each hand at your chest.', 'Press the weights up over your upper chest.', 'Lower under control until your elbows are just below the bench.'],
    ['Shoulder blades pinned back.', 'Feet planted.', 'Wrists stacked over elbows.'],
    ['Bench set too steep.', 'Bouncing the weights at the bottom.', 'Flaring elbows straight out.'])),
x('barbell-ohp', 'Overhead Press', 'upper', 'v-push', true, 2, [['barbell']], 'Squeeze glutes, press straight up, head through at the top.',
  h('Standing overhead strength for the shoulders, arms, and trunk.',
    ['Start with the bar on the front of your shoulders in a rack, hands just outside shoulder-width.', 'Squeeze your glutes and brace. Press the bar straight up, moving your head back slightly to clear it.', 'At the top, bring your head through so the bar is over your mid-foot. Lower to the shoulders.'],
    ['Glutes and abs tight.', 'Bar path straight up.', 'Ribs down.'],
    ['Leaning back to press.', 'Pressing the bar forward instead of up.', 'Loose trunk.']),
  { easier: 'seated-db-press' }),
x('seated-db-press', 'Seated Dumbbell Shoulder Press', 'upper', 'v-push', true, 1, [['dumbbells', 'bench']], 'Back on the pad, press up, lower to ear height.',
  h('Overhead pressing with back support.',
    ['Set a bench upright. Sit with your back on the pad and a dumbbell at each shoulder.', 'Press the weights up until your arms are nearly straight.', 'Lower to about ear height.'],
    ['Back stays on the pad.', 'Wrists over elbows.', 'Smooth reps.'],
    ['Arching off the pad.', 'Clanking the weights together.', 'Dropping too low and losing control.']),
  { easier: 'machine-shoulder-press', harder: 'barbell-ohp' }),
x('machine-shoulder-press', 'Machine Shoulder Press', 'upper', 'v-push', true, 1, [['shoulder-press-machine']], 'Handles at shoulder height, press up, slow return.',
  h('Overhead pressing on a guided path.',
    ['Set the seat so the handles start at about shoulder height.', 'Press up until your arms are nearly straight.', 'Return slowly.'],
    ['Back against the pad.', 'Shoulders down, away from ears.', 'Slow return.'],
    ['Arching the back.', 'Shrugging.', 'Letting the stack slam.']),
  { harder: 'seated-db-press' }),
x('barbell-row', 'Bent-Over Barbell Row', 'upper', 'h-pull', true, 2, [['barbell']], 'Hinge, flat back, pull the bar to your lower ribs.',
  h('Upper-back strength with a heavier load.',
    ['Hold the bar with an overhand grip, hands just outside your legs.', 'Hinge forward with soft knees until your torso is at about 45 degrees, back flat.', 'Pull the bar to your lower ribs, then lower it under control.'],
    ['Back stays flat and still.', 'Elbows drive back.', 'Pause at the top.'],
    ['Standing up as you pull.', 'Rounding the back.', 'Jerking the weight.']),
  { easier: 'chest-supported-row' }),
x('chest-supported-row', 'Chest-Supported Dumbbell Row', 'upper', 'h-pull', true, 1, [['dumbbells', 'bench']], 'Chest on the incline pad, pull elbows back.',
  h('Upper-back strength with the chest supported, so the lower back can relax.',
    ['Set a bench to a low incline. Lie face down with a dumbbell in each hand, arms hanging.', 'Pull your elbows back toward your hips, squeezing your shoulder blades.', 'Lower slowly.'],
    ['Chest stays on the pad.', 'Squeeze at the top.', 'Neck relaxed.'],
    ['Lifting the chest off the pad.', 'Shrugging.', 'Rushing the lowering.']),
  { harder: 'barbell-row' }),
x('assisted-pullup', 'Assisted Pull-Up', 'upper', 'v-pull', true, 1, [['assisted-pullup-machine'], ['pullup-bar', 'bands']], 'Full hang, pull your chest toward the bar, slow down.',
  h('Builds toward full pull-ups with help from a machine or band.',
    ['Machine: set the assist weight and kneel or stand on the platform. Band: loop a band over the bar and put one knee or foot in it.', 'Start from a full hang with arms straight.', 'Pull until your chin clears the bar, then lower slowly.'],
    ['Shoulders down before you pull.', 'Chest toward the bar.', 'Slow on the way down.'],
    ['Half reps.', 'Kicking or swinging.', 'Letting the band snap you up.']),
  { harder: 'pullup' }),
x('db-lateral-raise', 'Lateral Raise', 'upper', 'shoulder-iso', true, 1, [['dumbbells'], ['cable'], ['bands']], 'Light weight, lift out to shoulder height, slow down.',
  h('Isolates the side of the shoulders.',
    ['Stand tall with a light weight in each hand at your sides.', 'With a slight bend in the elbows, raise your arms out to the sides to about shoulder height.', 'Lower slowly.'],
    ['Lead with the elbows.', 'Stop at shoulder height.', 'Light and controlled.'],
    ['Swinging the weights up.', 'Shrugging.', 'Going too heavy.'])),
x('rear-delt-fly', 'Rear Delt Fly', 'upper', 'shoulder-care', true, 1, [['dumbbells'], ['cable'], ['bands']], 'Hinge forward, open the arms wide, squeeze the upper back.',
  h('Works the back of the shoulders and upper back.',
    ['Hinge forward with a flat back (or lie face down on an incline bench), light weights hanging.', 'With soft elbows, open your arms out to the sides.', 'Squeeze your shoulder blades, then lower slowly.'],
    ['Light weight.', 'Lead with the elbows.', 'Pause at the top.'],
    ['Swinging the body.', 'Going too heavy.', 'Shrugging.'])),
x('db-curl', 'Biceps Curl', 'upper', 'arm-flex', true, 1, [['dumbbells'], ['cable'], ['bands']], 'Elbows pinned, curl up, slow down.',
  h('Isolates the biceps.',
    ['Stand tall with weights at your sides, palms forward.', 'Curl the weights up without moving your elbows forward.', 'Lower slowly to straight arms.'],
    ['Elbows stay at your sides.', 'Full range.', 'Slow lowering.'],
    ['Swinging the body.', 'Elbows drifting forward.', 'Half reps.'])),
x('hammer-curl', 'Hammer Curl', 'upper', 'arm-flex', true, 1, [['dumbbells']], 'Thumbs up, elbows pinned, curl and lower slowly.',
  h('Works the biceps and forearms with a neutral grip.',
    ['Stand tall with dumbbells at your sides, palms facing in.', 'Curl the weights up, keeping your thumbs up.', 'Lower slowly.'],
    ['Elbows still.', 'Thumbs up the whole time.', 'Slow lowering.'],
    ['Swinging.', 'Rotating the wrists.', 'Rushing.'])),
x('triceps-pushdown', 'Triceps Pushdown', 'upper', 'arm-ext', true, 1, [['cable'], ['bands']], 'Elbows pinned, push down to straight arms.',
  h('Isolates the triceps.',
    ['Face a high cable (or a band anchored high) holding the rope or bar.', 'Pin your elbows at your sides and push down until your arms are straight.', 'Let your hands come back up to about chest height, elbows still.'],
    ['Elbows stay at your sides.', 'Squeeze at the bottom.', 'Controlled return.'],
    ['Leaning your body over the weight.', 'Elbows flaring out.', 'Letting the weight yank your arms up.'])),
x('db-overhead-triceps', 'Overhead Triceps Extension', 'upper', 'arm-ext', true, 1, [['dumbbells']], 'Weight overhead, lower behind the head, press up.',
  h('Works the triceps in a stretched position.',
    ['Sit or stand tall, holding one dumbbell overhead with both hands.', 'Keeping your elbows pointed up, lower the weight behind your head.', 'Straighten your arms to press it back up.'],
    ['Elbows point up and stay narrow.', 'Ribs down.', 'Slow lowering.'],
    ['Arching the back.', 'Elbows flaring wide.', 'Going too heavy.'])),

// ---------- Core ----------
x('bird-dog', 'Bird Dog', 'core', 'core-ext', false, 1, NONE, 'Opposite arm and leg out, hips level, pause.',
  h('Trunk control while the arms and legs move.',
    ['Start on hands and knees, hands under shoulders, knees under hips.', 'Reach one arm forward and the opposite leg back until both are level with your body.', 'Pause, return, and switch sides.'],
    ['Hips stay level.', 'Reach long, not high.', 'Slow.'],
    ['Twisting the hips.', 'Arching the lower back.', 'Rushing.'])),
x('cable-woodchop', 'Cable Woodchop', 'core', 'core-rot', true, 1, [['cable'], ['bands']], 'Rotate from the hips, arms long, control the return.',
  h('Rotational strength through the trunk.',
    ['Set the cable (or band) high on one side. Stand side-on, holding the handle with both hands.', 'Pull diagonally down and across your body, turning from your hips and pivoting your back foot.', 'Return slowly. Switch sides.'],
    ['Turn from the hips.', 'Arms stay long.', 'Controlled return.'],
    ['Pulling only with the arms.', 'Twisting the lower back without moving the hips.', 'Going too heavy.'])),
x('hanging-knee-raise', 'Hanging Knee Raise', 'core', 'core-ext', false, 2, [['pullup-bar']], 'Hang still, curl the knees up, lower slowly.',
  h('Trunk and hip strength plus grip.',
    ['Hang from a bar with arms straight, shoulders pulled down.', 'Curl your knees up toward your chest, tilting your pelvis.', 'Lower slowly without swinging.'],
    ['No swinging.', 'Curl the pelvis up.', 'Slow lowering.'],
    ['Swinging for momentum.', 'Only lifting the knees to hip height.', 'Dropping fast.'])),

// ---------- Mobility / warm-up ----------
x('leg-swings', 'Leg Swings', 'prehab', 'mobility', false, 1, NONE, 'Hold a support, swing front-to-back, then side-to-side.',
  h('Loosens the hips before lower-body work.',
    ['Hold a wall or rack for balance.', 'Swing one leg forward and back, gradually bigger.', 'Then swing it side to side across your body. Switch legs.'],
    ['Stand tall.', 'Start small, build up.', 'Relaxed swing.'],
    ['Forcing the range.', 'Leaning the body.', 'Rushing.'])),
x('arm-circles', 'Arm Circles', 'prehab', 'mobility', false, 1, NONE, 'Arms out, small to big circles, both directions.',
  h('Warms up the shoulders before upper-body work.',
    ['Stand tall with arms out to the sides.', 'Make small circles, gradually getting bigger.', 'Reverse direction.'],
    ['Tall posture.', 'Smooth circles.', 'Both directions.'],
    ['Shrugging.', 'Rushing.', 'Forcing big circles right away.'])),
x('inchworm', 'Inchworm', 'prehab', 'mobility', false, 1, NONE, 'Hinge down, walk hands out to a plank, walk feet in.',
  h('A whole-body warm-up for the hamstrings, shoulders, and trunk.',
    ['Stand tall, hinge forward, and place your hands on the floor (bend your knees as needed).', 'Walk your hands out to a high plank.', 'Walk your feet toward your hands and stand up.'],
    ['Straight body in the plank.', 'Bend the knees if you need to.', 'Smooth.'],
    ['Sagging hips in the plank.', 'Forcing straight legs.', 'Rushing.'])),

// ---------- Cardio (scope: 'general'; logged by duration only) ----------
x('bike', 'Stationary Bike', 'cardio', 'cardio', false, 1, [['bike']], 'Seat at hip height, smooth pedaling, steady effort.',
  h('Low-impact cardio that\'s easy to adjust.',
    ['Set the seat so your knee is slightly bent at the bottom of the pedal stroke.', 'Pedal at a steady, comfortable pace.', 'Adjust resistance to match the effort your trainer set.'],
    ['Relaxed shoulders.', 'Smooth circles.', 'Use the talk test for effort.'],
    ['Seat too low.', 'Bouncing in the saddle.', 'Going harder than the effort set.'])),
x('rower', 'Rowing Machine', 'cardio', 'cardio', false, 1, [['rower']], 'Legs, then body, then arms. Reverse on the way back.',
  h('Full-body cardio with low impact.',
    ['Strap your feet in. Start with knees bent, arms straight, torso leaning slightly forward.', 'Push with your legs, then lean back slightly, then pull the handle to your lower ribs.', 'Return in reverse: arms, body, then legs.'],
    ['Legs first.', 'Smooth, steady strokes.', 'Use the talk test for effort.'],
    ['Pulling with the arms first.', 'Rounding the back.', 'Rushing back to the front.'])),
x('treadmill-walk', 'Treadmill Walk or Jog', 'cardio', 'cardio', false, 1, [['treadmill']], 'Clip the safety key, start slow, steady pace.',
  h('Simple cardio at an easy-to-control pace.',
    ['Clip the safety key to your clothing and start the belt slowly.', 'Walk or jog at the effort your trainer set. A small incline is fine.', 'Slow down gradually before stepping off.'],
    ['Stand tall.', 'Relaxed arms.', 'Use the talk test for effort.'],
    ['Holding the rails the whole time.', 'Starting too fast.', 'Stepping off while the belt is moving.'])),
x('elliptical', 'Elliptical', 'cardio', 'cardio', false, 1, [['elliptical']], 'Upright posture, smooth strides, steady effort.',
  h('Low-impact cardio for the whole body.',
    ['Step on and hold the handles.', 'Stride smoothly, pushing and pulling the handles.', 'Adjust resistance to match the effort your trainer set.'],
    ['Stand tall.', 'Whole foot on the pedal.', 'Use the talk test for effort.'],
    ['Leaning on the handles.', 'Toes only.', 'Going harder than the effort set.'])),
x('stair-climber', 'Stair Climber', 'cardio', 'cardio', false, 1, [['stair-climber']], 'Light hands on the rails, full steps, steady pace.',
  h('Cardio that also works the legs.',
    ['Step on, holding the rails lightly.', 'Climb at a steady pace with full steps.', 'Slow the machine down before stepping off.'],
    ['Stand tall.', 'Light grip on the rails.', 'Use the talk test for effort.'],
    ['Leaning hard on the rails.', 'Tiny steps.', 'Starting too fast.'])),
x('walk-jog', 'Walk or Jog', 'cardio', 'cardio', false, 1, NONE, 'Comfortable pace, tall posture, steady breathing.',
  h('Cardio anywhere, no equipment needed.',
    ['Walk or jog outside, on a track, or indoors.', 'Keep the effort your trainer set.', 'Finish with a few minutes of easy walking.'],
    ['Tall posture.', 'Relaxed shoulders.', 'Use the talk test for effort.'],
    ['Starting too fast.', 'Poor footwear.', 'Going harder than the effort set.'])),
x('jump-rope', 'Jump Rope', 'cardio', 'cardio', false, 2, [['jump-rope']], 'Small hops, wrists turn the rope, land softly.',
  h('Cardio with quick, light footwork.',
    ['Hold the handles at hip height. Rope behind you.', 'Turn the rope with your wrists and hop just high enough to clear it.', 'Rest whenever you trip or need a break; duration counts the whole block.'],
    ['Small, quiet hops.', 'Wrists, not arms.', 'Use the talk test for effort.'],
    ['Jumping too high.', 'Landing flat-footed and loud.', 'Big arm circles.'])),
```

## 5. Sport-neutral "why" text for general teams
Add an optional `whyGeneral` field. In general teams, show `whyGeneral` when it exists, otherwise `why`. These 27 existing exercises mention volleyball (approach, blocking, hitting, serving, setting, defense, arm swing) and get general text. (Where the v2.2 copy fixes in `drill-library.md` §3 already changed a line, this replaces that line in general teams only.)
| id | `whyGeneral` |
|---|---|
| `glute-bridge` | "Wakes up the glutes, which drive squats, lunges, and jumps." |
| `kb-swing` | "Teaches a fast, powerful hip snap." |
| `split-squat` | "Builds single-leg strength and balance." |
| `lateral-lunge` | "Strength in low, wide positions and side-to-side movement." |
| `ankle-balance` | "Trains ankle control and balance for moving and landing." |
| `bench` | "Builds pressing strength in the chest, shoulders, and arms." |
| `landmine-press` | "A shoulder-friendly angle for pressing up and forward." |
| `db-row` | "Upper-back strength to balance all the pressing." |
| `band-pulldown` | "Lat strength with just a band." |
| `lat-pulldown` | "Builds the lats and upper back." |
| `pullup` | "A classic upper-body strength builder for the back and arms." |
| `squat-jump` | "Builds jump power from a stop." |
| `broad-jump` | "Horizontal power and landing control." |
| `lateral-bound` | "Side-to-side power and landing control." |
| `mb-slam` | "Full-body power through the trunk and arms." |
| `mb-overhead` | "Trains full-body overhead power." |
| `mb-rotational` | "Rotational power from the hips through the trunk." |
| `dead-bug` | "Core control while the arms and legs move." |
| `plank` | "Basic trunk strength and stiffness." |
| `ab-rollout` | "Strong anti-extension core. Use an ab wheel or a barbell." |
| `pallof` | "Anti-rotation strength through the trunk." |
| `band-er` | "Strengthens the rotator cuff muscles that turn the arm out." |
| `band-pull-apart` | "Upper-back and rear-shoulder strength to balance all the pressing." |
| `face-pull` | "Rotator cuff and upper-back strength." |
| `wrist-roller` | "Hand, wrist, and grip strength." |
| `worlds-greatest` | "Opens the hips and upper back." |
| `thoracic-rotation` | "Upper-back rotation." |

## 6. General warm-ups (static content, about 6–8 min)
> **Superseded (11/18):** every session now gets a warm-up generated from its content (`content/programs/warmups.md`). W1–W3 below are kept only as reference.
Shown as the first step of a general-team session when the trainer turns on **"Include warm-up"** (default on). The trainer picks one per session, or Approach picks by session type.
| Warm-up | Use for | Blocks |
|---|---|---|
| **W1 General** | Full-body or mixed sessions | Easy cardio 3 min (any cardio machine the gym has, or `walk-jog`) · `arm-circles` 10 each way · `leg-swings` 8 each direction, each leg · `inchworm` 4 · `bodyweight-squat` 8 · `bird-dog` 4 each side |
| **W2 Lower** | Lower-body sessions | Easy cardio 3 min · `leg-swings` · `glute-bridge` 8 each · `side-lying-hip-raise` 8 each · `bodyweight-squat` 8 · `walking-lunge` (no weight) 4 each |
| **W3 Upper** | Upper-body sessions | Easy cardio 3 min · `arm-circles` · `band-pull-apart` 15 (or `scap-pushup` 8) · `thoracic-rotation` 5 each · `inchworm` 4 · `pushup` or `incline-pushup` 6 |
Cue under each: "Easy effort. You should feel warmer and looser, not tired." The existing per-lift warm-up sets (light × 10, about 50% × 5, about 70% × 3) still show before a tier A lift.

## 7. Items for CSCS review [CSCS]
1. **Level assignments** for the barbell lifts added here (`conventional-deadlift`, `barbell-ohp`, `barbell-row` at level 2) and machine work at level 1.
2. **Tier assignments**, especially `leg-press` (B) and `barbell-ohp` (A), since tier sets the rest floor.
3. **Jump rope at level 2** and whether impact work needs extra limits for deconditioned adults.
4. Whether the sport-neutral "why" lines read well to a general client (copy, low risk).

## 8. Acceptance criteria (for Product)
- [ ] All 39 exercises present with the tags in §4a; claim-word search is clean.
- [ ] The 13 equipment items appear only in general teams' gym profile; `cable` reads "Cable station" there.
- [ ] Cardio exercises appear only in general teams (`scope: 'general'`) and log duration only.
- [ ] `whyGeneral` shows in general teams; volleyball teams keep `why`.
- [ ] `assisted-pullup` gets no weight suggestion; `sled-push` progression is capped at +5 lb.
- [ ] Warm-ups W1–W3 available in general teams; tier A per-lift warm-up sets still show.
