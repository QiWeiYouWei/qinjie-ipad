const {chromium}=require('C:/Users/22078/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const banks={};for(const id of ['grand','upright'])vm.runInNewContext(fs.readFileSync('web/samples/'+id+'.js','utf8'),{PianoAudio:{register:(name,data)=>banks[name]=data}});
(async()=>{
  const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  try{
    const context=await browser.newContext(),page=await context.newPage(),requests=[],errors=[];
    await context.route('**/samples/*.js',route=>{requests.push(route.request().url());return route.abort()});
    await context.addInitScript(banks=>{
      const recorded=JSON.stringify({completed:[0,1],history:[{date:'2026-10-12',minutes:5}],timbre:'grand'});localStorage.setItem('qinjie-state',recorded);
      window.nativeReads=[];window.Android={readPianoSampleBank:id=>{nativeReads.push(id);return JSON.stringify(banks[id])}};
      window.voices=[];document.addEventListener('DOMContentLoaded',()=>{const original=PianoAudio.voice;PianoAudio.voice=(...args)=>{const v=original(...args);voices.push({bank:v.timbre,note:args[2],frames:v.nodes[0].buffer.length});return v}});
    },banks);
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:5173');await page.locator('[data-nav="settings"]').click();await page.locator('[data-audio-status]').filter({hasText:'已就绪'}).waitFor();
    await page.locator('#timbre-preview').click();await page.waitForFunction(()=>voices.length===4);
    await page.locator('#timbre').selectOption('upright');await page.locator('[data-audio-status]').filter({hasText:'已就绪'}).waitFor();await page.locator('#timbre-preview').click();await page.waitForFunction(()=>voices.length===8);
    assert.deepEqual(await page.evaluate(()=>nativeReads),['grand','upright']);assert.equal(requests.length,0);
    assert.ok((await page.evaluate(()=>voices.slice(4))).every(v=>v.bank==='upright'&&v.frames>10000));
    await page.locator('[data-nav="songs"]').click();await page.locator('[data-practice="0"]').click();await page.locator('#start-btn').click();await page.waitForFunction(()=>!document.querySelector('#finish-btn').disabled);await page.locator('.key[data-note="60"]').click();await page.locator('#finish-btn').click();
    const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('qinjie-state')));assert.deepEqual(saved.completed,[0,1]);assert.ok(saved.history.length>=1);assert.deepEqual(errors,[]);
    // Shared script path: fail once, leave an actionable status, retry in-place.
    const fallback=await browser.newContext(),retryPage=await fallback.newPage();let blocked=true;
    await fallback.route('**/samples/*.js',route=>blocked?route.abort():route.continue());
    await retryPage.goto('http://127.0.0.1:5173');await retryPage.locator('[data-nav="settings"]').click();await retryPage.locator('[data-audio-status]').filter({hasText:'读取失败'}).waitFor();
    assert.ok(!(await retryPage.locator('[data-audio-status]').innerText()).includes('重新安装'));blocked=false;
    await retryPage.locator('#timbre-preview').click();await retryPage.locator('[data-audio-status]').filter({hasText:'正在试听'}).waitFor();
    await fallback.close();await context.close();
    console.log('PASS: both real banks decode/play with all dynamic sample requests blocked; saved lessons preserved; failure retry succeeds without reinstall. Android bridge simulated, not tablet verification.');
  }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
