const {chromium}=require('C:/Users/22078/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{
  const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
  const context=await browser.newContext({viewport:{width:1280,height:800},hasTouch:true}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  async function open(i){await page.locator('[data-nav="songs"]').click();await page.locator(`[data-practice="${i}"]`).click()}
  async function tap(n){await page.locator(`.key[data-note="${n}"]`).tap()}
  try{
    await page.goto('http://127.0.0.1:5173');await open(12);
    assert.equal(await page.locator('.key.white').count(),8);const big=await page.locator('.key.white').first().boundingBox();
    await page.locator('#keyboard-layout').selectOption('full');assert.equal(await page.locator('.key.white').count(),14);const small=await page.locator('.key.white').first().boundingBox();assert.ok(big.width>small.width*1.6);
    await page.locator('#keyboard-layout').selectOption('wide');await page.locator('#range').selectOption('bars');await page.locator('#bar-first').selectOption('3');await page.locator('#bar-last').selectOption('4');
    assert.equal(await page.locator('[data-score-index]').count(),7);await page.locator('#start-btn').click();await page.waitForFunction(()=>!document.querySelector('#finish-btn').disabled);for(const n of [65,65,64,64,62,62,60])await tap(n);
    assert.match(await page.locator('#result').innerText(),/7\/7个目标音/);
    const recorded=await page.evaluate(()=>JSON.parse(localStorage.getItem('qinjie-state')).replays.at(-1));assert.equal(recorded.notes.length,7);assert.equal(recorded.expected.length,7);assert.ok(recorded.notes.every(n=>n.duration>0));assert.match(recorded.title,/第3—4小节/);
    await page.locator('#replay-mine').click();assert.match(await page.locator('#practice-status').innerText(),/我的演奏/);assert.equal(await page.locator('#start-btn').isDisabled(),true);await page.locator('#demo-btn').click();assert.equal(await page.locator('#start-btn').isEnabled(),true);
    await page.locator('#replay-model').click();assert.equal(await page.locator('[data-score-index]').count(),7);await page.locator('#demo-btn').click();
    await page.locator('[data-nav="progress"]').click();assert.equal(await page.locator('[data-replay]').count(),1);await page.reload();await page.locator('[data-nav="progress"]').click();await page.locator('[data-replay="0"]').click();await page.locator('#practice-status').filter({hasText:'我的演奏'}).waitFor();assert.match(await page.locator('#practice-status').innerText(),/我的演奏/);await page.locator('#demo-btn').click();
    // Loop uses the selected bar, resets scoring, and can be cancelled during the gap.
    await open(0);await page.locator('#range').selectOption('bars');await page.locator('#bar-first').selectOption('3');await page.locator('#repeat').check();await page.locator('#start-btn').click();await tap(60);assert.match(await page.locator('#feedback').innerText(),/循环/);
    await page.waitForTimeout(2250);assert.equal(await page.locator('#start-btn').isDisabled(),true);await tap(60);await page.locator('#finish-btn').click();await page.waitForTimeout(2250);assert.equal(await page.locator('#start-btn').isEnabled(),true);assert.equal(await page.locator('#repeat').isChecked(),false);
    // Guided listen -> prompted find-note -> independent rhythm; no automatic mastery from errors.
    await open(0);await page.locator('#bpm').fill('120');await page.locator('#guide-start').click();assert.equal(await page.locator('#range').inputValue(),'bars');assert.equal(await page.locator('#bar-last').inputValue(),'2');await page.locator('#start-btn').click();
    await page.waitForFunction(()=>document.querySelector('.guide-steps .current')?.textContent.includes('带提示'),{timeout:8000});assert.equal(await page.locator('#hints').isChecked(),true);await page.locator('#start-btn').click();
    await tap(61);assert.match(await page.locator('#feedback').innerText(),/试试/);for(const n of [60,62,64,65,67,65,64,62])await tap(n);assert.match(await page.locator('#result').innerText(),/第1小节/);await page.locator('#guide-next').click();assert.equal(await page.locator('#hints').isChecked(),false);assert.equal(await page.locator('#mode').inputValue(),'rhythm');
    await page.locator('#start-btn').click();await page.waitForFunction(()=>document.querySelector('#practice-status')?.textContent.startsWith('第 1 /'));
    await page.evaluate(()=>{const keys=['a','s','d','f','g','f','d','s'];keys.forEach((key,i)=>{setTimeout(()=>{dispatchEvent(new KeyboardEvent('keydown',{key}));setTimeout(()=>dispatchEvent(new KeyboardEvent('keyup',{key})),130)},i*500)})});
    await page.locator('#guide-next').waitFor({timeout:7000});assert.match(await page.locator('#result').innerText(),/目标音命中 100%/);assert.match(await page.locator('#result').innerText(),/命中音起音达标 100%/);assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('qinjie-state')).hints),true);
    await page.locator('#guide-next').click();assert.equal(await page.locator('#bar-first').inputValue(),'3');assert.equal(await page.locator('#bar-last').inputValue(),'3');await page.locator('#guide-exit').click();assert.equal(await page.locator('#hints').isChecked(),true);assert.equal(await page.locator('#mode').inputValue(),'wait');
    // All course pages have the guided entry. Large-span exercises keep all notes reachable.
    await open(9);assert.equal(await page.locator('.key.white').count(),14);assert.match(await page.locator('.keyboard-caption').innerText(),/自动展示/);
    await page.locator('[data-nav="courses"]').click();await page.locator('[data-lesson="16"]').click();await page.locator('[data-guided]').click();assert.equal(await page.locator('.guide-panel').count(),1);await page.locator('#guide-exit').click();
    await open(12);await page.locator('#notation').selectOption('both');await page.screenshot({path:'release/previews/practice-1.2.png',fullPage:true});let box=await page.locator('.transport').boundingBox();assert.ok(box.y+box.height<=800,'ordinary paired view fits landscape');
    await page.locator('#guide-start').click();await page.screenshot({path:'release/previews/guided-1.2.png',fullPage:true});box=await page.locator('.transport').boundingBox();assert.ok(box.y+box.height<=800,'guided paired view fits landscape');
    await page.setViewportSize({width:800,height:1280});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:'release/previews/guided-portrait-1.2.png',fullPage:true});
    await page.locator('#guide-exit').click();await open(0);await page.locator('#range').selectOption('bars');await page.locator('#bar-first').selectOption('3');await page.locator('#start-btn').click();await tap(60);await page.locator('#replay-mine').click();await page.evaluate(()=>window.pausePiano());assert.equal(await page.locator('.key.replaying').count(),0);assert.equal(await page.locator('#start-btn').isEnabled(),true);
    await page.locator('#start-btn').click();await page.waitForFunction(()=>!document.querySelector('#finish-btn').disabled);await page.keyboard.down('a');await page.locator('#result .result').waitFor();await page.waitForTimeout(350);await page.keyboard.up('a');const heldDuration=await page.evaluate(()=>JSON.parse(localStorage.getItem('qinjie-state')).replays.at(-1).notes.at(-1).duration);assert.ok(heldDuration>=.3,'final held note records its actual release after completion');
    await page.reload();const restored=await page.evaluate(()=>JSON.parse(localStorage.getItem('qinjie-state')));assert.equal(restored.replays.length,5);await page.locator('[data-nav="progress"]').click();assert.equal(await page.locator('[data-replay]').count(),5);
    assert.deepEqual(errors,[]);console.log('PASS: wide keyboard, arbitrary bars, captured durations including final release, five saved replays, model comparison, repeat restart/cancel, guided listen/follow/independent, restored settings, lifecycle and tablet layout.');
  }catch(e){console.error('Runtime errors:',errors);console.error((await page.locator('body').innerText()).slice(-3500));throw e}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});

