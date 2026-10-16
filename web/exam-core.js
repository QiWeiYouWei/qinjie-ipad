(function(root){
  'use strict';
  const version=1;
  const levels=[
    {title:'A · 五指与长音',bpm:60,description:'五个白键，四分与二分音符，完整短句。'},
    {title:'B · 音阶与休止',bpm:66,description:'一个八度，长短时值与休止，保持稳定拍感。'},
    {title:'C · 八分与双音',bpm:72,description:'八分音符、短琶音、双音同时起落。'},
    {title:'D · 附点与变化音',bpm:80,description:'附点与八分组合，升号，双音与休止。'}
  ];
  const clamp=(n,a=0,b=100)=>Math.max(a,Math.min(b,n)),round=n=>Math.round(n*10)/10;
  function random(seed){let x=seed>>>0;return ()=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return x/4294967296}}
  function shuffle(items,rng){const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
  function events(sequence){let beat=0;return sequence.map(([notes,duration],index)=>{const e={index,notes:Array.isArray(notes)?notes:[notes],beat,duration};beat+=duration;return e})}
  function median(a){const s=[...a].sort((x,y)=>x-y);return s.length?s.length%2?s[(s.length-1)/2]:(s[s.length/2-1]+s[s.length/2])/2:0}
  function calibration(taps,ticks){
    const offsets=[],used=new Set();for(const tap of taps){let best=-1;for(let i=4;i<ticks.length;i++)if(!used.has(i)&&Math.abs(tap-ticks[i])<=.25&&(best<0||Math.abs(tap-ticks[i])<Math.abs(tap-ticks[best])))best=i;if(best>=0){used.add(best);offsets.push((tap-ticks[best])*1000)}}
    const offset=median(offsets),jitter=median(offsets.map(n=>Math.abs(n-offset)));
    return {valid:offsets.length===8&&taps.length===8&&Math.abs(offset)<=150&&jitter<=35,offsetMs:round(offset),jitterMs:round(jitter),count:offsets.length};
  }
  // Per-pitch dynamic programming: maximize one-to-one matches, then minimize error.
  // Never align the performance retrospectively or adapt its tempo to improve marks.
  function align(targets,actual){
    const pairs=[];
    for(const note of new Set(targets.map(t=>t.note))){
      const t=targets.filter(t=>t.note===note),a=actual.filter(a=>a.note===note),cols=a.length+1,size=(t.length+1)*cols;
      const hits=new Uint16Array(size),errors=new Float64Array(size),moves=new Uint8Array(size);
      for(let i=1;i<=t.length;i++)moves[i*cols]=1;for(let j=1;j<=a.length;j++)moves[j]=2;
      for(let i=1;i<=t.length;i++)for(let j=1;j<=a.length;j++){
        const k=i*cols+j,up=k-cols,left=k-1,diag=k-cols-1;
        const best=hits[up]>hits[left]||hits[up]===hits[left]&&errors[up]<=errors[left]?up:left;
        hits[k]=hits[best];errors[k]=errors[best];moves[k]=best===up?1:2;
        const delta=Math.abs(a[j-1].at-t[i-1].at),window=t[i-1].window;
        if(delta<=window){const h=hits[diag]+1,e=errors[diag]+delta/window;if(h>hits[k]||h===hits[k]&&e<errors[k]){hits[k]=h;errors[k]=e;moves[k]=3}}
      }
      let i=t.length,j=a.length;while(i||j){const move=moves[i*cols+j];if(move===3){pairs.push({target:t[i-1],actual:a[j-1],delta:a[j-1].at-t[i-1].at});i--;j--}else if(move===1)i--;else j--}
    }return pairs.sort((a,b)=>a.target.id-b.target.id);
  }
  function quality(error,good,bad){return error<=good?100:error>=bad?0:100*(bad-error)/(bad-good)}
  function unionLength(intervals){const a=intervals.filter(([s,e])=>e>s).sort((a,b)=>a[0]-b[0]);let total=0,start=0,end=0;for(const [s,e] of a){if(s>end){total+=end-start;start=s;end=e}else end=Math.max(end,e)}return total+end-start}
  function evaluate(sequence,input,{bpm=60,offsetMs=0,meter=4}={}){
    if(!Array.isArray(input)||input.length>600||!Number.isFinite(bpm)||bpm<35||bpm>120||!Number.isFinite(offsetMs)||Math.abs(offsetMs)>150||input.some(n=>!n||!Number.isInteger(n.note)||n.note<55||n.note>83||!Number.isFinite(n.at)||n.at< -10||n.at>300||!Number.isFinite(n.duration)||n.duration<0||n.duration>300))return {valid:false,reason:'输入记录不完整或越界，无法可靠评分'};
    const unit=60/bpm,all=events(sequence),targets=[];
    for(const e of all)for(const note of e.notes)targets.push({id:targets.length,note,event:e.index,beat:e.beat,at:e.beat*unit,duration:e.duration*unit,window:Math.min(.24,unit*.45,e.duration*unit*.45)});
    if(!targets.length)return {valid:false,reason:'考题没有目标音'};
    const actual=input.map((n,id)=>({...n,id,at:n.at-offsetMs/1000})).sort((a,b)=>a.at-b.at||a.id-b.id),pairs=align(targets,actual),byTarget=new Map(pairs.map(p=>[p.target.id,p])),groups=all.filter(e=>e.notes.length),starts=new Map(),details=[];
    for(const e of groups){const p=pairs.filter(p=>p.target.event===e.index);if(p.length)starts.set(e.index,median(p.map(p=>p.actual.at)))}
    let onset=0,hold=0;
    for(const t of targets){const p=byTarget.get(t.id);if(p){onset+=quality(Math.abs(p.delta),Math.max(.025,Math.min(.06,unit*.08)),Math.max(.065,Math.min(.15,unit*.3)));const ratio=p.actual.duration/t.duration;if(!p.actual.open)hold+=ratio>=.85&&ratio<=1.1?100:ratio<.85?quality(.85-ratio,0,.5):quality(ratio-1.1,0,.6)}
      details.push({note:t.note,bar:Math.floor(t.beat/meter)+1,beat:round(t.beat%meter+1),status:p?'matched':'missed',offsetMs:p?Math.round(p.delta*1000):null,holdPercent:p?Math.round(p.actual.duration/t.duration*100):null,open:p?.actual.open===true});
    }
    let continuity=0,interruptions=0;
    for(let i=1;i<groups.length;i++){const a=groups[i-1],b=groups[i];if(starts.has(a.index)&&starts.has(b.index)){const expected=(b.beat-a.beat)*unit,interval=starts.get(b.index)-starts.get(a.index),error=Math.abs(interval-expected)/expected;continuity+=quality(error,.1,.4);if(interval-expected>Math.max(unit*.5,.25))interruptions++}else interruptions++}
    const chords=groups.filter(e=>e.notes.length>1);let chord=0;
    for(const e of chords){const p=pairs.filter(p=>p.target.event===e.index);if(p.length===e.notes.length){const times=p.map(p=>p.actual.at);chord+=quality(Math.max(...times)-Math.min(...times),.04,.14)}}
    const rests=all.filter(e=>!e.notes.length);let restLength=0,violation=0;
    for(const e of rests){const start=e.beat*unit+.04,end=(e.beat+e.duration)*unit-.04;if(end>start){restLength+=end-start;violation+=unionLength(actual.map(n=>[Math.max(start,n.at),Math.min(end,n.at+n.duration)]))}}
    const hit=pairs.length,extra=actual.length-hit,metrics={pitch:100*2*hit/(targets.length+actual.length),onset:onset/targets.length,duration:hold/targets.length,continuity:groups.length>1?continuity/(groups.length-1):null,chord:chords.length?chord/chords.length:null,rests:restLength?100*(1-violation/restLength):null};
    const weights={pitch:30,onset:25,duration:20,continuity:15,chord:5,rests:5};let sum=0,weight=0;for(const k of Object.keys(weights))if(metrics[k]!==null){sum+=clamp(metrics[k])*weights[k];weight+=weights[k];metrics[k]=round(clamp(metrics[k]))}
    const score=round(sum/weight),errors=details.filter(d=>d.status==='missed'||d.open||Math.abs(d.offsetMs)>Math.max(60,unit*80)||d.holdPercent<85||d.holdPercent>110).slice(0,80);
    const recall=round(hit/targets.length*100),precision=round(actual.length?hit/actual.length*100:0),gates=recall>=85&&precision>=85&&metrics.pitch>=80&&metrics.onset>=60&&metrics.duration>=55&&score>=60;
    return {valid:true,version,score,metrics,weights:Object.fromEntries(Object.keys(weights).filter(k=>metrics[k]!==null).map(k=>[k,round(weights[k]/weight*100)])),recall,precision,hit,total:targets.length,missed:targets.length-hit,extra,interruptions,restViolationMs:Math.round(violation*1000),biasMs:hit?Math.round(median(pairs.map(p=>p.delta))*1000):null,gates,details,errors,actual:input.map(n=>({note:n.note,at:round(n.at*1000)/1000,duration:round(n.duration*1000)/1000,open:n.open===true})),bpm,offsetMs};
  }
  const theory=[
    ['简谱中0表示什么？',['休止','中央C','用大拇指','升高八度'],0,0],['2/4拍每小节有几拍四分音符？',['2拍','3拍','4拍','8拍'],0,0],['一个二分音符等于几个四分音符？',['2个','1个','3个','4个'],0,0],['中央C的音名是什么？',['C4','C3','A4','G4'],0,0],['简谱数字是指什么？',['音级','手指编号','按键力度','速度'],0,0],
    ['4/4拍的一小节应包含几拍？',['4拍','2拍','3拍','6拍'],0,1],['升号♯表示什么？',['升高半音','升高八度','延长一拍','减弱音量'],0,1],['C大调主和弦是哪三个音？',['C E G','C D E','D F A','E G B'],0,1],['遇到休止符时应怎样处理？',['按时保持安静','跳过不计时间','延长前音填满','加快速度'],0,1],['重复的同音怎样重新起音？',['松开再按','一直按住','改弹邻键','用力滑动'],0,1],
    ['两个八分音符相当于什么？',['一个四分音符','一个二分音符','一个全音符','四个四分音符'],0,2],['大三和弦从根音算起的半音距离是？',['0、4、7','0、3、7','0、2、5','0、5、9'],0,2],['小三和弦从根音算起的半音距离是？',['0、3、7','0、4、7','0、2、6','0、5、7'],0,2],['琶音通常怎样弹奏？',['和弦音先后展开','所有音永远同时按','只弹根音','只弹黑键'],0,2],['视奏中偶尔错音，最需要维持的是？',['拍感与连续进行','停下从头重来','任意改变速度','跳掉所有休止'],0,2],
    ['附点四分音符有几拍？',['1.5拍','1拍','2拍','0.5拍'],0,3],['附点八分加十六分音符合计几拍？',['1拍','0.5拍','1.5拍','2拍'],0,3],['还原号♮的作用是什么？',['取消此前的升降变化','提高音量','延长时值','升高半音'],0,3],['演奏完谱面最后长音时应该？',['保持够时值再松开','按到就结束','马上重按一次','任意延长十秒'],0,3],['什么情况更说明节拍不稳定？',['非谱面要求的停顿或忽快忽慢','按谱面休止','按谱面长音','准确换音'],0,3]
  ];
  function questions(level,rng){
    const quiz=shuffle(theory.filter(q=>q[3]===level),rng).map(([prompt,options,answer])=>{const order=shuffle(options.map((text,i)=>({text,correct:i===answer})),rng);return {prompt,options:order.map(x=>x.text),answer:order.findIndex(x=>x.correct)}});
    const ears=Array.from({length:5},(_,i)=>{
      let prompt,options,answer,sounds;
      const base=60+Math.floor(rng()*4);
      if(level===0){const direction=Math.floor(rng()*3);prompt='第二个音相对第一个音怎样变化？';options=['上行','下行','同音'];answer=direction;sounds=[[base,.65],[base+[4,-3,0][direction],.65]]}
      else if(level===1){answer=Math.floor(rng()*3);prompt='这两个音的间隔是哪一种？';options=['大三度','小三度','纯五度'];sounds=[[base,.65],[base+[4,3,7][answer],.65]]}
      else if(level===2){answer=Math.floor(rng()*2);prompt='同时响起的是哪一种和弦？';options=['大三和弦','小三和弦'];sounds=[[[base,base+[4,3][answer],base+7],1.2]]}
      else{answer=Math.floor(rng()*3);prompt='听节奏：四拍对应哪一种时值组合？';options=['1拍 + 1拍 + 2拍','1.5拍 + 0.5拍 + 2拍','0.5拍 + 0.5拍 + 1拍 + 2拍'];sounds=[[1,1,2],[1.5,.5,2],[.5,.5,1,2]][answer].map(d=>[base,d*.55])}
      const order=shuffle(options.map((text,i)=>({text,correct:i===answer})),rng);return {prompt,options:order.map(x=>x.text),answer:order.findIndex(x=>x.correct),sounds};
    });return {quiz,ears};
  }
  function sight(level,rng){
    const pools=[[60,62,64,65,67],[60,62,64,65,67,69,71,72],[60,62,64,65,67,69,72],[60,61,62,64,65,66,67,69,70,72]],pool=pools[level],sequence=[];
    const patterns=level<1?[[1,1,2],[2,2]]:level===1?[[1,1,2],[2,1,1]]:level===2?[[.5,.5,1,2],[1,1,1,1]]:[[1.5,.5,1,1],[.75,.25,1,2]];
    for(let bar=0;bar<4;bar++){const pattern=patterns[Math.floor(rng()*patterns.length)];pattern.forEach((duration,i)=>{const n=pool[Math.floor(rng()*pool.length)],rest=level>0&&bar===2&&i===pattern.length-1;sequence.push([rest?[]:level>1&&bar===1&&i===0?[60,64]:[n],duration])})}
    sequence[sequence.length-1]=[[60],sequence[sequence.length-1][1]];return sequence;
  }
  function paper(level,seed,pack){
    level=clamp(Math.trunc(level),0,3);const rng=random(seed),q=questions(level,rng),technical=pack.songs.find(s=>s.id==='qinjie.exam.tech.'+level),piece=pack.songs.find(s=>s.id==='qinjie.exam.piece.'+level);
    if(!technical||!piece)throw Error('考核曲目缺失');
    return [{kind:'technical',title:'基本技术 · '+technical.title,weight:25,sequence:technical.sequence,meter:4},{kind:'piece',title:'完整短曲 · '+piece.title,weight:35,sequence:piece.sequence,meter:4},{kind:'sight',title:'随机视奏 · 30秒预览',weight:20,sequence:sight(level,rng),meter:4},{kind:'ear',title:'听辨 · 5题',weight:10,questions:q.ears},{kind:'theory',title:'乐理 · 5题',weight:10,questions:q.quiz}];
  }
  function verdict(stages,{calibrated=true}={}){
    if(stages.length!==5||stages.some((s,i)=>s.kind!==['technical','piece','sight','ear','theory'][i]||s.weight!==[25,35,20,10,10][i]||!Number.isFinite(s.score)||s.score<0||s.score>100||s.valid!==true))return {total:null,grade:'未完成',passed:false,reasons:['完整完成五部分后才生成综合成绩']};
    const total=round(stages.reduce((n,s)=>n+s.score*s.weight/100,0)),reasons=[];
    for(const s of stages){if(s.metrics){if(!s.gates)reasons.push(s.title+'：覆盖/精确率均≥85%、音高≥80、起音≥60、时长≥55且本站≥60才达标')}else if(s.score<40)reasons.push(s.title+'：正确率须达到40%')}
    if(total<70)reasons.push('综合分须达到70');if(!calibrated)reasons.push('尚未跟拍校准，成绩作为参考');
    const passed=!reasons.length,grade=!calibrated?'参考分 · 未校准':!passed?'待巩固':total>=90&&stages.every(s=>s.score>=80)?'优秀':total>=85&&stages.every(s=>s.score>=70)?'稳固达标':'基础达标';
    return {total,grade,passed,reasons};
  }
  function safeState(value){
    const state={level:0,notation:'numbered',calibration:null,history:[]};if(!value||typeof value!=='object')return state;
    if(Number.isInteger(value.level)&&value.level>=0&&value.level<=3)state.level=value.level;if(['numbered','staff','both'].includes(value.notation))state.notation=value.notation;
    const c=value.calibration;if(c&&Number.isFinite(c.offsetMs)&&Math.abs(c.offsetMs)<=150&&Number.isFinite(c.jitterMs)&&c.jitterMs>=0&&c.jitterMs<=35&&/^\d{4}-\d{2}-\d{2}$/.test(c.date))state.calibration={offsetMs:c.offsetMs,jitterMs:c.jitterMs,date:c.date};
    if(Array.isArray(value.history))state.history=value.history.slice(-20).filter(h=>h&&/^\d{4}-\d{2}-\d{2}$/.test(h.date)&&Number.isInteger(h.level)&&h.level>=0&&h.level<=3&&['complete','interrupted'].includes(h.status)).map(h=>{
      const stages=Array.isArray(h.stages)?h.stages.slice(0,5).filter(s=>s&&typeof s==='object').map(s=>{const clean={kind:['technical','piece','sight','ear','theory'].includes(s.kind)?s.kind:'piece',title:String(s.title||'考核').slice(0,100),weight:clamp(Number(s.weight)||0),score:clamp(Number(s.score)||0),valid:s.valid===true,gates:false};
        if(s.metrics){clean.metrics={};for(const k of ['pitch','onset','duration','continuity','chord','rests'])clean.metrics[k]=s.metrics[k]===null?null:clamp(Number(s.metrics[k])||0);for(const k of ['hit','total','missed','extra','interruptions','restViolationMs'])clean[k]=clamp(Math.trunc(Number(s[k])||0),0,100000);clean.biasMs=Number.isFinite(s.biasMs)?clamp(s.biasMs,-10000,10000):null;clean.errors=Array.isArray(s.errors)?s.errors.slice(0,80).filter(d=>d&&Number.isInteger(d.note)&&d.note>=55&&d.note<=83).map(d=>({note:d.note,bar:clamp(Math.trunc(d.bar)||1,1,100),beat:clamp(Number(d.beat)||1,1,4),status:d.status==='missed'?'missed':'matched',offsetMs:Number.isFinite(d.offsetMs)?clamp(d.offsetMs,-10000,10000):null,holdPercent:Number.isFinite(d.holdPercent)?clamp(d.holdPercent,0,10000):null,open:d.open===true})):[]}
        if(clean.metrics){clean.recall=clamp(clean.total?clean.hit/clean.total*100:0);clean.precision=clamp(clean.hit+clean.extra?clean.hit/(clean.hit+clean.extra)*100:0);clean.gates=clean.recall>=85&&clean.precision>=85&&clean.score>=60&&clean.metrics.pitch>=80&&clean.metrics.onset>=60&&clean.metrics.duration>=55}
        if(Array.isArray(s.actual))clean.actual=s.actual.slice(0,160).filter(n=>n&&Number.isInteger(n.note)&&n.note>=55&&n.note<=83&&Number.isFinite(n.at)&&n.at>=-10&&n.at<=300&&Number.isFinite(n.duration)&&n.duration>=0&&n.duration<=300).map(n=>({note:n.note,at:n.at,duration:n.duration,open:n.open===true}));
        if(Array.isArray(s.items))clean.items=s.items.slice(0,5).filter(q=>q&&typeof q==='object').map(q=>({prompt:String(q.prompt||'').slice(0,200),selected:String(q.selected||'').slice(0,150),correct:String(q.correct||'').slice(0,150),hit:q.hit===true}));
        if(s.correct!==undefined)clean.correct=clamp(Math.trunc(Number(s.correct)||0),0,5);
        return clean;}).filter(Boolean):[];
      const calibrated=Number.isFinite(h.offsetMs)&&Math.abs(h.offsetMs)<=150,v=h.status==='complete'?verdict(stages,{calibrated}):{total:null,grade:'未完成',passed:false,reasons:[]};
      return {date:h.date,level:h.level,status:h.status,seed:Math.trunc(Number(h.seed)||0)>>>0,notation:['numbered','staff','both'].includes(h.notation)?h.notation:'numbered',offsetMs:calibrated?h.offsetMs:null,stages,...v,reason:String(h.reason||'').slice(0,160)};
    });return state;
  }
  const api={version,levels,random,shuffle,events,median,calibration,align,evaluate,sight,paper,verdict,safeState};if(typeof module!=='undefined')module.exports=api;else root.PianoExamCore=api;
})(typeof window==='undefined'?globalThis:window);
