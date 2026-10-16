const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('web/audio.js','utf8');
function fixture(native){
  const scripts=[],timers=new Map();let timer=0;
  const window={Android:native},context={window,Map,WeakMap,atob:s=>Buffer.from(s,'base64').toString('binary'),setTimeout:(f,ms)=>{if(ms===0)return setTimeout(f,0);timers.set(++timer,f);return timer},clearTimeout:id=>timers.delete(id),document:{createElement:()=>({remove(){this.removed=true}}),head:{appendChild:s=>scripts.push(s)}}};
  vm.runInNewContext(source,context);
  const audio={decodeAudioData:(bytes,ok)=>ok({duration:1,numberOfChannels:1,sampleRate:1000,length:1000,getChannelData:()=>new Float32Array(1000).fill(.5)})};
  return {A:window.PianoAudio,audio,scripts,timers};
}
const bank=Object.fromEntries(Array.from({length:8},(_,i)=>[60+i,'AAAA']));
test('Android native bank loads without script request, caches and decodes',async()=>{
  const calls=[],f=fixture({readPianoSampleBank:id=>{calls.push(id);return JSON.stringify(bank)}});
  const a=await f.A.prepare(f.audio,'grand'),b=await f.A.prepare(f.audio,'grand');
  assert.equal(a,b);assert.equal(a.buffers.size,8);assert.deepEqual(calls,['grand']);assert.equal(f.scripts.length,0);
  await f.A.prepare(f.audio,'upright');assert.deepEqual(calls,['grand','upright']);
});
test('invalid native data falls back, shares pending request and retries after failure',async()=>{
  const f=fixture({readPianoSampleBank:()=>'{"60":123}'});
  const first=f.A.prepare(f.audio),second=f.A.prepare(f.audio);assert.equal(first,second);assert.equal(f.scripts.length,1);
  const rejection=assert.rejects(first,/离线音源读取失败/);f.scripts[0].onerror();await rejection;
  const retry=f.A.prepare(f.audio);assert.equal(f.scripts.length,2);f.A.register('grand',bank);f.scripts[1].onload();assert.equal((await retry).buffers.size,8);
});
test('timeout cleans up and stale handlers cannot damage a later retry',async()=>{
  const f=fixture(),promise=f.A.prepare(f.audio),old=f.scripts[0].onerror;
  const rejected=assert.rejects(promise,/超时/);[...f.timers.values()][0]();await rejected;
  const retry=f.A.prepare(f.audio);old();f.A.register('grand',bank);f.scripts[1].onload();assert.equal((await retry).buffers.size,8);
});
test('Android bridge exposes only bounded bundled banks and extracts their exact JSON',()=>{
  const java=fs.readFileSync('android/src/cn/qinjie/piano/MainActivity.java','utf8');
  assert.match(java,/@JavascriptInterface public String readPianoSampleBank/);
  const store=fs.readFileSync('android/src/cn/qinjie/piano/PianoSampleStore.java','utf8');
  assert.ok(store.includes('!"grand".equals(id)&&!"upright".equals(id)'));
  assert.ok(store.includes('out.size()+count>5000000'));
  for(const id of ['grand','upright']){
    const script=fs.readFileSync('web/samples/'+id+'.js','utf8'),marker='PianoAudio.register("'+id+'",';
    const data=JSON.parse(script.slice(script.indexOf(marker)+marker.length,script.lastIndexOf(');')));
    const captured={};vm.runInNewContext(script,{PianoAudio:{register:(name,bank)=>captured[name]=bank}});
    assert.deepEqual(data,JSON.parse(JSON.stringify(captured[id])));assert.ok(Object.keys(data).length>=8);
  }
});

test('chunk bridge loads a large real bank with no script or multi-megabyte return',async()=>{
  let data;vm.runInNewContext(fs.readFileSync('web/samples/upright.js','utf8'),{PianoAudio:{register:(_,bank)=>data=bank}});
  const raw=JSON.stringify(data),calls=[],released=[];
  const f=fixture({pianoSampleBankInfo:()=>JSON.stringify({ok:true,length:raw.length,chunkSize:16384}),pianoSampleBankChunk:(_,offset)=>{const chunk=raw.slice(offset,offset+16384);calls.push(chunk.length);return chunk},releasePianoSampleBank:id=>released.push(id),readPianoSampleBank:()=>{throw Error('large return forbidden')}});
  const a=f.A.prepare(f.audio,'upright'),b=f.A.prepare(f.audio,'upright');assert.equal(a,b);assert.equal((await a).buffers.size,Object.keys(data).length);
  assert.equal(f.scripts.length,0);assert.ok(calls.length>100&&calls.every(n=>n>0&&n<=16384));assert.deepEqual(released,['upright']);assert.equal(f.A.status(f.audio,'upright').transport,'native-chunks');assert.equal(f.A.diagnostics('upright').nativeError,null);
});

test('native failure is retained alongside script failure and short chunks fail safely',async()=>{
  const f=fixture({pianoSampleBankInfo:()=>'{"ok":false,"code":"ASSET_READ_FAILED","detail":"FileNotFoundException"}',pianoSampleBankChunk:()=>'',releasePianoSampleBank:()=>{}});
  const a=f.A.prepare(f.audio),rejected=assert.rejects(a,/原生读取：ASSET_READ_FAILED/);f.scripts[0].onerror();await rejected;
  assert.match(f.A.diagnostics().nativeError,/FileNotFoundException/);assert.match(f.A.diagnostics().scriptError,/离线音源读取失败/);
  const short=fixture({pianoSampleBankInfo:()=>'{"ok":true,"length":100,"chunkSize":16384}',pianoSampleBankChunk:()=>'{',releasePianoSampleBank:()=>{}});
  const b=short.A.prepare(short.audio),failure=assert.rejects(b,/NATIVE_CHUNK_INCOMPLETE/);short.scripts[0].onerror();await failure;assert.equal(short.A.status(short.audio).phase,'error');
});

