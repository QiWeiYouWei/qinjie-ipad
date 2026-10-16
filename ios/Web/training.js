(function(root){
  'use strict';
  const C=typeof module!=='undefined'?require('./core.js'):root.PianoCore;
  const levels=[
    {title:'定位入门',description:'中央C到G：先记住C、E、G，再找相邻位置。',notes:[60,62,64,65,67]},
    {title:'一个八度',description:'中央C到高音C，分清线上与间内的音。',notes:[60,62,64,65,67,69,71,72]},
    {title:'上下扩展',description:'低音G到高音C，留意简谱音点与五线谱加线。',notes:[55,57,59,60,62,64,65,67,69,71,72]},
    {title:'升号挑战',description:'G3到B5，加入升号。简谱统一以1=C为参考。',notes:Array.from({length:29},(_,i)=>55+i)}
  ];
  const modes={bridge:'简谱配五线谱',staff:'看五线谱找音',numbered:'看简谱找音',review:'错音复习'};
  function shuffle(items,rng=Math.random){const out=items.slice();for(let i=out.length-1;i>0;i--){const j=Math.min(i,Math.max(0,Math.floor(rng()*(i+1))));[out[i],out[j]]=[out[j],out[i]]}return out}
  function weakNotes(reading){return reading.notes.filter(n=>n.attempts>n.correct&&n.streak<3).sort((a,b)=>(b.attempts-b.correct)/b.attempts-(a.attempts-a.correct)/a.attempts||a.streak-b.streak||a.note-b.note)}
  function round(level,mode,reading,rng=Math.random){
    const pool=levels[level]?.notes;if(!pool||!modes[mode])throw Error('训练难度或模式无效');
    const targets=mode==='review'?shuffle(weakNotes(reading).map(n=>n.note),rng).slice(0,10):[];
    if(mode!=='review')while(targets.length<10){const batch=shuffle(pool,rng);if(batch[0]===targets.at(-1))batch.push(batch.shift());targets.push(...batch.slice(0,10-targets.length))}
    return targets.map(note=>({note,choices:shuffle([note,...shuffle((mode==='review'?levels[3].notes:pool).filter(n=>n!==note),rng).slice(0,3)],rng)}));
  }
  function explanation(note){
    const steps=[0,0,1,1,2,3,3,4,4,5,5,6],step=(Math.floor(note/12)-5)*7+steps[note%12];
    let position;if(step<1){const distance=-step;position=distance%2===0?`下方第${distance/2+1}条加线`:`下方第${(distance+1)/2}条加线下方的间`}
    else if(step===1)position='下方第一条加线与第一线之间';
    else if(step<=10)position=step%2===0?`第${step/2}线`:`第${(step-1)/2}间`;
    else position=step%2===0?`上方第${(step-10)/2}条加线`:`第五线之上第${(step-9)/2}个间`;
    const p=C.numberPitch(note),oct=p.octave>0?`上方${p.octave}个音点`:p.octave<0?`下方${-p.octave}个音点`:'没有八度音点';
    return `${C.name(note)}在高音谱表的${position}；简谱是${p.accidental}${p.degree}，${oct}。${p.accidental?'升号表示比同位置的自然音高半音。':''}数字是音级，不是手指编号。`;
  }
  function record(reading,answers,{date,mode,level,seconds,complete}){
    if(!answers.length)return null;
    for(const a of answers){let item=reading.notes.find(n=>n.note===a.note);if(!item){item={note:a.note,attempts:0,correct:0,streak:0};reading.notes.push(item)}item.attempts++;if(a.correct){item.correct++;item.streak=Math.min(100,item.streak+1)}else item.streak=0}
    const entry={date,mode,level,total:answers.length,correct:answers.filter(a=>a.correct).length,seconds:Math.round(Math.min(600,Math.max(0,seconds))),complete:Boolean(complete)};
    reading.history.push(entry);reading.history=reading.history.slice(-100);return entry;
  }
  function card(note,notation){
    const N=root.PianoNotation,html=N.render(C.events([[note,1]]),{notation,hints:false});
    return html.replace(/viewBox="[^"]+"/,'viewBox="0 0 168 180"').replace(/width="\d+"/,'width="168"').replace('preserveAspectRatio="none"','preserveAspectRatio="xMidYMid meet"').replace(/<text x="90" y="(?:159|174)"[^>]*>.*?<\/text>/,'');
  }
  function mount({state,save,day,shell,play}){
    let current=null,last=null;
    const reading=state.reading;
    const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const $=s=>document.querySelector(s);
    function settle(complete=false){if(!current)return;const r=current;current=null;last=record(reading,r.answers,{date:day(),mode:r.mode,level:r.level,seconds:r.seconds,complete});save()}
    function start(mode=reading.mode){settle();reading.mode=mode;const questions=round(reading.level,mode,reading);if(!questions.length){last=null;paint();return}current={mode,level:reading.level,questions,index:0,answers:[],response:null,seconds:0,started:performance.now()};save();paint()}
    function answer(note){if(!current||current.response)return;const q=current.questions[current.index];const correct=note===q.note;current.seconds+=Math.min(30,(performance.now()-current.started)/1000);current.answers.push({note:q.note,correct});current.response={correct,selected:note};if(current.mode!=='bridge')play(note);paint()}
    function keyboard(){const notes=current.mode==='review'?levels[3].notes:levels[current.level].notes,min=notes[0],max=notes.at(-1),whites=[],blacks=[];let wi=0;const count=Array.from({length:max-min+1},(_,i)=>min+i).filter(n=>![1,3,6,8,10].includes(n%12)).length;
      for(let n=min;n<=max;n++){const label=root.PianoNotation.keyLabel(n,'numbered',true),disabled=current.response?'disabled':'';if([1,3,6,8,10].includes(n%12)){const width=67/count;blacks.push(`<button class="key black" data-reading-answer="${n}" ${disabled} style="width:${width}%;left:calc(${wi/count*100}% - ${width/2}%)" aria-label="${C.name(n)}"><span>${label}</span></button>`)}else{whites.push(`<button class="key white" data-reading-answer="${n}" ${disabled} aria-label="${C.name(n)}"><span>${label}</span></button>`);wi++}}return `<div class="keyboard-wrap"><div class="keyboard reading-keyboard" style="min-width:${count*50}px">${whites.join('')+blacks.join('')}</div></div>`}
    function paint(){
      const weak=weakNotes(reading),total=reading.history.reduce((n,h)=>n+h.total,0),correct=reading.history.reduce((n,h)=>n+h.correct,0);
      let content=`<div class="eyebrow">READ A LITTLE MUSIC</div><h1>把简谱，慢慢变成五线谱</h1><p class="muted">先看位置，再找对应音。每轮最多10题，不限答题速度。</p>`;
      if(current){const q=current.questions[current.index],responded=current.response,bridge=current.mode==='bridge',notation=current.mode==='numbered'?'numbered':'staff';
        content+=`<div class="reading-round card"><div class="row between"><span class="badge">${modes[current.mode]} · 第${current.index+1}/${current.questions.length}题</span><button id="reading-stop" class="small outline">结束并保存</button></div><h2>${bridge?'下面的简谱，对应哪一张五线谱？':'看这个音，在下面的键盘找到它'}</h2><div class="reading-question">${card(q.note,bridge?'numbered':notation)}</div>${bridge?`<div class="reading-choices">${q.choices.map((n,i)=>`<button data-reading-answer="${n}" ${responded?'disabled':''} class="reading-choice ${responded&&n===q.note?'is-correct':responded&&n===responded.selected?'is-wrong':''}" aria-label="选项${i+1}"><span>选项${i+1}</span>${card(n,'staff')}</button>`).join('')}</div>`:keyboard()}<div class="reading-feedback" role="status">${responded?`<div class="callout ${responded.correct?'':'reading-error'}"><b>${responded.correct?'答对了。':'这次没选对，看看这个对应关系。'}</b><p>${esc(explanation(q.note))}</p><div class="reading-pair">${card(q.note,'numbered')}${card(q.note,'staff')}</div><div class="row"><button class="small outline" id="reading-listen">♫ 听正确的音</button><button id="reading-next" class="primary">${current.index+1===current.questions.length?'查看这一轮结果':'下一题 →'}</button></div></div>`:'先自己判断；答题后会显示简谱与五线谱对照。'}</div></div>`;
      }else{
        if(last)content+=`<div class="card reading-result"><h2>${last.complete?'这一轮完成了':'本轮已保存'}</h2><div class="row"><span class="note-chip">首次答对 ${last.correct}/${last.total}</span><span class="note-chip">正确率 ${Math.round(last.correct/last.total*100)}%</span></div><p>${last.correct===last.total?'这轮很稳，可以换成看五线谱找音，或逐步提高难度。':'先看懂答错音的对照关系，再做错音复习。连对3次后会移出待巩固列表。'}</p><button class="primary" id="reading-again">再来一轮</button></div>`;
        content+=`<div class="grid"><div class="card"><h2>按熟悉程度选择</h2><label class="field">难度<select id="reading-level">${levels.map((l,i)=>`<option value="${i}" ${reading.level===i?'selected':''}>${l.title}</option>`).join('')}</select></label><p id="reading-level-help">${levels[reading.level].description}</p><div class="reading-mode-list">${['bridge','staff','numbered'].map(m=>`<button class="outline" data-reading-mode="${m}">${modes[m]} →</button>`).join('')}</div><p class="audio-note">默认先做配对，熟悉后再找音。这里练音高对应，不评节奏与手指。</p></div><div class="card"><h2>错音复习</h2><p>待巩固 <b>${weak.length}</b> 个音。每个错音连续答对3次后移出列表，历史错误仍保留。</p>${weak.length?`<div class="reading-weak">${weak.slice(0,8).map(n=>`<span class="note-chip">${C.name(n.note)} · 连对${n.streak}/3</span>`).join('')}</div><button class="primary" id="reading-review">复习这些音 →</button>`:'<div class="callout">先完成一轮训练。答错的音会自动进入这里。</div>'}<p class="audio-note">累计${total}题 · 首次答对${correct}题${total?' · '+Math.round(correct/total*100)+'%':''}。退出或切到后台会保存已答题，不把未答题算成错误。</p></div></div><div class="card"><h2>最近的识谱训练</h2>${reading.history.length?reading.history.slice(-6).reverse().map(h=>`<div class="history-item"><b>${modes[h.mode]} · ${h.correct}/${h.total}</b><small>${h.date} · ${levels[h.level].title} · ${h.complete?'完成一轮':'部分练习'} · 有效${h.seconds}秒</small></div>`).join(''):'<p class="muted">还没有记录，从“简谱配五线谱”开始。</p>'}</div>`;
      }
      shell(content);document.querySelector('.main').classList.add('reading-main');
      document.querySelectorAll('[data-reading-answer]').forEach(b=>b.onclick=()=>answer(Number(b.dataset.readingAnswer)));
      document.querySelectorAll('[data-reading-mode]').forEach(b=>b.onclick=()=>start(b.dataset.readingMode));
      if($('#reading-level'))$('#reading-level').onchange=e=>{reading.level=Number(e.target.value);save();$('#reading-level-help').textContent=levels[reading.level].description};
      if($('#reading-review'))$('#reading-review').onclick=()=>start('review');
      if($('#reading-again'))$('#reading-again').onclick=()=>start(reading.mode==='review'&&!weak.length?'staff':reading.mode);
      if($('#reading-stop'))$('#reading-stop').onclick=()=>{settle();paint()};
      if($('#reading-next'))$('#reading-next').onclick=()=>{if(!current?.response)return;if(++current.index>=current.questions.length)settle(true);else{current.response=null;current.started=performance.now()}paint();document.querySelector('.reading-round')?.scrollIntoView({block:'start'})};
      if($('#reading-listen'))$('#reading-listen').onclick=()=>play(current.questions[current.index].note);
    }
    paint();return {stop(){settle()},pause(){settle();if(document.querySelector('.reading-main'))paint()}};
  }
  const api={levels,modes,shuffle,weakNotes,round,explanation,record,mount};
  if(typeof module!=='undefined')module.exports=api;else root.PianoTraining=api;
})(typeof window==='undefined'?globalThis:window);
