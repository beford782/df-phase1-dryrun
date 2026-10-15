/* Shared, dependency-free data and timer rules. No treatment defaults. */
(function(root){
  'use strict';
  const dateKey=(date=new Date())=>date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0')+'-'+String(date.getDate()).padStart(2,'0');
  const validDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&dateKey(new Date(s+'T12:00:00'))===s;
  const daysUntil=(day,from=dateKey())=>validDate(day)&&validDate(from)?Math.round((Date.parse(day+'T12:00:00Z')-Date.parse(from+'T12:00:00Z'))/86400000):null;
  const pain=v=>Number.isInteger(v)&&v>=0&&v<=10?v:null;
  const text=(v,max=2000)=>typeof v==='string'?v.slice(0,max):'';
  function validateDose(d){
    if(!d||!['hold','move'].includes(d.mode)) return false;
    return [['seconds',1,600],['reps',1,30],['sets',1,5],['rest',0,300],['setRest',0,600]].every(([k,min,max])=>Number.isInteger(d[k])&&d[k]>=min&&d[k]<=max)&&Array.isArray(d.labels)&&d.labels.length<=30&&d.labels.every(s=>typeof s==='string'&&s.length<=80);
  }
  function phases(d){
    if(!validateDose(d)) throw Error('Enter the timing your clinician gave you.');
    const list=[];
    for(let set=1;set<=d.sets;set++){
      for(let rep=1;rep<=d.reps;rep++){
        list.push({seconds:d.seconds,label:d.labels[(rep-1)%Math.max(1,d.labels.length)]||(d.mode==='hold'?'Hold':'Move slowly'),set,rep,work:true});
        if(rep<d.reps&&d.rest) list.push({seconds:d.rest,label:'Rest',set,rep,work:false});
      }
      if(set<d.sets&&d.setRest) list.push({seconds:d.setRest,label:'Rest between sets',set,rep:d.reps,work:false});
    }
    return list;
  }
  function newState(){return {version:3,appointment:'',started:dateKey(),plan:[],sessions:[],days:{},questions:'',current:null,legacy:[]};}
  const daily=v=>({pain:pain(v?.pain),sleep:['yes','no',''].includes(v?.sleep)?v.sleep:'',note:text(v?.note),later:pain(v?.later),morning:pain(v?.morning)});
  const safeId=v=>typeof v==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(v);
  const cleanDose=d=>validateDose(d)?{mode:d.mode,seconds:d.seconds,reps:d.reps,sets:d.sets,rest:d.rest,setRest:d.setRest,labels:d.labels.map(s=>text(s,80))}:null;
  const cleanPlan=p=>p&&safeId(p.id)&&safeId(p.exercise)&&p.confirmed===true&&validateDose(p.dose)?{id:p.id,exercise:p.exercise,confirmed:true,dose:cleanDose(p.dose),note:text(p.note)}:null;
  const cleanResult=r=>r&&safeId(r.exercise)&&['completed','skipped','stopped','not attempted'].includes(r.status)?{exercise:r.exercise,name:text(r.name,150),status:r.status,dose:cleanDose(r.dose),instructions:text(r.instructions),note:text(r.note)}:null;
  const stamp=v=>Number.isFinite(v)&&v>0&&v<8640000000000000?v:null;
  function hydrate(raw,legacy){
    const result=newState();
    if(raw&&raw.version===3){
      result.appointment=validDate(raw.appointment)?raw.appointment:'';
      result.started=validDate(raw.started)?raw.started:result.started;
      result.questions=text(raw.questions,6000);
      result.plan=Array.isArray(raw.plan)?raw.plan.map(cleanPlan).filter(Boolean).slice(0,30):[];
      result.sessions=Array.isArray(raw.sessions)?raw.sessions.filter(s=>s&&safeId(s.id)&&validDate(s.date)&&Array.isArray(s.results)).map(s=>({id:s.id,date:s.date,started:stamp(s.started),ended:stamp(s.ended),prePain:pain(s.prePain),postPain:pain(s.postPain),later:pain(s.later),morning:pain(s.morning),note:text(s.note),followNote:text(s.followNote),results:s.results.map(cleanResult).filter(Boolean).slice(0,30)})):[];
      if(raw.days&&typeof raw.days==='object') for(const [k,v] of Object.entries(raw.days)) if(validDate(k)) result.days[k]=daily(v);
      result.legacy=Array.isArray(raw.legacy)?raw.legacy.filter(s=>s&&validDate(s.date)).map(s=>({date:s.date,postPain:pain(s.postPain),painNight:!!s.painNight,flags:Array.isArray(s.flags)?s.flags.filter(safeId):[],migrated:true})):[];
      const c=raw.current;
      if(c&&safeId(c.id)&&validDate(c.date)&&Array.isArray(c.items)&&c.items.length&&c.items.length<=30&&c.items.every(p=>cleanPlan(p))&&Number.isInteger(c.index)&&c.index>=0&&c.index<=c.items.length&&Array.isArray(c.results)&&c.results.length===c.index&&c.results.every(r=>cleanResult(r))){
        const all=c.index<c.items.length?phases(c.items[c.index].dose):[];
        const t=c.timer;
        result.current={id:c.id,date:c.date,started:stamp(c.started),prePain:pain(c.prePain),postPain:pain(c.postPain),items:c.items.map(cleanPlan),index:c.index,results:c.results.map(cleanResult),note:text(c.note),itemNote:text(c.itemNote),hurt:!!c.hurt,timer:t&&Number.isInteger(t.phase)&&t.phase>=0&&t.phase<=all.length&&Number.isFinite(t.left)&&t.left>=0&&t.left<=(all[t.phase]?.seconds||0)?{phase:t.phase,left:t.left,running:false}:null};
      }
    }else if(legacy&&Array.isArray(legacy.sessions)){
      result.legacy=legacy.sessions.filter(s=>s&&validDate(s.date)).map(s=>({date:s.date,postPain:pain(s.postPain),painNight:!!s.painNight,flags:Array.isArray(s.flags)?s.flags.filter(x=>typeof x==='string'):[],migrated:true}));
    }
    return result;
  }
  const api={dateKey,validDate,daysUntil,pain,validateDose,phases,newState,hydrate};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.ShoulderModel=api;
})(typeof window!=='undefined'?window:globalThis);
