/* Routine content. Edit this file to change exercises, doses, cues, or videos.
   The engine in index.html reads window.ROUTINE and never needs to change for content edits.

   Step fields:
     id        stable key (completion and flags are stored by id — don't rename once in use)
     name, dose
     video     YouTube video id
     mode      'hold'  → auto-cycling timer: hold `hold` sec, rest `rest` sec, repeat `reps` times
               'rounds'→ `reps` rounds of `hold` sec each (pendulum directions)
               'count' → rep counter only, with an optional `cadence` beep every N sec
     setup / move / feel / avoid   guide text
     links     [[label, url], ...] extra references
*/
window.ROUTINE = {
  title: "Stretch routine",
  eyebrow: "Right shoulder · pre-PT",
  minutes: 10,
  perDay: "1–2× a day",
  intro: "For right-shoulder impingement with biceps and calcific tendonitis. Warm up first: a warm shower or 5 minutes of walking. Heat is for before a session only, never on a shoulder that is flaring.",
  clinic: { name: "Dr. Lanzi's office (Houston Methodist Ortho)", phone: "713-441-9000" },
  rules: [
    "Pain stays at 3/10 or lower during a stretch, and no worse an hour later. Log it below each session.",
    "Arm stays below shoulder height. Overhead is what pinches.",
    "Skip: behind-the-back stretches, straight-arm-behind-you biceps stretches, sleeper stretch, weights, sleeping on the right side. Sleep on your back or left side hugging a pillow, or with a folded towel under the right elbow.",
    "Progress only after three sessions in a row at 3/10 or lower: add one set, or 10 seconds to a hold. Never both at once.",
  ],
  stopRules: [
    "Sudden severe pain, often at night: likely a calcific flare. Switch to Flare mode (pendulums only) and call the clinic.",
    "New numbness, tingling that doesn't fade, or weakness in the arm or hand.",
    "Fever, redness, or swelling at the shoulder.",
    "No improvement after two weeks, or steadily getting worse.",
  ],
  steps: [
    { id: "pendulum", name: "Pendulum swings", dose: "4 rounds × 45 sec: circles each way, front-to-back, side-to-side",
      video: "QF_ubbr_RUE", mode: "rounds", hold: 45, reps: 4,
      roundNames: ["Circles clockwise", "Circles counter-clockwise", "Front to back", "Side to side"],
      setup: "Stand beside a table or counter. Put your LEFT hand on it and lean forward so your torso is roughly 45°. Let the right arm hang straight down, completely relaxed. Nothing in the hand.",
      move: "Shift your weight between your feet so the hanging arm swings on its own. One direction per round.",
      feel: "A light pull or 'opening' in the shoulder. The arm should feel heavy.",
      avoid: "Using the shoulder muscles to make the circles. Swinging big or fast. Holding a weight. Any pinch at the top of the shoulder.",
      links: [["Pendulum front to back · Ask Doctor Jo", "https://www.youtube.com/watch?v=2V1pBrtI4Zs"]] },

    { id: "chin", name: "Chin tucks", dose: "10 reps · hold 3 sec",
      video: "ekJzJTnd43s", mode: "hold", hold: 3, rest: 2, reps: 10,
      setup: "Sit tall on a firm chair, feet flat, shoulders relaxed, eyes looking straight ahead.",
      move: "Glide the head straight back on the neck (make a double chin) without tipping the chin up or down. Hold, then release.",
      feel: "A gentle stretch at the base of the skull and work in the front of the neck.",
      avoid: "Nodding the chin to the chest. Jamming the head back hard. Rocking the upper body.",
      links: [] },

    { id: "scap", name: "Shoulder-blade squeezes", dose: "12 reps · hold 5 sec",
      video: "QN1oZVMMRjE", mode: "hold", hold: 5, rest: 3, reps: 12,
      setup: "Sit or stand tall, arms relaxed at your sides, palms facing forward.",
      move: "Draw both shoulder blades back and DOWN, as if tucking them into your back pockets. Hold, then relax fully.",
      feel: "Muscles working between the shoulder blades and a slight opening across the chest.",
      avoid: "Shrugging toward the ears. Arching the low back. Holding your breath.",
      links: [["Scapular squeeze · Hinge Health", "https://www.hingehealth.com/resources/articles/scapular-squeezes"]] },

    { id: "thor", name: "Thoracic extension over chair", dose: "10 slow reps · 2 sec pause",
      video: "kCoTeRB8c-g", mode: "hold", hold: 2, rest: 3, reps: 10,
      setup: "Sit in a chair whose back ends around mid-shoulder-blade height. Cross your arms over your chest, hands on opposite shoulders. (The video shows hands behind the head; that puts the right arm at shoulder height, so use it only if completely pain-free.)",
      move: "Lean back so your upper back arches over the top edge of the chair. Exhale as you go, pause, return. Scoot up or down a little to hit different levels.",
      feel: "A stretch across the upper back and front of the chest.",
      avoid: "Arching from the low back. Letting the head drop back. Any pain in the right shoulder.",
      links: [] },

    { id: "cross", name: "Cross-body stretch", dose: "3 × 30 sec",
      video: "TCDA6qCp1FU", mode: "hold", hold: 30, rest: 10, reps: 3,
      setup: "Stand or sit tall. Set your shoulder blades back and down first and keep them there.",
      move: "Bring the right arm across your chest at chest height or lower. Hook the left hand just above the right elbow and pull gently toward the chest.",
      feel: "A stretch in the BACK of the right shoulder.",
      avoid: "Pain on TOP of the shoulder instead of behind it (stop). Letting the right shoulder hike up or roll forward. Twisting the trunk. Pulling the arm above shoulder height. The sleeper stretch, if the video shows it.",
      links: [["Cross body stretch · Prehab Guys", "https://library.theprehabguys.com/vimeo-video/standing-shoulder-cross-body-stretch-posterior-cuff-2/"]] },

    { id: "door", name: "Low doorway chest stretch", dose: "3 × 30 sec",
      video: "069o76BafTk", mode: "hold", hold: 30, rest: 10, reps: 3,
      setup: "Stand in a doorway. Place the right forearm on the frame with the elbow BELOW shoulder height, hand about chest height. Right foot slightly forward. (Most demos show the elbow at shoulder height. Yours stays lower.)",
      move: "Shift your weight onto the front foot and turn your chest slightly away from the frame until you feel the stretch.",
      feel: "A stretch under the collarbone and in the front of the chest.",
      avoid: "Pain at the FRONT of the shoulder where the biceps tendon runs (stop). Raising the elbow to or above the shoulder. Leaning so far the shoulder rolls forward. Any tingling in the hand.",
      links: [["Pec minor doorway stretch · Prehab Guys", "https://library.theprehabguys.com/vimeo-video/pec-minor-stretch-doorway/"]] },

    { id: "table", name: "Table slides", dose: "10 reps · 3 sec pause",
      video: "pgsPQ1_5e0w", mode: "hold", hold: 3, rest: 3, reps: 10,
      setup: "Sit facing a table or sideways to it. Rest the right forearm on a towel, elbow bent, thumb pointing up. Chair height so the shoulder sits level and relaxed.",
      move: "Lean your trunk forward from the hips so the towel slides away from you; the arm just rides along. Slide only until the FIRST hint of a pinch, pause there, then sit back up. Don't chase full reach; the video goes further than you should.",
      feel: "A gentle stretch at the end of the slide. Mild discomfort is okay; a pinch or sharp pain is not.",
      avoid: "Lifting the arm off the table. Pushing past the first pinch. Shrugging the shoulder.",
      links: [] },
  ],
  optional: {
    name: "Optional: isometric cuff holds",
    note: "Confirm with your PT at the first visit before adding this. Standard pain-free loading for tendonitis.",
    text: "Elbow bent 90° at your side, a rolled towel between elbow and ribs. Press the back of the hand gently outward into a door frame (no movement), 5 holds × 10 sec at about 30% effort. Pain must stay at 3/10 or lower.",
  },
};
