const {chromium}=require('C:/Users/22078/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),X=require('../web/exam-core.js');
const pack=JSON.parse(fs.readFileSync('release/曲库模板/考核专项.qinjie.json','utf8'));
(async()=>{
  const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  const context=await browser.newContext({viewport:{width:1280,height:800},hasTouch:true}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  try{
    await context.addInitScript(()=>{
      window.examTicks=[];const Original=window.AudioContext;
      window.AudioContext=function(...args){const ctx=new Original(...args);window.testAudio=ctx;return ctx};window.AudioContext.prototype=Original.prototype;
      const create=Original.prototype.createOscillator;Original.prototype.createOscillator=function(){const node=create.call(this),start=node.start.bind(node);node.start=t=>{window.examTicks.push(t);start(t)};return node};
      Object.defineProperty(crypto,'getRandomValues',{value:a=>{a[0]=1337;return a}});
    });
    await page.goto('http://127.0.0.1:5173');await page.locator('[data-nav="exam"]').click();assert.equal(await page.locator('#exam-level option').count(),4);
    await page.locator('#exam-calibrate').click();await page.locator('#exam-cal-tap').waitFor();await page.evaluate(async()=>{await Promise.all(examTicks.slice(4).map(t=>new Promise(resolve=>setTimeout(()=>{document.querySelector('#exam-cal-tap').dispatchEvent(new MouseEvent('click',{bubbles:true}));resolve()},Math.max(0,(t-testAudio.currentTime)*1000)))))});await page.locator('#exam-cal-info').filter({hasText:'已校准'}).waitFor();
    const c=await page.evaluate(()=>JSON.parse(localStorage.getItem('qinjie-state')).exams.calibration);assert.ok(Math.abs(c.offsetMs)<35);console.log('PASS: real audio-clock calibration accepts eight stable taps.');
    const cdp=await context.newCDPSession(page);let active=[];await page.exposeFunction('examTouch',async payload=>{if(payload.down)active=[{x:payload.x,y:payload.y,id:1}];else active=[];await cdp.send('Input.dispatchTouchEvent',{type:payload.down?'touchStart':'touchEnd',touchPoints:active})});
    const paper=X.paper(0,1337,pack);
    async function perform(stageIndex){
      const s=paper[stageIndex],sequence=s.sequence,unit=1;
      await page.waitForFunction(()=>examTicks.length>=4);const start=await page.evaluate(()=>examTicks.at(-1)+1);
      const positions={};for(const n of new Set(sequence.flatMap(e=>e[0]))){const b=await page.locator(`[data-exam-key="${n}"]`).boundingBox();positions[n]={x:b.x+b.width/2,y:b.y+b.height*.85}}
      await page.evaluate(async({sequence,start,positions,unit})=>{let beat=0;const jobs=[];for(const [notes,duration] of sequence){for(const n of notes){const at=start+beat*unit,pos=positions[n];jobs.push(new Promise(resolve=>setTimeout(async()=>{await window.examTouch({...pos,down:true});resolve()},Math.max(0,(at-testAudio.currentTime)*1000))));jobs.push(new Promise(resolve=>setTimeout(async()=>{await window.examTouch({...pos,down:false});resolve()},Math.max(0,(at+duration*unit*.95-testAudio.currentTime)*1000))))}beat+=duration}await Promise.all(jobs)},{sequence,start,positions,unit});
      await page.locator('#exam-next').waitFor({timeout:26000});assert.equal(await page.locator('.key.pressed').count(),0);console.log('PASS: native touch timeline completed '+s.kind+' including full final hold.');
    }
    await page.locator('#exam-start').click();await page.locator('#exam-stage-start').waitFor();await page.locator('#exam-stage-start').click();await perform(0);
    await page.locator('#exam-next').click();await page.locator('#exam-stage-start').click();await perform(1);
    await page.locator('#exam-next').click();assert.match(await page.locator('#exam-clock').innerText(),/视奏预览/);assert.equal(await page.locator('#exam-stage-start').count(),0);await page.waitForFunction(()=>document.querySelector('#exam-clock')?.textContent.startsWith('预备'),{},{timeout:34000});await perform(2);
    await page.locator('#exam-next').click();
    for(let i=0;i<5;i++){assert.equal(await page.locator('[data-exam-answer]:enabled').count(),0);await page.locator('#exam-listen').click();await page.locator('[data-exam-answer]:enabled').first().waitFor({timeout:5000});await page.locator(`[data-exam-answer="${paper[3].questions[i].answer}"]`).click()}
    await page.locator('#exam-next').click();for(let i=0;i<5;i++)await page.locator(`[data-exam-answer="${paper[4].questions[i].answer}"]`).click();
    await page.locator('.exam-report').waitFor();let history=await page.evaluate(()=>JSON.parse(localStorage.getItem('qinjie-state')).exams.history);const result=history.at(-1);assert.equal(result.status,'complete');assert.ok(result.total>=90,JSON.stringify(result.stages.map(s=>s.metrics)));assert.equal(result.passed,true);assert.equal(result.stages.length,5);assert.ok(result.stages.slice(0,3).every(s=>s.actual.length&&s.metrics.duration>=95));assert.equal(result.stages[3].score,100);assert.equal(result.stages[4].score,100);
    await page.locator('.exam-stage-report').first().locator('summary').first().click();await page.screenshot({path:'release/previews/exam-report-1.7.png',fullPage:true});
    await page.reload();await page.locator('[data-nav="exam"]').click();await page.locator('[data-exam-history]').first().click();assert.match(await page.locator('.exam-report').innerText(),/优秀|稳固达标/);assert.equal((await page.evaluate(()=>JSON.parse(localStorage.getItem('qinjie-state')).exams.history)).length,1);
    await page.locator('#exam-start').click();await page.locator('#exam-stage-start').click();await page.evaluate(()=>window.pausePiano());history=await page.evaluate(()=>JSON.parse(localStorage.getItem('qinjie-state')).exams.history);assert.equal(history.at(-1).status,'interrupted');assert.equal(history.at(-1).total,null);assert.equal(await page.locator('.key.pressed').count(),0);
    await page.locator('[data-nav="progress"]').click();assert.match(await page.locator('main').innerText(),/考核成长/);await page.locator('[data-nav="settings"]').click();const raw=await page.evaluate(()=>localStorage.getItem('qinjie-state'));page.once('dialog',d=>d.accept());await page.evaluate(t=>window.importPianoState(t),raw);assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('qinjie-state')).exams.calibration),null);assert.equal((await page.evaluate(()=>JSON.parse(localStorage.getItem('qinjie-state')).exams.history)).length,2);
    await page.locator('[data-nav="exam"]').click();for(const size of [{width:1280,height:800},{width:800,height:1280},{width:600,height:960}]){await page.setViewportSize(size);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)}await page.setViewportSize({width:1280,height:800});await page.screenshot({path:'release/previews/exam-setup-1.7.png',fullPage:true});
    const file=await context.newPage();await file.goto('file:///'+process.cwd().replaceAll('\\','/')+'/ios/Web/index.html');await file.locator('[data-nav="exam"]').click();await file.locator('#exam-start').click();await file.locator('#exam-stage-start').click();await file.evaluate(()=>window.pausePiano());assert.equal(await file.evaluate(()=>JSON.parse(localStorage.getItem('qinjie-state')).exams.history.at(-1).total),null);await file.close();
    assert.deepEqual(errors,[]);console.log('PASS: complete five-station exam on real clock, held-note capture, random sight preview, hearing locks, detailed results, persistence, interruption, backup/calibration reset, growth and iPad file source. Actual devices remain untested.');
  }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
