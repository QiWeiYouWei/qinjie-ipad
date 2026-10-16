const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
let pw;try{pw=require('playwright')}catch{pw=require(process.env.PLAYWRIGHT_MODULE||'C:/Users/22078/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')}
const root=path.resolve(__dirname,'..'),pack=JSON.parse(fs.readFileSync(path.join(root,'release/曲库模板/示例歌曲包.qinjie.json'),'utf8'));
(async()=>{
  const executablePath=process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe';
  const browser=await pw.chromium.launch({executablePath,headless:true,args:['--autoplay-policy=no-user-gesture-required']});
  const context=await browser.newContext({viewport:{width:1024,height:768},hasTouch:true});
  await context.addInitScript(()=>{window.nativeCalls=[];window.webkit={messageHandlers:{qinjie:{postMessage:body=>window.nativeCalls.push(body)}}}});
  await context.addInitScript({path:path.join(root,'ios/Bridge.js')});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
    await page.goto(pathToFileURL(path.join(root,'ios/Web/index.html')).href);
    await page.evaluate(()=>localStorage.clear());await page.reload();
    await page.locator('[data-nav="songs"]').click();await page.locator('#import-songs').click();
    assert.equal(await page.evaluate(()=>nativeCalls.at(-1).action),'importSongs');
    await page.evaluate(raw=>window.importPianoSongs(raw),JSON.stringify(pack));
    assert.equal(await page.evaluate(()=>localStorage.getItem('qinjie-song-library')),null);
    await page.locator('#confirm-song-import').click();
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('qinjie-song-library')).songs.length),2);
    await page.locator('#export-songs').click();
    const exported=await page.evaluate(()=>nativeCalls.at(-1));assert.equal(exported.action,'exportSongs');assert.equal(JSON.parse(exported.data).songs.length,2);
    await page.locator('[data-practice="39"]').click();await page.locator('#start-btn').click();await page.waitForFunction(()=>document.querySelector('#finish-btn')&&!document.querySelector('#finish-btn').disabled);
    for(const [notes] of pack.songs[0].sequence)await page.locator(`.key[data-note="${notes[0]}"]`).tap();
    await page.locator('#result .result').waitFor();assert.match(await page.locator('#result').innerText(),/目标音命中 100%/);
    await page.evaluate(()=>window.pausePiano());
    await page.locator('[data-nav="settings"]').click();assert.match(await page.locator('main').innerText(),/iPadOS 16及以上/);assert.ok(!(await page.locator('main').innerText()).includes('Android'));
    await page.locator('#export').click();let backup=await page.evaluate(()=>nativeCalls.at(-1));assert.equal(backup.action,'exportData');assert.equal(JSON.parse(backup.data).songPack.songs.length,2);
    await page.locator('#import').click();assert.equal(await page.evaluate(()=>nativeCalls.at(-1).action),'importData');
    page.once('dialog',d=>d.accept());await page.evaluate(raw=>window.importPianoState(raw),JSON.stringify({version:1,completed:[1],history:[]}));
    assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('qinjie-state')).completed),[1]);
    await page.locator('[data-nav="songs"]').click();
    const blocked=await page.evaluate(async()=>{try{await fetch('https://example.com');return false}catch{return true}});assert.equal(blocked,true);
    for(const size of [{width:1024,height:768},{width:768,height:1024},{width:600,height:960}]){
      await page.setViewportSize(size);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    }
    fs.mkdirSync(path.join(root,'release/previews'),{recursive:true});
    await page.setViewportSize({width:1024,height:768});await page.screenshot({path:path.join(root,'release/previews/ipad-library.png'),fullPage:true});
    await page.locator('[data-practice="39"]').click();await page.screenshot({path:path.join(root,'release/previews/ipad-practice.png'),fullPage:true});
    assert.deepEqual(errors,[]);
    console.log('PASS: iPad assets in Chrome touch simulation; four bridge commands, preview/confirm, full melody practice, backup restore, offline CSP and 3 viewport widths. Native WKWebView and real device remain untested.');
  }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
