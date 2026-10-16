const {chromium}=require('C:/Users/22078/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const base=path.resolve('.build/audio-apk-preview');fs.mkdirSync(base,{recursive:true});
const extraction=spawnSync('C:/Users/22078/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe',['-c',`import zipfile,pathlib
base=pathlib.Path(r'${base}').resolve()
with zipfile.ZipFile('release/Qinjie-1.12.1-Android.apk') as z:
 for info in z.infolist():
  assert chr(92) not in info.orig_filename
  if not info.filename.startswith('assets/') or info.is_dir(): continue
  target=(base/info.filename[7:]).resolve()
  assert target.is_relative_to(base)
  target.parent.mkdir(parents=True,exist_ok=True)
  target.write_bytes(z.read(info))
`],{encoding:'utf8'});if(extraction.status!==0)throw Error(extraction.stderr);
const banks={};for(const id of ['grand','upright'])vm.runInNewContext(fs.readFileSync(path.join(base,'samples',id+'.js'),'utf8'),{PianoAudio:{register:(name,data)=>banks[name]=JSON.stringify(data)}});
(async()=>{const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});try{
  const context=await browser.newContext({viewport:{width:1280,height:800},hasTouch:true}),page=await context.newPage(),errors=[];
  await context.route('**/*',async route=>{const url=new URL(route.request().url());if(url.origin!=='https://appassets.androidplatform.net')return route.abort();const relative=url.pathname.slice(1);if(relative.startsWith('samples/'))return route.abort();const file=path.join(base,relative);if(!fs.existsSync(file))return route.fulfill({status:404,body:''});return route.fulfill({contentType:relative.endsWith('.html')?'text/html':relative.endsWith('.css')?'text/css':'text/javascript',body:fs.readFileSync(file)})});
  await context.addInitScript(banks=>{
    window.chunkSizes=[];window.nativeReleases=[];window.pianoVoices=[];
    window.Android={pianoSampleBankInfo:id=>JSON.stringify({ok:true,length:banks[id].length,chunkSize:16384}),pianoSampleBankChunk:(id,offset)=>{const chunk=banks[id].slice(offset,offset+16384);chunkSizes.push(chunk.length);return chunk},releasePianoSampleBank:id=>nativeReleases.push(id),readPianoSampleBank:()=>{throw Error('whole-bank transfer blocked')},audioDeviceInfo:()=>JSON.stringify({nativeVersion:'1.12.1',model:'APK-TEST-SIMULATION',sdk:36})};
    localStorage.setItem('qinjie-state',JSON.stringify({version:1,completed:[0,4],history:[],timbre:'upright'}));
    document.addEventListener('DOMContentLoaded',()=>{const original=PianoAudio.voice;PianoAudio.voice=(...args)=>{pianoVoices.push({note:args[2],id:args[5].id});return original(...args)}});
  },banks);page.on('pageerror',e=>errors.push(e.message));
  await page.goto('https://appassets.androidplatform.net/index.html');await page.locator('[data-nav="settings"]').click();await page.locator('[data-audio-status]').filter({hasText:'已就绪'}).waitFor();
  let info=JSON.parse(await page.locator('#audio-diagnostic').inputValue());assert.equal(info.version,'1.12.1');assert.equal(info.preparation.transport,'native-chunks');assert.equal(info.preparation.total,8);assert.equal(info.reading.nativeError,null);assert.equal(info.device.nativeVersion,'1.12.1');
  await page.locator('#timbre-preview').click();await page.waitForFunction(()=>pianoVoices.length===4);await page.locator('#timbre').selectOption('grand');await page.locator('[data-audio-status]').filter({hasText:'已就绪'}).waitFor();await page.locator('#timbre-preview').click();await page.waitForFunction(()=>pianoVoices.length===8);
  assert.ok((await page.evaluate(()=>chunkSizes)).length>400);assert.ok((await page.evaluate(()=>chunkSizes)).every(n=>n>0&&n<=16384));assert.deepEqual(await page.evaluate(()=>nativeReleases),['upright','grand']);assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('qinjie-state')).completed),[0,4]);
  await page.locator('[data-nav="songs"]').click();await page.locator('[data-practice="0"]').click();await page.locator('#start-btn').click();await page.waitForFunction(()=>!document.querySelector('#finish-btn').disabled);await page.locator('.key[data-note="60"]').tap();await page.locator('#finish-btn').click();assert.deepEqual(errors,[]);await context.close();
  console.log('PASS: final APK frontend/assets at Android origin, blocked sample scripts and whole-bank bridge, <=16 KB chunked native simulation decodes/plays upright and grand, release, stored lessons and practice. No Android device verification.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
