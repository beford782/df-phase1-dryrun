/* General information and appointment preparation. Exercise choices and doses require clinician review. */
window.SHOULDER_GUIDE = {
  reviewDate: '2026-10-15',
  purpose: 'A guide for the week before your first physical therapy visit: stay comfortable, record changes, and prepare questions. The exercise library is for discussion with your clinician; it is not an approved home exercise plan.',
  referral: [
    'Right shoulder impingement syndrome (M75.41).',
    'Right biceps tendinitis (M75.21).',
    'Right shoulder calcific tendinitis (M75.31).',
    'The visible referral requests evaluation and treatment. It does not specify home exercises, doses, movement limits, or the stage of the calcium deposit.'
  ],
  safety: {
    urgent: [
      'Stop the routine and seek same-day medical advice for new severe or rapidly worsening pain, or if you cannot move your arm. Do not assume a sudden change is caused by the calcium deposit.',
      'Seek urgent assessment for persistent pins and needles, new numbness or weakness, a change in arm or shoulder shape, marked swelling, or an arm that feels unusually hot or cold.',
      'Seek urgent assessment if pain follows an injury, or your shoulder is hot, red or swollen and you feel feverish or unwell.',
      'Contact your clinic before the appointment if symptoms are worsening, sleep is repeatedly interrupted, or everyday activities become much harder.'
    ],
    emergency: [
      'Call 911 for shoulder or arm discomfort with chest pressure, shortness of breath, cold sweat, faintness, or pain spreading to the jaw or back.',
      'Call 911 for sudden arm weakness with face drooping or trouble speaking.'
    ]
  },
  comfort: [
    'Follow any instructions your treating clinician has already given you. Ask the clinic whether they want you to do any exercises before the first visit.',
    'Keep using the arm gently as symptoms allow. Pace tasks and adjust movements that make symptoms worse; avoid pushing through strong pain.',
    'Support the arm with a pillow when resting or sleeping if that feels more comfortable. Change position regularly.',
    'A wrapped heat or cold pack may help comfort. Protect your skin, follow the pack instructions, and stop if skin becomes painful or irritated. Ask your clinician first if sensation or circulation is reduced.',
    'Ask your clinician or pharmacist which pain relief is suitable for you, and follow the label and their advice.',
    'Record pain, sleep, and activities that are easier or harder. A low pain score alone does not establish that an exercise is suitable.',
    'Do not add resistance, repetitions, or longer holds based on a streak or a few comfortable sessions. Ask your therapist to set the plan.'
  ],
  sources: [
    { title: 'AAOS: Shoulder impingement and rotator cuff tendinitis', url: 'https://orthoinfo.aaos.org/en/diseases--conditions/shoulder-impingementrotator-cuff-tendinitis/' },
    { title: 'AAOS: Biceps tendinitis', url: 'https://orthoinfo.aaos.org/en/diseases--conditions/biceps-tendinitis/' },
    { title: 'NHS: Shoulder pain and when to seek help', url: 'https://www.nhs.uk/symptoms/shoulder-pain/' },
    { title: 'AAOS: Shoulder conditioning program (clinician-supervised)', url: 'https://orthoinfo.aaos.org/en/recovery/rotator-cuff-and-shoulder-conditioning-program/' },
    { title: 'Whittington Health NHS: Calcific tendinopathy', url: 'https://www.whittington.nhs.uk/mini-apps/leaflet/?id=501' },
    { title: 'American Heart Association: Heart attack warning signs', url: 'https://www.heart.org/en/health-topics/heart-attack/warning-signs-of-a-heart-attack' },
    { title: 'CDC: Signs and symptoms of stroke', url: 'https://www.cdc.gov/stroke/signs-symptoms/index.html' }
  ],
  questions: [
    'Which movements and exercises should I do before and after my first visit?',
    'For each approved exercise, what repetitions, hold time, rest, and frequency should I use?',
    'What discomfort is acceptable during exercise, later that day, and the next morning?',
    'Which symptoms should make me stop or call the clinic?',
    'Does the calcium deposit change my plan or require any further assessment?',
    'How should I adapt sleep, desk work, lifting, and daily activities?',
    'When and how should I increase exercise difficulty?',
    'What are our first goals, and when should we review progress?'
  ],
  exercises: [
    { id: 'pendulum', name: 'Pendulum swings', summary: 'A relaxed, supported shoulder movement to ask your clinician about.', cues: ['Support yourself with your other hand on a stable surface.', 'Let the affected arm hang relaxed.', 'Shift your body gently to create a small swing.'], caution: 'Do not force the swing or add weight. Stop if it causes pain, pinching, or dizziness.', kind: 'timed', candidateDose: 'Timing and directions to be set by your clinician.' },
    { id: 'scap', name: 'Shoulder-blade squeezes', summary: 'A gentle shoulder-blade movement to review with your therapist.', cues: ['Sit or stand comfortably with your arms relaxed.', 'Gently bring the shoulder blades toward each other.', 'Relax fully without forcing the position.'], caution: 'Avoid straining, shrugging, or holding your breath. Stop if shoulder symptoms increase.', kind: 'reps', candidateDose: 'Repetitions and hold time to be set by your clinician.' },
    { id: 'thor', name: 'Upper-back extension over a chair', summary: 'A supported upper-back movement that may need modification for your shoulder.', cues: ['Use a stable chair with a comfortable back edge.', 'Keep the arms in a comfortable supported position.', 'Gently extend the upper back, then return.'], caution: 'Have your therapist show a suitable position. Do not force your back or neck, or use a painful arm position.', kind: 'reps', candidateDose: 'Range, repetitions, and pauses to be set by your clinician.' },
    { id: 'cross', name: 'Cross-body stretch', summary: 'A shoulder stretch to check for suitability before trying.', cues: ['Keep the shoulder relaxed.', 'Bring the arm gently across the body.', 'Support the arm without pulling hard.'], caution: 'Do not force a stretch. Stop for pain at the front or top of the shoulder, pinching, or tingling.', kind: 'timed', candidateDose: 'Position, hold time, and repetitions to be set by your clinician.' },
    { id: 'door', name: 'Supported chest opener', summary: 'A supported resting stretch that requires a comfortable shoulder position.', cues: ['Lie with the head and trunk comfortably supported.', 'Support the arms on pillows or towels as needed.', 'Breathe normally and let the chest relax.'], caution: 'Ask your therapist to choose the support and arm position. Do not let gravity force the shoulder backward.', kind: 'timed', candidateDose: 'Support, arm position, and timing to be set by your clinician.' },
    { id: 'table', name: 'Table slides', summary: 'A supported arm movement with a range chosen by your therapist.', cues: ['Sit facing a stable table with the arm supported.', 'Slide the arm gently as your body leans forward.', 'Return without lifting or forcing the shoulder.'], caution: 'Use only the range your clinician recommends. Stop for pinching, sharp pain, or increased symptoms.', kind: 'reps', candidateDose: 'Range, repetitions, and pauses to be set by your clinician.' },
    { id: 'iso', name: 'Isometric shoulder holds', summary: 'A muscle contraction against support without moving the arm.', cues: ['Have your clinician show the arm and support position.', 'Press gently in the direction they demonstrate.', 'Keep the arm still and breathe normally.'], caution: 'The direction and effort matter. Do not begin resistance work until your clinician confirms it is appropriate.', kind: 'timed', candidateDose: 'Direction, effort, hold time, rest, and repetitions to be set by your clinician.' },
    { id: 'biso', name: 'Isometric biceps hold', summary: 'A biceps contraction without elbow movement, for clinician review.', cues: ['Support the upper arm in the position demonstrated.', 'Gently press against the support without moving the elbow.', 'Relax fully between efforts.'], caution: 'This loads the biceps tendon. Ask whether it belongs in your plan and stop if symptoms increase.', kind: 'timed', candidateDose: 'Position, effort, hold time, rest, and repetitions to be set by your clinician.' },
    { id: 'er', name: 'Side-lying external rotation', summary: 'A shoulder-strengthening movement to learn with your therapist.', cues: ['Lie on the other side with the head supported.', 'Keep the upper arm supported and elbow bent as demonstrated.', 'Rotate the forearm slowly through the recommended range.'], caution: 'Do not add a weight or push to end range without clinician guidance. Stop if shoulder symptoms increase.', kind: 'reps', candidateDose: 'Range, resistance, repetitions, and sets to be set by your clinician.' }
  ]
};
