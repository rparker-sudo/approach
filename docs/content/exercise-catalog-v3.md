# Exercise Catalog v3: College-Level Additions
Owner: Training Content / Sports Science (02) · v3.0 · Wed Nov 18, 2026
Status: **Draft for founder approval. Unreviewed by a CSCS.** Builds the catalog that `content/program-design.md` (v3) programs from.
Adds **66 exercises** and **5 equipment items** to the existing library (64 v2.0 + 6 mobility + 4 home in `drill-library.md`, and 39 in `general-library.md`). With these, the full catalog is **179 exercises**.

## 1. What's added and why
A college volleyball strength program runs on four things the old library was thin on:
| Gap in the old library | Added |
|---|---|
| One Olympic lift (hang power clean) and nothing to teach toward it | **10 power exercises**: Olympic derivatives at L2 (hang high pull, jump shrug, clean pull, push press, DB snatch, DB push press) and L3 (power clean, push jerk, hang power snatch), plus loaded jumps |
| 6 jumps, no progression from extensive to reactive | **11 plyometrics**: a full ladder from line hops and skater hops to hurdle hops, depth drops, single-leg hop-and-stick, and depth jumps |
| 4 med-ball throws | **3 throws**: scoop toss, step-in overhead throw, backward toss |
| Few strength variations for heavy-lift progressions | **10 squat and single-leg variations** (pause, box, safety-bar squat, front-foot elevated split squat, lateral squat, skater squat, etc.), **6 posterior chain** (GHR, good morning, back extension, slider curl, etc.), **8 push/pull** (incline and close-grip bench, chin-up, weighted pull-up, ring row, etc.) |
| Little durability work beyond bands | **4 core**, **8 durability** (90/90 ER isometric, side-lying ER, wall slide, reverse Nordic, Peterson step-up, isometric split squat, soleus raise, band lateral walk) |
| No movement prep for warm-ups | **6 movement-prep drills** (A-skip, lateral shuffle, carioca, high knees, walking knee hug, walking quad stretch) |

All copy follows the claim rules (`safety-guidelines.md` §7). Every entry has `tier`, `level`, `pattern`, `equipment`, cue, and a full how-to. All are `scope: 'all'` (volleyball and general teams).

## 2. New equipment (all teams)
| id | Label | In the "Full weight room" preset? |
|---|---|---|
| `ssb` | Safety squat bar | No (opt-in) |
| `ghd` | GHD / back extension bench | No (opt-in) |
| `suspension` | Suspension trainer or rings | No (opt-in) |
| `sliders` | Sliders | Yes |
| `hurdles` | Mini hurdles | Yes |
Sliders and hurdles are cheap and common, so the full preset includes them; the other three are ticked individually. Towels work as sliders at home (the slider curl lists bodyweight as a setup).

## 3. Summary table
| id | Name | Cat | Pattern | Lvl | Tier | Equipment (any one setup) | Easier → Harder |
|---|---|---|---|---|---|---|---|
| **Power** | | | | | | | |
| `hang-high-pull` | Hang High Pull | power | olympic | 2 | P | barbell | kb-swing → hang-clean |
| `jump-shrug` | Jump Shrug | power | olympic | 2 | P | barbell / trap-bar | kb-swing → hang-clean |
| `clean-pull` | Clean Pull (from mid-thigh) | power | olympic | 2 | P | barbell | jump-shrug → — |
| `db-hang-snatch` | Dumbbell Hang Snatch | power | olympic | 2 | P | dumbbells / kettlebells | mb-backward-toss → hang-power-snatch |
| `push-press` | Push Press | power | olympic | 2 | P | barbell | db-push-press → push-jerk |
| `db-push-press` | Dumbbell Push Press | power | olympic | 2 | P | dumbbells | mb-step-overhead-throw → push-press |
| `power-clean` | Power Clean | power | olympic | 3 | P | barbell | hang-clean → — |
| `push-jerk` | Push Jerk | power | olympic | 3 | P | barbell | push-press → — |
| `hang-power-snatch` | Hang Power Snatch | power | olympic | 3 | P | barbell | db-hang-snatch → — |
| `db-jump-squat` | Dumbbell Jump Squat | power | jump | 2 | P | dumbbells | squat-jump → trap-bar-jump |
| **Plyometrics** | | | | | | | |
| `cmj` | Countermovement Jump | power | jump | 1 | P | bodyweight | pogo → box-jump |
| `line-hops` | Line Hops | power | jump | 1 | P | bodyweight | — → single-leg-box-jump |
| `skater-hop` | Skater Hop | power | jump | 1 | P | bodyweight | — → lateral-bound |
| `hurdle-hop` | Hurdle Hops | power | jump | 2 | P | hurdles | box-jump → depth-jump |
| `lateral-hurdle-hop` | Lateral Hurdle Hops | power | jump | 3 | P | hurdles | lateral-bound → — |
| `single-leg-box-jump` | Single-Leg Box Jump | power | jump | 2 | P | box | line-hops → single-leg-hop-stick |
| `single-leg-hop-stick` | Single-Leg Hop and Stick | power | jump | 3 | P | bodyweight | single-leg-box-jump → — |
| `depth-drop` | Depth Drop (stick) | power | jump | 2 | P | box | box-jump → depth-jump |
| `depth-jump` | Depth Jump | power | jump | 3 | P | box | depth-drop → — |
| `seated-box-jump` | Seated Box Jump | power | jump | 2 | P | box + bench | box-jump → — |
| `continuous-broad-jump` | Continuous Broad Jumps | power | jump | 2 | P | bodyweight | broad-jump → — |
| **Throws** | | | | | | | |
| `mb-scoop-toss` | Med Ball Scoop Toss | power | throw | 1 | P | med-ball | — → jump-shrug |
| `mb-step-overhead-throw` | Med Ball Step-In Overhead Throw | power | throw | 1 | P | med-ball | mb-overhead → db-push-press |
| `mb-backward-toss` | Med Ball Backward Overhead Toss | power | throw | 1 | P | med-ball | mb-scoop-toss → db-hang-snatch |
| **Squat** | | | | | | | |
| `pause-back-squat` | Pause Back Squat | lower | squat | 2 | A | barbell | goblet-squat → back-squat |
| `box-squat` | Box Squat | lower | squat | 2 | A | barbell + box / barbell + bench | goblet-box-squat → back-squat |
| `ssb-squat` | Safety Bar Squat | lower | squat | 2 | A | ssb | goblet-squat → back-squat |
| `heels-elevated-goblet` | Heels-Elevated Goblet Squat | lower | squat | 1 | B | dumbbells / kettlebells | bodyweight-squat → goblet-squat |
| **Single-leg** | | | | | | | |
| `ffe-split-squat` | Front-Foot Elevated Split Squat | lower | single-leg | 1 | B | dumbbells + box / box | reverse-lunge → split-squat |
| `lateral-squat` | Lateral Squat | lower | single-leg | 2 | B | dumbbells / kettlebells / bodyweight | lateral-lunge → — |
| `skater-squat` | Skater Squat | lower | single-leg | 2 | B | bodyweight / dumbbells | ffe-split-squat → — |
| `lateral-step-up` | Lateral Step-Up | lower | single-leg | 1 | B | dumbbells + box / box | — → step-up |
| `single-leg-box-squat` | Single-Leg Box Squat | lower | single-leg | 2 | B | box / bench | step-up → skater-squat |
| `bb-reverse-lunge` | Barbell Reverse Lunge | lower | single-leg | 2 | B | barbell | reverse-lunge → — |
| **Posterior chain** | | | | | | | |
| `bb-good-morning` | Barbell Good Morning | lower | hinge | 2 | B | barbell | band-good-morning → — |
| `back-extension` | 45° Back Extension | lower | hinge | 1 | C | ghd | glute-bridge → ghr |
| `ghr` | Glute-Ham Raise | lower | hinge | 2 | B | ghd | slider-ham-curl → nordic |
| `slider-ham-curl` | Slider Hamstring Curl | lower | hinge | 1 | C | sliders / bodyweight (towel) | glute-bridge → ghr |
| `sl-hip-thrust` | Single-Leg Hip Thrust | lower | hinge | 1 | B | bench | glute-bridge → hip-thrust |
| `kb-deadlift` | Kettlebell Deadlift | lower | hinge | 1 | B | kettlebells / dumbbells | glute-bridge → trap-bar-deadlift |
| **Push** | | | | | | | |
| `incline-bench` | Incline Bench Press | upper | h-push | 2 | A | barbell + bench | db-incline-press → — |
| `close-grip-bench` | Close-Grip Bench Press | upper | h-push | 2 | A | barbell + bench | db-bench → — |
| `push-up-plus` | Push-Up Plus | prehab | shoulder-care | 1 | D | bodyweight | scap-pushup → — |
| **Pull** | | | | | | | |
| `chin-up` | Chin-Up | upper | v-pull | 2 | B | pull-up bar | assisted-pullup → weighted-pullup |
| `weighted-pullup` | Weighted Pull-Up | upper | v-pull | 3 | B | pull-up bar + dumbbells | pullup → — |
| `ring-row` | Ring Row | upper | h-pull | 1 | B | suspension | doorframe-row → inverted-row |
| `single-arm-cable-row` | Half-Kneeling Single-Arm Cable Row | upper | h-pull | 1 | B | cable / bands | band-row → db-row |
| `half-kneeling-pulldown` | Half-Kneeling Single-Arm Pulldown | upper | v-pull | 1 | C | cable / bands | band-pulldown → lat-pulldown |
| **Core** | | | | | | | |
| `landmine-rotation` | Landmine Rotation | core | core-rot | 2 | C | barbell | pallof → — |
| `body-saw` | Body Saw | core | core-ext | 2 | C | sliders | plank → ab-rollout |
| `overhead-carry` | Single-Arm Overhead Carry | core | carry | 2 | C | kettlebells / dumbbells | suitcase-carry → — |
| `short-lever-copenhagen` | Short-Lever Copenhagen | prehab | knee-care | 1 | C | bench | side-plank → copenhagen |
| **Durability** | | | | | | | |
| `side-lying-er` | Side-Lying External Rotation | prehab | shoulder-care | 1 | D | dumbbells | band-er → — |
| `er-90-90-iso` | 90/90 External Rotation Hold | prehab | shoulder-care | 1 | D | bands / cable | band-er → — |
| `wall-slide` | Wall Slide | prehab | shoulder-care | 1 | D | bodyweight | — → ytw |
| `reverse-nordic` | Reverse Nordic | prehab | knee-care | 2 | C | bodyweight | spanish-squat → — |
| `peterson-step-up` | Peterson Step-Up | prehab | knee-care | 1 | C | box / dumbbells + box | — → reverse-nordic |
| `iso-split-squat` | Isometric Split Squat | prehab | knee-care | 1 | C | bodyweight / dumbbells | wall-sit → spanish-squat |
| `soleus-calf-raise` | Bent-Knee Calf Raise | prehab | ankle-care | 1 | C | bodyweight / dumbbells | — → calf-raise |
| `band-lateral-walk` | Band Lateral Walk | prehab | knee-care | 1 | D | bands | — → — |
| **Movement prep (warm-ups)** | | | | | | | |
| `a-skip` | A-Skip | prehab | mobility | 1 | D | bodyweight | high-knees → — |
| `lateral-shuffle` | Lateral Shuffle | prehab | mobility | 1 | D | bodyweight | — → — |
| `carioca` | Carioca | prehab | mobility | 1 | D | bodyweight | — → — |
| `high-knees` | High Knees | prehab | mobility | 1 | D | bodyweight | — → a-skip |
| `walking-knee-hug` | Walking Knee Hug | prehab | mobility | 1 | D | bodyweight | — → — |
| `walking-quad-stretch` | Walking Quad Stretch | prehab | mobility | 1 | D | bodyweight | — → — |

**Updates to existing exercises:** `hang-clean.easier = 'hang-high-pull'` (was `kb-swing`); `box-jump.harder = 'depth-drop'` (was `trap-bar-jump`); `lateral-bound.easier = 'skater-hop'`; `nordic.easier = 'ghr'`; `pullup.easier = 'chin-up'` when no assisted option fits; `inverted-row.easier = 'ring-row'`; `copenhagen.easier = 'short-lever-copenhagen'`; `goblet-squat.easier = 'heels-elevated-goblet'`.

**Generator rule change:** remove "Olympic pattern only at level 3" (`pickExercise`). Gate by each exercise's `level` only, so L2 derivatives are available to intermediate athletes.

**Reps notation for new holds/one-sided items** (`REP_OVERRIDE`/`HOLDS`): `er-90-90-iso`, `iso-split-squat`, `short-lever-copenhagen` → holds ("30s each", "20s each"); `line-hops` → "20" (contacts); `a-skip`, `lateral-shuffle`, `carioca`, `high-knees`, `walking-knee-hug`, `walking-quad-stretch` → "10 yd" (distance); `overhead-carry` → "20 yd each".

## 4. Code-ready entries
```ts
// ---------- Power: Olympic derivatives ----------
x('hang-high-pull', 'Hang High Pull', 'power', 'olympic', true, 2, [['barbell']], 'From mid-thigh, jump and pull elbows high and outside.',
  h('Teaches the explosive hip extension of the clean without the catch.',
    ['Stand tall with the bar at your hips, hands just outside your legs.', 'Hinge until the bar is just above your knees, back flat, shoulders over the bar.', 'Jump hard: extend hips, knees, and ankles, then pull your elbows high and out so the bar rises to your chest.'],
    ['Legs first, arms last.', 'Bar stays close.', 'Elbows high and outside.'],
    ['Pulling with the arms early.', 'Bar swinging away from the body.', 'Going too heavy to stay fast.']),
  { easier: 'kb-swing', harder: 'hang-clean' }),
x('jump-shrug', 'Jump Shrug', 'power', 'olympic', true, 2, [['barbell'], ['trap-bar']], 'Hinge to the knees, jump, and shrug hard. Arms stay long.',
  h('The simplest way to load a fast triple extension.',
    ['Hold the bar at your hips (or stand in a trap bar).', 'Hinge until the bar is just above your knees.', 'Jump straight up and shrug your shoulders to your ears, arms straight. Land softly in the same spot.'],
    ['Arms stay straight.', 'Jump, don\'t lean back.', 'Land soft and reset.'],
    ['Bending the arms.', 'Leaning back at the top.', 'Landing stiff.']),
  { easier: 'kb-swing', harder: 'hang-clean' }),
x('clean-pull', 'Clean Pull (from mid-thigh)', 'power', 'olympic', true, 2, [['barbell']], 'Bar at mid-thigh, drive the floor away, finish tall with a shrug.',
  h('Overloads the pulling part of the clean so it\'s fast and strong.',
    ['Set the bar on blocks or safety pins at mid-thigh, or hinge to that position.', 'Brace, then drive hard through the floor, extending hips and knees fast.', 'Finish tall on your toes with a strong shrug. Arms stay straight.'],
    ['Push the floor, don\'t lift with the back.', 'Bar close to the thighs.', 'Fast finish.'],
    ['Bending the arms.', 'Rounding the back.', 'Slow, grinding pulls.']),
  { easier: 'jump-shrug' }),
x('db-hang-snatch', 'Dumbbell Hang Snatch', 'power', 'olympic', true, 2, [['dumbbells'], ['kettlebells']], 'One dumbbell, hinge, jump, punch it straight overhead.',
  h('A single-arm power movement that\'s easier to learn than the barbell snatch.',
    ['Hold one dumbbell in front of your thighs, feet hip-width.', 'Hinge until the weight is just above your knees.', 'Jump, pull the weight up close to your body, then punch your arm straight overhead and catch in a quarter squat.'],
    ['Weight stays close.', 'Punch to lockout.', 'Catch soft.'],
    ['Swinging the weight out in front.', 'Pressing it out slowly.', 'Bent elbow at the top.']),
  { easier: 'mb-backward-toss', harder: 'hang-power-snatch' }),
x('push-press', 'Push Press', 'power', 'olympic', true, 2, [['barbell']], 'Short dip, drive with the legs, press to lockout.',
  h('Transfers leg drive into the arms, overhead.',
    ['Start with the bar on the front of your shoulders, hands just outside shoulder-width.', 'Dip a few inches by bending your knees, torso upright.', 'Drive up hard with your legs and press the bar to lockout, head through.'],
    ['Short, straight dip.', 'Legs start it, arms finish it.', 'Lock out over mid-foot.'],
    ['Dipping too deep or leaning forward.', 'Pressing before the legs finish.', 'Arching back at the top.']),
  { easier: 'db-push-press', harder: 'push-jerk' }),
x('db-push-press', 'Dumbbell Push Press', 'power', 'olympic', true, 2, [['dumbbells']], 'Dumbbells at the shoulders, dip and drive, press overhead.',
  h('Leg-driven overhead power with dumbbells.',
    ['Hold a dumbbell at each shoulder, palms facing in.', 'Dip a few inches, torso upright.', 'Drive up with your legs and press both dumbbells to lockout.'],
    ['Short dip.', 'Fast drive.', 'Stack wrists over shoulders.'],
    ['Leaning back.', 'Slow press with no leg drive.', 'Dumbbells drifting forward.']),
  { easier: 'mb-step-overhead-throw', harder: 'push-press' }),
x('power-clean', 'Power Clean', 'power', 'olympic', true, 3, [['barbell']], 'Push the floor away, explode at the hips, fast elbows.',
  h('Full-body explosive power from the floor.',
    ['Set up like a deadlift: bar over mid-foot, back flat, shoulders over the bar.', 'Lift the bar to your knees with the same back angle, then jump hard as it passes your thighs.', 'Pull yourself under and catch the bar on your shoulders in a quarter squat, elbows high.'],
    ['Slow off the floor, fast at the hips.', 'Bar stays close.', 'Fast elbows in the catch.'],
    ['Pulling with the arms early.', 'Bar looping out in front.', 'Catching with low elbows.']),
  { easier: 'hang-clean' }),
x('push-jerk', 'Push Jerk', 'power', 'olympic', true, 3, [['barbell']], 'Dip, drive, punch under the bar into a quarter squat.',
  h('Overhead power with a fast drop under the bar.',
    ['Start with the bar on the front of your shoulders.', 'Dip and drive hard like a push press.', 'As the bar leaves your shoulders, punch yourself under it and catch with straight arms in a quarter squat, then stand.'],
    ['Straight dip and drive.', 'Punch under, don\'t press.', 'Stand up to finish.'],
    ['Pressing out the bar.', 'Catching with bent elbows.', 'Bar drifting forward.']),
  { easier: 'push-press' }),
x('hang-power-snatch', 'Hang Power Snatch', 'power', 'olympic', true, 3, [['barbell']], 'Wide grip, jump, pull under, catch locked out overhead.',
  h('Full-body power with the bar finishing overhead.',
    ['Take a wide grip so the bar sits in your hip crease when standing.', 'Hinge until the bar is just above your knees.', 'Jump hard, pull your elbows high, and punch under to catch the bar overhead in a quarter squat.'],
    ['Bar brushes the hips.', 'Punch to lockout.', 'Catch balanced.'],
    ['Swinging the bar out.', 'Pressing it out.', 'Catching with soft elbows.']),
  { easier: 'db-hang-snatch' }),
x('db-jump-squat', 'Dumbbell Jump Squat', 'power', 'jump', true, 2, [['dumbbells']], 'Light dumbbells at your sides, dip, jump, land soft.',
  h('Adds light load to jumping to build explosive strength.',
    ['Hold light dumbbells at your sides (about 10–20% of your squat).', 'Dip to a quarter squat.', 'Jump as high as you can and land softly, resetting between reps.'],
    ['Light load, max speed.', 'Land soft and quiet.', 'Reset each rep.'],
    ['Going so heavy you barely leave the ground.', 'Landing stiff.', 'Bouncing reps.']),
  { easier: 'squat-jump', harder: 'trap-bar-jump' }),

// ---------- Plyometrics ----------
x('cmj', 'Countermovement Jump', 'power', 'jump', false, 1, NONE, 'Quick dip, big arm swing, jump straight up, land soft.',
  h('The basic vertical jump, done with full intent.',
    ['Stand tall, feet hip-width.', 'Dip quickly while swinging your arms back.', 'Jump straight up as high as you can, swinging your arms up, and land softly.'],
    ['Quick dip.', 'Arms help.', 'Stick the landing.'],
    ['Slow, deep dip.', 'Landing with knees caving.', 'Bouncing into the next rep.']),
  { easier: 'pogo', harder: 'box-jump' }),
x('line-hops', 'Line Hops', 'power', 'jump', false, 1, NONE, 'Quick, small hops over a line: forward-back, then side to side.',
  h('Quick, light ground contacts for ankle stiffness and footwork.',
    ['Stand next to a line on the floor.', 'Hop over and back quickly on both feet, staying on the balls of your feet.', 'Do forward-back sets and side-to-side sets.'],
    ['Small and quick.', 'Quiet feet.', 'Stay tall.'],
    ['Big, slow hops.', 'Heels slamming.', 'Looking down the whole time.']),
  { harder: 'single-leg-box-jump' }),
x('skater-hop', 'Skater Hop', 'power', 'jump', false, 1, NONE, 'Hop side to side onto one foot, stick it, go back.',
  h('Side-to-side power and single-leg landing control.',
    ['Stand on your right foot.', 'Hop sideways to land on your left foot, letting the right leg swing behind.', 'Stick the landing for a second, then hop back.'],
    ['Land soft on one foot.', 'Knee over toes.', 'Pause before the next hop.'],
    ['Knee caving on landing.', 'Rushing through the stick.', 'Hopping too far to control.']),
  { harder: 'lateral-bound' }),
x('hurdle-hop', 'Hurdle Hops', 'power', 'jump', false, 2, [['hurdles']], 'Two-foot hops over hurdles, quick off the ground.',
  h('Reactive jumping: spending less time on the ground between jumps.',
    ['Set 4–6 mini hurdles about 3 feet apart.', 'Jump over each one on both feet, landing and leaving quickly.', 'Stick the landing after the last hurdle.'],
    ['Quick contacts.', 'Knees up.', 'Stay tall in the air.'],
    ['Long pauses between hurdles.', 'Heels slamming.', 'Hurdles too high to stay quick.']),
  { easier: 'box-jump', harder: 'depth-jump' }),
x('lateral-hurdle-hop', 'Lateral Hurdle Hops', 'power', 'jump', false, 3, [['hurdles']], 'Hop sideways over a hurdle and back, quick off the ground.',
  h('Reactive side-to-side jumping for lateral movement and blocking footwork.',
    ['Stand beside a mini hurdle.', 'Hop sideways over it on both feet and immediately hop back.', 'Keep contacts quick for the set.'],
    ['Quick contacts.', 'Hips square.', 'Knees stay over toes.'],
    ['Landing with knees caving.', 'Slow contacts.', 'Leaning into the hop.']),
  { easier: 'lateral-bound' }),
x('single-leg-box-jump', 'Single-Leg Box Jump', 'power', 'jump', false, 2, [['box']], 'Jump off one foot onto a low box, land on both.',
  h('Single-leg jumping power with a soft landing.',
    ['Stand on one foot facing a low box.', 'Dip and jump onto the box, landing on both feet.', 'Step down and switch legs.'],
    ['Low box.', 'Drive the free knee up.', 'Land soft on both feet.'],
    ['Box too high.', 'Jumping down off the box.', 'Knee caving on take-off.']),
  { easier: 'line-hops', harder: 'single-leg-hop-stick' }),
x('single-leg-hop-stick', 'Single-Leg Hop and Stick', 'power', 'jump', false, 3, NONE, 'Hop forward on one leg and stick the landing for 2 seconds.',
  h('Single-leg power and landing control for one-foot take-offs.',
    ['Stand on one leg.', 'Hop forward a comfortable distance and land on the same leg.', 'Hold the landing for 2 seconds, then reset.'],
    ['Land soft, knee over toes.', 'Hips level.', 'Hold the stick.'],
    ['Hopping too far to stick.', 'Knee caving.', 'Rushing the next rep.']),
  { easier: 'single-leg-box-jump' }),
x('depth-drop', 'Depth Drop (stick)', 'power', 'jump', false, 2, [['box']], 'Step off a low box and stick the landing.',
  h('Trains landing force before adding a rebound jump.',
    ['Stand on a low box (12–18 in).', 'Step off, don\'t jump, and land on both feet.', 'Absorb the landing in an athletic position and hold for 2 seconds.'],
    ['Step off, don\'t jump off.', 'Land quiet, hips back.', 'Knees over toes.'],
    ['Box too high.', 'Landing stiff-legged.', 'Knees caving in.']),
  { easier: 'box-jump', harder: 'depth-jump' }),
x('depth-jump', 'Depth Jump', 'power', 'jump', false, 3, [['box']], 'Step off a low box, land, and jump up immediately.',
  h('The highest-intensity reactive jump: land and rebound as fast as possible.',
    ['Stand on a low box (12–18 in).', 'Step off and land on both feet.', 'Jump straight up as fast and high as you can, spending as little time on the ground as possible. Land and reset.'],
    ['Short ground contact.', 'Step off, don\'t jump off.', 'Full rest between reps.'],
    ['Box too high.', 'Sinking deep on the landing.', 'Doing too many reps.']),
  { easier: 'depth-drop' }),
x('seated-box-jump', 'Seated Box Jump', 'power', 'jump', false, 2, [['box', 'bench']], 'Sit on a bench, then jump from seated onto a box.',
  h('Jump power from a dead stop, with no bounce to help.',
    ['Sit on a bench facing a box, feet flat.', 'Swing your arms back and jump from seated onto the box.', 'Land softly and step down.'],
    ['Explode from the seat.', 'Arms help.', 'Land soft.'],
    ['Rocking forward to build momentum.', 'Box too high.', 'Jumping down off the box.']),
  { easier: 'box-jump' }),
x('continuous-broad-jump', 'Continuous Broad Jumps', 'power', 'jump', false, 2, NONE, '3 broad jumps in a row, quick between jumps.',
  h('Horizontal power linked jump to jump.',
    ['Stand with feet hip-width.', 'Do a broad jump, land, and go straight into the next one.', 'After the third jump, stick the landing.'],
    ['Quick between jumps.', 'Arms swing every jump.', 'Stick the last one.'],
    ['Long pauses between jumps.', 'Landing with knees caving.', 'Losing control on the last jump.']),
  { easier: 'broad-jump' }),

// ---------- Throws ----------
x('mb-scoop-toss', 'Med Ball Scoop Toss', 'power', 'throw', true, 1, [['med-ball']], 'Hinge with the ball low, drive the hips, throw up and forward.',
  h('Teaches the hip drive behind cleans and jumps, with no bar.',
    ['Hold a med ball between your legs, hinge with a flat back.', 'Drive your hips forward and extend fast.', 'Throw the ball up and forward as far as you can.'],
    ['Hips drive the throw.', 'Arms stay long.', 'Full extension.'],
    ['Throwing with the arms.', 'Rounding the back.', 'Ball too heavy to throw fast.']),
  { harder: 'jump-shrug' }),
x('mb-step-overhead-throw', 'Med Ball Step-In Overhead Throw', 'power', 'throw', true, 1, [['med-ball']], 'Step in, ball overhead, throw down and forward hard.',
  h('Overhead power linked from the legs through the trunk.',
    ['Hold a med ball overhead facing a wall or open space.', 'Step forward and throw the ball hard at the wall or ground ahead.', 'Reset and alternate the stepping leg.'],
    ['Step and throw together.', 'Whole body, not just arms.', 'Throw hard every rep.'],
    ['Arching the back hard.', 'Throwing only with the arms.', 'Ball too heavy.']),
  { easier: 'mb-overhead', harder: 'db-push-press' }),
x('mb-backward-toss', 'Med Ball Backward Overhead Toss', 'power', 'throw', true, 1, [['med-ball']], 'Squat with the ball low, jump, and throw it back over your head.',
  h('Full-body power through hips, knees, and ankles.',
    ['Face away from open space, holding a med ball at your waist.', 'Squat down slightly with the ball between your knees.', 'Explode up and throw the ball back over your head as far as you can.'],
    ['Legs drive the throw.', 'Arms stay long.', 'Check behind you first.'],
    ['Throwing with the arms.', 'No clear space behind.', 'Rounding the back.']),
  { easier: 'mb-scoop-toss', harder: 'db-hang-snatch' }),

// ---------- Squat ----------
x('pause-back-squat', 'Pause Back Squat', 'lower', 'squat', true, 2, [['barbell']], 'Squat down, pause 2 seconds at the bottom, drive up.',
  h('Builds strength and control in the bottom of the squat.',
    ['Set up like a back squat with safeties set.', 'Squat to your normal depth and hold for 2 seconds, staying tight.', 'Drive up hard.'],
    ['Stay braced in the pause.', 'Don\'t relax at the bottom.', 'Drive up fast.'],
    ['Losing tightness in the pause.', 'Bouncing out of the hole.', 'Going too heavy.']),
  { easier: 'goblet-squat', harder: 'back-squat' }),
x('box-squat', 'Box Squat', 'lower', 'squat', true, 2, [['barbell', 'box'], ['barbell', 'bench']], 'Sit back to the box, stay tight, drive up.',
  h('A squat with a set depth that teaches sitting back and driving up.',
    ['Set a box or bench so your thighs are about parallel when seated.', 'With the bar on your back, sit back until you touch the box without relaxing.', 'Drive up hard.'],
    ['Touch, don\'t sit and relax.', 'Shins near vertical.', 'Brace the whole time.'],
    ['Dropping onto the box.', 'Rocking to stand.', 'Box too low.']),
  { easier: 'goblet-box-squat', harder: 'back-squat' }),
x('ssb-squat', 'Safety Bar Squat', 'lower', 'squat', true, 2, [['ssb']], 'Hands on the handles, chest up, sit down between your hips.',
  h('Heavy squatting with the arms in front, easier on the shoulders.',
    ['Set the safety squat bar on your upper back with the handles in front. Set safeties.', 'Hold the handles, brace, and squat to depth.', 'Drive up, keeping your chest tall.'],
    ['Push your upper back into the pad.', 'Chest up.', 'Knees out.'],
    ['Folding forward.', 'Losing brace at the bottom.', 'Squatting without safeties.']),
  { easier: 'goblet-squat', harder: 'back-squat' }),
x('heels-elevated-goblet', 'Heels-Elevated Goblet Squat', 'lower', 'squat', true, 1, [['dumbbells'], ['kettlebells']], 'Heels on a small plate, weight at the chest, sit straight down.',
  h('A more upright squat that makes depth easier to reach.',
    ['Stand with your heels on a small plate or wedge, holding a weight at your chest.', 'Sit straight down between your hips, knees forward over your toes.', 'Stand up tall.'],
    ['Upright chest.', 'Knees travel forward.', 'Full depth.'],
    ['Heels too high.', 'Knees caving.', 'Rushing.']),
  { easier: 'bodyweight-squat', harder: 'goblet-squat' }),

// ---------- Single-leg ----------
x('ffe-split-squat', 'Front-Foot Elevated Split Squat', 'lower', 'single-leg', true, 1, [['dumbbells', 'box'], ['box']], 'Front foot on a low step, drop the back knee straight down.',
  h('Single-leg strength with an easier balance demand than the rear-foot version.',
    ['Put your front foot on a low step (2–4 in), back foot on the floor behind you.', 'Lower straight down until your back knee nearly touches the floor.', 'Drive through the front foot to stand.'],
    ['Torso tall.', 'Front knee over the middle of the foot.', 'Control the lowering.'],
    ['Stance too short.', 'Front knee caving.', 'Pushing off the back foot.']),
  { easier: 'reverse-lunge', harder: 'split-squat' }),
x('lateral-squat', 'Lateral Squat', 'lower', 'single-leg', true, 2, [['dumbbells'], ['kettlebells'], []], 'Wide stance, sit deep into one hip, other leg straight.',
  h('Strength in deep side-to-side positions.',
    ['Stand very wide, toes slightly out, holding a weight at your chest (or no weight).', 'Sit deep into one hip, keeping the other leg straight and foot flat.', 'Push back to center and switch sides.'],
    ['Sit back into the hip.', 'Whole foot down.', 'Chest up.'],
    ['Heel lifting on the working side.', 'Knee caving.', 'Rounding the back.']),
  { easier: 'lateral-lunge' }),
x('skater-squat', 'Skater Squat', 'lower', 'single-leg', false, 2, [[], ['dumbbells']], 'On one leg, lower the back knee to a pad, stand up.',
  h('Single-leg strength and balance through a full range.',
    ['Stand on one leg with a pad or folded mat behind you.', 'Bend the standing knee and reach your arms forward as you lower your back knee to the pad.', 'Stand back up without touching down the free foot.'],
    ['Slow lowering.', 'Knee over toes.', 'Arms forward for balance.'],
    ['Dropping onto the pad.', 'Knee caving.', 'Pushing off the free foot.']),
  { easier: 'ffe-split-squat' }),
x('lateral-step-up', 'Lateral Step-Up', 'lower', 'single-leg', true, 1, [['dumbbells', 'box'], ['box']], 'Stand beside the box, step up sideways, drive through the top foot.',
  h('Single-leg strength in a side-on position.',
    ['Stand beside a box with your near foot on it.', 'Drive through that foot to stand on the box, bringing the other foot up.', 'Lower slowly on the same side.'],
    ['Top foot does the work.', 'Knee over toes.', 'Slow lowering.'],
    ['Pushing off the floor foot.', 'Knee caving.', 'Box too high.']),
  { harder: 'step-up' }),
x('single-leg-box-squat', 'Single-Leg Box Squat', 'lower', 'single-leg', true, 2, [['box'], ['bench']], 'On one leg, sit back to a box and stand up.',
  h('Single-leg strength with a set depth target.',
    ['Stand on one leg in front of a box or bench.', 'Reach your arms forward and sit back until you lightly touch the box.', 'Stand back up on the same leg.'],
    ['Touch, don\'t sit.', 'Knee over toes.', 'Slow down, strong up.'],
    ['Dropping onto the box.', 'Knee caving.', 'Box too low.']),
  { easier: 'step-up', harder: 'skater-squat' }),
x('bb-reverse-lunge', 'Barbell Reverse Lunge', 'lower', 'single-leg', true, 2, [['barbell']], 'Bar on the back, step back, drop the knee, drive up.',
  h('Heavier single-leg strength with a barbell.',
    ['Set the bar on your upper back as for a squat.', 'Step back and lower until your back knee nearly touches the floor.', 'Drive through the front foot to return.'],
    ['Torso tall.', 'Front foot does the work.', 'Controlled step.'],
    ['Wobbling the bar.', 'Short steps.', 'Front knee caving.']),
  { easier: 'reverse-lunge' }),

// ---------- Posterior chain ----------
x('bb-good-morning', 'Barbell Good Morning', 'lower', 'hinge', true, 2, [['barbell']], 'Bar on the back, soft knees, push hips back, flat back.',
  h('Hamstring and back strength in a long hinge.',
    ['Set a light bar on your upper back.', 'With soft knees, push your hips back and lower your chest until you feel your hamstrings.', 'Squeeze your glutes to stand.'],
    ['Flat back.', 'Hips back, not down.', 'Light load.'],
    ['Rounding the back.', 'Going too heavy.', 'Squatting instead of hinging.']),
  { easier: 'band-good-morning' }),
x('back-extension', '45° Back Extension', 'lower', 'hinge', true, 1, [['ghd']], 'Hips on the pad, hinge down, squeeze glutes to rise.',
  h('Back, glute, and hamstring endurance.',
    ['Set the pad just below your hip bones, feet secured.', 'Hinge down with a flat back.', 'Squeeze your glutes to rise until your body is straight. Hold a plate for load when ready.'],
    ['Hinge at the hips.', 'Squeeze at the top.', 'Don\'t overextend.'],
    ['Arching past straight at the top.', 'Rounding the back.', 'Swinging.']),
  { easier: 'glute-bridge', harder: 'ghr' }),
x('ghr', 'Glute-Ham Raise', 'lower', 'hinge', false, 2, [['ghd']], 'Knees on the pad, lower under control, curl back up.',
  h('Builds strong hamstrings through knee bending and hip extension.',
    ['Set your knees just behind the pad and feet secured on the GHD.', 'Start upright, then lower your body forward under control, hips straight.', 'Pull with your hamstrings to curl back up. Use your hands to help at first.'],
    ['Hips stay straight.', 'Slow lowering.', 'Hands can assist.'],
    ['Bending at the hips.', 'Dropping fast.', 'Arching the lower back.']),
  { easier: 'slider-ham-curl', harder: 'nordic' }),
x('slider-ham-curl', 'Slider Hamstring Curl', 'lower', 'hinge', false, 1, [['sliders'], []], 'Hips up, slide heels out slowly, pull them back in.',
  h('Hamstring strength with no machine.',
    ['Lie on your back, heels on sliders (or towels on a smooth floor), knees bent.', 'Lift your hips into a bridge.', 'Slide your heels out slowly until your legs are nearly straight, then pull them back in, hips up.'],
    ['Hips stay up.', 'Slow out.', 'Squeeze to pull in.'],
    ['Hips dropping.', 'Rushing out.', 'Arching the back.']),
  { easier: 'glute-bridge', harder: 'ghr' }),
x('sl-hip-thrust', 'Single-Leg Hip Thrust', 'lower', 'hinge', false, 1, [['bench']], 'Upper back on the bench, one foot down, drive the hips up.',
  h('Single-leg glute strength.',
    ['Sit with your upper back against a bench, one foot flat, the other leg lifted.', 'Drive through the heel to lift your hips until your body is flat.', 'Lower under control. Switch legs.'],
    ['Hips level.', 'Ribs down.', 'Squeeze at the top.'],
    ['Hips tilting.', 'Arching the back.', 'Pushing through the toes.']),
  { easier: 'glute-bridge', harder: 'hip-thrust' }),
x('kb-deadlift', 'Kettlebell Deadlift', 'lower', 'hinge', true, 1, [['kettlebells'], ['dumbbells']], 'Weight between your feet, hips back, stand tall.',
  h('Teaches the deadlift pattern with a simple setup.',
    ['Stand with a kettlebell between your feet.', 'Push your hips back, bend your knees, and grip the handle with a flat back.', 'Stand tall, pushing the floor away.'],
    ['Hips back.', 'Flat back.', 'Stand tall.'],
    ['Rounding the back.', 'Squatting the weight up.', 'Leaning back at the top.']),
  { easier: 'glute-bridge', harder: 'trap-bar-deadlift' }),

// ---------- Push ----------
x('incline-bench', 'Incline Bench Press', 'upper', 'h-push', true, 2, [['barbell', 'bench']], 'Low incline, bar to the upper chest, press up and back.',
  h('Pressing strength for the upper chest and shoulders.',
    ['Set a bench to a low incline (about 30 degrees) under a rack. Set safeties or use a spotter.', 'Lower the bar to your upper chest under control.', 'Press up and slightly back to lockout.'],
    ['Shoulder blades pinned.', 'Feet planted.', 'Controlled lowering.'],
    ['Bench too steep.', 'Bouncing off the chest.', 'Pressing without safeties or a spotter.']),
  { easier: 'db-incline-press' }),
x('close-grip-bench', 'Close-Grip Bench Press', 'upper', 'h-push', true, 2, [['barbell', 'bench']], 'Hands shoulder-width, elbows tucked, bar to the lower chest.',
  h('Pressing strength with extra triceps work.',
    ['Lie under the bar with hands about shoulder-width. Set safeties or use a spotter.', 'Lower the bar to your lower chest, elbows close to your sides.', 'Press to lockout.'],
    ['Elbows tucked.', 'Wrists straight.', 'Controlled lowering.'],
    ['Grip too narrow.', 'Flaring the elbows.', 'Pressing without safeties or a spotter.']),
  { easier: 'db-bench' }),
x('push-up-plus', 'Push-Up Plus', 'prehab', 'shoulder-care', false, 1, NONE, 'At the top of a push-up, push the floor away a little more.',
  h('Works the muscles that move the shoulder blades around the ribs.',
    ['Start at the top of a push-up (or on knees).', 'Do a push-up.', 'At the top, push the floor away so your upper back rounds slightly, then relax back.'],
    ['Straight body.', 'Push the floor away at the top.', 'Slow.'],
    ['Sagging hips.', 'Shrugging.', 'Rushing the "plus."']),
  { easier: 'scap-pushup' }),

// ---------- Pull ----------
x('chin-up', 'Chin-Up', 'upper', 'v-pull', false, 2, [['pullup-bar']], 'Palms facing you, full hang, chin over the bar.',
  h('Vertical pulling strength for the back and arms.',
    ['Hang from a bar with palms facing you, hands shoulder-width.', 'Pull until your chin clears the bar.', 'Lower to a full hang. Use a band if needed.'],
    ['Shoulders down first.', 'Chest to the bar.', 'Full hang each rep.'],
    ['Half reps.', 'Kicking.', 'Dropping fast.']),
  { easier: 'assisted-pullup', harder: 'weighted-pullup' }),
x('weighted-pullup', 'Weighted Pull-Up', 'upper', 'v-pull', true, 3, [['pullup-bar', 'dumbbells']], 'Weight between the feet or on a belt, strict reps.',
  h('Heavier vertical pulling for athletes who own the pull-up.',
    ['Hold a dumbbell between your feet or use a dip belt.', 'From a full hang, pull until your chin clears the bar.', 'Lower to a full hang under control.'],
    ['Strict reps only.', 'Full range.', 'Add load slowly.'],
    ['Kipping or swinging.', 'Half reps.', 'Too much weight.']),
  { easier: 'pullup' }),
x('ring-row', 'Ring Row', 'upper', 'h-pull', false, 1, [['suspension']], 'Body straight, pull your chest to the handles.',
  h('Horizontal pulling where body angle sets the difficulty.',
    ['Hold the rings or straps and lean back with straight arms, body in a line.', 'Pull your chest to your hands, squeezing your shoulder blades.', 'Lower slowly. Walk your feet forward to make it harder.'],
    ['Straight body.', 'Squeeze at the top.', 'Slow lowering.'],
    ['Hips sagging.', 'Shrugging.', 'Pulling only to half range.']),
  { easier: 'doorframe-row', harder: 'inverted-row' }),
x('single-arm-cable-row', 'Half-Kneeling Single-Arm Cable Row', 'upper', 'h-pull', true, 1, [['cable'], ['bands']], 'Half-kneeling, pull the elbow back, no twisting.',
  h('Single-arm pulling with trunk control.',
    ['Kneel on one knee facing the cable (or band), holding the handle with the opposite hand.', 'Pull your elbow back toward your hip without rotating.', 'Return slowly.'],
    ['Torso stays square.', 'Elbow to hip.', 'Slow return.'],
    ['Twisting.', 'Shrugging.', 'Leaning back.']),
  { easier: 'band-row', harder: 'db-row' }),
x('half-kneeling-pulldown', 'Half-Kneeling Single-Arm Pulldown', 'upper', 'v-pull', true, 1, [['cable'], ['bands']], 'Half-kneeling, pull the elbow down to your ribs.',
  h('Single-arm lat strength with the trunk held still.',
    ['Kneel on one knee under a high cable (or band), holding the handle overhead.', 'Pull your elbow down to your ribs.', 'Return slowly to a full reach.'],
    ['Ribs down.', 'Elbow to ribs.', 'Full reach.'],
    ['Leaning to the side.', 'Shrugging.', 'Short range.']),
  { easier: 'band-pulldown', harder: 'lat-pulldown' }),

// ---------- Core ----------
x('landmine-rotation', 'Landmine Rotation', 'core', 'core-rot', true, 2, [['barbell']], 'Arms long, rotate the bar side to side from the hips.',
  h('Rotational strength through the hips and trunk.',
    ['Anchor one end of a barbell in a landmine or corner. Hold the other end at chest height, arms long.', 'Rotate the bar down toward one hip, pivoting your feet.', 'Rotate across to the other side.'],
    ['Turn from the hips.', 'Arms long.', 'Controlled.'],
    ['Twisting only at the lower back.', 'Bending the arms.', 'Going too heavy.']),
  { easier: 'pallof' }),
x('body-saw', 'Body Saw', 'core', 'core-ext', false, 2, [['sliders']], 'Forearm plank on sliders, rock back and forward.',
  h('Anti-extension strength that builds toward the ab wheel.',
    ['Get into a forearm plank with your feet on sliders.', 'Push your body back a few inches, keeping a straight line.', 'Pull back to the start.'],
    ['Ribs down.', 'Straight line.', 'Small range first.'],
    ['Hips sagging.', 'Going too far.', 'Holding your breath.']),
  { easier: 'plank', harder: 'ab-rollout' }),
x('overhead-carry', 'Single-Arm Overhead Carry', 'core', 'carry', true, 2, [['kettlebells'], ['dumbbells']], 'Weight locked out overhead, walk tall.',
  h('Shoulder stability and trunk control.',
    ['Press one weight overhead and lock your arm out, biceps by your ear.', 'Walk tall for the distance.', 'Switch hands.'],
    ['Arm locked.', 'Ribs down.', 'Slow steps.'],
    ['Arching the back.', 'Bent elbow.', 'Leaning to the side.']),
  { easier: 'suitcase-carry' }),
x('short-lever-copenhagen', 'Short-Lever Copenhagen', 'prehab', 'knee-care', false, 1, [['bench']], 'Side plank with the top knee on the bench, lift the hips.',
  h('Inner-thigh strength, an easier version of the Copenhagen plank.',
    ['Lie on your side with your top knee on a bench, bottom leg underneath.', 'Lift your hips into a straight side plank, supported by your forearm and top knee.', 'Hold, then switch sides.'],
    ['Straight line.', 'Hips high.', 'Breathe.'],
    ['Hips sagging.', 'Rolling forward.', 'Holding your breath.']),
  { easier: 'side-plank', harder: 'copenhagen' }),

// ---------- Durability ----------
x('side-lying-er', 'Side-Lying External Rotation', 'prehab', 'shoulder-care', true, 1, [['dumbbells']], 'Elbow on a towel at your side, rotate the weight up slowly.',
  h('Isolates the rotator cuff muscles that turn the arm out.',
    ['Lie on your side with a small towel under your top elbow, elbow bent 90 degrees.', 'Holding a light dumbbell, rotate your forearm up toward the ceiling.', 'Lower slowly.'],
    ['Elbow stays on the towel.', 'Light weight.', 'Slow lowering.'],
    ['Going too heavy.', 'Elbow drifting.', 'Rolling the body back.'])),
x('er-90-90-iso', '90/90 External Rotation Hold', 'prehab', 'shoulder-care', false, 1, [['bands'], ['cable']], 'Arm out at 90/90, hold against the band.',
  h('Builds strength in the overhead position the shoulder uses to hit and serve.',
    ['Anchor a band in front of you at shoulder height.', 'Raise your arm out to the side with the elbow at shoulder height and bent 90 degrees, forearm up.', 'Hold that position against the band\'s pull.'],
    ['Elbow at shoulder height.', 'Forearm vertical.', 'Steady hold, about 70% effort.'],
    ['Elbow dropping.', 'Shrugging.', 'Band too heavy.'])),
x('wall-slide', 'Wall Slide', 'prehab', 'shoulder-care', false, 1, NONE, 'Forearms on the wall, slide up into a Y, slide down.',
  h('Shoulder blade movement for reaching overhead.',
    ['Stand facing a wall, forearms on it in a "W."', 'Slide your arms up into a "Y," keeping forearms on the wall.', 'Slide back down, pulling your shoulder blades down.'],
    ['Ribs down.', 'Forearms stay on the wall.', 'Slow.'],
    ['Shrugging.', 'Arching the lower back.', 'Rushing.']),
  { harder: 'ytw' }),
x('reverse-nordic', 'Reverse Nordic', 'prehab', 'knee-care', false, 2, NONE, 'Kneel tall, lean back slowly from the knees, return.',
  h('Builds quad strength in a lengthened position.',
    ['Kneel tall on a pad, body straight from knees to head.', 'Lean back slowly from the knees, keeping hips straight, as far as you can control.', 'Return to tall kneeling.'],
    ['Hips stay straight.', 'Small range first.', 'Slow.'],
    ['Bending at the hips.', 'Going too far.', 'Dropping back.']),
  { easier: 'spanish-squat' }),
x('peterson-step-up', 'Peterson Step-Up', 'prehab', 'knee-care', false, 1, [['box'], ['dumbbells', 'box']], 'Low step, heel lifted, knee forward over the toes, stand up.',
  h('Builds quad strength over the knee with a short range.',
    ['Stand on a low step (4–6 in) with one foot, heel slightly raised.', 'Drive the knee forward over your toes and straighten that leg to lift your body.', 'Lower the other heel to the floor slowly.'],
    ['Knee travels forward.', 'Heel stays up.', 'Slow lowering.'],
    ['Step too high.', 'Pushing off the floor foot.', 'Knee caving.']),
  { harder: 'reverse-nordic' }),
x('iso-split-squat', 'Isometric Split Squat', 'prehab', 'knee-care', false, 1, [[], ['dumbbells']], 'Split stance, hold halfway down, steady.',
  h('A steady hold that builds leg strength in one position.',
    ['Take a split stance.', 'Lower until your front thigh is about halfway to parallel.', 'Hold, then switch sides.'],
    ['Torso tall.', 'Front knee over toes.', 'Steady breathing.'],
    ['Leaning forward.', 'Knee caving.', 'Holding your breath.']),
  { easier: 'wall-sit', harder: 'spanish-squat' }),
x('soleus-calf-raise', 'Bent-Knee Calf Raise', 'prehab', 'ankle-care', true, 1, [[], ['dumbbells']], 'Knees bent, rise onto your toes, slow down.',
  h('Works the lower calf with the knee bent.',
    ['Stand with knees slightly bent, holding a weight if needed.', 'Keeping the knee bend, rise as high onto your toes as you can.', 'Lower slowly.'],
    ['Knees stay bent.', 'Full range.', 'Slow lowering.'],
    ['Straightening the knees.', 'Bouncing.', 'Half reps.']),
  { harder: 'calf-raise' }),
x('band-lateral-walk', 'Band Lateral Walk', 'prehab', 'knee-care', false, 1, [['bands']], 'Band above the knees, quarter squat, step sideways.',
  h('Wakes up the side-hip muscles before lower-body work.',
    ['Put a small band just above your knees or around your ankles.', 'Get into a quarter squat.', 'Step sideways, keeping tension on the band, then go back.'],
    ['Stay low.', 'Knees out.', 'Small steps.'],
    ['Standing up tall.', 'Knees caving.', 'Feet coming together.'])),

// ---------- Movement prep ----------
x('a-skip', 'A-Skip', 'prehab', 'mobility', false, 1, NONE, 'Skip with a high knee, foot strikes under your hip.',
  h('Rhythm and posture for running and jumping.',
    ['Skip forward, driving one knee up to hip height.', 'Bring the foot down under your hip.', 'Opposite arm swings with each knee.'],
    ['Tall posture.', 'Quick, light contacts.', 'Arms match legs.'],
    ['Leaning back.', 'Reaching the foot out front.', 'Flat-footed landings.']),
  { easier: 'high-knees' }),
x('lateral-shuffle', 'Lateral Shuffle', 'prehab', 'mobility', false, 1, NONE, 'Athletic stance, shuffle sideways without crossing your feet.',
  h('Warms up side-to-side movement.',
    ['Get into an athletic stance.', 'Shuffle sideways, feet never crossing.', 'Go back the other way.'],
    ['Stay low.', 'Push off the trail leg.', 'Chest up.'],
    ['Standing up tall.', 'Feet crossing.', 'Bouncing up and down.'])),
x('carioca', 'Carioca', 'prehab', 'mobility', false, 1, NONE, 'Move sideways, crossing the trail leg in front and behind.',
  h('Hip rotation and footwork for warming up.',
    ['Move sideways, crossing your trail foot in front of the lead foot.', 'Then cross it behind.', 'Rotate your hips with each step. Go back the other way.'],
    ['Hips turn.', 'Shoulders stay square.', 'Light feet.'],
    ['Stiff hips.', 'Tripping over the feet.', 'Rushing before it\'s smooth.'])),
x('high-knees', 'High Knees', 'prehab', 'mobility', false, 1, NONE, 'Quick steps, knees to hip height, tall posture.',
  h('Raises heart rate and warms up the hips.',
    ['Run in place or forward, driving your knees to hip height.', 'Land on the balls of your feet.', 'Swing your arms.'],
    ['Tall posture.', 'Quick feet.', 'Arms working.'],
    ['Leaning back.', 'Heels slamming.', 'Knees low.']),
  { harder: 'a-skip' }),
x('walking-knee-hug', 'Walking Knee Hug', 'prehab', 'mobility', false, 1, NONE, 'Step, pull one knee to your chest, rise on the toes.',
  h('Opens the hips and glutes while warming up.',
    ['Step forward and pull one knee to your chest with both hands.', 'Rise onto the toes of the standing leg.', 'Step down and switch.'],
    ['Stand tall.', 'Rise on the toes.', 'Smooth steps.'],
    ['Rounding the back.', 'Rushing.', 'Losing balance.'])),
x('walking-quad-stretch', 'Walking Quad Stretch', 'prehab', 'mobility', false, 1, NONE, 'Step, pull one heel to your glute, reach the other arm up.',
  h('Opens the front of the thigh and hip while warming up.',
    ['Step forward and pull one heel toward your glute.', 'Reach the opposite arm up.', 'Step down and switch.'],
    ['Knee points down.', 'Stand tall.', 'Squeeze the glute.'],
    ['Arching the back.', 'Knee flaring out.', 'Rushing.'])),
```

## 5. Tier list additions (for `rest-and-supersets.md` §7)
- **P:** all 10 power, 11 plyometrics, 3 throws.
- **A:** `pause-back-squat`, `box-squat`, `ssb-squat`, `incline-bench`, `close-grip-bench`.
- **B:** `heels-elevated-goblet`, `ffe-split-squat`, `lateral-squat`, `skater-squat`, `lateral-step-up`, `single-leg-box-squat`, `bb-reverse-lunge`, `bb-good-morning`, `ghr`, `sl-hip-thrust`, `kb-deadlift`, `chin-up`, `weighted-pullup`, `ring-row`, `single-arm-cable-row`.
- **C:** `back-extension`, `slider-ham-curl`, `half-kneeling-pulldown`, `landmine-rotation`, `body-saw`, `overhead-carry`, `short-lever-copenhagen`, `reverse-nordic`, `peterson-step-up`, `iso-split-squat`, `soleus-calf-raise`.
- **D:** `push-up-plus`, `side-lying-er`, `er-90-90-iso`, `wall-slide`, `band-lateral-walk`, and the 6 movement-prep drills.
Also: the general library's `leg-swings`, `arm-circles`, `inchworm`, `db-incline-press`, `chest-supported-row`, `barbell-row`, `rear-delt-fly` are used by volleyball programs and warm-ups, so their `scope` is `'all'` (only the 7 cardio items stay `'general'`).

## 6. Items for CSCS review [CSCS]
1. **Level placements** of the Olympic derivatives (L2: hang high pull, jump shrug, clean pull, push press, DB snatch; L3: power clean, push jerk, hang power snatch).
2. **Depth jump (L3)** and **depth drop (L2)** with a 12–18 in box: this reverses the old "no depth jumps for minors without review" rule for Approach programs.
3. Lateral hurdle hops and single-leg hop-and-stick at L3.
4. Reverse Nordic at L2.

## 7. Acceptance criteria (for Product)
- [ ] All 66 exercises present with the tags in §3; claim-word search clean; no duplicate ids with the existing 113.
- [ ] 5 equipment items added; "Full weight room" preset includes sliders and hurdles only.
- [ ] Existing exercises' `easier`/`harder` links updated per §3.
- [ ] `pickExercise` no longer restricts the `olympic` pattern to level 3; a level 2 athlete can get Hang High Pull, never Hang Power Clean.
