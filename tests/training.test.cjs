const {test}=require('node:test'),assert=require('node:assert/strict'),C=require('../web/core.js'),T=require('../web/training.js');
test('四档训练均有10题，选项互异且恰含一个正确音，相邻题不重复',()=>{
  for(let level=0;level<4;level++)for(const mode of ['bridge','staff','numbered']){
    const questions=T.round(level,mode,C.safeReading(),()=>.37);assert.equal(questions.length,10);
    for(let i=0;i<questions.length;i++){const q=questions[i];assert.ok(T.levels[level].notes.includes(q.note));assert.equal(q.choices.length,4);assert.equal(new Set(q.choices).size,4);assert.equal(q.choices.filter(n=>n===q.note).length,1);if(i)assert.notEqual(q.note,questions[i-1].note)}
  }
});
test('首次错误入错音列表，跨轮连对3次移出，答错重新进入',()=>{
  const r=C.safeReading(),meta={date:'2026-10-13',mode:'staff',level:0,seconds:3,complete:true};
  T.record(r,[{note:60,correct:false}],meta);assert.equal(T.weakNotes(r).length,1);
  for(let i=0;i<3;i++){T.record(r,[{note:60,correct:true}],meta);assert.equal(T.weakNotes(r).length,i<2?1:0)}
  assert.equal(r.notes[0].attempts,4);assert.equal(r.notes[0].correct,3);T.record(r,[{note:60,correct:false}],meta);assert.equal(T.weakNotes(r).length,1);
});
test('复习每个错音最多问一次，允许短轮；无错音不伪造题目',()=>{
  assert.deepEqual(T.round(0,'review',C.safeReading()),[]);
  const r=C.safeReading({notes:[{note:83,attempts:1,correct:0},{note:55,attempts:2,correct:1}]});
  const questions=T.round(0,'review',r,()=>.4);assert.equal(questions.length,2);assert.deepEqual(questions.map(q=>q.note).sort((a,b)=>a-b),[55,83]);
});
test('老备份保留旧记录，新识谱备份清理越界值、重复音与伪造记录',()=>{
  const old=C.safeState({completed:[0],history:[]});assert.deepEqual(old.completed,[0]);assert.equal(old.reading.history.length,0);
  const s=C.safeState({reading:{level:99,mode:'html',notes:[{note:60,attempts:2,correct:999,streak:999},{note:60,attempts:5},{note:900,attempts:5}],history:[{date:'2026-10-13',mode:'bridge',level:0,total:10,correct:8,seconds:99999,complete:true},{date:'x',mode:'bridge',level:0,total:1,correct:1,seconds:1}]}});
  assert.equal(s.reading.level,0);assert.equal(s.reading.notes.length,1);assert.equal(s.reading.notes[0].correct,2);assert.equal(s.reading.notes[0].streak,2);assert.equal(s.reading.history.length,1);assert.equal(s.reading.history[0].seconds,600);
  assert.deepEqual(C.safeState(JSON.parse(JSON.stringify(s))).reading,s.reading);
});
test('讲解区分线上、间内、加线、八度音点和升号',()=>{
  assert.match(T.explanation(60),/下方第1条加线/);assert.match(T.explanation(64),/第1线/);assert.match(T.explanation(65),/第1间/);assert.match(T.explanation(55),/下方第2条加线下方/);assert.match(T.explanation(72),/上方1个音点/);assert.match(T.explanation(61),/高半音/);
});
