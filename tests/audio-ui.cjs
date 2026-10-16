const {chromium}=require('C:/Users/22078/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
function wav(samples,rate,file){const pcm=Buffer.alloc(samples.length*2),header=Buffer.alloc(44);for(let i=0;i<samples.length;i++)pcm.writeInt16LE(Math.round(Math.max(-1,Math.min(1,samples[i]))*32767),i*2);header.write('RIFF',0);header.writeUInt32LE(36+pcm.length,4);header.write('WAVEfmt ',8);header.writeUInt32LE(16,16);header.writeUInt16LE(1,20);header.writeUInt16LE(1,22);header.writeUInt32LE(rate,24);header.writeUInt32LE(rate*2,28);header.writeUInt16LE(2,32);header.writeUInt16LE(16,34);header.write('data',36);header.writeUInt32LE(pcm.length,40);fs.writeFileSync(file,Buffer.concat([header,pcm]));}
(async()=>{
  const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  const page=await browser.newPage();try{
    await page.goto('http://127.0.0.1:5173');
    const results=await page.evaluate(async()=>{
      const rate=44100,results=[];
      const delta=(a,b,start,end)=>{let max=0;for(let i=start;i<end;i++)max=Math.max(max,Math.abs(a[i]-b[i]));return max},rms=(a,start,end)=>Math.sqrt(a.slice(start,end).reduce((s,n)=>s+n*n,0)/(end-start));
      for(const id of ['grand','upright']){
        const bank=await PianoAudio.prepare(new OfflineAudioContext(2,44100,rate),id);
        const attacks=[];for(const [note,buffer] of bank.buffers){const channel=buffer.getChannelData(0);let peak=0;for(let i=0;i<Math.min(channel.length,rate);i++)peak=Math.max(peak,Math.abs(channel[i]));let first=0;while(first<rate*.1&&Math.abs(channel[first])<peak*.01)first++;attacks.push({note,ms:first/rate*1000})}
        async function render(stop,fallback=false,voices=1,release=.093,start=0,duration=8){
          const ctx=new OfflineAudioContext(1,rate*1.2,rate),out=voices>1?PianoAudio.createOutput(ctx):ctx.createGain(),v=[];
          if(voices===1){out.gain.value=.75;out.connect(ctx.destination)}
          for(let i=0;i<voices;i++)v.push(PianoAudio.voice(ctx,out,60+i%4,start,duration,bank));
          if(fallback)for(const x of v)Object.defineProperty(x.gain.gain,'cancelAndHoldAtTime',{value:undefined});
          if(stop)for(const x of v){x.release(release);x.release(release+.01)}
          const buffer=await ctx.startRendering();return Array.from(buffer.getChannelData(0));
        }
        const checks=[];
        for(const [release,duration] of [[.001,8],[.093,8],[.58,.5]]){
          const baseline=await render(false,false,1,release,0,duration);
          for(const fallback of [false,true]){
            const stopped=await render(true,fallback,1,release,0,duration),frame=Math.floor(release*rate),tailStart=Math.floor((release+.3)*rate);
            checks.push({release,fallback,before:delta(stopped,baseline,0,frame-1),at:delta(stopped,baseline,frame-1,frame+2),tail:rms(stopped,tailStart,tailStart+2000)});
          }
        }
        const future=await render(true,false,1,.05,.3),chord=await render(true,false,16),modern=await render(true);
        const auditionContext=new OfflineAudioContext(1,rate*7,rate),out=PianoAudio.createOutput(auditionContext);
        const seq=[60,64,67,72,71,67,64,60];seq.forEach((n,i)=>PianoAudio.voice(auditionContext,out,n,.1+i*.55,.8,bank));
        [60,64,67].forEach(n=>PianoAudio.voice(auditionContext,out,n,5,1.3,bank));
        const audition=Array.from((await auditionContext.startRendering()).getChannelData(0));
        results.push({id,checks,attacks,peakChord:chord.reduce((m,n)=>Math.max(m,Math.abs(n)),0),cancelled:future.reduce((m,n)=>Math.max(m,Math.abs(n)),0),modern,audition,rate});
      }
      return results;
    });
    const report=[];
    for(const result of results){for(const c of result.checks){assert.ok(c.before<.00001,JSON.stringify(c));assert.ok(c.at<.0003,JSON.stringify(c));assert.ok(c.tail<.000001,JSON.stringify(c))}for(const attack of result.attacks)assert.ok(attack.ms<10,JSON.stringify(attack));assert.equal(result.cancelled,0);assert.ok(result.peakChord<.98);assert.ok(result.audition.some(n=>Math.abs(n)>.03));wav(result.modern,result.rate,'release/previews/release-check-'+result.id+'-1.12.1.wav');wav(result.audition,result.rate,'release/previews/piano-'+result.id+'-1.12.1.wav');report.push({id:result.id,checks:result.checks,attacks:result.attacks,peakChord:result.peakChord,cancelled:result.cancelled})}
    fs.writeFileSync('release/previews/audio-check-1.12.1.json',JSON.stringify(report,null,2));
    console.log('PASS: both real sample banks decode; attack/sustain/decay releases continuous in modern and fallback paths; silent tail, future cancellation, 16 voices unclipped.');console.log(JSON.stringify(report));
  }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
