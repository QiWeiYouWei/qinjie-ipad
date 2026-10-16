(function(root){
  'use strict';
  const R=root.PianoRhythmCore,esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function mount({state,save,day,shell,ensureClock,now,running,inputTime,click,stopSound}){
    const prefs=state.rhythm,$=s=>document.querySelector(s);
    let run=null,pending=false,disposed=false,generation=0,frame=null,last=prefs.history.at(-1)||null,notice='选一段节奏，先听，再用一根手指轻拍。';
    const calibrated=()=>prefs.useCalibration&&state.exams.calibration?state.exams.calibration.offsetMs:null;
    function patternView(pattern){let beat=0;const events=pattern.events.map((e,index)=>{const at=beat;beat+=e.duration;return {e,index,at}});return `<div class="rhythm-bars">${[0,1,2,3].map(bar=>`<div class="rhythm-bar"><small>第${bar+1}小节</small><div class="rhythm-cells">${events.filter(item=>item.at>=bar*pattern.meter&&item.at<(bar+1)*pattern.meter).map(({e,index,at})=>`<div data-rhythm-event="${index}" class="rhythm-cell ${e.hit?'attack':'rest'}" style="flex:${e.duration}" title="第${at%pattern.meter+1}拍 · ${e.duration}拍时值" aria-label="${e.hit?'拍一下':'休止'}，${e.duration}拍"><b>${e.hit?'●':'0'}</b><span>${at%pattern.meter+1}</span></div>`).join('')}</div></div>`).join('')}</div>`}
    function resultView(entry){
      if(!entry)return '';
      const p=R.get(entry.patternId),index=prefs.history.indexOf(entry),previous=R.previous(prefs.history.slice(0,Math.max(0,index)),entry);
      if(!entry.complete)return `<article class="card rhythm-result"><span class="badge">${entry.date} · 部分练习</span><h2>${p.title} · 本轮未完成</h2><p>已拍${entry.taps.length}次，进行${Math.round(entry.elapsed)}秒。${esc(entry.reason)} 中断时不评价完整节奏，也不把后面的目标判为漏拍。</p><button class="small outline" data-rhythm-retry>准备再练一次</button></article>`;
      const report=R.evaluate(entry.patternId,entry.taps,entry),older=previous?R.evaluate(previous.patternId,previous.taps,previous):null;
      return `<article class="card rhythm-result"><span class="badge">${entry.date} · ${entry.bpm} BPM · ${entry.assist?'伴拍开启':'独立拍击'} · ${entry.offsetMs===null?'未校准参考':`校准${entry.offsetMs}毫秒`}</span><h2>${p.title} · 本轮复盘</h2><div class="rhythm-metrics"><div><span>目标命中</span><b>${report.coverage}%</b><small>${report.hit}/${report.total}次</small></div><div><span>按拍准确</span><b>${report.precision}%</b><small>多拍${report.extra}次</small></div><div><span>命中拍的时机</span><b>${report.timing===null?'—':report.timing+'%'}</b><small>偏早${report.early} · 偏晚${report.late}</small></div></div><p>漏拍${report.missed}次 · 休止期间多拍${report.rest}次 · 命中拍的平均绝对偏差${report.meanAbsMs===null?'—':report.meanAbsMs+'毫秒'}。</p>${older?`<div class="callout">上一遍相同速度、伴拍、细分、重音与校准条件：命中${older.coverage}% → ${report.coverage}%，按拍准确${older.precision}% → ${report.precision}%，命中时机${older.timing===null?'—':older.timing+'%'} → ${report.timing===null?'—':report.timing+'%'}。</div>`:''}<button class="small outline" data-rhythm-retry>按本轮速度与伴拍设置准备重练</button><details><summary>查看每个拍点</summary><div class="table-scroll"><table class="rhythm-detail"><thead><tr><th>小节／拍点</th><th>结果</th><th>偏差</th></tr></thead><tbody>${report.details.map(d=>`<tr><td>${d.bar} / ${d.beat}</td><td>${{onTime:'准确',early:'偏早',late:'偏晚',missed:'漏拍'}[d.status]}</td><td>${d.deltaMs===null?'—':d.deltaMs>0?'晚'+d.deltaMs+' ms':d.deltaMs<0?'早'+Math.abs(d.deltaMs)+' ms':'0 ms'}</td></tr>`).join('')}</tbody></table></div>${report.extra?`<p>额外拍击：${report.extras.map(e=>`第${e.bar}小节${e.rest?'（休止时）':''}`).join('、')}</p>`:''}</details><small>这里只评价拍击起点，不检查钢琴音高、按住时长、手指或力度。没有设备校准时，毫秒偏差只作参考。</small></article>`;
    }
    function paint(){
      if(disposed)return;const p=R.get(prefs.patternId),busy=!!run||pending,disabled=busy?'disabled':'';
      shell(`<div class="eyebrow">FEEL THE PULSE</div><h1>节拍与节奏工坊</h1><p class="muted">先走稳拍点，再练长短与休止。不需要钢琴音源或麦克风。</p><div class="rhythm-workshop"><section class="card"><h2>${run&&run.kind!=='metro'?'本轮拍点 · '+run.bpm+' BPM':'独立节拍器'}</h2><div class="rhythm-controls"><label>速度 <input id="rhythm-bpm" type="range" min="35" max="160" value="${prefs.bpm}" ${disabled}><b id="rhythm-bpm-value">${prefs.bpm}</b> BPM</label><label>拍号 <select id="rhythm-meter" ${disabled}>${[2,3,4].map(n=>`<option value="${n}" ${n===prefs.meter?'selected':''}>${n}/4</option>`).join('')}</select></label><label>细分 <select id="rhythm-subdivision" ${disabled}>${[[1,'整拍'],[2,'半拍'],[4,'四分之一拍']].map(([n,t])=>`<option value="${n}" ${n===prefs.subdivision?'selected':''}>${t}</option>`).join('')}</select></label><label><input id="rhythm-accent" type="checkbox" ${prefs.accent?'checked':''} ${disabled}>突出第一拍</label><label><input id="rhythm-sound" type="checkbox" ${prefs.sound?'checked':''} ${disabled}>节拍器声音</label></div><div class="rhythm-pulse" aria-hidden="true">${Array.from({length:run?.meter||prefs.meter},(_,i)=>`<span data-pulse="${i}">${i+1}</span>`).join('')}</div><p id="rhythm-status" role="status">${esc(notice)}</p><div class="row"><button id="metro-start" class="outline" ${disabled}>启动节拍器</button><button id="rhythm-stop" class="outline" ${!busy?'disabled':''}>停止</button></div><small>节拍器只负责伴拍，运行时间不算作弹奏成绩。静音时仍可看拍点。</small></section><section class="card"><h2>四小节节奏训练</h2><div class="rhythm-catalog">${R.patterns.map(pattern=>`<button class="small outline ${pattern.id===prefs.patternId?'selected':''}" data-rhythm-pattern="${pattern.id}" ${disabled}><small>${['入门','基础','挑战'][pattern.level]}</small>${pattern.title}</button>`).join('')}</div><h3>${p.title} · ${p.meter}/4拍</h3>${run&&run.kind!=='metro'?`<div class="rhythm-live-mode">${run.kind==='listen'?'节奏示范':run.assist?'保留伴拍':'独立拍击'} · ${run.offsetMs===null?'未校准参考':'已使用设备校准'}</div>`:''}<p>${p.desc}</p><p class="rhythm-count"><b>心里数：</b>${p.count}</p><small>● 在格子起点拍一下，格子宽度表示等待时长；0是休止。格子下方是本小节的拍点位置。</small>${patternView(p)}<div class="rhythm-controls"><label><input id="rhythm-assist" type="checkbox" ${prefs.assist?'checked':''} ${disabled}>练习时保留伴拍</label><label><input id="rhythm-calibration" type="checkbox" ${prefs.useCalibration?'checked':''} ${disabled}>使用已保存的设备校准</label></div><small>${calibrated()===null?'当前没有使用设备校准，结果为参考；需要时可到考核页先做跟拍校准。':`使用考核页保存的${calibrated()}毫秒修正，不会自动调整本轮整体快慢。`}</small><div class="row rhythm-actions"><button id="rhythm-listen" class="outline" ${disabled}>先听一遍</button><button id="rhythm-train" class="primary" ${disabled}>开始拍击练习</button></div><button id="rhythm-pad" class="rhythm-pad" ${run?.kind!=='train'?'disabled':''}>轻拍这里<span>每次触碰记一次；按住不重复计数</span></button><p id="rhythm-feedback" role="status">准备一小节后开始，保持节奏到片段结束。</p></section></div>${resultView(last)}<section class="card rhythm-history"><h2>最近的节奏练习</h2><p>最近30轮，随学习记录备份；单独统计，不折算成课程弹奏时间或考核成绩。</p>${prefs.history.length?prefs.history.slice().reverse().map((h,i)=>`<div class="rhythm-history-row"><span>${h.date} · ${R.get(h.patternId).title} · ${h.bpm} BPM · ${h.complete?'已完成':'部分练习'}</span><button class="small outline" data-rhythm-history="${prefs.history.length-1-i}" ${disabled}>查看</button></div>`).join(''):'<p>还没有拍击记录。试听和节拍器不会生成练习成绩。</p>'}</section>`);
      $('.main').classList.add('rhythm-main');$('.main').classList.toggle('rhythm-active',!!run&&run.kind!=='metro');
      const changed=()=>{prefs.bpm=Number($('#rhythm-bpm').value);prefs.meter=Number($('#rhythm-meter').value);prefs.subdivision=Number($('#rhythm-subdivision').value);prefs.accent=$('#rhythm-accent').checked;prefs.sound=$('#rhythm-sound').checked;prefs.assist=$('#rhythm-assist').checked;prefs.useCalibration=$('#rhythm-calibration').checked;save();paint()};
      $('#rhythm-bpm').oninput=()=>{prefs.bpm=Number($('#rhythm-bpm').value);$('#rhythm-bpm-value').textContent=prefs.bpm;save()};
      ['rhythm-meter','rhythm-subdivision','rhythm-accent','rhythm-sound','rhythm-assist','rhythm-calibration'].forEach(id=>$('#'+id).onchange=changed);
      document.querySelectorAll('[data-rhythm-pattern]').forEach(b=>b.onclick=()=>{prefs.patternId=b.dataset.rhythmPattern;notice='已选节奏，可先听一遍。';save();paint()});
      $('#metro-start').onclick=()=>start('metro');$('#rhythm-listen').onclick=()=>start('listen');$('#rhythm-train').onclick=()=>start('train');$('#rhythm-stop').onclick=()=>halt(false,'手动停止');
      $('#rhythm-pad').onpointerdown=e=>{e.preventDefault();tap(e)};$('#rhythm-pad').onkeydown=e=>{if(!e.repeat&&(e.key===' '||e.key==='Enter')){e.preventDefault();tap(e)}};
      document.querySelectorAll('[data-rhythm-history]').forEach(b=>b.onclick=()=>{last=prefs.history[Number(b.dataset.rhythmHistory)];paint()});
      if($('[data-rhythm-retry]')){$('[data-rhythm-retry]').disabled=busy;$('[data-rhythm-retry]').onclick=()=>{if(busy)return;prefs.patternId=last.patternId;prefs.bpm=last.bpm;prefs.assist=last.assist;prefs.subdivision=last.subdivision;prefs.accent=last.accent;prefs.useCalibration=last.offsetMs!==null;notice='已准备本轮速度与伴拍设置。'+(calibrated()!==last.offsetMs?'校准已变化，下一遍使用当前设备设置。':'')+'点开始拍击练习。';save();paint()}}
    }
    async function start(kind){
      if(disposed||pending||run)return;const ticket=++generation;pending=true;notice='正在启动节拍声音…';paint();
      try{await ensureClock();if(disposed||ticket!==generation)return;
        const pattern=R.get(prefs.patternId),track=R.timeline(pattern,prefs.bpm),unit=60/prefs.bpm,meter=kind==='metro'?prefs.meter:pattern.meter;
        run={kind,pattern,track,bpm:prefs.bpm,meter,unit,subdivision:prefs.subdivision,accent:prefs.accent,assist:prefs.assist,sound:prefs.sound,offsetMs:calibrated(),start:now()+.12+(kind==='metro'?0:meter*unit),next:kind==='metro'?0:-meter*prefs.subdivision,nextTarget:0,taps:[],used:new Set(),lastClock:now(),lastFrame:performance.now(),cursor:-1};
        pending=false;notice=kind==='metro'?'节拍器运行中':kind==='listen'?'先听一小节预备拍，再听目标节奏。':'先听一小节预备拍，再开始轻拍。';paint();window.scrollTo(0,0);loop();
      }catch(error){if(!disposed&&ticket===generation){pending=false;notice='无法开始：'+error.message;paint()}}
    }
    function halt(complete,reason){
      generation++;pending=false;cancelAnimationFrame(frame);frame=null;const finished=run;run=null;stopSound();
      if(finished?.kind==='train'&&(complete||finished.taps.length)){
        const elapsed=Math.max(0,Math.min(finished.track.end+.3,now()-finished.start));
        const entry=R.cleanEntry({date:day(),patternId:finished.pattern.id,bpm:finished.bpm,assist:finished.assist,subdivision:finished.subdivision,accent:finished.accent,offsetMs:finished.offsetMs,complete,elapsed,taps:finished.taps,reason:complete?'':reason});
        if(entry){prefs.history.push(entry);prefs.history=prefs.history.slice(-30);last=entry;save()}
      }
      notice=complete?(finished?.kind==='listen'?'示范结束，可以自己拍一遍。':'本轮结束，请查看复盘。'):'已停止。'+reason;paint();
    }
    function tap(event){
      const current=run;if(!current||current.kind!=='train')return;const at=inputTime(event)-current.start;
      const corrected=at-(current.offsetMs||0)/1000,first=current.track.targets[0];
      if(at<0&&Math.abs(corrected-first.at)>first.window){$('#rhythm-feedback').textContent='正在预备拍，拍击暂不计入记录。';return}
      if(at>current.track.end+.3)return;if(current.taps.length>=160){halt(false,'输入过多，本轮未完整评分');return}
      current.taps.push(at);const target=R.match(current.track.targets,current.used,at-(current.offsetMs||0)/1000);
      const box=$('#rhythm-feedback');if(target){current.used.add(target.target);const delta=at-(current.offsetMs||0)/1000-target.at;box.textContent=Math.abs(delta)<=target.onTime?'拍点准确，继续':`${delta<0?'偏早':'偏晚'} ${Math.round(Math.abs(delta)*1000)}毫秒，继续保持节奏。`}else box.textContent='这个时刻不需要新的拍击，继续跟拍。';
      $('#rhythm-pad').classList.remove('tapped');void $('#rhythm-pad').offsetWidth;$('#rhythm-pad').classList.add('tapped');
    }
    function loop(){
      const current=run;if(!current||disposed)return;const clock=now(),wall=performance.now(),elapsed=clock-current.start;
      if(!running()||wall-current.lastFrame>350||clock-current.lastClock> .35){halt(false,'声音或页面播放中断');return}
      current.lastFrame=wall;current.lastClock=clock;
      if(current.kind!=='metro'&&elapsed>=current.track.end+.3){halt(true,'');return}
      const interval=current.unit/current.subdivision;
      while(current.start+current.next*interval<=clock+.12){
        const beat=current.next/current.subdivision,time=current.start+current.next*interval;
        if(current.kind!=='metro'&&beat>=current.track.beats)break;
        if(time<clock-.04){halt(false,'伴拍调度中断，请重新开始');return}
        const countIn=beat<0,main=current.next%current.subdivision===0,strong=current.accent&&main&&Math.abs(beat%current.meter)<1e-9;
        if(current.kind==='metro'?current.sound:countIn||current.kind==='train'&&current.assist)click(time,strong);
        current.next++;
      }
      if(current.kind==='listen')while(current.nextTarget<current.track.targets.length&&current.start+current.track.targets[current.nextTarget].at<=clock+.12){const t=current.track.targets[current.nextTarget++];if(current.start+t.at<clock-.04){halt(false,'示范调度中断，请重新开始');return}click(current.start+t.at,current.accent&&t.beat%current.meter===0)}
      const visualElapsed=Math.max(current.kind==='metro'?0:-current.meter*current.unit,elapsed),beat=Math.floor(visualElapsed/current.unit),pulse=((beat%current.meter)+current.meter)%current.meter;
      document.querySelectorAll('[data-pulse]').forEach(e=>e.classList.toggle('current',Number(e.dataset.pulse)===pulse));
      const status=elapsed<0?`预备拍 · ${pulse+1} / ${current.meter}`:current.kind==='metro'?`${current.meter}/4拍 · 第${pulse+1}拍`:`第${Math.min(4,Math.floor(Math.max(0,elapsed)/current.unit/current.meter)+1)}小节 · 第${pulse+1}拍`;if($('#rhythm-status').textContent!==status)$('#rhythm-status').textContent=status;
      if(current.kind!=='metro'){
        const cursor=elapsed<0?-1:current.track.events.findIndex(e=>elapsed>=e.at&&elapsed<(e.beat+e.duration)*current.unit);
        if(cursor!==current.cursor){current.cursor=cursor;document.querySelectorAll('[data-rhythm-event]').forEach(e=>e.classList.toggle('current',Number(e.dataset.rhythmEvent)===cursor))}
      }
      frame=requestAnimationFrame(loop);
    }
    paint();return {pause(){if(run||pending)halt(false,'切出页面')},stop(){disposed=true;if(run||pending)halt(false,'离开节奏工坊');generation++;cancelAnimationFrame(frame)}};
  }
  root.PianoRhythm={mount};
})(typeof window==='undefined'?globalThis:window);
