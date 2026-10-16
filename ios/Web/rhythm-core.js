(function(root){
  'use strict';
  const repeat=(bar,n=4)=>Array.from({length:n},()=>bar.map(([hit,duration])=>({hit:!!hit,duration}))).flat();
  const patterns=[
    {id:'pulse-four',title:'四拍走稳',level:0,meter:4,desc:'每拍轻拍一次，先听清第一拍的重音。',count:'1、2、3、4',events:repeat([[1,1],[1,1],[1,1],[1,1]])},
    {id:'pulse-three',title:'三拍摇摆',level:0,meter:3,desc:'感受强、弱、弱，每三拍换一小节。',count:'1、2、3',events:repeat([[1,1],[1,1],[1,1]])},
    {id:'pulse-two',title:'两拍交替',level:0,meter:2,desc:'第一拍略强调，第二拍放松，保持同样间隔。',count:'1、2',events:repeat([[1,1],[1,1]])},
    {id:'quarter-rest',title:'拍一下，等一下',level:0,meter:4,desc:'0表示休止。保持心中的拍点，休止时不要触碰拍击区。',count:'1、等、3、等',events:repeat([[1,1],[0,1],[1,1],[0,1]])},
    {id:'eighth-pairs',title:'一拍分两半',level:1,meter:4,desc:'每拍平均分成两次。可以把节拍器细分设为半拍。',count:'1 & 2 & 3 & 4 &',events:repeat(Array.from({length:8},()=>[1,.5]))},
    {id:'long-short',title:'长短接起来',level:1,meter:4,desc:'两次半拍接一次整拍，长音期间保持等待。这里只检查拍击起点。',count:'1 & 2、3 & 4',events:repeat([[1,.5],[1,.5],[1,1],[1,.5],[1,.5],[1,1]])},
    {id:'dotted-step',title:'附点不抢拍',level:2,meter:4,desc:'第一段等待一拍半，第二次拍击落在第二拍的后半拍。',count:'1（等到2 &）、2 &、3、4',events:repeat([[1,1.5],[1,.5],[1,1],[1,1]])},
    {id:'offbeat',title:'从后半拍进入',level:2,meter:4,desc:'每小节先休止半拍，再从“&”进入。不要听到重拍就立刻拍。',count:'等 &、2、3 &、4',events:repeat([[0,.5],[1,.5],[1,1],[1,.5],[1,.5],[1,1]])},
    {id:'sixteenth',title:'四等分小挑战',level:2,meter:4,desc:'第一拍平均分成四次，随后整拍、半拍与休止。先用低速练。',count:'1 e & a、2、3 &、等',events:repeat([[1,.25],[1,.25],[1,.25],[1,.25],[1,1],[1,.5],[1,.5],[0,1]])}
  ];
  const get=id=>patterns.find(p=>p.id===id);
  const round=(n,d=1000)=>Math.round(n*d)/d;
  function timeline(pattern,bpm){
    if(!get(pattern?.id)||!Number.isFinite(bpm)||bpm<35||bpm>160)throw Error('节奏或速度无效');
    let beat=0;const unit=60/bpm;
    const events=pattern.events.map((e,index)=>{const value={...e,index,beat,at:beat*unit,bar:Math.floor(beat/pattern.meter)+1};beat+=e.duration;return value});
    const targets=events.filter(e=>e.hit).map((e,index,list)=>{
      const previous=index?e.at-list[index-1].at:Infinity,next=index<list.length-1?list[index+1].at-e.at:Infinity;
      const window=Math.min(.25,.45*unit,.49*previous,.49*next);
      return {...e,target:index,window,onTime:Math.min(.08,.12*unit,window*.65)};
    });
    return {events,targets,beats:beat,end:beat*unit,unit};
  }
  function match(targets,used,at){
    return targets.find(t=>!used.has(t.target)&&Math.abs(at-t.at)<=t.window+1e-9)||null;
  }
  function evaluate(patternId,taps,{bpm=60,offsetMs=null}={}){
    const p=get(patternId);if(!p||!Array.isArray(taps)||taps.length>160||!Number.isFinite(bpm)||bpm<35||bpm>160||(offsetMs!==null&&(!Number.isFinite(offsetMs)||Math.abs(offsetMs)>150)))return null;
    const track=timeline(p,bpm);
    if(taps.some(t=>!Number.isFinite(t)||t<-.45||t>track.end+.3))return null;
    const used=new Set(),details=[],extras=[],offset=(offsetMs||0)/1000;
    // Windows do not overlap. Each target can consume one actual tap, in time order.
    for(const raw of taps.slice().sort((a,b)=>a-b)){
      const at=raw-offset,target=match(track.targets,used,at);
      if(target){used.add(target.target);const delta=at-target.at;details.push({target:target.target,bar:target.bar,beat:round(target.beat%p.meter+1),deltaMs:Math.round(delta*1000),status:Math.abs(delta)<=target.onTime+1e-9?'onTime':delta<0?'early':'late'})}
      else{const event=track.events.find(e=>at>=e.at&&at<(e.beat+e.duration)*track.unit);extras.push({at:round(raw),bar:Math.min(4,Math.max(1,Math.floor(Math.max(0,at)/track.unit/p.meter)+1)),rest:!!event&&!event.hit})}
    }
    for(const t of track.targets)if(!used.has(t.target))details.push({target:t.target,bar:t.bar,beat:round(t.beat%p.meter+1),deltaMs:null,status:'missed'});
    details.sort((a,b)=>a.target-b.target);
    const hit=used.size,total=track.targets.length,onTime=details.filter(d=>d.status==='onTime').length;
    return {hit,total,missed:total-hit,extra:extras.length,rest:extras.filter(e=>e.rest).length,early:details.filter(d=>d.status==='early').length,late:details.filter(d=>d.status==='late').length,onTime,coverage:Math.round(hit/total*100),precision:taps.length?Math.round(hit/taps.length*100):0,timing:hit?Math.round(onTime/hit*100):null,meanAbsMs:hit?Math.round(details.filter(d=>d.deltaMs!==null).reduce((s,d)=>s+Math.abs(d.deltaMs),0)/hit):null,details,extras};
  }
  function validDate(value){if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const date=new Date(value+'T00:00:00Z');return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value}
  function cleanEntry(h){
    if(!h||!get(h.patternId)||!validDate(h.date)||!Number.isFinite(h.bpm)||h.bpm<35||h.bpm>160||!Number.isFinite(h.elapsed)||!Array.isArray(h.taps)||h.taps.length>160||typeof h.complete!=='boolean'||typeof h.assist!=='boolean'||!([1,2,4].includes(h.subdivision))||typeof h.accent!=='boolean'||(h.offsetMs!==null&&(!Number.isFinite(h.offsetMs)||Math.abs(h.offsetMs)>150)))return null;
    const track=timeline(get(h.patternId),h.bpm);
    if(h.elapsed<0||h.elapsed>track.end+.5||h.taps.some(t=>!Number.isFinite(t)||t<-.45||t>Math.min(track.end+.3,h.elapsed+.02)))return null;
    const complete=h.complete&&h.elapsed>=track.end;
    return {date:h.date,patternId:h.patternId,bpm:h.bpm,assist:h.assist,subdivision:h.assist?h.subdivision:1,accent:h.assist?h.accent:false,offsetMs:h.offsetMs,complete,elapsed:round(h.elapsed,1000000),taps:h.taps.map(t=>round(t,1000000)),reason:String(h.reason||'').slice(0,100)};
  }
  function safeState(value){
    const state={bpm:60,meter:4,subdivision:1,accent:true,sound:true,patternId:'pulse-four',assist:true,useCalibration:true,history:[]};
    if(!value||typeof value!=='object')return state;
    if(Number.isFinite(value.bpm))state.bpm=Math.max(35,Math.min(160,Math.round(value.bpm)));
    if([2,3,4].includes(value.meter))state.meter=value.meter;
    if([1,2,4].includes(value.subdivision))state.subdivision=value.subdivision;
    for(const k of ['accent','sound','assist','useCalibration'])if(typeof value[k]==='boolean')state[k]=value[k];
    if(get(value.patternId))state.patternId=value.patternId;
    if(Array.isArray(value.history))state.history=value.history.slice(-100).map(cleanEntry).filter(Boolean).slice(-30);
    return state;
  }
  function previous(history,current){
    if(!current?.complete)return null;
    return history.slice().reverse().find(h=>h.complete&&['patternId','bpm','assist','subdivision','accent','offsetMs'].every(k=>h[k]===current[k]))||null;
  }
  const api={patterns,get,timeline,match,evaluate,cleanEntry,safeState,previous};
  if(typeof module!=='undefined')module.exports=api;else root.PianoRhythmCore=api;
})(typeof window==='undefined'?globalThis:window);
