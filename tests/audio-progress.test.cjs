const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('web/audio.js','utf8');
function fixture(native){
  const scripts=[],timers=new Map();let timer=0;
  const window={Android:native},context={window,Map,WeakMap,atob:s=>Buffer.from(s,'base64').toString('binary'),setTimeout:f=>{timers.set(++timer,f);return timer},clearTimeout:id=>timers.delete(id),document:{createElement:()=>({remove(){this.removed=true}}),head:{appendChild:s=>scripts.push(s)}}};
  vm.runInNewContext(source,context);
  const audio={decodeAudioData:(bytes,ok)=>ok({duration:1,numberOfChannels:1,sampleRate:1000,length:1000,getChannelData:()=>new Float32Array(1000).fill(.5)})};
  return {A:window.PianoAudio,audio,scripts,timers};
}
const bank=Object.fromEntries(Array.from({length:8},(_,i)=>[60+i,'AAAA']));
test('progress reports real decoded counts, excludes runtime data and isolates observers',async()=>{
  const f=fixture({readPianoSampleBank:()=>JSON.stringify(bank)}),events=[];
  assert.equal(f.A.status(f.audio).phase,'idle');
  const off=f.A.observe(e=>events.push({context:e.context,id:e.id,phase:e.phase,completed:e.completed,total:e.total}));
  f.A.observe(()=>{throw Error('UI listener failure')});
  const first=f.A.prepare(f.audio),second=f.A.prepare(f.audio);assert.equal(first,second);
  await first;
  const ready=f.A.status(f.audio);assert.equal(ready.phase,'ready');assert.equal(ready.total,8);assert.equal(ready.completed,8);assert.equal(ready.transport,'native');
  assert.ok(events.every(e=>e.context===f.audio&&e.id==='grand'));
  assert.deepEqual(events.filter(e=>e.phase==='decoding').map(e=>e.completed),[0,1,2,3,4,5,6,7,8]);
  ready.completed=999;assert.equal(f.A.status(f.audio).completed,8);
  assert.deepEqual(Object.keys(ready).sort(),['completed','message','phase','total','transport']);
  off();const count=events.length;await f.A.prepare(f.audio,'upright');assert.equal(events.length,count);
});

test('a stalled decode times out, reports error, retries and ignores its late callback',async()=>{
  const f=fixture({readPianoSampleBank:()=>JSON.stringify(bank)});let complete;
  const buffer={duration:1,numberOfChannels:1,sampleRate:1000,length:1000,getChannelData:()=>new Float32Array(1000).fill(.5)};
  f.audio.decodeAudioData=(_,ok)=>{complete=ok};const first=f.A.prepare(f.audio);
  await new Promise(setImmediate);assert.equal(f.A.status(f.audio).phase,'decoding');
  const rejected=assert.rejects(first,/解码超时/);[...f.timers.values()][0]();await rejected;
  assert.equal(f.A.status(f.audio).phase,'error');assert.equal(f.A.status(f.audio).completed,0);
  const late=complete;f.audio.decodeAudioData=(_,ok)=>ok(buffer);const retry=await f.A.prepare(f.audio);
  late(buffer);await Promise.resolve();assert.equal(retry.buffers.size,8);assert.equal(f.A.status(f.audio).phase,'ready');assert.equal(f.A.status(f.audio).completed,8);
});

test('concurrent contexts retain their actual transport instead of sharing mutable metadata',async()=>{
  const f=fixture({readPianoSampleBank:()=>JSON.stringify(bank)}),other={...f.audio};
  const original=f.A.prepare(f.audio),cached=f.A.prepare(other);await Promise.all([original,cached]);
  assert.equal(f.A.status(f.audio).transport,'native');assert.equal(f.A.status(other).transport,'cache');
  const fresh=fixture();const promise=fresh.A.prepare(fresh.audio),rejected=assert.rejects(promise,/读取失败/);fresh.scripts[0].onerror();await rejected;
  assert.equal(fresh.A.status(fresh.audio).transport,'script');assert.equal(fresh.A.status(fresh.audio).phase,'error');
});

