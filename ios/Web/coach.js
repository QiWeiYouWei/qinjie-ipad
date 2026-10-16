(function(root){
  'use strict';
  const X=typeof module!=='undefined'?require('./exam-core.js'):root.PianoExamCore;
  const focuses=[['pitch','找音与跳进'],['onset','起音节奏'],['duration','长短音保持'],['continuity','连续音阶'],['chord','双音起落'],['rests','休止与收音'],['technical','基本技术'],['piece','完整短曲'],['sight','随机视奏'],['ear','听辨'],['theory','乐理']].map(([id,title])=>({id,title}));
  const tips={pitch:'先看下一音的位置，少量白键慢练；漏音与试探性乱按都要减少。',onset:'先数拍再弹；同音也需重新起音，跟稳后关闭节拍器复测。',duration:'比较一拍、两拍和三拍；按住到应松手的位置，末音保持够时值。',continuity:'提前看下一音，错音后维持拍感，避免停下来重弹。',chord:'先固定两指位置，两个音同时按下、保持并松开；适合已有双音基础时练。',rests:'把休止也数进拍子；休止开始松开，保持拍感到下一音。',ear:'先听完整声音，比较方向、半音距离或长短，再做第一次选择。',theory:'先说清概念再答；把时值、拍号和和弦落实到一段谱面。',sight:'换一段新谱，先观察拍号、变化音和重复型，再连续弹完。'};
  const targets={pitch:85,onset:80,duration:80,continuity:80,chord:85,rests:90,ear:80,theory:80};
  function validFocus(id){return focuses.some(f=>f.id===id)}
  function drill(focus,level,seed,examPack,drillPack){
    if(!validFocus(focus)||!Number.isInteger(level)||level<0||level>3)throw Error('训练项目无效');
    if(['technical','piece','sight','ear','theory'].includes(focus))return {...X.paper(level,seed,examPack).find(s=>s.kind===focus),focus};
    const song=drillPack.songs.find(s=>s.id===`qinjie.drill.${focus}.${level}`);if(!song)throw Error('专项谱面缺失');
    return {kind:'technical',title:song.title,weight:100,meter:4,sequence:song.sequence,focus};
  }
  function trainingVerdict(result,focus){
    if(!result?.valid)return {total:null,passed:false,grade:'未完成'};
    const passed=result.metrics?result.gates&&(result.metrics[focus]===undefined||result.metrics[focus]===null||result.metrics[focus]>=80):result.score>=80;
    return {total:result.score,passed,grade:passed?'训练达标':'继续巩固'};
  }
  function safeState(value){
    const out={focus:'onset',bpm:60,metronome:true,hints:true,history:[]};if(!value||typeof value!=='object')return out;
    if(validFocus(value.focus))out.focus=value.focus;
    if(Number.isInteger(value.bpm)&&value.bpm>=35&&value.bpm<=120)out.bpm=value.bpm;
    if(typeof value.metronome==='boolean')out.metronome=value.metronome;if(typeof value.hints==='boolean')out.hints=value.hints;
    if(Array.isArray(value.history))out.history=value.history.slice(-50).filter(h=>h&&validFocus(h.focus)&&Number.isInteger(h.bpm)&&h.bpm>=35&&h.bpm<=120&&typeof h.metronome==='boolean'&&typeof h.hints==='boolean').flatMap(h=>{
      const clean=X.safeState({history:[h]}).history[0];if(!clean)return [];
      const result=clean.stages[0],quiz=['ear','theory'].includes(h.focus),shape=quiz?result?.kind===h.focus&&!result.metrics:['technical','piece','sight'].includes(result?.kind)&&!!result?.metrics;
      const complete=h.status==='complete'&&clean.stages.length===1&&result.valid&&shape;
      return [{...clean,mode:'drill',focus:h.focus,bpm:h.bpm,metronome:h.metronome,hints:h.hints,status:complete?'complete':'interrupted',...(complete?trainingVerdict(clean.stages[0],h.focus):{total:null,passed:false,grade:'未完成'})}];
    });return out;
  }
  function prescription(history,level,notation){
    const h=history.slice().reverse().find(h=>h.level===level&&h.notation===notation&&h.status==='complete'&&Number.isFinite(h.total));
    if(!h)return {source:null,items:[{focus:'onset',title:'先建立稳定拍感',score:null,tip:tips.onset},{focus:'duration',title:'练清楚长音与松手',score:null,tip:tips.duration},{focus:'sight',title:'再看一段新谱',score:null,tip:tips.sight}]};
    const values={};for(const s of h.stages){if(s.metrics){for(const [k,v] of Object.entries(s.metrics))if(Number.isFinite(v))(values[k]??=[]).push(v)}else if(['ear','theory'].includes(s.kind))values[s.kind]=[s.score]}
    const items=Object.entries(values).map(([focus,a])=>({focus,title:focuses.find(f=>f.id===focus).title,score:Math.round(a.reduce((n,v)=>n+v,0)/a.length),tip:tips[focus],target:targets[focus]})).filter(i=>i.score<i.target).sort((a,b)=>(a.score/a.target)-(b.score/b.target)).slice(0,3);
    if(!items.length)items.push({focus:'sight',title:'保持能力，尝试新谱',score:null,tip:tips.sight});
    return {source:h,items};
  }
  function trend(history,level,notation){
    const records=history.filter(h=>h.level===level&&h.notation===notation&&h.status==='complete'&&Number.isFinite(h.total)&&Number.isFinite(h.offsetMs)).slice(-8);
    const latest=records.at(-1),previous=records.at(-2);return {records,count:records.length,delta:previous?Math.round((latest.total-previous.total)*10)/10:null,best:records.length?Math.max(...records.map(h=>h.total)):null};
  }
  function comparison(history,h){const index=history.indexOf(h);return (index>=0?history.slice(0,index):history).slice().reverse().find(r=>r!==h&&r.status==='complete'&&Number.isFinite(r.total)&&r.level===h.level&&r.notation===h.notation&&r.focus===h.focus&&r.bpm===h.bpm&&r.metronome===h.metronome&&r.hints===h.hints&&r.offsetMs===h.offsetMs)||null}
  function explanation(q,kind){
    if(kind==='ear'){
      if(q.prompt.includes('变化'))return '比较第二个音的高低：更高是上行，更低是下行，高度不变是同音。';
      if(q.prompt.includes('间隔'))return '小三度相距3个半音，大三度4个半音，纯五度7个半音。先听方向，再比较距离。';
      if(q.prompt.includes('和弦'))return '大三和弦从根音算是0、4、7半音，小三和弦是0、3、7；区别在中间的三音。';
      return '把四拍细分：附点四分是1.5拍，八分是0.5拍；先听起音间距，再核对最后长音。';
    }
    const text=String(q.prompt||'');
    if(text.includes('0表示')||text.includes('休止'))return '0是休止，也占谱面时间。及时松键并继续数拍，下一音仍按原拍点进入。';
    if(text.includes('2/4'))return '2/4以四分音符为一拍，每小节两拍。分子表示每小节拍数。';
    if(text.includes('4/4'))return '4/4以四分音符为一拍，每小节四拍；音符与休止合计必须满四拍。';
    if(text.includes('二分'))return '二分音符相当于两个四分音符；若四分为一拍，二分需保持两拍。';
    if(text.includes('中央C'))return '中央C是C4。本应用简谱以1=C为参考，无八度点的1对应C4。';
    if(text.includes('数字'))return '简谱数字1—7是音级，不是手指编号；八度由上、下音点区别。';
    if(text.includes('升号'))return '升号把原音升高半音，例如C升为C♯，是相邻的更高一个键。';
    if(text.includes('主和弦'))return 'C大调主三和弦由C、E、G组成，根音、三音、五音构成0、4、7半音。';
    if(text.includes('重复'))return '重复音需松开再按，产生新的起音；一直按住只产生一个音的持续。';
    if(text.includes('两个八分'))return '每个八分音符半拍，两个八分合计一拍，等于一个四分音符。';
    if(text.includes('大三'))return '大三和弦根音到三音4半音，到五音7半音，即0、4、7。';
    if(text.includes('小三'))return '小三和弦根音到三音3半音，到五音7半音，即0、3、7。';
    if(text.includes('琶音'))return '琶音把和弦音先后展开；和弦与琶音音高可相同，但起音次序不同。';
    if(text.includes('附点四分'))return '附点增加原时值的一半：四分1拍，加半拍成为1.5拍。';
    if(text.includes('附点八分'))return '附点八分0.75拍加十六分0.25拍，合计1拍。';
    if(text.includes('还原'))return '还原号取消此前适用的升降变化，让音恢复自然音高。';
    if(text.includes('最后'))return '最后一个音也包含完整时值；起音正确但立即松开会损失保持分。';
    return '视奏时维持稳定拍感，提前看下一音；谱面休止与长音是音乐的一部分，不算额外停顿。';
  }
  const api={focuses,tips,drill,trainingVerdict,safeState,prescription,trend,comparison,explanation};if(typeof module!=='undefined')module.exports=api;else root.PianoCoach=api;
})(typeof window==='undefined'?globalThis:window);
