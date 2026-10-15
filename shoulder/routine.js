/* Routine content. Edit this file to change exercises, doses, cues, or videos.
   The engine in index.html reads window.ROUTINE and never needs to change for content edits.

   Built for: right shoulder impingement (M75.41) + biceps tendonitis (M75.21) + calcific tendonitis (M75.31),
   pre-PT. Reconciled from three evidence reviews (rotator-cuff pain, calcific, long-head biceps) on 2026-10-15.
   Design rules that came out of that:
     - Loading (isometrics, light ER) is the evidence-backed core; stretching is secondary.
     - Nothing takes the arm behind the body or into outward rotation at the end of range (biceps groove).
     - Nothing lifts the arm past ~60° (calcium deposit sits under the acromion in the 60–120° arc).
     - Pain ≤3/10 during, no worse an hour later. A calcific flare suspends everything but pendulums.

   Step fields:
     id        stable key (completion and flags are stored by id — don't rename once in use)
     name, dose, video (YouTube id)
     mode      'hold'   → auto-cycling timer: hold `hold` sec, rest `rest` sec, `reps` times. rest:0 = metronome.
               'rounds' → `reps` rounds of `hold` sec (pendulum directions)
     roundNames / repNames   optional labels per round or rep
     setup / move / feel / avoid   guide text
     skipInFlare   true → hidden while Flare mode is on
     links     [[label, url], ...]
*/
window.ROUTINE = {
  title: "Shoulder routine",
  eyebrow: "Right shoulder · pre-PT",
  minutes: 14,
  perDay: "once a day; stretches may be repeated",
  intro: "Right shoulder: impingement, biceps tendon, and a calcium deposit in the cuff. The loading steps are what the evidence says helps; the stretches keep you moving. Warm up first with a warm shower or 5 minutes of walking. If the calcium is in its resorbing phase the shoulder can go from dull to severe in a day; that is expected, not damage. Use Flare mode.",
  clinic: { name: "Dr. Lanzi's office (Houston Methodist Ortho)", phone: "713-441-9000" },
  rules: [
    "Pain stays at 3/10 or lower during a step, and no worse an hour later. Log it after each session.",
    "Arm stays below shoulder height, and never behind the body. Overhead pinches the deposit; arm-back loads the biceps tendon.",
    "Skip: behind-the-back stretches, doorway or wall stretches with the arm back, sleeper stretch, weights beyond a soup can, sleeping on the right side. Sleep on your back or left side hugging a pillow, or with a folded towel under the right elbow.",
    "Progress only after three sessions in a row at 3/10 or lower and no worse the next morning: add one hold, 5 seconds to a hold, or one step of weight. Never two at once.",
    "A calcific flare is a step-change, not a gradual creep: pain at rest, every direction hurts, waking repeatedly. Night pain alone is not the signal; the step-change is.",
  ],
  stopRules: [
    "Sudden severe pain, often overnight, hurting at rest and in every direction: likely the calcium resorbing. Switch to Flare mode and call the clinic the same or next day. The worst usually lasts 1–2 weeks.",
    "ER or urgent care instead: fever or chills with a hot, red, swollen shoulder; cannot move the arm at all after a fall or jolt; pain uncontrolled by maximum over-the-counter doses.",
    "New numbness, tingling that doesn't fade, or weakness in the arm or hand: clinic within a day or two.",
    "Not clearly improving by 3 weeks, or worse again after week 2: clinic. Pain past 8 weeks: ask about ultrasound-guided lavage (barbotage) or shockwave; which one depends on whether the deposit is hard or soft on imaging.",
  ],
  flare: {
    name: "Flare mode: resorbing calcium",
    do: [
      "Stop every step except pendulums, and do those only if they ease the ache. Keep the elbow, wrist, and hand moving several times a day.",
      "Ice 15–20 minutes every 2–3 hours for the first 48–72 hours. No heat during a flare.",
      "Pain relief on a schedule, not just when desperate, if nothing in your history rules it out. Confirm doses with the clinic or pharmacist.",
      "Rest the arm slightly out from your side: hand on a chair back, or a pillow under the armpit. Sleep propped up or in a recliner, pillow under the right elbow, never on the right side.",
      "A sling or arm across the chest for comfort only, a few days at most.",
      "Call the clinic same or next day. A flare is when a bursal injection or lavage gets decided; don't wait two weeks.",
    ],
    back: "Return to the full routine when rest pain is gone and you can raise the arm to shoulder height at 3/10 or less for two days in a row.",
  },
  steps: [
    { id: "pendulum", name: "Pendulum swings", dose: "2 rounds × 45 sec",
      video: "QF_ubbr_RUE", mode: "rounds", hold: 45, reps: 2,
      roundNames: ["Circles, both directions", "Front to back"],
      setup: "Stand beside a table or counter. Put your LEFT hand on it and lean forward so your torso is roughly 45°. Let the right arm hang straight down under the shoulder, completely relaxed. Nothing in the hand.",
      move: "Shift your weight between your feet so the hanging arm swings on its own. Small circles one way, then the other. Then front to back, keeping the swing under the shoulder, not past the hip.",
      feel: "A light pull or 'opening' in the shoulder. The arm should feel heavy.",
      avoid: "Using the shoulder muscles to make the circles. Swinging big or fast. Holding a weight. Letting the arm drift behind your hip. Any pinch at the top or front of the shoulder.",
      links: [["Pendulum front to back · Ask Doctor Jo", "https://www.youtube.com/watch?v=2V1pBrtI4Zs"]] },

    { id: "scap", name: "Shoulder-blade squeezes", dose: "12 reps · hold 5 sec",
      video: "QN1oZVMMRjE", mode: "hold", hold: 5, rest: 3, reps: 12, skipInFlare: true,
      setup: "Sit or stand tall, chin level, arms hanging relaxed at your sides, palms facing your thighs.",
      move: "Draw both shoulder blades gently back and DOWN, as if tucking them into your back pockets. The blades move; the elbows stay where they hang and do not travel backward. Hold, then relax fully.",
      feel: "Muscles working between the shoulder blades and a slight opening across the chest.",
      avoid: "Shrugging toward the ears. Pulling the elbows back behind the body (that loads the biceps tendon). Arching the low back. Holding your breath.",
      links: [["Scapular squeeze · Hinge Health", "https://www.hingehealth.com/resources/articles/scapular-squeezes"]] },

    { id: "thor", name: "Thoracic extension over chair", dose: "10 slow reps · 2 sec pause",
      video: "kCoTeRB8c-g", mode: "hold", hold: 2, rest: 3, reps: 10, skipInFlare: true,
      setup: "Sit in a chair whose back ends around mid-shoulder-blade height. Cross your arms over your chest, hands on opposite shoulders. The video shows hands behind the head; that position is off for you, since it turns the right arm out at shoulder height and loads the biceps tendon.",
      move: "Lean back so your upper back arches over the top edge of the chair. Exhale as you go, pause, return. Scoot up or down a little to hit different levels.",
      feel: "A stretch across the upper back and front of the chest.",
      avoid: "Arching from the low back. Letting the head drop back. Hands behind the head. Any pain in the right shoulder.",
      links: [] },

    { id: "cross", name: "Cross-body stretch", dose: "2 × 30 sec · gentle",
      video: "TCDA6qCp1FU", mode: "hold", hold: 30, rest: 10, reps: 2, skipInFlare: true,
      setup: "Skip this step entirely if the shoulder has had any rest pain or woke you in the last 48 hours. Otherwise stand or sit tall and set your shoulder blades back and down first.",
      move: "Bring the right arm across your chest at chest height or lower. Hook the left hand just above the right elbow and pull gently, no more than a 2/10 stretch, toward the chest.",
      feel: "A mild stretch in the BACK of the right shoulder.",
      avoid: "Pain on TOP or at the FRONT of the shoulder instead of behind it (stop). Letting the right shoulder hike up or roll forward. Twisting the trunk. Pulling the arm above shoulder height. The sleeper stretch, if the video shows it.",
      links: [["Cross body stretch · Prehab Guys", "https://library.theprehabguys.com/vimeo-video/standing-shoulder-cross-body-stretch-posterior-cuff-2/"]] },

    { id: "door", name: "Supine chest opener", dose: "3 × 30 sec",
      video: "9RCQDYbkPkM", mode: "hold", hold: 30, rest: 10, reps: 3, skipInFlare: true,
      setup: "Lie on your back along a foam roller or a tightly rolled bath towel running down your spine, head and tailbone supported, knees bent, feet flat. Arms rest on the floor beside you, palms up, elbows slightly bent, about 45° out from your sides, well below shoulder height.",
      move: "Breathe out and let the chest soften toward the floor. Gravity does the work; don't press the arms down or reach them wider. If the right arm wants to float, slide a folded towel under the right forearm.",
      feel: "An opening across the front of the chest and under the collarbones, both sides evenly.",
      avoid: "Pain at the FRONT of the right shoulder where the biceps tendon runs (stop). Arms above the shoulder line or elbows behind the body. Turning the palm out further to get more. Any tingling in the hand. This replaces the doorway stretch, which pushes the arm back and out, exactly the position that loads a sore biceps tendon.",
      links: [["Why doorway stretches aggravate the biceps tendon · Stronger by Science", "https://www.strongerbyscience.com/biceps-tendinopathy/"]] },

    { id: "table", name: "Table slides", dose: "10 reps · 3 sec pause · low",
      video: "pgsPQ1_5e0w", mode: "hold", hold: 3, rest: 3, reps: 10, skipInFlare: true,
      setup: "Sit facing a table. Rest the right forearm on a towel, elbow bent, thumb pointing up. Chair height so the shoulder sits level and relaxed.",
      move: "Lean forward from the hips no more than about 30°, so the forearm never rises above roughly 60° from your side and the hand stays well below shoulder height. Slide only to the first hint of a pinch, pause, sit back. The video goes further than you should.",
      feel: "A gentle stretch at the end of the slide. Mild discomfort is okay; a pinch or sharp pain is not.",
      avoid: "Lifting the arm off the table. Leaning far enough that the hand nears shoulder height. Pushing past the first pinch. Shrugging.",
      links: [] },

    { id: "iso", name: "Isometric cuff holds", dose: "8 holds × 10 sec · 30% effort",
      video: "xZKlQlkAeZA", mode: "hold", hold: 10, rest: 8, reps: 8, skipInFlare: true,
      repNames: ["Outward 1", "Outward 2", "Outward 3", "Outward 4", "Sideways 1", "Sideways 2", "Sideways 3", "Sideways 4"],
      setup: "Stand side-on to a door frame. Right elbow bent 90° and tucked to your ribs with a rolled towel pinned between elbow and side.",
      move: "Holds 1–4: back of the right hand against the frame; press outward. Nothing moves. About 30% effort, a firm lean rather than a shove. Holds 5–8: turn so the outside of the elbow touches the frame and press the elbow sideways into it, same effort.",
      feel: "A deep, steady tightening at the back and outside of the shoulder. Pain stays at 3/10 or below and should stay flat or fade across the set, not climb.",
      avoid: "Shrugging. Holding your breath. Pushing hard. Any sharp or front-of-shoulder pain: stop for the day. This is the first loading rung; tell your PT you've been doing it.",
      links: [["Isometric ER at a wall", "https://www.youtube.com/watch?v=xZKlQlkAeZA"]] },

    { id: "biso", name: "Isometric biceps hold", dose: "4 holds × 20 sec · 30–40% effort",
      video: "LVpq6ww5m4c", mode: "hold", hold: 20, rest: 15, reps: 4, skipInFlare: true,
      setup: "Sit tall. Right elbow bent 90°, upper arm resting against your ribs or slightly in front of them, never behind. Palm up. Place the left hand on top of the right palm.",
      move: "Push the right palm up into the left hand. Nothing moves. About a third of your strength. Breathe normally through the hold.",
      feel: "The biceps working, maybe a mild ache at the front of the shoulder that stays at 3/10 or below and eases between holds.",
      avoid: "Twisting the forearm while pushing (keep the palm flat up). Letting the elbow drift behind the body. Pushing hard. If a hold raises pain, lower the effort, not the time; stop for the day if it stays above 3.",
      links: [["Proximal biceps tendinopathy exercises", "https://www.youtube.com/watch?v=rG6hFwdZVhg"]] },

    { id: "er", name: "Side-lying external rotation", dose: "10 reps · lower over 3 sec · no weight to start",
      video: "A1_3p0U96Kk", mode: "hold", hold: 4, rest: 0, reps: 10, skipInFlare: true,
      setup: "Lie on your LEFT side, head on a pillow. Right elbow bent 90°, rolled towel between elbow and ribs, hand resting on your belly. Start with no weight. Progress to a can of soup, then a 2–3 lb dumbbell, only after three clean sessions.",
      move: "Each beep: rotate the forearm up toward the ceiling as far as is pain-free, elbow glued to the towel, then lower slowly over 3 seconds. Rest 30 seconds and do a second set of 10.",
      feel: "Work at the back of the shoulder. The last reps should feel like effort.",
      avoid: "Elbow drifting away from the body. Rolling the trunk backward. Fast lowering. Pain above 3/10: drop the weight before dropping the exercise.",
      links: [["Side-lying ER · Prehab Guys", "https://library.theprehabguys.com/vimeo-video/side-lying-shoulder-external-rotation-band/"]] },
  ],
  optional: {
    name: "Dropped from the routine, and why",
    note: "Three reviews changed this routine on 2026-10-15. Chin tucks: no shoulder-pain evidence, time better spent on loading. Doorway chest stretch: arm back and turned out is the position that compresses the biceps tendon in its groove; replaced by the supine opener. Hands-behind-head during thoracic extension: same problem.",
    text: "Band rows (elbows stopping at the ribs, light band) are the next loading step after the isometrics feel easy. Add them only once three sessions in a row sit at 3/10 or lower, and show your PT first.",
  },
};
