(function(root){
  'use strict';
  const floor=.00001;
  // Gain envelopes are explicit so old WebViews can hold an exact release value.
  function envelope(start,duration){
    const attack=.012,body=Math.min(.32,duration*.6),end=start+duration;
    return [{time:start,value:0,kind:'set'},{time:start+attack,value:.46,kind:'linear'},{time:start+Math.max(attack+.006,body),value:.15,kind:'exp'},{time:end+.14,value:floor,kind:'exp'}];
  }
  function valueAt(points,time){
    if(time<=points[0].time)return points[0].value;
    for(let i=1;i<points.length;i++)if(time<=points[i].time){const a=points[i-1],b=points[i],p=(time-a.time)/(b.time-a.time);return b.kind==='exp'?a.value*Math.pow(b.value/a.value,p):a.value+(b.value-a.value)*p}
    return points.at(-1).value;
  }
  function schedule(param,points){for(const p of points){const method=p.kind==='set'?'setValueAtTime':p.kind==='linear'?'linearRampToValueAtTime':'exponentialRampToValueAtTime';param[method](p.value,p.time)}}
  function createOutput(context){
    const gain=context.createGain(),compressor=context.createDynamicsCompressor();
    gain.gain.value=.2;compressor.threshold.value=-15;compressor.knee.value=12;compressor.ratio.value=8;compressor.attack.value=.003;compressor.release.value=.12;
    gain.connect(compressor);compressor.connect(context.destination);return gain;
  }
  function voice(context,output,note,start,duration){
    duration=Math.max(.04,duration);const gain=context.createGain(),filter=context.createBiquadFilter(),nodes=[],points=envelope(start,duration);
    filter.type='lowpass';filter.frequency.value=Math.min(6500,440*Math.pow(2,(note-69)/12)*9);filter.Q.value=.45;
    schedule(gain.gain,points);gain.connect(filter);filter.connect(output);
    [1,2,3,4].forEach((harmonic,i)=>{const o=context.createOscillator(),partial=context.createGain();o.type='sine';o.frequency.value=440*Math.pow(2,(note-69)/12)*harmonic;partial.gain.value=[1,.16,.055,.018][i];o.connect(partial);partial.connect(gain);o.start(start);o.stop(start+duration+.18);nodes.push(o)});
    let released=false,ended=0;
    const result={gain,nodes,points,release(time=context.currentTime){
      if(released)return;released=true;
      const param=gain.gain,current=valueAt(points,time);
      if(time<=start){param.cancelScheduledValues(time);param.setValueAtTime(0,time);nodes.forEach(o=>{try{o.stop(time)}catch(e){}});return}
      if(typeof param.cancelAndHoldAtTime==='function')param.cancelAndHoldAtTime(time);
      else{
        // Preserve the ramp segment leading into the release, including offline scheduling.
        param.cancelScheduledValues(time);const next=points.find(p=>p.time>=time);
        if(next?.kind==='exp')param.exponentialRampToValueAtTime(Math.max(floor,current),time);
        else param.linearRampToValueAtTime(current,time);
      }
      param.linearRampToValueAtTime(0,time+.11);nodes.forEach(o=>{try{o.stop(time+.13)}catch(e){}});
    }};
    nodes.forEach(o=>o.onended=()=>{if(++ended===nodes.length){gain.disconnect();filter.disconnect();if(result.onended)result.onended()}});
    return result;
  }
  const api={envelope,valueAt,createOutput,voice};
  if(typeof module!=='undefined')module.exports=api;else root.PianoAudio=api;
})(typeof window==='undefined'?globalThis:window);
