(function(root){
  'use strict';
  const FORMAT='qinjie-song-pack',VERSION=1,MAX_SONGS=200,MAX_BYTES=2000000;
  const durations=[.25,.5,.75,1,1.5,2,3,4],own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
  function fail(path,message){throw Error(path+'：'+message)}
  function object(v,path){if(!v||typeof v!=='object'||Array.isArray(v))fail(path,'应为对象')}
  function text(v,path,max){if(typeof v!=='string'||!v.trim()||v.length>max)fail(path,`应为1—${max}字的文字`);return v.trim()}
  function texts(v,path,min,max,length){if(!Array.isArray(v)||v.length<min||v.length>max)fail(path,`需要${min}—${max}项`);return v.map((s,i)=>text(s,path+'['+(i+1)+']',length))}
  function integer(v,path,min,max){if(!Number.isInteger(v)||v<min||v>max)fail(path,`应为${min}—${max}的整数`);return v}
  function song(v,path){
    object(v,path);const id=text(v.id,path+'.id',64);if(!/^[a-z0-9][a-z0-9._-]{2,63}$/.test(id))fail(path+'.id','需要3—64位小写字母、数字、点、下划线或横线，首位为字母或数字');
    const title=text(v.title,path+'.title',80),revision=integer(v.revision,path+'.revision',1,999999),composer=text(v.composer,path+'.composer',100),source=text(v.source,path+'.source',500);
    if(!['melody','duet'].includes(v.arrangement))fail(path+'.arrangement','仅支持melody或duet');
    if(typeof v.complete!=='boolean')fail(path+'.complete','需要true或false');
    const level=integer(v.level,path+'.level',0,3),meter=integer(v.meter,path+'.meter',2,4),bpm=integer(v.bpm,path+'.bpm',35,120),form=text(v.form,path+'.form',400),skills=texts(v.skills,path+'.skills',1,6,40),plan=texts(v.plan,path+'.plan',3,6,180);
    if(!Array.isArray(v.sequence)||!v.sequence.length||v.sequence.length>200)fail(path+'.sequence','需要1—200组音符');
    let ticks=0,low=Infinity,high=-Infinity,count=0;const bar=meter*4;
    const sequence=v.sequence.map((event,i)=>{
      const p=path+'.sequence['+(i+1)+']';if(!Array.isArray(event)||event.length!==2)fail(p,'需要[音高数组,拍数]');
      const [notes,duration]=event;if(!Array.isArray(notes)||notes.length>2)fail(p,'每组为0—2个音的数组，[]表示休止');
      if(v.arrangement==='melody'&&notes.length>1)fail(p,'melody只能每组一个音');
      if(new Set(notes).size!==notes.length)fail(p,'同一组不能重复同一音高');
      notes.forEach(n=>{integer(n,p+'.音高',55,83);low=Math.min(low,n);high=Math.max(high,n);count++});
      if(!durations.includes(duration))fail(p+'.拍数','只支持0.25、0.5、0.75、1、1.5、2、3、4拍');
      const d=duration*4;if(ticks%bar+d>bar)fail(p,'音符跨越小节，请拆开或调整编排');ticks+=d;
      return [[...notes],duration];
    });
    if(!count)fail(path+'.sequence','不能全是休止');if(high-low>24)fail(path+'.sequence','全曲音域超过24个半音，需要移调或简编');
    if(ticks%bar)fail(path+'.sequence','末小节拍数不足；弱起与结尾请补休止');if(ticks>1024)fail(path+'.sequence','总长不能超过256拍');if(ticks/4*60/bpm>300)fail(path+'.bpm','建议速度下整曲超过5分钟，请分成乐章文件');
    return {id,revision,title,composer,source,arrangement:v.arrangement,complete:v.complete,level,meter,bpm,form,skills,plan,sequence};
  }
  function validate(value,{allowEmpty=false}={}){
    object(value,'歌曲包');if(value.format!==FORMAT||value.version!==VERSION)fail('歌曲包','需要format="qinjie-song-pack"、version=1');
    if(!Array.isArray(value.songs)||value.songs.length>(MAX_SONGS)||(!allowEmpty&&!value.songs.length))fail('songs','需要1—200首歌曲');
    const songs=value.songs.map((s,i)=>song(s,'第'+(i+1)+'首')),ids=new Set();for(const s of songs){if(ids.has(s.id))fail('songs','同包重复ID：'+s.id);ids.add(s.id)}
    return {format:FORMAT,version:VERSION,songs};
  }
  function parse(raw,options){if(typeof raw!=='string'||new TextEncoder().encode(raw).length>MAX_BYTES)fail('文件','最大2MB');let value;try{value=JSON.parse(raw.replace(/^\uFEFF/,''))}catch(e){fail('文件','不是有效JSON；不要带Markdown代码围栏、注释或尾逗号')}return validate(value,options)}
  function empty(){return {format:FORMAT,version:VERSION,songs:[]}}
  function merge(current,incoming){const next=validate(current,{allowEmpty:true}).songs,changes=validate(incoming).songs;for(const s of changes){const i=next.findIndex(x=>x.id===s.id);if(i<0)next.push(s);else next[i]=s}return validate({format:FORMAT,version:VERSION,songs:next},{allowEmpty:true})}
  function exercise(s){return {id:'custom:'+s.id,custom:true,revision:s.revision,composer:s.composer,title:s.title,work:s.title,level:Math.min(2,s.level),tier:s.level,meter:s.meter,bpm:s.bpm,complete:s.complete,version:s.arrangement==='duet'?'双音简编':'单声部旋律',sequence:s.sequence,skills:s.skills,plan:s.plan,form:s.form,source:s.source,desc:s.skills.join('、')+'。'+s.plan[0]}}
  const api={FORMAT,VERSION,MAX_SONGS,MAX_BYTES,empty,validate,parse,merge,exercise};
  if(typeof module!=='undefined')module.exports=api;else root.PianoLibrary=api;
})(typeof window==='undefined'?globalThis:window);
