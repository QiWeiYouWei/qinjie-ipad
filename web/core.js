(function(root){
  'use strict';
  const X=typeof module!=='undefined'?require('./exam-core.js'):root.PianoExamCore;
  const M=typeof module!=='undefined'?require('./learning-core.js'):root.PianoLearningCore;
  const P=typeof module!=='undefined'?require('./practice-review.js'):root.PianoPracticeReview;
  const K=typeof module!=='undefined'?require('./coach.js'):root.PianoCoach;
  const R=typeof module!=='undefined'?require('./rhythm-core.js'):root.PianoRhythmCore;
  if(!Array.prototype.at)Object.defineProperty(Array.prototype,'at',{value:function(i){i=Math.trunc(i)||0;return this[i<0?this.length+i:i]},configurable:true,writable:true});
  if(!Array.prototype.findLastIndex)Object.defineProperty(Array.prototype,'findLastIndex',{value:function(fn){for(let i=this.length-1;i>=0;i--)if(fn(this[i],i,this))return i;return -1},configurable:true,writable:true});
  const names=['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];
  function name(n){return names[n%12]+(Math.floor(n/12)-1)}
  function frequency(n){return 440*Math.pow(2,(n-69)/12)}
  function numberPitch(n){
    const degrees=[1,1,2,2,3,4,4,5,5,6,6,7],sharp=[false,true,false,true,false,false,true,false,true,false,true,false];
    return {degree:degrees[n%12],accidental:sharp[n%12]?'♯':'',octave:Math.floor((n-60)/12)};
  }
  function numberDuration(beats){
    if(beats>=1&&Number.isInteger(beats))return {dashes:beats-1,underlines:0,dotted:false};
    if(beats===1.5)return {dashes:0,underlines:0,dotted:true};
    if(beats===.75)return {dashes:0,underlines:1,dotted:true};
    if(beats===.5)return {dashes:0,underlines:1,dotted:false};
    if(beats===.25)return {dashes:0,underlines:2,dotted:false};
    throw Error('Unsupported numbered-notation duration: '+beats);
  }
  function events(sequence){let beat=0;return sequence.map((item,index)=>{const e={index,notes:Array.isArray(item[0])?item[0]:[item[0]],beat,duration:item[1]};beat+=item[1];return e})}
  function measures(sequence,meter=4){const all=events(sequence);return Math.max(1,Math.ceil((all.at(-1)?.beat+all.at(-1)?.duration||0)/meter))}
  function sliceMeasures(sequence,meter,first,last){
    const all=events(sequence),count=measures(sequence,meter);
    first=Math.max(1,Math.min(count,Math.trunc(first)||1));last=Math.max(first,Math.min(count,Math.trunc(last)||first));
    return all.filter(e=>e.beat>=(first-1)*meter&&e.beat<last*meter).map((e,index)=>({...e,index,sourceIndex:e.index,sourceBeat:e.beat,beat:e.beat-(first-1)*meter}));
  }
  function safeReplay(r){
    if(!r||typeof r!=='object'||!Array.isArray(r.notes)||!Array.isArray(r.expected))return null;
    const notes=r.notes.filter(n=>n&&Number.isInteger(n.note)&&n.note>=36&&n.note<=107&&Number.isFinite(n.at)&&n.at>=0&&n.at<=300&&Number.isFinite(n.duration)&&n.duration>=0&&n.duration<=300).slice(0,600).map(n=>({note:n.note,at:n.at,duration:Math.min(n.duration,300-n.at),index:Number.isInteger(n.index)&&n.index>=0&&n.index<200?n.index:null}));
    const expected=r.expected.filter(e=>e&&Array.isArray(e.notes)&&e.notes.every(n=>Number.isInteger(n)&&n>=36&&n<=107)&&Number.isFinite(e.beat)&&e.beat>=0&&e.beat<=600&&[.25,.5,.75,1,1.5,2,3,4].includes(e.duration)).slice(0,200).map((e,index)=>({index,notes:e.notes.slice(0,4),beat:e.beat,duration:e.duration}));
    if(!notes.length||!expected.length)return null;
    const songId=typeof r.songId==='string'&&/^(builtin:\d{1,3}|custom:[a-z0-9][a-z0-9._-]{2,63})$/.test(r.songId)?r.songId:null;
    return {title:String(r.title||'练习回放').slice(0,100),exercise:Number.isInteger(r.exercise)&&r.exercise>=0&&r.exercise<1000?r.exercise:0,songId,meter:[2,3,4].includes(r.meter)?r.meter:null,bpm:Math.max(35,Math.min(120,Number(r.bpm)||60)),mode:r.mode==='rhythm'?'rhythm':'wait',notes,expected};
  }
  function summarize(expected,actual,matches,mode,bpm){
    const total=expected.reduce((n,e)=>n+e.notes.length,0),hit=matches.length;
    const extras=Math.max(0,actual.length-hit);
    const pitch=total?Math.round(hit/total*100):0;
    const precision=actual.length?Math.round(hit/actual.length*100):0;
    const timing=mode==='rhythm'&&hit?Math.round(matches.filter(x=>Math.abs(x.delta)<=.18).length/hit*100):null;
    return {pitch,precision,timing,hit,total,extras,missed:total-hit,bpm,mode};
  }
  function matchRhythm(expected,matched,note,beat,tolerance=.5){
    let best=null;
    for(const e of expected){
      for(let j=0;j<e.notes.length;j++){
        const key=e.index+':'+j,delta=beat-e.beat;
        if(e.notes[j]===note&&!matched.has(key)&&Math.abs(delta)<=tolerance&&(!best||Math.abs(delta)<Math.abs(best.delta)))best={key,index:e.index,note,delta};
      }
    }return best;
  }
  function safeReading(value){
    const r={level:0,mode:'bridge',notes:[],history:[]},modes=['bridge','staff','numbered','review'];
    if(!value||typeof value!=='object')return r;
    if(Number.isInteger(value.level)&&value.level>=0&&value.level<=3)r.level=value.level;
    if(modes.includes(value.mode))r.mode=value.mode;
    const count=n=>Math.min(100000,Math.max(0,Math.trunc(Number(n)||0))),seen=new Set();
    if(Array.isArray(value.notes))for(const item of value.notes.slice(0,200)){if(!item||!Number.isInteger(item.note)||item.note<55||item.note>83||seen.has(item.note))continue;seen.add(item.note);const attempts=count(item.attempts),correct=Math.min(attempts,count(item.correct));r.notes.push({note:item.note,attempts,correct,streak:Math.min(correct,100,count(item.streak))})}
    if(Array.isArray(value.history))r.history=value.history.filter(h=>h&&/^\d{4}-\d{2}-\d{2}$/.test(h.date)&&modes.includes(h.mode)&&Number.isInteger(h.level)&&h.level>=0&&h.level<=3&&Number.isInteger(h.total)&&h.total>=1&&h.total<=10&&Number.isInteger(h.correct)&&h.correct>=0&&h.correct<=h.total&&Number.isFinite(h.seconds)).slice(-100).map(h=>({date:h.date,mode:h.mode,level:h.level,total:h.total,correct:h.correct,seconds:Math.round(Math.min(600,Math.max(0,h.seconds))),complete:h.complete===true}));
    return r;
  }
  function safeState(value){
    if(!value||typeof value!=='object'||Array.isArray(value))throw Error('记录格式不正确');
    const s={version:1,minutes:20,goal:'完整弹奏一首简单旋律',bpm:60,hints:true,notation:'numbered',keyboard:'wide',repeat:false,completed:[],history:[],quiz:[],review:[],replays:[]};
    if(Number.isFinite(value.minutes))s.minutes=Math.max(5,Math.min(60,Math.round(value.minutes)));
    if(typeof value.goal==='string')s.goal=value.goal.slice(0,100);
    if(Number.isFinite(value.bpm))s.bpm=Math.max(35,Math.min(120,Math.round(value.bpm)));
    if(typeof value.hints==='boolean')s.hints=value.hints;
    if(['numbered','staff','both'].includes(value.notation))s.notation=value.notation;
    if(['wide','full'].includes(value.keyboard))s.keyboard=value.keyboard;
    s.timbre=['grand','upright'].includes(value.timbre)?value.timbre:'grand';
    if(typeof value.repeat==='boolean')s.repeat=value.repeat;
    s.practiceReview=P.safeState(value.practiceReview);
    s.learning=M.safeState(value.learning);
    s.reading=safeReading(value.reading);
    s.exams=X.safeState(value.exams);
    s.coach=K.safeState(value.coach);
    s.rhythm=R.safeState(value.rhythm);
    if(Array.isArray(value.replays))s.replays=value.replays.slice(-5).map(safeReplay).filter(Boolean);
    if(Array.isArray(value.completed))s.completed=value.completed.filter(x=>Number.isInteger(x)&&x>=0&&x<100).slice(0,100);
    if(Array.isArray(value.quiz))s.quiz=value.quiz.filter(x=>Number.isInteger(x)&&x>=0&&x<100).slice(0,100);
    if(Array.isArray(value.review))s.review=value.review.filter(x=>Number.isInteger(x)&&x>=0&&x<100).slice(0,100);
    if(Array.isArray(value.history))s.history=value.history.filter(h=>h&&typeof h.date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(h.date)&&typeof h.title==='string'&&Number.isFinite(h.seconds)&&h.seconds>=0).slice(-500).map(h=>({date:h.date,title:h.title.slice(0,100),seconds:Math.min(h.seconds,7200),mode:h.mode==='rhythm'?'rhythm':'wait',pitch:Math.max(0,Math.min(100,Number(h.pitch)||0)),timing:Number.isFinite(h.timing)?Math.max(0,Math.min(100,h.timing)):null,bpm:Number(h.bpm)||60,notation:['numbered','staff','both'].includes(h.notation)?h.notation:'staff'}));
    return s;
  }
  const api={name,frequency,numberPitch,numberDuration,events,measures,sliceMeasures,safeReplay,summarize,matchRhythm,safeState,safeReading};
  if(typeof module!=='undefined')module.exports=api;else root.PianoCore=api;
})(typeof window==='undefined'?globalThis:window);
