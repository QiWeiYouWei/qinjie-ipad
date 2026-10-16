const {chromium}=require('C:/Users/22078/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{
  const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
  const context=await browser.newContext({viewport:{width:1280,height:800},hasTouch:true}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  async function songs(){await page.locator('[data-nav="songs"]').click()}
  async function open(id){await songs();await page.locator(`[data-practice="${id}"]`).click()}
  async function finishMelody(id){
    await page.locator('#start-btn').click();await page.waitForFunction(()=>!document.querySelector('#finish-btn').disabled);
    const events=await page.evaluate(id=>PianoCore.events(PianoContent.exercises[id].sequence),id);
    for(let i=0;i<events.length;i++){
      await page.waitForFunction(i=>document.querySelector('#practice-status')?.textContent.startsWith('第 '+(i+1)+' /'),i,{timeout:7000});
      for(const n of events[i].notes)await page.locator(`.key[data-note="${n}"]`).tap();
    }
    await page.locator('#result .result').waitFor({timeout:7000});assert.match(await page.locator('#result').innerText(),/目标音命中 100%/);
  }
  try{
    await page.goto('http://127.0.0.1:5173');await songs();assert.equal(await page.locator('[data-practice]').count(),39);assert.equal(await page.locator('[data-song-id]').first().getAttribute('data-song-id'),'26');
    await page.locator('[data-kind="full"]').click();assert.equal(await page.locator('[data-practice]').count(),13);
    for(const [tier,count] of [[0,3],[1,3],[2,4],[3,3]]){await page.locator(`[data-filter="${tier}"]`).click();assert.equal(await page.locator('[data-practice]').count(),count)}
    await page.locator('[data-filter="-1"]').click();await page.locator('#song-search').fill('附点');assert.ok(await page.locator('[data-practice]').count()>=3);await page.locator('#song-search').fill('不存在的歌名');assert.equal(await page.locator('[data-practice]').count(),0);await page.locator('#song-search').fill('');
    await page.screenshot({path:'release/previews/repertoire-1.3.png',fullPage:true});
    // All complete melodies have their entire pitch range available without shifting octaves.
    const ids=await page.evaluate(()=>PianoContent.fullSongIds);
    for(const id of ids){await open(id);const missing=await page.evaluate(id=>PianoCore.events(PianoContent.exercises[id].sequence).flatMap(e=>e.notes).filter(n=>!document.querySelector(`.key[data-note="${n}"]`)),id);assert.deepEqual(missing,[],'unreachable pitch in song '+id)}
    await open(28);assert.equal(await page.locator('[data-score-index]').count(),42);await page.locator('.piece-plan summary').click();await page.locator('#song-speed').click();assert.equal(await page.locator('#bpm').inputValue(),'65');
    await finishMelody(28);let saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('qinjie-state')).replays.at(-1));assert.equal(saved.expected.length,42);assert.equal(saved.notes.length,42);assert.equal(saved.expected.at(-1).notes[0],60);assert.equal(saved.exercise,28);
    await page.reload();await page.locator('[data-nav="progress"]').click();await page.locator('[data-replay="0"]').click();assert.match(await page.locator('#practice-status').innerText(),/我的演奏/);await page.locator('#demo-btn').click();
    await open(33);assert.equal(await page.locator('[data-score-index]').count(),107);await page.locator('#range').selectOption('bars');assert.equal(await page.locator('#bar-last option').count(),32);await page.locator('#range').selectOption('all');await page.locator('#bpm').fill('120');await finishMelody(33);saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('qinjie-state')).replays.at(-1));assert.equal(saved.expected.length,107);assert.equal(saved.notes.length,107);
    await open(34);assert.equal(await page.locator('.key[data-note="55"]').count(),1);assert.equal(await page.locator('.key[data-note="72"]').count(),1);await page.locator('#notation').selectOption('both');await page.locator('#guide-start').click();assert.equal(await page.locator('#bar-last').inputValue(),'2');const box=await page.locator('.transport').boundingBox();assert.ok(box.y+box.height<=800,'full-song guided paired view fits landscape');await page.screenshot({path:'release/previews/full-song-practice-1.3.png',fullPage:true});
    await page.locator('#guide-exit').click();await open(36);await page.locator('#notation').selectOption('staff');assert.ok(await page.locator('.note-flag').count()>20);assert.ok(await page.locator('.short-rest').count()>0);await page.locator('#demo-btn').click();await page.waitForFunction(()=>document.querySelector('#practice-status').textContent.includes('示范'));await page.locator('#demo-btn').click();assert.equal(await page.locator('#start-btn').isEnabled(),true);
    await page.setViewportSize({width:800,height:1280});await songs();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await open(36);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    assert.deepEqual(errors,[]);console.log('PASS: 13 complete versions, four-tier filters/search, every song pitch reachable, complete Twinkle and 32-bar Jingle playback/recording, saved replay, recommended tempo, 32-bar selection, guided paired view, short notes/rests and portrait.');
  }catch(e){console.error('Runtime errors:',errors);console.error((await page.locator('body').innerText()).slice(-2500));throw e}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
