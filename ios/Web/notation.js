(function(root){
  'use strict';
  const C=typeof module!=='undefined'?require('./core.js'):root.PianoCore;
  const STEP=104,START=90;
  function width(expected){return Math.max(720,expected.length*STEP+START)}
  function label(note,notation){
    if(notation==='staff')return C.name(note);
    const p=C.numberPitch(note),oct=p.octave>0?'高'+(p.octave>1?p.octave+'八度':'音'):p.octave<0?'低'+(p.octave<-1?-p.octave+'八度':'音'):'';
    return oct+p.accidental+p.degree+'（'+C.name(note)+'）';
  }
  function keyLabel(note,notation,hints){
    if(!hints)return '';
    if(notation==='staff')return C.name(note);
    const p=C.numberPitch(note);
    return `<b class="key-number">${p.octave>0?'<i>'+('·'.repeat(p.octave))+'</i>':''}${p.accidental}${p.degree}${p.octave<0?'<em>'+('·'.repeat(-p.octave))+'</em>':''}</b><small>${C.name(note)}</small>`;
  }
  function numbered(expected,{meter=4,hints=true}={}){
    const w=width(expected);let accidentals=new Map(),measure=-1;let svg=`<svg class="jianpu-score" preserveAspectRatio="none" viewBox="0 0 ${w} 180" width="${w}" role="img" aria-label="简谱，1=C，${meter}/4拍"><text x="12" y="21" font-size="14" fill="#58704d">1=C</text>`;
    expected.forEach(e=>{
      const x=START+e.index*STEP,notes=[...e.notes].sort((a,b)=>b-a),duration=C.numberDuration(e.duration),rows=notes.length?notes:[null];
      const m=Math.floor((e.beat+.00001)/meter);if(m!==measure){accidentals=new Map();measure=m;}
      if(e.beat>0&&Math.abs(e.beat%meter)<.001)svg+=`<line x1="${x-28}" x2="${x-28}" y1="33" y2="148" stroke="#c3cdb6"/>`;
      svg+=`<g data-score-index="${e.index}" data-score-kind="numbered" style="color:#354f3b" fill="currentColor"><rect class="cursor" x="${x-22}" y="28" width="99" height="127" rx="9" fill="#e4ebce" opacity="0"/>`;
      rows.forEach((note,j)=>{
        const y=rows.length===1?94:52+j*38,p=note===null?{degree:0,accidental:'',octave:0}:C.numberPitch(note),size=rows.length===1?32:27;
        svg+=`<text x="${x}" y="${y}" font-size="${size}" text-anchor="middle" font-weight="600">${p.degree}</text>`;
        if(note!==null){const key=p.octave+':'+p.degree,prior=accidentals.get(key)||'',mark=p.accidental|| (prior?'♮':'');if(mark)svg+=`<text class="accidental" x="${x-21}" y="${y-1}" font-size="20" text-anchor="middle">${mark}</text>`;accidentals.set(key,p.accidental);}
        for(let k=0;k<Math.abs(p.octave);k++)svg+=`<circle class="octave-dot" cx="${x}" cy="${p.octave>0?y-32-k*7:y+12+k*7}" r="2.4"/>`;
        for(let k=0;k<duration.dashes;k++)svg+=`<text class="extension-dash" x="${x+26+k*20}" y="${y-2}" font-size="23" text-anchor="middle">−</text>`;
        if(duration.dotted)svg+=`<circle class="duration-dot" cx="${x+18}" cy="${y-11}" r="2.7"/>`;
      });
      for(let k=0;k<duration.underlines;k++)svg+=`<line class="duration-underline" x1="${x-10}" x2="${x+12+(duration.dotted?10:0)}" y1="${rows.length===1?124+k*6:150+k*6}" y2="${rows.length===1?124+k*6:150+k*6}" stroke="currentColor" stroke-width="1.9"/>`;
      svg+=`</g><text x="${x}" y="174" text-anchor="middle" font-size="10" fill="#829175">${hints?(notes.length?notes.map(C.name).join('+'):'休止'):e.index+1}</text>`;
    });return svg+'</svg>';
  }
  function staff(expected,{meter=4,hints=true}={}){
    const w=width(expected),letter=[0,0,1,1,2,3,3,4,4,5,5,6],position=n=>132-((Math.floor(n/12)-5)*7+letter[n%12])*6;
    let accidentals=new Map(),measure=-1;
    let svg=`<svg class="staff-score" preserveAspectRatio="none" viewBox="0 0 ${w} 165" width="${w}" role="img" aria-label="高音谱表，${meter}/4拍">${[72,84,96,108,120].map(y=>`<line x1="8" x2="${w-8}" y1="${y}" y2="${y}" stroke="#b6c1ad"/>`).join('')}<text x="15" y="110" font-size="45" fill="#45644e">𝄞</text><text x="48" y="91" font-size="19" fill="#63745a">${meter}</text><text x="48" y="114" font-size="19" fill="#63745a">4</text>`;
    expected.forEach(e=>{
      const x=START+e.index*STEP,m=Math.floor((e.beat+.00001)/meter);
      if(m!==measure){accidentals=new Map();measure=m;}
      if(e.beat>0&&Math.abs(e.beat%meter)<.001)svg+=`<line x1="${x-28}" x2="${x-28}" y1="72" y2="120" stroke="#aebca4"/>`;
      svg+=`<g data-score-index="${e.index}" data-score-kind="staff" style="color:#354f3b" fill="currentColor" stroke="currentColor"><rect class="cursor" x="${x-22}" y="28" width="99" height="112" rx="9" fill="#e4ebce" stroke="none" opacity="0"/>`;
      if(!e.notes.length){
        if(e.duration>=2)svg+=`<rect class="rest-symbol" x="${x-8}" y="${e.duration>=4?96:90}" width="16" height="6"/>`;
        else if(e.duration<1){svg+=`<path class="rest-symbol short-rest" d="M${x+7} 78 l-9 34" fill="none" stroke-width="2"/><circle cx="${x-2}" cy="84" r="4"/>`;if(e.duration===.25)svg+=`<circle cx="${x-5}" cy="94" r="4"/>`}
        else svg+=`<path class="rest-symbol" d="M${x+2} 74 l9 13 l-9 12 l8 10 q-11 -4 -10 7 q-10 -10 0 -16 l-7 -10 l8 -10" stroke-width="1.5"/>`;
        if([.75,1.5,3].includes(e.duration))svg+=`<circle class="duration-dot" cx="${x+18}" cy="92" r="2" stroke="none"/>`;
      }
      const down=e.notes.length&&e.notes.reduce((s,n)=>s+n,0)/e.notes.length>=71,ys=e.notes.map(position);
      e.notes.forEach(n=>{
        const y=position(n),sharp=[1,3,6,8,10].includes(n%12),key=Math.floor(n/12)*7+letter[n%12],before=accidentals.get(key)||false;
        for(let yy=132;yy<=y;yy+=12)svg+=`<line x1="${x-12}" x2="${x+12}" y1="${yy}" y2="${yy}"/>`;
        for(let yy=60;yy>=y;yy-=12)svg+=`<line x1="${x-12}" x2="${x+12}" y1="${yy}" y2="${yy}"/>`;
        if(sharp||before)svg+=`<text class="accidental" x="${x-25}" y="${y+5}" font-size="16" stroke="none">${sharp?'♯':'♮'}</text>`;
        accidentals.set(key,sharp);
        svg+=`<ellipse cx="${x}" cy="${y}" rx="8" ry="5.5" transform="rotate(-18 ${x} ${y})" fill="${e.duration>=2?'#fffef8':'currentColor'}" stroke-width="1.7"/>`;
        if([.75,1.5,3].includes(e.duration))svg+=`<circle class="duration-dot" cx="${x+15}" cy="${y-2}" r="2" stroke="none"/>`;
      });
      if(e.notes.length&&e.duration<4){
        const stemX=x+(down?-7:7),from=down?Math.min(...ys):Math.max(...ys),to=down?Math.max(...ys)+32:Math.min(...ys)-32;
        svg+=`<line x1="${stemX}" x2="${stemX}" y1="${from}" y2="${to}" stroke-width="1.6"/>`;
        if([.25,.5,.75].includes(e.duration)){for(let flag=0;flag<(e.duration===.25?2:1);flag++){const yy=to+(down?-7:7)*flag;svg+=`<path class="note-flag" d="M${stemX} ${yy} q14 ${down?-9:9} 6 ${down?-19:19}" fill="none" stroke-width="2"/>`}}
      }
      svg+=`</g><text x="${x}" y="159" text-anchor="middle" font-size="11" fill="#839176">${hints?(e.notes.length?e.notes.map(C.name).join('+'):'休止'):e.index+1}</text>`;
    });return svg+'</svg>';
  }
  function render(expected,options={}){
    const notation=options.notation||'numbered';
    if(notation==='both')return `<div class="score-pair"><small class="score-name">简谱 · 1=C · 无点1=C4</small>${numbered(expected,options)}<small class="score-name">五线谱 · 同一组音上下对应</small>${staff(expected,options)}</div>`;
    return notation==='staff'?staff(expected,options):numbered(expected,options);
  }
  const api={render,numbered,staff,label,keyLabel,STEP,START};
  if(typeof module!=='undefined')module.exports=api;else root.PianoNotation=api;
})(typeof window==='undefined'?globalThis:window);
