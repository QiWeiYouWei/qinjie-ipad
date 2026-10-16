const {chromium}=require('C:/Users/22078/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
  const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
  const context=await browser.newContext({viewport:{width:1280,height:800},hasTouch:true});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
    await page.goto('http://127.0.0.1:5173');await page.getByRole('heading',{name:/慢慢来/}).waitFor();
    fs.mkdirSync('release/previews',{recursive:true});await page.screenshot({path:'release/previews/tablet-home.png',fullPage:true});
    await page.locator('[data-nav="courses"]').click();assert.equal(await page.locator('[data-lesson]').count(),28);
    await page.locator('[data-lesson="0"]').click();assert.equal(await page.locator('#complete-lesson').isDisabled(),true);await page.locator('[data-quiz="0"]').click();assert.equal(await page.locator('#complete-lesson').isDisabled(),true);await page.locator('[data-review-quiz="1"]').click();await page.locator('#complete-lesson').click();
    await page.locator('[data-practice="0"]').click();await page.locator('#start-btn').click();await page.waitForFunction(()=>document.querySelector('#finish-btn')&&!document.querySelector('#finish-btn').disabled);
    for(const n of [60,62,64,65,67,65,64,62,60])await page.locator(`.key[data-note="${n}"]`).tap();
    await page.locator('#result .result').waitFor();assert.match(await page.locator('#result').innerText(),/目标音命中 100%/);
    await page.reload();await page.locator('[data-nav="progress"]').click();assert.match(await page.locator('main').innerText(),/五个白键/);assert.match(await page.locator('.stats').innerText(),/1 \/ 28/);
    await page.locator('[data-nav="songs"]').click();assert.equal(await page.locator('[data-practice]').count(),39);await page.locator('[data-practice="8"]').click();await page.locator('#start-btn').click();await page.waitForFunction(()=>document.querySelector('#finish-btn')&&!document.querySelector('#finish-btn').disabled);
    const points=[];for(const n of [60,64,67]){const b=await page.locator(`.key[data-note="${n}"]`).boundingBox();points.push({x:b.x+b.width/2,y:b.y+b.height*.85,id:points.length+1})}
    const cdp=await context.newCDPSession(page);
    for(let i=0;i<3;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:points});assert.equal(await page.locator('.key.pressed').count(),3);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})}
    assert.match(await page.locator('#result').innerText(),/目标音命中 100%/);assert.equal(await page.locator('.key.pressed').count(),0);
    await page.screenshot({path:'release/previews/tablet-practice.png',fullPage:true});
    await page.locator('#start-btn').click();await page.waitForFunction(()=>document.querySelector('#finish-btn')&&!document.querySelector('#finish-btn').disabled);await page.locator('.key[data-note="60"]').tap();await page.locator('[data-nav="home"]').click();assert.equal(await page.locator('.key.pressed').count(),0);
    await page.locator('[data-nav="theory"]').click();await page.locator('[data-learning-tab="sounds"]').click();assert.equal(await page.locator('[data-theory]').count(),15);await page.locator('[data-theory="3"]').click();
    await page.locator('[data-nav="settings"]').click();await page.locator('#minutes').fill('15');await page.locator('#goal').fill('学会小星星');await page.locator('#save-settings').click();await page.reload();await page.locator('[data-nav="settings"]').click();assert.equal(await page.locator('#minutes').inputValue(),'15');
    await page.locator('[data-nav="songs"]').click();await page.locator('[data-practice="2"]').click();await page.locator('#mode').selectOption('rhythm');await page.locator('#bpm').fill('120');await page.locator('#start-btn').click();await page.waitForFunction(()=>document.querySelector('#finish-btn')&&!document.querySelector('#finish-btn').disabled);await page.locator('.key[data-note="60"]').tap();assert.match(await page.locator('#feedback').innerText(),/预备/);await page.locator('#result .result').waitFor({timeout:12000});assert.match(await page.locator('#result').innerText(),/目标音命中 0%/);assert.match(await page.locator('#result').innerText(),/漏音8个/);
    await page.locator('#mode').selectOption('wait');await page.locator('#start-btn').click();await page.waitForFunction(()=>document.querySelector('#finish-btn')&&!document.querySelector('#finish-btn').disabled);await page.locator('.key[data-note="60"]').tap();await page.evaluate(()=>window.pausePiano());assert.equal(await page.locator('#finish-btn').isDisabled(),true);assert.equal(await page.locator('.key.pressed').count(),0);
    await page.setViewportSize({width:800,height:1280});await page.locator('[data-nav="songs"]').click();await page.locator('[data-practice="12"]').click();await page.screenshot({path:'release/previews/tablet-portrait.png',fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.setViewportSize({width:600,height:960});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.setViewportSize({width:1280,height:800});const buttons=await page.locator('.transport').boundingBox();assert.ok(buttons.y+buttons.height<=800,'Landscape transport must fit screen');await page.screenshot({path:'release/previews/tablet-practice.png',fullPage:true});
    assert.deepEqual(errors,[]);console.log('PASS: curriculum, quiz, single notes, polyphonic touch, count-in, rhythm misses, pause, storage, settings, portrait and landscape layout; no runtime errors.');
  }catch(e){console.error('Browser errors:',errors);console.error('Page:',(await page.locator('body').innerText()).slice(0,2000));throw e}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
