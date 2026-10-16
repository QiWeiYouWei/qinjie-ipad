const test=require('node:test'),assert=require('node:assert/strict');
const R=require('../web/rhythm-core.js'),C=require('../web/core.js');
function entry(id='pulse-four',bpm=60,patch={}){const track=R.timeline(R.get(id),bpm);return {date:'2026-10-13',patternId:id,bpm,assist:true,subdivision:1,accent:true,offsetMs:null,complete:true,elapsed:track.end+.3,taps:track.targets.map(t=>t.at),...patch}}
test('9种完整四小节节奏，从整拍到十六分，理想输入在全速度与正负校准正确',()=>{
  assert.equal(R.patterns.length,9);assert.equal(new Set(R.patterns.map(p=>p.id)).size,9);
  for(const pattern of R.patterns)for(const bpm of [35,60,90,120,160])for(const offsetMs of [null,-80,80]){
    const track=R.timeline(pattern,bpm);assert.equal(track.beats,pattern.meter*4);assert.ok(track.targets.every(t=>t.onTime<t.window));
    const report=R.evaluate(pattern.id,track.targets.map(t=>t.at+(offsetMs||0)/1000),{bpm,offsetMs});
    assert.equal(report.coverage,100);assert.equal(report.precision,100);assert.equal(report.timing,100);assert.equal(report.extra,0);assert.equal(report.missed,0);
  }
});
test('固定窗口一对一匹配，早晚、漏拍、多拍与休止分别记录，重复不会刷时机',()=>{
  const result=R.evaluate('quarter-rest',[.12,1.2,2-.12,2+.01,4,6],{bpm:60});
  assert.equal(result.hit,4);assert.equal(result.missed,4);assert.equal(result.extra,2);assert.equal(result.rest,1);assert.equal(result.early,1);assert.equal(result.late,1);assert.equal(result.onTime,2);assert.equal(result.timing,50);
  const duplicate=R.evaluate('pulse-two',[.1,.11,1,2,3,4,5,6,7],{bpm:60});assert.equal(duplicate.hit,8);assert.equal(duplicate.extra,1);assert.equal(duplicate.late,1);assert.equal(duplicate.precision,89);
});
test('密集十六分窗口互不重叠，迟到不会牵动整条时间轴',()=>{
  const track=R.timeline(R.get('sixteenth'),160),used=new Set();
  assert.ok(track.targets[0].window<track.targets[1].at/2);
  const boundary=R.match(track.targets,used,track.targets[0].window);assert.equal(boundary.target,0);used.add(0);assert.equal(R.match(track.targets,used,0),null);
  const delayed=R.evaluate('pulse-four',Array.from({length:16},(_,i)=>i+.4),{bpm:60});assert.equal(delayed.hit,0);assert.equal(delayed.extra,16);
});
test('非法输入和超量数据拒绝，状态复原重算成绩且部分练习不冒充完整',()=>{
  assert.equal(R.evaluate('unknown',[]),null);assert.equal(R.evaluate('pulse-four',Array(161).fill(0)),null);assert.equal(R.evaluate('pulse-four',[NaN]),null);assert.equal(R.evaluate('pulse-four',[0],{bpm:900}),null);
  const full=entry(),partial=entry('pulse-four',60,{complete:true,elapsed:2,taps:[0,1]}),badDate=entry('pulse-four',60,{date:'2026-02-30'}),fakeScore=entry('pulse-four',60,{taps:[],coverage:100});
  const state=R.safeState({bpm:900,meter:7,patternId:'evil',subdivision:3,history:[full,partial,badDate,fakeScore]});
  assert.equal(state.bpm,160);assert.equal(state.meter,4);assert.equal(state.patternId,'pulse-four');assert.equal(state.subdivision,1);assert.equal(state.history.length,3);assert.equal(state.history[1].complete,false);assert.equal(R.evaluate(state.history[2].patternId,state.history[2].taps,state.history[2]).coverage,0);
  assert.equal(R.safeState({history:Array(40).fill(full)}).history.length,30);
});
test('同条件比较仅取更早完整训练，不混速度、伴拍、细分、重音或设备校准',()=>{
  const current=entry(),good=entry();
  for(const patch of [{bpm:80},{assist:false},{subdivision:2},{accent:false},{offsetMs:50},{complete:false},{patternId:'pulse-three'}])assert.equal(R.previous([entry('pulse-four',60,patch)],current),null);
  assert.equal(R.previous([good,entry('pulse-four',60,{complete:false})],current),good);assert.equal(R.previous([good],entry('pulse-four',60,{complete:false})),null);
  const silent=R.cleanEntry(entry('pulse-four',60,{assist:false,subdivision:4,accent:true}));assert.equal(silent.subdivision,1);assert.equal(silent.accent,false);
});
test('旧记录默认新工坊，节奏记录与备份保留且不改变课程、歌曲和原成绩',()=>{
  const original={completed:[0,4],history:[{date:'2026-10-13',title:'旧练习',seconds:10,mode:'wait',pitch:80}],rhythm:{bpm:90,meter:3,patternId:'eighth-pairs',history:[entry()]}};
  const state=C.safeState(original);assert.deepEqual(state.completed,[0,4]);assert.equal(state.history.length,1);assert.equal(state.rhythm.bpm,90);assert.equal(state.rhythm.history.length,1);assert.equal(C.safeState({completed:[0]}).rhythm.history.length,0);
  assert.deepEqual(C.safeState(JSON.parse(JSON.stringify(state))).rhythm,state.rhythm);
});
