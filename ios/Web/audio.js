(function(root){
  'use strict';
  const floor=.00001,releaseSeconds=.22;
  const timbres=Object.freeze([
    {id:'grand',name:'三角钢琴 · 清亮',description:'开阔、清亮，保留琴弦共鸣，适合旋律与和弦。'},
    {id:'upright',name:'立式钢琴 · 温暖',description:'温暖、贴近，带有实录的木质感，适合慢练与小曲。'}
  ]);
  const encoded=new Map(),loads=new Map(),contexts=new WeakMap(),states=new WeakMap(),transports=new Map(),listeners=new Set();
  const issues=new Map();
  function diagnostics(id='grand'){return {...(issues.get(valid(id))||{nativeError:null,scriptError:null})}}
  function valid(id){return timbres.some(t=>t.id===id)?id:'grand'}
  function status(context,id='grand'){
    return {...(states.get(context)?.get(valid(id))||{phase:'idle',completed:0,total:0,transport:'unknown',message:'尚未准备采样'})};
  }
  function observe(listener){if(typeof listener!=='function')throw Error('无效进度监听');listeners.add(listener);return ()=>listeners.delete(listener)}
  function update(context,id,patch){
    let map=states.get(context);if(!map){map=new Map();states.set(context,map)}
    const value={...status(context,id),...patch};map.set(id,value);
    for(const listener of listeners){try{listener({context,id,...value})}catch(ignored){}}
  }
  function register(id,data){if(valid(id)!==id||!data||typeof data!=='object')throw Error('无效音源');encoded.set(id,data)}
  function bankData(raw){
    if(typeof raw!=='string'||!raw.length)throw Error('NATIVE_EMPTY_RESPONSE');
    const data=JSON.parse(raw);
    if(!data||typeof data!=='object'||Array.isArray(data)||Object.keys(data).length<8||Object.entries(data).some(([note,bytes])=>!/^\d+$/.test(note)||typeof bytes!=='string'||!bytes.length))throw Error('NATIVE_BANK_INVALID');
    return data;
  }
  function scriptLoad(id,problem){
    transports.set(id,'script');
    return new Promise((resolve,reject)=>{
      const script=document.createElement('script');script.src='samples/'+id+'.js';script.async=true;
      let finished=false;
      const finish=error=>{if(finished)return;finished=true;clearTimeout(timer);script.onload=null;script.onerror=null;script.remove();if(error){problem.scriptError=error.message;if(problem.nativeError)error.message+='；原生读取：'+problem.nativeError;reject(error)}else resolve({data:encoded.get(id),transport:'script'})};
      const timer=setTimeout(()=>finish(Error('音源加载超时，请重试')),20000);
      script.onload=()=>finish(encoded.has(id)?null:Error('未读到钢琴采样，请在设置中切换音色并重试'));script.onerror=()=>finish(Error('离线音源读取失败，请在设置中点试听重试；仍失败可退出应用后重新打开'));
      document.head.appendChild(script);
    });
  }
  function load(id,progress){
    if(encoded.has(id))return Promise.resolve({data:encoded.get(id),transport:'cache'});
    if(loads.has(id))return loads.get(id);
    const problem={nativeError:null,scriptError:null};issues.set(id,problem);
    const promise=(async()=>{
      const native=root.Android;
      if(native?.pianoSampleBankInfo&&native?.pianoSampleBankChunk){
        try{
          const info=JSON.parse(native.pianoSampleBankInfo(id));
          if(info.ok!==true)throw Error(String(info.code||'NATIVE_METADATA_FAILED')+(info.detail?' ('+String(info.detail).slice(0,60)+')':''));
          if(!Number.isInteger(info.length)||info.length<2||info.length>5000000||info.chunkSize!==16384)throw Error('NATIVE_METADATA_INVALID');
          transports.set(id,'native-chunks');
          const chunks=[],total=Math.ceil(info.length/info.chunkSize);
          for(let offset=0;offset<info.length;offset+=info.chunkSize){
            const chunk=native.pianoSampleBankChunk(id,offset);
            if(typeof chunk!=='string'||chunk.length!==Math.min(info.chunkSize,info.length-offset))throw Error('NATIVE_CHUNK_INCOMPLETE '+chunks.length+'/'+total);
            chunks.push(chunk);progress({transport:'native-chunks',completed:chunks.length,total,message:'正在读取离线采样 '+chunks.length+'/'+total+'块'});
            if(chunks.length%8===0)await new Promise(resolve=>setTimeout(resolve,0));
          }
          const data=bankData(chunks.join(''));register(id,data);return {data,transport:'native-chunks'};
        }catch(error){problem.nativeError=String(error.message||error).slice(0,200)}
        finally{try{native.releasePianoSampleBank?.(id)}catch(ignored){}}
      }else if(native?.readPianoSampleBank){
        try{const data=bankData(native.readPianoSampleBank(id));register(id,data);transports.set(id,'native');return {data,transport:'native'}}
        catch(error){problem.nativeError=String(error.message||error).slice(0,200)}
      }else if(native)problem.nativeError='NATIVE_READER_UNAVAILABLE';
      return await scriptLoad(id,problem);
    })().catch(error=>{loads.delete(id);throw error});
    loads.set(id,promise);return promise;
  }
  function decode(context,data){
    const binary=atob(data),bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
    // Callback API also supports older Android WebViews.
    return new Promise((resolve,reject)=>{
      let finished=false;const done=(error,buffer)=>{if(finished)return;finished=true;clearTimeout(timer);error?reject(error):resolve(buffer)};
      const timer=setTimeout(()=>done(Error('采样解码超时，请重试音源')),15000);
      try{context.decodeAudioData(bytes.buffer,buffer=>done(null,buffer),()=>done(Error('当前系统无法解码钢琴采样，请尝试另一音色并检查系统更新')))}catch(error){done(error)}
    });
  }
  function trimCodecSilence(context,buffer){
    // Stream-encoded MP3 may retain encoder padding. Strip that padding after decode,
    // keeping a 3 ms lead-in so the recorded hammer attack is not cut off.
    const channels=Array.from({length:buffer.numberOfChannels},(_,c)=>buffer.getChannelData(c));
    let peak=0;for(const channel of channels)for(let i=0;i<Math.min(channel.length,buffer.sampleRate);i++)peak=Math.max(peak,Math.abs(channel[i]));
    let first=0;for(;first<Math.min(buffer.length,buffer.sampleRate*.15);first++)if(channels.some(c=>Math.abs(c[first])>peak*.006))break;
    const cut=Math.max(0,first-Math.round(buffer.sampleRate*.003));if(!cut)return buffer;
    const trimmed=context.createBuffer(buffer.numberOfChannels,buffer.length-cut,buffer.sampleRate);
    channels.forEach((c,i)=>trimmed.copyToChannel(c.subarray(cut),i));return trimmed;
  }
  function prepare(context,id='grand'){
    id=valid(id);let banks=contexts.get(context);if(!banks){banks=new Map();contexts.set(context,banks)}
    if(banks.has(id))return banks.get(id);
    update(context,id,{phase:'loading',completed:0,total:0,transport:'unknown',message:'正在读取离线采样…'});
    const promise=(async()=>{
      const loaded=await load(id,patch=>update(context,id,patch)),buffers=new Map();
      const entries=Object.entries(loaded.data),transport=loaded.transport;
      update(context,id,{phase:'decoding',completed:0,total:entries.length,transport,message:'正在准备钢琴采样…'});
      // Decode sequentially to bound peak memory on tablets; complete before playback.
      for(const [note,bytes] of entries){const buffer=trimCodecSilence(context,await decode(context,bytes));if(buffer.duration<.1)throw Error('音源解码失败');buffers.set(Number(note),buffer);update(context,id,{completed:buffers.size,message:'正在准备钢琴采样 '+buffers.size+'/'+entries.length})}
      if(buffers.size<8)throw Error('音源采样缺失');
      update(context,id,{phase:'ready',message:'实录采样已就绪 · 离线可弹'});
      return {id,buffers,notes:[...buffers.keys()].sort((a,b)=>a-b)};
    })().catch(error=>{banks.delete(id);const current=status(context,id);update(context,id,{phase:'error',transport:current.transport==='unknown'?(transports.get(id)||'unknown'):current.transport,message:error.message||'音源准备失败，请重试'});throw error});banks.set(id,promise);return promise;
  }
  function nearest(notes,note){return notes.reduce((best,n)=>Math.abs(n-note)<Math.abs(best-note)?n:best,notes[0])}
  function envelope(start,duration){return [{time:start,value:0,kind:'set'},{time:start+.003,value:1,kind:'linear'},{time:start+duration,value:1,kind:'linear'},{time:start+duration+releaseSeconds,value:floor,kind:'exp'},{time:start+duration+releaseSeconds+.005,value:0,kind:'linear'}]}
  function valueAt(points,time){
    if(time<=points[0].time)return points[0].value;
    for(let i=1;i<points.length;i++)if(time<=points[i].time){const a=points[i-1],b=points[i],p=(time-a.time)/(b.time-a.time);return b.kind==='exp'?a.value*Math.pow(b.value/a.value,p):a.value+(b.value-a.value)*p}
    return points[points.length-1].value;
  }
  function schedule(param,points){for(const p of points)param[p.kind==='set'?'setValueAtTime':p.kind==='linear'?'linearRampToValueAtTime':'exponentialRampToValueAtTime'](p.value,p.time)}
  function createOutput(context){
    const gain=context.createGain(),compressor=context.createDynamicsCompressor(),limiter=context.createWaveShaper();
    gain.gain.value=.75;compressor.threshold.value=-15;compressor.knee.value=12;compressor.ratio.value=10;compressor.attack.value=.002;compressor.release.value=.16;
    const curve=new Float32Array(4097);for(let i=0;i<curve.length;i++){const x=i/(curve.length-1)*2-1,a=Math.abs(x);curve[i]=Math.sign(x)*(a<=.75?a:.75+.21*(1-Math.exp(-(a-.75)/.21)))}limiter.curve=curve;
    gain.connect(compressor);compressor.connect(limiter);limiter.connect(context.destination);return gain;
  }
  function voice(context,output,note,start,duration,bank){
    if(!bank?.buffers)throw Error('请先加载钢琴音源');
    duration=Math.max(.04,duration);const gain=context.createGain(),source=context.createBufferSource(),points=envelope(start,duration),rootNote=nearest(bank.notes,note);
    source.buffer=bank.buffers.get(rootNote);source.playbackRate.value=Math.pow(2,(note-rootNote)/12);
    schedule(gain.gain,points);source.connect(gain);gain.connect(output);source.start(start);source.stop(start+duration+releaseSeconds+.02);
    let released=false;
    const result={gain,nodes:[source],points,rootNote,timbre:bank.id,release(time=context.currentTime){
      if(released)return;released=true;const param=gain.gain,current=valueAt(points,time);
      if(time<=start){param.cancelScheduledValues(time);param.setValueAtTime(0,time);source.stop(time);return}
      if(typeof param.cancelAndHoldAtTime==='function')param.cancelAndHoldAtTime(time);
      else{param.cancelScheduledValues(time);const next=points.find(p=>p.time>=time);if(next?.kind==='exp')param.exponentialRampToValueAtTime(Math.max(floor,current),time);else param.linearRampToValueAtTime(current,time)}
      if(current>floor){param.exponentialRampToValueAtTime(floor,time+releaseSeconds);param.linearRampToValueAtTime(0,time+releaseSeconds+.005)}else param.linearRampToValueAtTime(0,time+.005);
      source.stop(time+releaseSeconds+.02);
    }};
    source.onended=()=>{source.disconnect();gain.disconnect();if(result.onended)result.onended()};return result;
  }
  const api={timbres,valid,register,prepare,status,observe,diagnostics,nearest,envelope,valueAt,createOutput,voice};
  if(typeof module!=='undefined')module.exports=api;else root.PianoAudio=api;
})(typeof window==='undefined'?globalThis:window);
