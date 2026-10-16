const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const M=require('../web/learning-core.js'),R=require('../web/learning-content.js'),C=require('../web/core.js'),L=require('../web/library.js');
const env={PianoCore:C};env.window=env;vm.createContext(env);for(const f of ['content','teaching','repertoire'])vm.runInContext(fs.readFileSync('web/'+f+'.js','utf8'),env);const D=env.PianoContent,cards=M.catalog(D.lessons);
test('40个课程与专题、80道解释题保持稳定ID，12份原创完整例谱符合现有协议',()=>{
  assert.equal(D.lessons.length,28);assert.equal(D.exercises.length,39);assert.equal(R.units.length,12);assert.equal(cards.length,80);assert.equal(new Set(cards.map(q=>q.id)).size,80);
  for(const q of cards){assert.ok(M.validCard(q.id));assert.ok(q.explanation&&q.options.length>=3);assert.equal(new Set(q.options).size,q.options.length);assert.ok(q.answer>=0&&q.answer<q.options.length)}
  const pack=L.parse(JSON.stringify(R.pack));assert.equal(pack.songs.length,12);assert.deepEqual(JSON.parse(fs.readFileSync('release/曲库模板/知识专题例谱.qinjie.json')),R.pack);
  for(const u of R.units){assert.equal(u.points.length,3);assert.equal(u.questions.length,2);assert.equal(u.steps.length,3);assert.ok(u.worked&&u.pitfall);const e=C.events(u.sequence);assert.equal(e.at(-1).beat+e.at(-1).duration,16);assert.ok(e.every(n=>n.beat%4+n.duration<=4));assert.ok(e.at(-1).notes.includes(u.id==='resource.center'?69:60),u.id)}
  // Pedagogical correspondence, beyond JSON structure: subdivided pulse, rests, dotted pair, pickup and C scale.
  assert.ok(R.units[0].sequence.some(e=>e[1]===.5));assert.ok(R.units[1].sequence.some(e=>Array.isArray(e[0])&&!e[0].length));assert.ok(R.units[2].sequence.some(e=>e[1]===1.5));assert.deepEqual(R.units[3].sequence.slice(0,2),[[[],3],[60,1]]);assert.deepEqual(R.units.find(u=>u.id==='resource.fingers').sequence.slice(0,8).map(e=>e[0]),[60,62,64,65,67,69,71,72]);
});
test('复习按1/3/7/14/30天安排，首次错误重置，重答与时钟倒退不能刷记录',()=>{
  const s=M.safeState({});let date='2026-10-13';const id='resource.pulse.a';
  for(const interval of [1,3,7,14,30,30]){assert.equal(M.grade(s,id,0,true,date,'review').accepted,true);assert.equal(s.scheduled[id].due,M.addDays(date,interval));assert.equal(M.grade(s,id,1,false,date).accepted,false);date=s.scheduled[id].due}
  assert.equal(s.history.length,6);assert.equal(M.grade(s,id,1,false,date,'review').accepted,true);assert.equal(s.scheduled[id].box,0);assert.equal(s.scheduled[id].due,M.addDays(date,1));assert.equal(s.scheduled[id].wrong,1);assert.equal(M.grade(s,id,0,true,'2026-10-12').accepted,false);
  assert.equal(M.addDays('2028-02-28',1),'2028-02-29');assert.equal(M.addDays('2026-12-31',1),'2027-01-01');assert.equal(M.dateValue('2026-02-29'),null);assert.equal(M.grade(s,id,0,true,'2026-13-01').accepted,false);
});
test('旧课程只补复习安排不伪造答题，新完成课程明日复习，不重置已有计划',()=>{
  const s=M.safeState({});M.syncCompleted(s,[0,27,28,99],'2026-10-13');assert.equal(Object.keys(s.scheduled).length,4);assert.equal(s.history.length,0);assert.equal(M.due(s,'2026-10-13',cards).length,4);M.grade(s,'lesson.0.a',0,true,'2026-10-13');const due=s.scheduled['lesson.0.a'].due;M.syncCompleted(s,[0],'2026-10-13');assert.equal(s.scheduled['lesson.0.a'].due,due);assert.equal(M.due(s,'2026-10-13',cards).length,3);
  M.enroll(s,'lesson.1','2026-10-13');assert.equal(s.scheduled['lesson.1.a'].due,'2026-10-14');assert.equal(M.due(s,'2026-10-13',cards).length,3);for(const u of R.units)M.enroll(s,u.id,'2026-10-13',{immediate:true});assert.equal(M.due(s,'2026-10-13',cards).length,10);assert.equal(M.due(s,'2026-10-13',cards,80).length,27);
});
test('笔记收藏与复习随记录备份清洗，非法ID日期及超长内容被限制',()=>{
  const s=M.safeState({});M.bookmark(s,'lesson.0');M.note(s,'lesson.0','</textarea><img src=x onerror=alert(1)>','2026-10-13');M.visit(s,'resource.pulse','2026-10-13');s.textSize='large';M.grade(s,'resource.pulse.a',0,true,'2026-10-13');
  assert.deepEqual(C.safeState(JSON.parse(JSON.stringify({learning:s}))).learning,s);assert.equal(C.safeState({}).learning.history.length,0);
  const corrupt=M.safeState({bookmarks:['lesson.0','lesson.0','lesson.99','__proto__'],notes:{'lesson.0':{text:'x'.repeat(2000),date:'2026-10-13'},'lesson.1':{text:'bad',date:'2026-02-29'}},scheduled:{'resource.pulse.a':s.scheduled['resource.pulse.a'],'forged.a':s.scheduled['resource.pulse.a']},history:[...s.history,{id:'fake.a',date:'2026-10-13',choice:0,correct:true}]});assert.deepEqual(corrupt.bookmarks,['lesson.0']);assert.equal(corrupt.notes['lesson.0'].text.length,1200);assert.equal(Object.keys(corrupt.notes).length,1);assert.equal(Object.keys(corrupt.scheduled).length,1);assert.equal(corrupt.history.length,1);M.note(s,'lesson.0','  ','2026-10-13');assert.equal(Object.keys(s.notes).length,0);
});
