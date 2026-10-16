/* Browser-local appointment notes and clinician-entered activity. */
(() => {
  'use strict';
  const G=window.SHOULDER_GUIDE, M=window.ShoulderModel, KEY='shoulder-guide-v3';
  const $=id=>document.getElementById(id), main=$('main');
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const uid=()=>crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2);
  const clone=v=>JSON.parse(JSON.stringify(v));
  let state, storageCorrupt=false, undo=null, interval=null, deadline=0, audio=null;
  function storageWarning(message){$('storage-warning').hidden=false;$('storage-warning').textContent=message;document.querySelector('.local-badge').textContent='Notes not saved';}
  try {
    const saved=localStorage.getItem(KEY);
    const parsed=saved?JSON.parse(saved):null;
    if(saved&&(!parsed||parsed.version!==3||!Array.isArray(parsed.sessions)||!parsed.days))throw Error('Unrecognized saved guide data');
    state=M.hydrate(parsed, saved?null:JSON.parse(localStorage.getItem('shoulder-routine-v2')||'null'));
  } catch(e){state=M.newState();storageCorrupt=true;storageWarning('Saved notes could not be read. The original data has been kept. Download your data in About before restoring a backup. New changes will only last while this page is open.');}
  function save(){
    if(storageCorrupt)return false;
    try{localStorage.setItem(KEY,JSON.stringify(state));$('storage-warning').hidden=true;document.querySelector('.local-badge').textContent='Saved on this device';return true;}
    catch(e){storageWarning('This browser could not save your notes. Keep this page open and download your PT summary before leaving.');return false;}
  }
  if(!storageCorrupt)save();
  function announce(t){$('announcement').textContent=t;}
  const exercise=id=>G.exercises.find(e=>e.id===id);
  const name=id=>exercise(id)?.name||id;
  const fmt=s=>Math.floor(s/60)+':'+String(s%60).padStart(2,'0');
  const pretty=d=>M.validDate(d)?new Date(d+'T12:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}):'Not set';
  const pval=v=>M.pain(v)===null?'not recorded':v+'/10';
  const list=items=>'<ul>'+items.map(s=>'<li>'+esc(s)+'</li>').join('')+'</ul>';
  function doseText(d){return `${d.sets} set${d.sets===1?'':'s'} × ${d.reps} ${d.mode==='hold'?'holds':'reps/rounds'} × ${d.seconds}s; ${d.rest}s between reps; ${d.setRest}s between sets${d.labels.length?'; directions: '+d.labels.join(' → '):''}`;}
  function heading(k,title,sub=''){return `<div class="page-heading"><div class="eyebrow">${esc(k)}</div><h1>${esc(title)}</h1>${sub?'<p>'+esc(sub)+'</p>':''}</div>`;}
  function safety(){return `<section class="warning safety" aria-label="When to seek help"><p><strong>New severe pain, inability to move, persistent tingling or numbness?</strong> Stop activity and seek urgent medical advice.</p><a href="#help">When to call &amp; urgent symptoms</a></section>`;}
  function btn(action,label,cls='',data=''){return `<button type="button" class="${cls}" data-action="${action}" ${data}>${esc(label)}</button>`;}
  function painScale(id,label,value,required=false){return `<fieldset data-pain="${id}"><legend>${esc(label)}${required?' (required)':''}</legend><input type="hidden" id="${id}" name="${id}" value="${M.pain(value)===null?'':value}"><div class="pain-scale">${Array.from({length:11},(_,n)=>`<button type="button" data-score="${n}" aria-label="${esc(label)}: ${n} out of 10" aria-pressed="${value===n}">${n}</button>`).join('')}</div><div class="scale-labels"><span>0 · No pain</span><span>10 · Worst imaginable</span></div>${!required?'<button type="button" class="text-link" data-clear-pain>Clear / not recorded</button>':''}</fieldset>`;}
  function readPain(id){const v=$(id)?.value;return v===''||v===undefined?null:M.pain(Number(v));}
  function showError(text){let el=$('form-error');if(!el){el=document.createElement('p');el.id='form-error';el.className='form-error';el.setAttribute('role','alert');main.querySelector('form')?.append(el);}el.textContent=text;el.scrollIntoView({block:'nearest'});}
  function route(){return location.hash.slice(1)||'today';}
  function navigate(to){if(route()===to)render();else location.hash=to;}
  function todayView(){
    const left=M.daysUntil(state.appointment), c=state.current;
    return heading('Watch · move comfortably','Your shoulder guide','See how a movement works. Follow the exercise choices and doses your clinician gave you.')+`
      <div class="guide-tools"><details class="appointment-inline"><summary>${state.appointment?`PT visit: ${pretty(state.appointment)}${left>0?' · '+left+' days away':''}`:'Set PT appointment date'}</summary><form id="appointment-form"><label for="appointment">First PT appointment</label><input type="date" id="appointment" value="${esc(state.appointment)}"><button class="primary">Save date</button></form></details></div>
      <details class="before-start"><summary>Before you start · comfort &amp; when to stop</summary><p>These videos demonstrate movements; they do not set your personal exercise plan. Skip movements that increase symptoms and follow your clinician’s instructions.</p>${safety()}</details>
      ${c?`<section class="card session-resume"><h2>Your timed session</h2><p>${c.results.length} of ${c.items.length} exercises recorded. Your timer resumes paused.</p><div class="actions"><a class="button primary" href="#session">Resume session</a><a class="button" href="#finish">End &amp; save</a></div></section>`:''}
      <div class="demo-grid">${G.exercises.map((e,i)=>`<a class="demo-card" href="#demo/${e.id}"><span class="demo-cover" aria-hidden="true"><span class="play-symbol">▶</span><span class="demo-number">${String(i+1).padStart(2,'0')}</span></span><span class="demo-copy"><strong>${esc(e.name)}</strong><small>Watch demo · ${esc(e.demo.provider)}</small></span></a>`).join('')}</div>
      <details class="section-gap"><summary>My timed plan ${state.plan.length?'· '+state.plan.length+' exercise'+(state.plan.length===1?'':'s'):''}</summary><section class="card"><p>Use the timing and instructions your clinician gave you. Demos are available above without filling in a plan.</p>${state.plan.map(p=>`<div class="entry"><h3>${esc(name(p.exercise))}</h3><p class="hint">${esc(doseText(p.dose))}</p><a class="button" href="#plan/${p.exercise}">Edit timing</a> ${btn('remove-plan','Remove','quiet',`data-id="${p.id}"`)}</div>`).join('')}${state.plan.length?'<a class="button primary section-gap" href="#check">Start timed plan</a>':'<p class="hint">Open a demo to enter clinician-provided timing.</p>'}</section></details>`;
  }
  function demoPlayer(e){
    if(!e?.demo)return '';
    return `<section class="demo-block"><div class="video-slot" data-player="${e.id}">${btn('play-demo','Play video demonstration','video-launch',`data-exercise="${e.id}"`)}</div><p class="demo-credit">${esc(e.demo.title)} · ${esc(e.demo.provider)}</p><p class="hint">${esc(e.demo.caption)}</p><a class="video-fallback" href="https://www.youtube.com/watch?v=${e.demo.video}" target="_blank" rel="noopener noreferrer">Open on YouTube ↗</a><p class="hint video-network">Video needs internet. Loads from YouTube only when you press Play.</p></section>`;
  }
  function demoView(id){
    const e=exercise(id);if(!e)return notFound();const i=G.exercises.indexOf(e);
    return `<div class="exercise-layout"><a class="back-link" href="#today">← All exercises</a>${heading('Movement demonstration',e.name)}${demoPlayer(e)}<section class="card"><h2>How the movement works</h2><ol class="cue-list">${e.cues.map(c=>'<li>'+esc(c)+'</li>').join('')}</ol><p class="caution">${esc(e.caution)}</p><details><summary>Set up clinician-provided timing</summary><p class="hint">${esc(e.candidateDose)}</p><a class="button" href="#plan/${id}">Enter timing &amp; instructions</a></details></section><div class="actions">${i>0?`<a class="button" href="#demo/${G.exercises[i-1].id}">← Previous</a>`:''}${i<G.exercises.length-1?`<a class="button primary" href="#demo/${G.exercises[i+1].id}">Next demo →</a>`:'<a class="button primary" href="#today">All exercises</a>'}</div></div>`;
  }

  function activityView(){return todayView();}
  function planView(id){
    const e=exercise(id);if(!e)return notFound();const p=state.plan.find(p=>p.exercise===id), d=p?.dose;
    return heading('Only after clinician guidance',e.name,'Enter the exact timing and instructions you were given. Nothing increases automatically.')+`
    <section class="card exercise-layout"><p class="caution">This form records advice you have received; it does not approve an exercise or choose a dose for you.</p><form id="plan-form" data-exercise="${id}"><label class="check"><input type="checkbox" id="confirmed" required ${p?'checked':''}><span>A clinician has told me to do this exercise and given me its dose.</span></label>
    <label for="plan-note">Their instructions: position, range, effort, resistance, and frequency</label><textarea id="plan-note" maxlength="2000" required placeholder="Use your clinician’s instructions">${esc(p?.note)}</textarea>
    <label for="mode">What is being timed?</label><select id="mode"><option value="move" ${d?.mode==='move'?'selected':''}>A movement, repetition, or direction</option><option value="hold" ${d?.mode==='hold'?'selected':''}>A still hold</option></select>
    <div class="field-grid">${[['seconds','Seconds per hold / rep / direction',1,600,d?.seconds],['reps','Holds / reps / directions per set',1,30,d?.reps],['sets','Sets',1,5,d?.sets],['rest','Rest between reps (seconds)',0,300,d?.rest],['setRest','Rest between sets (seconds)',0,600,d?.setRest]].map(([id,label,min,max,val])=>`<div><label for="${id}">${label}</label><input id="${id}" type="number" min="${min}" max="${max}" step="1" value="${val??''}" required></div>`).join('')}</div>
    <label for="directions">Direction cues, in order (optional, one per line)</label><textarea id="directions" maxlength="2400" placeholder="Enter only directions your clinician gave you">${esc(d?.labels.join('\n'))}</textarea><p class="hint">One cue is shown per repetition and the list repeats in each set. For swings, enter each agreed direction as its own timed round.</p><div class="actions"><button class="primary">Save agreed instructions</button><a class="button" href="#activity">Cancel</a></div></form></section>`;
  }
  function dailyView(day){return notesView(M.validDate(day)?day:M.dateKey());}
  function checkView(){
    if(state.current)return `<section class="card"><h1>Resume your unfinished session</h1><p>Finish or end it before starting another session.</p><a class="button primary" href="#session">Resume</a></section>`;
    if(!state.plan.length)return activityView();
    return heading('Before agreed activity','Check in first','Use the dose your clinician gave you, and stop if symptoms increase.')+safety()+`<section class="card exercise-layout"><form id="check-form"><details><summary>Pain before activity (optional)</summary>${painScale('pre-pain','Pain before activity',null)}</details><fieldset><legend>Any new severe pain, inability to move, persistent tingling or numbness, or other urgent symptoms listed above?</legend><label class="check"><input type="radio" name="urgent" value="yes" required><span>Yes, or I’m unsure</span></label><label class="check"><input type="radio" name="urgent" value="no" required><span>No</span></label></fieldset><p class="hint">This check cannot clear an exercise as safe. Follow your clinician’s stop rules.</p><div class="actions"><button class="primary">Continue</button><a class="button" href="#today">Cancel</a></div></form></section>`;
  }
  function sessionView(){
    const c=state.current;if(!c)return `<section class="card"><h1>No session in progress</h1><a class="button" href="#activity">My activity</a></section>`;
    if(c.index>=c.items.length)return finishView();
    const p=c.items[c.index], e=exercise(p.exercise);ensureTimer();
    return `<div class="exercise-layout"><div class="progress-line"><span>Exercise ${c.index+1} of ${c.items.length}</span><a href="#finish">End session</a></div><progress aria-label="Exercises recorded this session" value="${c.results.length}" max="${c.items.length}"></progress><section class="card"><div class="eyebrow">Your agreed activity</div><h1>${esc(e?.name||p.exercise)}</h1><p class="hint">${esc(doseText(p.dose))}</p><p class="clinician-note"><strong>Your clinician’s instructions</strong><br>${esc(p.note)}</p><details><summary>General movement cues</summary><ol class="cue-list">${(e?.cues||[]).map(s=>'<li>'+esc(s)+'</li>').join('')}</ol></details><p class="caution">${esc(e?.caution||'Stop if symptoms increase.')} Your clinician’s instructions take priority.</p>${demoPlayer(e)}<div class="actions">${btn('hurt','This hurts — stop','danger')}${btn('skip','Skip exercise','quiet')}</div><div id="hurt-message" class="warning notice" hidden><p>The timer is paused. Stop this exercise. A low pain score does not mean you should continue.</p><div class="actions">${btn('stopped','Record stopped & continue')}<a class="button" href="#finish">End session</a></div><a href="#help">When to seek help</a></div></section>
    <section class="timer-panel" id="timer-panel" aria-label="Exercise timer"><div class="timer-top"><div class="clock" id="clock">0:00</div><div class="timer-description"><strong id="phase-label">Ready</strong><small id="phase-detail"></small></div>${btn('timer','Start','primary','id="timer-button"')}</div><div class="actions">${btn('reset-timer','Reset timer','quiet')}${btn('complete','Mark completed','primary')}</div><p class="hint" id="timer-help">The timer guides timing; it does not verify what you performed.</p></section></div>`;
  }
  function finishView(){
    const c=state.current;if(!c)return `<section class="card"><h1>Session saved</h1><a class="button" href="#notes">View my notes</a></section>`;
    return heading('Record what happened','How did it feel?','Stopping or skipping is useful information for your therapist.')+`<section class="card exercise-layout"><p>${c.results.filter(r=>r.status==='completed').length} completed · ${c.results.filter(r=>r.status==='skipped').length} skipped · ${c.results.filter(r=>r.status==='stopped').length} stopped because of symptoms.</p>${c.index<c.items.length?'<p class="hint">Remaining exercises will be recorded as not attempted.</p>':''}<form id="finish-form"><details><summary>Pain after activity (optional)</summary>${painScale('post-pain','Pain after activity',c.postPain)}</details><p class="hint">Your exercise results are saved when you finish. If there is anything to remember, add it to My note.</p><div class="actions"><button class="primary">Save session</button>${c.index<c.items.length?'<a class="button" href="#session">Back to exercise</a>':''}</div></form></section>`;
  }
  function followView(){return notesView();}
  function summaryText(){
    const lines=['SHOULDER — BEFORE PT',`Generated ${pretty(M.dateKey())}`,`First appointment: ${pretty(state.appointment)}`,'Patient-entered observations and patient-recorded clinician instructions. Not a clinical assessment.','', 'REFERRAL',...G.referral,'','DAILY SYMPTOMS (one sleep entry per date)'];
    const days=Object.keys(state.days).sort();
    if(!days.length)lines.push('No daily notes recorded.');
    for(const d of days){const x=state.days[d];lines.push(`${d}: pain ${pval(x.pain)}; previous night interrupted: ${x.sleep||'not recorded'}${x.note?'; '+x.note:''}`);}
    lines.push('','AGREED PLAN (entered by user)');
    if(!state.plan.length)lines.push('No exercises entered as clinician-approved.');
    state.plan.forEach(p=>lines.push(`${name(p.exercise)}: ${doseText(p.dose)}. ${p.note}`));
    lines.push('','ACTIVITY SESSIONS');
    if(!state.sessions.length)lines.push('No sessions recorded.');
    state.sessions.forEach(s=>{lines.push(`${s.date} · ${s.started?new Date(s.started).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):''} · before ${pval(s.prePain)}, after ${pval(s.postPain)}, about 1h later ${pval(s.later)}, next morning ${pval(s.morning)}`);s.results.forEach(r=>lines.push(`  ${r.name||name(r.exercise)}: ${r.status}${r.dose?' · '+doseText(r.dose):''}${r.instructions?' · instructions: '+r.instructions:''}${r.note?' · '+r.note:''}`));if(s.note)lines.push('  Note: '+s.note);if(s.followNote)lines.push('  Follow-up: '+s.followNote);});
    if(state.legacy.length){lines.push('','OLDER ROUTINE HISTORY — unverified completion; earlier app did not record actual exercises');state.legacy.forEach(s=>lines.push(`${s.date}: after ${pval(s.postPain)}${s.painNight?'; night pain reported (may repeat within a date)':''}${s.flags?.length?'; flagged: '+s.flags.map(name).join(', '):''}`));}
    lines.push('','MY PT / DOCTOR NOTE',state.questions||'No note added.');
    return lines.join('\n');
  }
  function notesView(day=M.dateKey()){
    const d=state.days[day]||{}, days=Object.keys(state.days).sort().reverse(), sessions=[...state.sessions].reverse();
    return heading('One place for your thoughts','My PT / doctor note','Write what you want to remember or ask. Everything goes into one shareable summary.')+`
      <section class="card notebook"><form id="pt-note-form" data-day="${day}"><label for="pt-note">My note</label><textarea id="pt-note" maxlength="6000" placeholder="What bothered you? What helped? What would you like to ask?">${esc(state.questions)}</textarea><p class="hint">One ongoing note. You do not need to write a separate note for each exercise or session.</p>
      <details><summary>Quick check-in · ${pretty(day)} (optional)</summary>${painScale('note-pain','Pain now',d.pain)}<label for="note-sleep">Did shoulder pain wake you last night?</label><select id="note-sleep"><option value="">Not recorded</option><option value="yes" ${d.sleep==='yes'?'selected':''}>Yes</option><option value="no" ${d.sleep==='no'?'selected':''}>No</option></select></details><div class="actions"><button class="primary">Save my note</button>${btn('copy','Copy summary')}${btn('download','Download summary')}</div><p id="copy-status" class="hint" role="status"></p></form></section>
      <details class="section-gap"><summary>Saved records &amp; summary</summary><p class="hint">Your previous notes and exercise records are kept here. No need to fill these in again.</p><div class="grid"><section class="card"><h2>Previous records</h2>${days.map(k=>`<div class="entry"><h3>${pretty(k)}</h3><p>Pain ${pval(state.days[k].pain)} · Woke last night: ${esc(state.days[k].sleep||'not recorded')}</p>${state.days[k].note?`<p>${esc(state.days[k].note)}</p>`:''}${btn('delete-day','Delete check-in','quiet',`data-day="${k}"`)}</div>`).join('')}${sessions.map(x=>`<div class="entry"><h3>Activity · ${pretty(x.date)}</h3><p>Before ${pval(x.prePain)} → after ${pval(x.postPain)}</p><p class="hint">${x.results.map(r=>`${esc(r.name||name(r.exercise))}: ${esc(r.status)}`).join('<br>')}</p>${x.note?`<p>${esc(x.note)}</p>`:''}${x.followNote?`<p>${esc(x.followNote)}</p>`:''}<div class="actions"><a class="button" href="#edit/${x.id}">Correct record</a>${btn('delete-session','Delete','quiet',`data-id="${x.id}"`)}</div></div>`).join('')}${!days.length&&!sessions.length?'<p>No earlier records yet.</p>':''}${state.legacy.length?`<p class="hint">${state.legacy.length} older routine records are included in the summary.</p>`:''}</section><section class="card"><h2>Summary preview</h2><pre class="summary-box" id="summary-text" tabindex="0" aria-label="Summary for your physical therapist">${esc(summaryText())}</pre></section></div></details>`;
  }

  function editView(id){
    const s=state.sessions.find(s=>s.id===id);if(!s)return notFound();
    return heading('Correct a record',pretty(s.date),'Update accidental entries so your therapist sees what actually happened.')+`<section class="card exercise-layout"><form id="edit-form" data-id="${s.id}">${painScale('edit-pre','Pain before activity',s.prePain)}${painScale('edit-post','Pain after activity',s.postPain)}${s.results.map((r,i)=>`<label for="result-${i}">${esc(r.name||name(r.exercise))}</label><select id="result-${i}">${['completed','skipped','stopped','not attempted'].map(v=>`<option value="${v}" ${r.status===v?'selected':''}>${v}</option>`).join('')}</select>`).join('')}<div class="actions"><button class="primary">Save corrections</button><a class="button" href="#notes">Cancel</a></div></form></section>`;
  }
  function helpView(){return heading('When symptoms change','Get the right help','Do not assume new severe pain is the calcium deposit changing.')+`<div class="grid"><section class="card warning"><h2>Urgent medical advice</h2>${list(G.safety.urgent)}<a class="button" href="tel:7134419000">Call Dr. Lanzi’s office · 713-441-9000</a><p class="hint section-gap">If the clinic is closed or cannot advise promptly, use urgent care or emergency care according to your symptoms.</p></section><section class="card warning"><h2>Call 911</h2>${list(G.safety.emergency)}</section></div>`;}
  function aboutView(){return heading('A guide for the week before PT','About this guide','General information and your own notes. Your treating clinician sets the exercise plan.')+`<div class="grid"><div class="stack"><section class="card"><h2>What the referral says</h2>${list(G.referral)}<p>${esc(G.purpose)}</p></section><section class="card"><h2>Comfort &amp; everyday activity</h2>${list(G.comfort)}</section></div><div class="stack"><section class="card"><h2>Your notes stay in this browser</h2><p>The app does not upload your notes or send them to the clinic. There is no account, analytics, or external font. Videos connect to YouTube only when you press Play; YouTube may collect playback and device information.</p><p>Clearing browser data can remove your notes. Other devices and browsers have separate records. Anyone using this browser profile may be able to read them.</p><p>The app can reopen offline after a successful online visit. Videos and external sources need an internet connection.</p><div class="actions">${btn('backup','Download my data')}${btn('download','Download PT summary')}</div><details><summary>Restore a saved data file</summary><p>Restoring replaces this browser’s guide records. Download the current data first if you want to keep it.</p><label for="restore-file">Data file from this guide</label><input type="file" id="restore-file" accept="application/json,.json">${btn('restore','Restore selected file')}</details></section><section class="card"><h2>Sources</h2><p class="hint">Guidance reviewed ${pretty(G.reviewDate)}. The app itself has not been approved by your treating clinician.</p><ul>${G.sources.map(s=>`<li><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)}</a></li>`).join('')}</ul></section><section class="card"><h2>Save on your phone</h2><p>On iPhone, open in Safari, choose Share, then Add to Home Screen. On Android, use your browser’s Install app or Add to Home screen option.</p></section></div></div>`;}
  function notFound(){return heading('Page unavailable','That record is not available.')+'<a class="button" href="#today">Back to today</a>';}
  function render(){
    const [page,id]=route().split('/');
    const views={today:todayView,activity:activityView,plan:()=>planView(id),daily:()=>dailyView(id),check:checkView,session:sessionView,finish:finishView,followup:()=>followView(id),notes:()=>notesView(),demo:()=>demoView(id),edit:()=>editView(id),help:helpView,about:aboutView};
    main.innerHTML=(views[page]||notFound)();
    document.querySelectorAll('[data-tab]').forEach(a=>{if((a.dataset.tab==='today'&&['today','activity','demo','plan','session','check','finish'].includes(page))||(a.dataset.tab==='notes'&&['notes','daily','edit','followup'].includes(page)))a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
    main.focus({preventScroll:true});window.scrollTo(0,0);wireForms();paintTimer();
    if(undo&&['notes','activity'].includes(page)){const box=document.createElement('div');box.className='notice';box.innerHTML='Record removed. '+btn('undo','Undo');main.prepend(box);}
  }
  // Timer state belongs to the session, not to the current screen.
  function ensureTimer(){
    const c=state.current;if(!c||c.index>=c.items.length)return;
    const phases=M.phases(c.items[c.index].dose);
    if(!c.timer||c.timer.phase>phases.length)c.timer={phase:0,left:phases[0].seconds,running:false};
  }
  function beep(){try{if(!audio)return;const o=audio.createOscillator(),g=audio.createGain();o.connect(g);g.connect(audio.destination);g.gain.setValueAtTime(.08,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.18);o.start();o.stop(audio.currentTime+.18);}catch(e){}}
  let wakeLock=null;
  async function awake(on){try{if(on&&!wakeLock&&navigator.wakeLock){wakeLock=await navigator.wakeLock.request('screen');wakeLock.addEventListener('release',()=>wakeLock=null);}else if(!on&&wakeLock){await wakeLock.release();wakeLock=null;}}catch(e){}}
  function pause(){const t=state.current?.timer;if(!t)return;if(t.running)t.left=Math.max(0,Math.ceil((deadline-Date.now())/1000));t.running=false;clearInterval(interval);interval=null;awake(false);save();paintTimer();}
  function tick(){
    const c=state.current,t=c?.timer;if(!t?.running)return;
    t.left=Math.max(0,Math.ceil((deadline-Date.now())/1000));
    if(t.left===0){const all=M.phases(c.items[c.index].dose);t.phase++;beep();if(t.phase>=all.length){t.running=false;clearInterval(interval);interval=null;awake(false);announce('Timer finished. Record what you actually performed.');}else{t.left=all[t.phase].seconds;deadline=Date.now()+t.left*1000;announce(all[t.phase].label);}}
    save();paintTimer();
  }
  function paintTimer(){
    if(!$('clock'))return;const c=state.current,t=c?.timer;if(!t)return;const p=c.items[c.index],all=M.phases(p.dose),phase=all[t.phase];
    $('clock').textContent=fmt(t.left);$('phase-label').textContent=phase?phase.label:'Timing finished';$('phase-detail').textContent=phase?`Set ${phase.set} of ${p.dose.sets} · ${p.dose.mode==='hold'?'Hold':'Rep/round'} ${phase.rep} of ${p.dose.reps}`:'Mark completed only if you performed the exercise.';$('timer-button').textContent=t.running?'Pause':phase?(t.left===phase.seconds&&t.phase===0?'Start':'Resume'):'Finished';$('timer-button').disabled=!phase||!!c.hurt;$('timer-panel').classList.toggle('running',t.running);
    if(c.hurt){$('hurt-message').hidden=false;main.querySelector('[data-action=complete]').disabled=true;}
  }
  function outcome(status){
    const c=state.current;if(!c)return;pause();const p=c.items[c.index];if(!p)return;
    if(c.hurt)status='stopped';
    c.results.push({exercise:p.exercise,name:name(p.exercise),dose:clone(p.dose),instructions:p.note,status,note:$('exercise-note')?.value||c.itemNote||''});c.index++;c.timer=null;c.itemNote='';c.hurt=false;save();if(c.index>=c.items.length)navigate('finish');else{navigate('session');announce('Exercise recorded as '+status);}
  }
  function download(text,filename,type='text/plain'){const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);announce('Download prepared.');}
  function wireForms(){
    main.querySelectorAll('[data-pain]').forEach(group=>group.addEventListener('click',ev=>{const b=ev.target.closest('[data-score]'),clear=ev.target.closest('[data-clear-pain]');if(!b&&!clear)return;const v=b?Number(b.dataset.score):'',input=group.querySelector('input');input.value=v;group.querySelectorAll('[data-score]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));announce(group.querySelector('legend').textContent+': '+(b?v+' out of 10':'not recorded'));}));
    const appointment=$('appointment-form');if(appointment)appointment.onsubmit=ev=>{ev.preventDefault();const v=$('appointment').value;if(v&&!M.validDate(v)){showError('Choose a valid date.');return;}state.appointment=v;save();render();announce('Appointment date saved.');};
    const noteForm=$('pt-note-form');
    function captureNote(){
      if(!noteForm)return;
      state.questions=$('pt-note').value;
      const day=noteForm.dataset.day, pain=readPain('note-pain'), sleep=$('note-sleep').value;
      if(state.days[day]||pain!==null||sleep)state.days[day]={...(state.days[day]||{}),pain,sleep};
    }
    if(noteForm){noteForm.onsubmit=ev=>{ev.preventDefault();captureNote();save();const preview=$('summary-text');if(preview)preview.textContent=summaryText();announce('Note saved.');noteForm.querySelector('button.primary').textContent='Saved';};noteForm.addEventListener('input',()=>{captureNote();save();});noteForm.addEventListener('click',ev=>{if(ev.target.closest('[data-score],[data-clear-pain]')){captureNote();save();}});}
    const plan=$('plan-form');if(plan)plan.onsubmit=ev=>{
      ev.preventDefault();const d={mode:$('mode').value,labels:$('directions').value.split('\n').map(s=>s.trim()).filter(Boolean)};['seconds','reps','sets','rest','setRest'].forEach(k=>d[k]=Number($(k).value));
      if(!$('confirmed').checked||!M.validateDose(d)||!$('plan-note').value.trim()){showError('Confirm the clinician instructions and fill in the timing.');return;}
      const existing=state.plan.find(p=>p.exercise===plan.dataset.exercise),p={id:existing?.id||uid(),exercise:plan.dataset.exercise,confirmed:true,note:$('plan-note').value.trim(),dose:d};
      if(existing)state.plan[state.plan.indexOf(existing)]=p;else state.plan.push(p);save();navigate('activity');announce('Agreed instructions saved.');
    };
    const check=$('check-form');if(check)check.onsubmit=ev=>{ev.preventDefault();const answer=check.querySelector('[name=urgent]:checked')?.value;if(answer!=='no'){navigate('help');return;}const pre=readPain('pre-pain');if(!state.plan.length)return;state.current={id:uid(),date:M.dateKey(),started:Date.now(),prePain:pre,items:clone(state.plan),index:0,results:[],timer:null};save();navigate('session');};
    const finish=$('finish-form');if(finish)finish.onsubmit=ev=>{ev.preventDefault();const v=readPain('post-pain');const c=state.current;if(!c)return;pause();for(let i=c.index;i<c.items.length;i++){const p=c.items[i];c.results.push({exercise:p.exercise,name:name(p.exercise),dose:clone(p.dose),instructions:p.note,status:i===c.index&&c.hurt?'stopped':'not attempted',note:i===c.index?(c.itemNote||''):''});}state.sessions.push({id:c.id,date:c.date,started:c.started,ended:Date.now(),prePain:c.prePain,postPain:v,note:c.note||'',results:c.results,later:null,morning:null});state.current=null;save();navigate('notes');announce('Exercise results saved.');};
    const edit=$('edit-form');if(edit)edit.onsubmit=ev=>{ev.preventDefault();const s=state.sessions.find(s=>s.id===edit.dataset.id);if(!s)return;s.prePain=readPain('edit-pre');s.postPain=readPain('edit-post');s.results.forEach((r,i)=>{r.status=$('result-'+i).value;});s.edited=Date.now();save();navigate('notes');announce('Record corrected.');};
    const post=$('post-pain');if(post)main.querySelector('[data-pain="post-pain"]').addEventListener('click',()=>{if(state.current){state.current.postPain=readPain('post-pain');save();}});

  }
  main.addEventListener('click',async ev=>{
    const b=ev.target.closest('[data-action]');if(!b)return;const a=b.dataset.action;
    if(a==='play-demo'){
      const e=exercise(b.dataset.exercise);if(!e?.demo||!/^[a-zA-Z0-9_-]{11}$/.test(e.demo.video))return;
      pause();const host=b.closest('[data-player]'),frame=document.createElement('iframe');
      frame.src='https://www.youtube-nocookie.com/embed/'+e.demo.video+'?rel=0&playsinline=1&autoplay=1';frame.title=e.name+' demonstration by '+e.demo.provider;frame.allow='autoplay; encrypted-media; picture-in-picture; fullscreen';frame.allowFullscreen=true;frame.referrerPolicy='strict-origin-when-cross-origin';host.replaceChildren(frame);
    }
    if(a==='timer'){ensureTimer();const t=state.current.timer;if(t.running)pause();else if(!state.current.hurt){try{if(!audio)audio=new (window.AudioContext||window.webkitAudioContext)();audio.resume();}catch(e){}t.running=true;deadline=Date.now()+t.left*1000;interval=setInterval(tick,200);awake(true);save();paintTimer();}}
    if(a==='reset-timer'){pause();state.current.timer=null;ensureTimer();save();paintTimer();announce('Timer reset.');}
    if(a==='hurt'){pause();state.current.hurt=true;save();paintTimer();announce('Timer paused. Stop this exercise.');$('hurt-message').scrollIntoView({block:'nearest'});}
    if(a==='complete')outcome('completed');if(a==='skip')outcome('skipped');if(a==='stopped')outcome('stopped');
    if(a==='remove-plan'){undo={type:'plan',value:clone(state.plan.find(p=>p.id===b.dataset.id))};state.plan=state.plan.filter(p=>p.id!==b.dataset.id);save();render();}
    if(a==='delete-day'){undo={type:'day',day:b.dataset.day,value:clone(state.days[b.dataset.day])};delete state.days[b.dataset.day];save();render();}
    if(a==='delete-session'){undo={type:'sessions',value:clone(state.sessions.find(s=>s.id===b.dataset.id))};state.sessions=state.sessions.filter(s=>s.id!==b.dataset.id);save();render();}
    if(a==='undo'&&undo){if(undo.type==='day'){if(!state.days[undo.day])state.days[undo.day]=undo.value;}else if(undo.type==='plan'){if(!state.plan.some(p=>p.id===undo.value.id||p.exercise===undo.value.exercise))state.plan.push(undo.value);}else if(!state.sessions.some(s=>s.id===undo.value.id)){state.sessions.push(undo.value);state.sessions.sort((a,b)=>(a.started||0)-(b.started||0));}undo=null;save();render();announce('Record restored.');}
    if(['copy','download'].includes(a)&&$('pt-note')){state.questions=$('pt-note').value;save();const preview=$('summary-text');if(preview)preview.textContent=summaryText();}
    if(a==='download')download(summaryText(),'shoulder-pt-summary-'+M.dateKey()+'.txt');
    if(a==='backup'){let raw=state;if(storageCorrupt){try{raw={unreadable:localStorage.getItem(KEY),older:localStorage.getItem('shoulder-routine-v2')};}catch(e){}}download(JSON.stringify(raw,null,2),'shoulder-notes-'+M.dateKey()+'.json','application/json');}
    if(a==='copy'){try{await navigator.clipboard.writeText(summaryText());$('copy-status').textContent='Copied to clipboard.';}catch(e){$('copy-status').textContent='Copy was unavailable. Select the summary below and copy it, or choose Download.';$('summary-text').closest('details').open=true;$('summary-text').scrollIntoView({block:'nearest'});const range=document.createRange();range.selectNodeContents($('summary-text'));const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);}}
    if(a==='restore'){const file=$('restore-file').files[0];if(!file)return announce('Choose a saved data file first.');try{if(file.size>5000000)throw Error('File too large');const raw=JSON.parse(await file.text());if(raw.version!==3||!Array.isArray(raw.sessions)||!raw.days)throw Error('Not a guide backup');if(!window.confirm('Replace this browser’s guide records with the selected backup? Download the current data first if you want to keep it.'))return;pause();state=M.hydrate(raw);storageCorrupt=false;save();navigate('notes');announce('Data restored.');}catch(e){announce('That file could not be restored. Use a data file downloaded from this guide.');}}
  });
  document.querySelector('.skip-link').addEventListener('click',ev=>{ev.preventDefault();main.focus();main.scrollIntoView({block:'start'});});
  window.addEventListener('hashchange',()=>{pause();render();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){pause();announce('Timer paused while the guide is in the background.');}});
  window.addEventListener('pagehide',pause);
  window.addEventListener('storage',ev=>{if(ev.key===KEY){storageCorrupt=true;pause();storageWarning('These notes changed in another tab. Download any work here, then reopen the guide to use the latest saved notes.');}});
  function networkStatus(){$('network-status').textContent=navigator.onLine?'':'Offline · saved guide available';}
  window.addEventListener('online',networkStatus);window.addEventListener('offline',networkStatus);networkStatus();
  if('serviceWorker' in navigator){let controlled=!!navigator.serviceWorker.controller;navigator.serviceWorker.register('sw.js',{updateViaCache:'none'}).then(reg=>reg.update()).catch(()=>{});navigator.serviceWorker.addEventListener('controllerchange',()=>{if(controlled)$('update-notice').hidden=false;controlled=true;});$('apply-update').onclick=()=>{pause();window.location.reload();};}
  render();
})();
