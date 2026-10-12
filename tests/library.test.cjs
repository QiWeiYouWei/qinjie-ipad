const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),L=require('../web/library.js'),C=require('../web/core.js');
const raw=fs.readFileSync(path.join(__dirname,'../release/曲库模板/示例歌曲包.qinjie.json'),'utf8');
function sample(){return JSON.parse(raw)}
test('规则示例包可导入，BOM兼容，归一化白名单字段',()=>{const p=sample();p.songs[0].evilScript='alert(1)';const pack=L.parse('\uFEFF'+JSON.stringify(p));assert.equal(pack.songs.length,2);assert.equal(C.measures(pack.songs[0].sequence),8);assert.equal(pack.songs[0].evilScript,undefined);assert.equal(L.exercise(pack.songs[0]).id,'custom:qinjie.morning.melody');assert.equal(L.exercise(pack.songs[1]).tier,3)});
test('非JSON、错误协议、空包与重复ID不会部分导入',()=>{assert.throws(()=>L.parse('```json\n'+raw+'\n```'),/有效JSON/);const p=sample();p.format='other';assert.throws(()=>L.validate(p),/format/);assert.throws(()=>L.validate(L.empty()),/1—200/);assert.equal(L.validate(L.empty(),{allowEmpty:true}).songs.length,0);const d=sample();d.songs[1].id=d.songs[0].id;assert.throws(()=>L.validate(d),/重复ID/)});
test('音域、跨小节、拍数、未补齐与单声部双音有清楚错误位置',()=>{
  for(const [change,pattern] of [[p=>p.songs[0].sequence[0][0]=[54],/第1首.*音高/],[p=>p.songs[0].sequence[0][1]=3,/跨越小节/],[p=>p.songs[0].sequence[0][1]=.33,/拍数/],[p=>p.songs[0].sequence.at(-1)[1]=3,/末小节/],[p=>p.songs[0].sequence[0][0]=[60,64],/melody/],[p=>p.songs[1].sequence[0][0]=[60,60],/重复/]]){const p=sample();change(p);assert.throws(()=>L.validate(p),pattern)}
  const p=sample();p.songs[0].sequence=[[[55],2],[[83],2]];assert.throws(()=>L.validate(p),/24个半音/);
});
test('包大小、曲库数量、事件数量及总时长受限制',()=>{
  assert.throws(()=>L.parse(' '.repeat(2000001)),/2MB/);const p=sample();p.songs[0].sequence=Array(201).fill([[60],1]);assert.throws(()=>L.validate(p),/200组/);
  p.songs[0].sequence=Array(100).fill([[60],4]);assert.throws(()=>L.validate(p),/256拍/);p.songs[0].sequence=Array(64).fill([[60],4]);p.songs[0].bpm=35;assert.throws(()=>L.validate(p),/5分钟/);
  const one=sample().songs[0],many={format:L.FORMAT,version:1,songs:Array.from({length:200},(_,i)=>({...one,id:'test.song.'+i}))};assert.equal(L.validate(many).songs.length,200);assert.throws(()=>L.merge(many,sample()),/200首/);assert.equal(many.songs.length,200);
});
test('同ID更新不改变其他歌曲，校验失败不修改原曲库',()=>{const current=L.parse(raw),p=sample();p.songs=p.songs.slice(0,1);p.songs[0].revision=2;p.songs[0].title='更新的旋律';const next=L.merge(current,p);assert.equal(next.songs.length,2);assert.equal(next.songs[0].revision,2);assert.equal(current.songs[0].revision,1);assert.equal(next.songs[1].id,current.songs[1].id);p.songs[0].meter=6;assert.throws(()=>L.merge(current,p));assert.equal(current.songs.length,2)});
test('新回放按稳定ID保留音符和拍号，兼容旧版无ID记录',()=>{const replay={title:'导入曲',exercise:101,songId:'custom:test.song.one',meter:3,bpm:60,mode:'wait',notes:[{note:60,at:0,duration:1,index:0}],expected:[{notes:[60],beat:0,duration:1}]};const r=C.safeReplay(replay);assert.equal(r.exercise,101);assert.equal(r.songId,replay.songId);assert.equal(r.meter,3);delete replay.songId;delete replay.meter;assert.equal(C.safeReplay(replay).songId,null);assert.equal(C.safeReplay(replay).meter,null)});
