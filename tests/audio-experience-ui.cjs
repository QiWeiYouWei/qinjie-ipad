const {chromium}=require('C:/Users/22078/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const banks={};for(const id of ['grand','upright'])vm.runInNewContext(fs.readFileSync('web/samples/'+id+'.js','utf8'),{PianoAudio:{register:(name,data)=>banks[name]=data}});
(async()=>{
  const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  try{
    const context=await browser.newContext({viewport:{width:1280,height:800},hasTouch:true}),page=await context.newPage(),errors=[];
    await context.route('**/samples/*.js',route=>route.abort());
    await context.addInitScript(banks=>{
      window.Android={readPianoSampleBank:id=>JSON.stringify(banks[id]),audioDeviceInfo:()=>JSON.stringify({manufacturer:'samsung',model:'TEST-TABLET',android:'test',sdk:35,webViewVersion:'test-provider'})};
      window.voices=[];window.resumeDelay=0;
      const decode=AudioContext.prototype.decodeAudioData,resume=AudioContext.prototype.resume;
      AudioContext.prototype.decodeAudioData=function(...args){setTimeout(()=>decode.apply(this,args),80)};
      AudioContext.prototype.resume=function(...args){return resume.apply(this,args).then(()=>new Promise(r=>setTimeout(r,window.resumeDelay)))};
      document.addEventListener('DOMContentLoaded',()=>{const original=PianoAudio.voice;PianoAudio.voice=(...args)=>{const v=original(...args);voices.push({note:args[2],bank:v.timbre,frames:v.nodes[0].buffer.length});return v}});
    },banks);
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:5173');await page.locator('[data-nav="settings"]').click();
    await page.locator('[data-audio-progress]').waitFor({state:'visible'});await page.waitForFunction(()=>document.querySelector('[data-audio-progress]').value>=1);
    const progress=await page.locator('[data-audio-progress]').evaluate(p=>({max:p.max,value:p.value}));assert.equal(progress.max,Object.keys(banks.grand).length);assert.ok(progress.value>0&&progress.value<progress.max);
    await page.locator('[data-audio-status]').filter({hasText:'已就绪'}).waitFor();assert.equal(await page.locator('[data-audio-retry]').isVisible(),false);
    let diag=JSON.parse(await page.locator('#audio-diagnostic').inputValue());assert.equal(diag.device.model,'TEST-TABLET');assert.equal(diag.preparation.transport,'native');assert.equal(diag.preparation.phase,'ready');assert.equal(diag.version,'1.12.1');assert.ok(!('history' in diag)&&!('completed' in diag));
    assert.equal(await page.locator('#audio-check-answer').isVisible(),false);
    await page.locator('#audio-check-run').click();await page.locator('#audio-check-message').filter({hasText:'正在播放'}).waitFor();assert.equal(await page.locator('#audio-check-run').isDisabled(),true);
    await page.locator('#audio-check-answer').waitFor({state:'visible'});assert.deepEqual((await page.evaluate(()=>voices)).map(v=>v.note),[60,67,72]);await page.locator('#audio-heard').click();assert.match(await page.locator('#audio-check-message').innerText(),/确认听到/);
    await page.locator('#timbre').selectOption('upright');await page.locator('[data-audio-status]').filter({hasText:'已就绪'}).waitFor();assert.equal(await page.locator('#audio-check-answer').isVisible(),false);
    await page.locator('#audio-check-run').click();await page.locator('#audio-check-answer').waitFor({state:'visible'});await page.locator('#audio-not-heard').click();assert.match(await page.locator('#audio-check-message').innerText(),/媒体音量、耳机或蓝牙/);
    diag=JSON.parse(await page.locator('#audio-diagnostic').inputValue());assert.equal(diag.hearingCheck.result,'silent');assert.equal(diag.timbre,'upright');
    // Suspend first so the delayed resume provides a real cancellation window.
    await page.evaluate(()=>{window.pausePiano();window.resumeDelay=300});await page.waitForTimeout(50);const before=await page.evaluate(()=>voices.length);
    await page.locator('#audio-check-run').click();await page.locator('#audio-stop').click();await page.waitForTimeout(450);assert.equal(await page.evaluate(()=>voices.length),before);assert.match(await page.locator('#audio-check-message').innerText(),/已停止/);
    await page.evaluate(()=>window.resumeDelay=0);
    for(const size of [{width:1280,height:800},{width:800,height:1280},{width:600,height:960}]){await page.setViewportSize(size);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)}
    await page.setViewportSize({width:1280,height:800});await page.screenshot({path:'release/previews/audio-settings-1.12.png',fullPage:true});
    // Cold preparation: release/repress with the same pointer must start only the latest attack.
    const touchContext=await browser.newContext({viewport:{width:1280,height:800},hasTouch:true}),touch=await touchContext.newPage();
    await touchContext.addInitScript(()=>{
      window.voices=[];const decode=AudioContext.prototype.decodeAudioData;AudioContext.prototype.decodeAudioData=function(...args){setTimeout(()=>decode.apply(this,args),120)};
      document.addEventListener('DOMContentLoaded',()=>{const original=PianoAudio.voice;PianoAudio.voice=(...args)=>{voices.push(args[2]);return original(...args)}});
    });
    touch.on('pageerror',e=>errors.push(e.message));await touch.goto('http://127.0.0.1:5173');await touch.locator('[data-nav="songs"]').click();await touch.locator('[data-practice="0"]').click();
    const c=await touch.locator('.key[data-note="60"]').boundingBox(),d=await touch.locator('.key[data-note="62"]').boundingBox();
    await touch.mouse.move(c.x+c.width/2,c.y+c.height*.8);await touch.mouse.down();await touch.mouse.up();await touch.mouse.down();await touch.waitForFunction(()=>voices.length>0);assert.deepEqual(await touch.evaluate(()=>voices),[60]);await touch.mouse.up();
    await touch.mouse.down();await touch.mouse.move(d.x+d.width/2,d.y+d.height*.8);await touch.mouse.move(5,5);await touch.mouse.up();assert.equal(await touch.locator('.key.pressed').count(),0);
    const e=await touch.locator('.key[data-note="64"]').boundingBox(),client=await touchContext.newCDPSession(touch);
    await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:c.x+c.width/2,y:c.y+c.height*.8},{id:2,x:e.x+e.width/2,y:e.y+e.height*.8}]});assert.equal(await touch.locator('.key.pressed').count(),2);
    await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.equal(await touch.locator('.key.pressed').count(),0);
    await touch.locator('#start-btn').click();await touch.waitForFunction(()=>!document.querySelector('#finish-btn').disabled);await touch.locator('.key[data-note="60"]').tap();await touch.evaluate(()=>window.dispatchEvent(new Event('blur')));assert.equal(await touch.locator('#finish-btn').isDisabled(),true);assert.equal(await touch.locator('.key.pressed').count(),0);
    await touchContext.close();
    // An obsolete failing grand request cannot overwrite a ready upright selection.
    const failureContext=await browser.newContext(),failure=await failureContext.newPage();
    await failureContext.route('**/samples/grand.js',async route=>{await new Promise(r=>setTimeout(r,400));await route.abort()});
    await failure.goto('http://127.0.0.1:5173');await failure.locator('[data-nav="settings"]').click();await failure.locator('#timbre').selectOption('upright');await failure.locator('[data-audio-status]').filter({hasText:'已就绪'}).waitFor();await failure.waitForTimeout(600);
    assert.match(await failure.locator('[data-audio-status]').innerText(),/已就绪/);assert.equal(await failure.locator('[data-audio-retry]').isVisible(),false);
    await failureContext.close();assert.deepEqual(errors,[]);await context.close();
    console.log('PASS: decoded progress, current-timbre diagnostics, human hearing confirmation, stop/cancel, same-pointer cold repress, glissando release, two-finger release, blur partial finish, stale failure isolation and tablet layouts. Android device info/bridge simulated.');
  }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
