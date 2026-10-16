const {chromium}=require('C:/Users/22078/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{
  const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  try{
    const context=await browser.newContext({viewport:{width:1280,height:800},hasTouch:true}),page=await context.newPage(),errors=[];
    await context.addInitScript(()=>{
      window.rhythmClicks=[];window.pianoPrepareCalls=0;
      const ctor=window.AudioContext;window.AudioContext=function(...args){const audio=new ctor(...args);window.rhythmAudio=audio;const create=audio.createOscillator.bind(audio);audio.createOscillator=()=>{const oscillator=create(),start=oscillator.start.bind(oscillator);oscillator.start=time=>{rhythmClicks.push({time,frequency:oscillator.frequency.value});return start(time)};return oscillator};return audio};window.AudioContext.prototype=ctor.prototype;
      document.addEventListener('DOMContentLoaded',()=>{PianoAudio.prepare=()=>{pianoPrepareCalls++;return Promise.reject(Error('Sample unavailable in rhythm independence test'))}});
    });
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:5173');await page.locator('[data-nav="rhythm"]').click();assert.equal(await page.locator('[data-rhythm-pattern]').count(),9);assert.equal(await page.locator('.rhythm-bar').count(),4);assert.equal(await page.locator('[data-rhythm-event]').count(),16);
    await page.locator('#rhythm-bpm').evaluate(e=>{e.value='160';e.dispatchEvent(new Event('input',{bubbles:true}))});await page.locator('#rhythm-meter').selectOption('3');await page.locator('#rhythm-subdivision').selectOption('2');
    await page.locator('#metro-start').click();await page.waitForFunction(()=>rhythmClicks.length>=8);assert.equal(await page.locator('#rhythm-bpm').isDisabled(),true);
    const clicks=await page.evaluate(()=>rhythmClicks.slice(0,8));for(let i=1;i<clicks.length;i++)assert.ok(Math.abs(clicks[i].time-clicks[i-1].time-.1875)<1e-6);assert.equal(clicks[0].frequency,1100);assert.equal(clicks[1].frequency,800);assert.equal(clicks[6].frequency,1100);
    assert.equal(await page.evaluate(()=>pianoPrepareCalls),0);await page.locator('#rhythm-stop').click();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('qinjie-state')).rhythm.history.length),0);
    await page.locator('#rhythm-sound').uncheck();const beforeSilent=await page.evaluate(()=>rhythmClicks.length);await page.locator('#metro-start').click();await page.waitForTimeout(450);assert.equal(await page.evaluate(()=>rhythmClicks.length),beforeSilent);await page.locator('#rhythm-stop').click();
    await page.locator('#rhythm-sound').check();await page.locator('#rhythm-subdivision').selectOption('1');await page.locator('[data-rhythm-pattern="quarter-rest"]').click();
    await page.locator('#rhythm-listen').click();await page.waitForTimeout(300);await page.locator('#rhythm-stop').click();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('qinjie-state')).rhythm.history.length),0);
    async function playRound(withErrors){
      await page.evaluate(()=>window.rhythmClicks=[]);await page.locator('#rhythm-train').click();await page.waitForFunction(()=>rhythmClicks.length>0);
      assert.equal(await page.locator('.rhythm-catalog').isVisible(),false);const pad=await page.locator('#rhythm-pad').boundingBox();assert.ok(pad.y+pad.height<=800,'active tapping pad must fit landscape viewport');
      await page.evaluate(async withErrors=>{
        const track=PianoRhythmCore.timeline(PianoRhythmCore.get('quarter-rest'),160),start=rhythmClicks[0].time+4*60/160;
        const attacks=track.targets.filter((_,i)=>!withErrors||i!==3).map((t,i)=>t.at+(withErrors&&i===0?.08:withErrors&&i===2?-.08:0));if(withErrors)attacks.push(track.unit);
        attacks.sort((a,b)=>a-b);
        await Promise.all(attacks.map(at=>new Promise(resolve=>setTimeout(()=>{document.querySelector('#rhythm-pad')?.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:11,clientX:300,clientY:300}));resolve()},Math.max(0,(start+at-rhythmAudio.currentTime)*1000)))));
      },withErrors);
      await page.locator('.rhythm-result').filter({hasText:'本轮复盘'}).waitFor();await page.waitForFunction(()=>!document.querySelector('#rhythm-train').disabled);
      return await page.evaluate(()=>{const r=JSON.parse(localStorage.getItem('qinjie-state')).rhythm,h=r.history.at(-1);return {history:r.history,report:PianoRhythmCore.evaluate(h.patternId,h.taps,h)}});
    }
    const first=await playRound(true);assert.equal(first.history.length,1);assert.equal(first.history[0].complete,true);assert.equal(first.report.hit,7);assert.equal(first.report.missed,1);assert.equal(first.report.extra,1);assert.equal(first.report.rest,1);assert.equal(first.report.early,1);assert.equal(first.report.late,1);
    const second=await playRound(false);assert.equal(second.history.length,2);assert.equal(second.report.coverage,100);assert.equal(second.report.precision,100);assert.ok(second.report.timing>=87);assert.match(await page.locator('.rhythm-result').innerText(),/上一遍相同速度/);
    // Changing support conditions suppresses the comparison and stopped runs remain partial.
    await page.locator('#rhythm-assist').uncheck();await page.locator('#rhythm-train').click();await page.locator('#rhythm-status').filter({hasText:'第1小节'}).waitFor();await page.locator('#rhythm-pad').tap();await page.locator('#rhythm-stop').click();assert.match(await page.locator('.rhythm-result').innerText(),/本轮未完成/);
    const partial=await page.evaluate(()=>JSON.parse(localStorage.getItem('qinjie-state')).rhythm.history.at(-1));assert.equal(partial.complete,false);assert.equal(partial.assist,false);assert.equal(partial.subdivision,1);assert.equal(partial.accent,false);
    await page.locator('[data-nav="progress"]').click();assert.match(await page.locator('.main').innerText(),/节奏训练积累/);const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('qinjie-state')));assert.equal(saved.history.length,0);assert.equal(saved.exams.history.length,0);assert.equal(saved.rhythm.history.length,3);
    await page.reload();await page.locator('[data-nav="rhythm"]').click();assert.equal(await page.locator('.rhythm-history-row').count(),3);assert.equal(await page.locator('#rhythm-bpm').inputValue(),'160');
    await page.locator('[data-rhythm-history="1"]').click();assert.match(await page.locator('.rhythm-result').innerText(),/本轮复盘/);await page.locator('[data-rhythm-retry]').click();assert.equal(await page.locator('#rhythm-assist').isChecked(),true);assert.equal(await page.locator('#rhythm-train').isEnabled(),true);
    for(const size of [{width:1280,height:800},{width:800,height:1280},{width:600,height:960}]){await page.setViewportSize(size);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)}
    await page.setViewportSize({width:1280,height:800});await page.screenshot({path:'release/previews/rhythm-workshop-1.12.png',fullPage:true});
    // Lifecycle and delayed startup must never continue ticking after leaving the workshop.
    await page.locator('#metro-start').click();await page.evaluate(()=>window.pausePiano());assert.equal(await page.locator('#metro-start').isEnabled(),true);assert.equal(await page.locator('#rhythm-stop').isDisabled(),true);
    const captured=await page.evaluate(()=>rhythmClicks.length);await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>rhythmClicks.length),captured);
    page.once('dialog',d=>d.accept());await page.evaluate(raw=>window.importPianoState(raw),JSON.stringify(saved));await page.locator('[data-nav="rhythm"]').click();assert.equal(await page.locator('.rhythm-history-row').count(),3);
    const delay=await context.newPage();await delay.addInitScript(()=>{const resume=AudioContext.prototype.resume;AudioContext.prototype.resume=function(){return resume.call(this).then(()=>new Promise(r=>setTimeout(r,300)))}});await delay.goto('http://127.0.0.1:5173');await delay.locator('[data-nav="settings"]').click();await delay.evaluate(()=>window.pausePiano());await delay.waitForFunction(()=>rhythmAudio.state==='suspended');await delay.evaluate(()=>window.rhythmClicks=[]);await delay.locator('[data-nav="rhythm"]').click();await delay.locator('#metro-start').click();await delay.locator('[data-nav="home"]').click();await delay.waitForTimeout(500);assert.equal(await delay.evaluate(()=>rhythmClicks.length),0);assert.equal(await delay.locator('#rhythm-stop').count(),0);await delay.close();
    assert.deepEqual(errors,[]);await context.close();console.log('PASS: independent audio-clock metronome/silent subdivisions, 9 four-bar patterns, demo no score, actual-clock early/late/miss/rest and full comparison, partial stop, history/restore, no piano/exam credits, cancellation and 3 layouts. Browser taps, not tablet latency verification.');
  }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
