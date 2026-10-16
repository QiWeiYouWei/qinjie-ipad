(function(root){
  'use strict';
  const songId=id=>typeof id==='string'&&/^(builtin:\d{1,3}|custom:[a-z0-9][a-z0-9._-]{2,63})$/.test(id);
  const count=n=>Number.isInteger(n)&&n>=0&&n<=10000?n:0;
  function key(sequence){return JSON.stringify(sequence)}
  function stats(report){const out={total:0,hit:0,missed:0,extra:0,early:0,late:0,rest:0};for(const b of report.bars)for(const n of Object.keys(out))out[n]+=b[n];out.pitch=out.total?Math.round(out.hit/out.total*100):null;out.precision=out.hit+out.extra?Math.round(out.hit/(out.hit+out.extra)*100):null;out.timing=report.mode==='rhythm'&&out.hit?Math.round((out.hit-out.early-out.late)/out.hit*100):null;return out}
  function issues(b){return b.missed+b.extra+b.early+b.late}
  function analyze(p){
    if(!songId(p.songId)||![2,3,4].includes(p.meter)||!Array.isArray(p.expected)||!Array.isArray(p.matches)||!Array.isArray(p.capture)||Number.isFinite(p.actualCount)&&p.actualCount>p.capture.length)return null;
    const evaluated=p.expected.filter(e=>p.complete||(p.mode==='wait'?e.index<p.frontier:e.beat+.5<=p.elapsedBeats));if(!evaluated.length)return null;
    const ids=new Set(evaluated.map(e=>e.index)),buckets=new Map(),group=new Map();
    for(const e of evaluated){const bar=Math.floor((e.sourceBeat??e.beat)/p.meter)+1;if(!buckets.has(bar))buckets.set(bar,{bar,total:0,hit:0,missed:0,extra:0,early:0,late:0,rest:0});const b=buckets.get(bar);b.total+=e.notes.length;group.set(e.index,b)}
    const remaining=new Map();
    for(const m of p.matches){const b=group.get(m.index),e=evaluated.find(e=>e.index===m.index);if(!b||!e||!e.notes.includes(m.note))continue;const k=m.index+':'+m.note;if(remaining.has(k))continue;remaining.set(k,1);b.hit++;if(p.mode==='rhythm'&&Math.abs(m.delta)>.18)b[m.delta<0?'early':'late']++}
    for(const n of p.capture){let e;
      if(p.mode==='wait'){if(!ids.has(n.index))continue;e=evaluated.find(e=>e.index===n.index)}
      else{const beat=n.at*p.bpm/60;if(beat<0||beat>Math.max(...evaluated.map(e=>e.beat+e.duration))+.5)continue;e=evaluated.find(e=>beat>=e.beat&&beat<e.beat+e.duration)||evaluated.reduce((a,b)=>Math.abs(b.beat-beat)<Math.abs(a.beat-beat)?b:a)}
      if(!e)continue;const k=n.index+':'+n.note;
      if(remaining.get(k)&&(p.mode==='wait'||n.matched===true)){remaining.set(k,0);continue}
      const b=group.get(e.index);b.extra++;if(!e.notes.length)b.rest++;
    }
    for(const b of buckets.values())b.missed=Math.max(0,b.total-b.hit);
    const bars=[...buckets.values()].sort((a,b)=>a.bar-b.bar);
    return {songId:p.songId,title:String(p.title).slice(0,100),scoreKey:key(p.sequence),meter:p.meter,date:p.date,mode:p.mode==='rhythm'?'rhythm':'wait',bpm:p.bpm,notation:p.notation,hints:p.hints===true,timbre:p.timbre,complete:p.complete===true,first:Math.floor((p.expected[0].sourceBeat??p.expected[0].beat)/p.meter)+1,last:Math.floor((p.expected.at(-1).sourceBeat??p.expected.at(-1).beat)/p.meter)+1,bars};
  }
  function safeState(value){
    const out={reports:[]};if(!value||!Array.isArray(value.reports))return out;
    for(const r of value.reports.slice(-30)){
      if(!r||!songId(r.songId)||typeof r.title!=='string'||typeof r.scoreKey!=='string'||r.scoreKey.length>10000||!/^\d{4}-\d{2}-\d{2}$/.test(r.date)||!Number.isInteger(r.bpm)||r.bpm<35||r.bpm>120||!['wait','rhythm'].includes(r.mode)||!['numbered','staff','both'].includes(r.notation)||!Array.isArray(r.bars))continue;
      if(![2,3,4].includes(r.meter))continue;let maxBar;
      try{const seq=JSON.parse(r.scoreKey);if(!Array.isArray(seq)||!seq.length||seq.length>200||seq.some(e=>!Array.isArray(e)||e.length!==2||!(Number.isInteger(e[0])||Array.isArray(e[0])&&e[0].every(Number.isInteger))||![.25,.5,.75,1,1.5,2,3,4].includes(e[1])))continue;maxBar=Math.min(128,Math.ceil(seq.reduce((n,e)=>n+e[1],0)/r.meter))}catch(e){continue}
      const seen=new Set(),bars=[];
      for(const b of r.bars.slice(0,128)){if(!b||!Number.isInteger(b.bar)||b.bar<1||b.bar>maxBar||seen.has(b.bar))continue;seen.add(b.bar);const total=count(b.total),hit=Math.min(total,count(b.hit)),extra=count(b.extra),early=Math.min(hit,count(b.early)),late=Math.min(hit-early,count(b.late));bars.push({bar:b.bar,total,hit,missed:total-hit,extra,early:r.mode==='rhythm'?early:0,late:r.mode==='rhythm'?late:0,rest:Math.min(extra,count(b.rest))})}
      if(!bars.length)continue;bars.sort((a,b)=>a.bar-b.bar);const first=Number.isInteger(r.first)&&r.first>=1&&r.first<=bars[0].bar?r.first:bars[0].bar,last=Number.isInteger(r.last)&&r.last>=bars.at(-1).bar&&r.last<=maxBar?r.last:bars.at(-1).bar;out.reports.push({songId:r.songId,title:r.title.slice(0,100),scoreKey:r.scoreKey,meter:r.meter,date:r.date,mode:r.mode,bpm:r.bpm,notation:r.notation,hints:r.hints===true,timbre:r.timbre==='upright'?'upright':'grand',complete:r.complete===true,first,last,bars});
    }return out;
  }
  function previous(state,r){if(!r.complete)return null;return state.reports.slice().reverse().find(o=>o.complete&&['songId','scoreKey','meter','mode','bpm','notation','hints','timbre','first','last'].every(k=>o[k]===r[k]))||null}
  function compatible(r,exercise){return !!exercise&&exercise.id===r.songId&&(exercise.meter||4)===r.meter&&key(exercise.sequence)===r.scoreKey}
  function target(r,bar,meter,context=false){const sequence=JSON.parse(r.scoreKey),length=sequence.reduce((n,e)=>n+e[1],0),max=Math.ceil(length/meter);return {first:Math.max(1,bar-(context?1:0)),last:Math.min(max,bar+(context?1:0)),bpm:Math.max(35,r.bpm-10)}}
  const api={analyze,safeState,key,stats,issues,previous,compatible,target};if(typeof module!=='undefined')module.exports=api;else root.PianoPracticeReview=api;
})(typeof window==='undefined'?globalThis:window);
