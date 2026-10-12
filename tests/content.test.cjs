const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),C=require('../web/core.js');
const sandbox={PianoCore:C};sandbox.window=sandbox;vm.createContext(sandbox);for(const f of ['content.js','teaching.js','repertoire.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../web',f),'utf8'),sandbox);const D=sandbox.PianoContent;
test('学习路线覆盖全部稳定ID，所有课程都有例子、步骤和带解析的第二题',()=>{assert.equal(D.lessons.length,28);assert.equal(D.exercises.length,39);assert.equal(D.theory.length,15);assert.deepEqual([...D.learningOrder].sort((a,b)=>a-b),Array.from({length:28},(_,i)=>i));for(const l of D.lessons){assert.ok(l.points.length>=3,l.title);assert.ok(l.worked.title&&l.worked.text,l.title);assert.ok(l.steps.length>=3,l.title);assert.ok(l.pitfall.wrong&&l.pitfall.correct,l.title);assert.ok(l.reviewQuestion.explanation,l.title);assert.ok(l.reviewQuestion.answer>=0&&l.reviewQuestion.answer<l.reviewQuestion.options.length,l.title);assert.ok(D.exercises[l.exercise],l.title)}});
test('所有课程练习有有效音高和可绘制的简谱时值，休止不变成琴键',()=>{for(const e of D.exercises){const expected=C.events(e.sequence);assert.ok(expected.length);for(const event of expected){C.numberDuration(event.duration);for(const n of event.notes)assert.ok(Number.isInteger(n)&&n>=55&&n<=83,e.title+':'+n)}}});
test('完整曲覆盖11首独立旋律与2个双音版，每小节拍数完整且目标不越小节',()=>{
  const full=D.fullSongIds.map(i=>D.exercises[i]);assert.equal(full.length,13);assert.equal(new Set(full.map(e=>e.work)).size,11);
  assert.deepEqual([0,1,2,3].map(t=>full.filter(e=>e.tier===t).length),[3,3,4,3]);
  for(const e of full){const events=C.events(e.sequence),last=events.at(-1);assert.equal((last.beat+last.duration)%e.meter,0,e.title);assert.ok(e.bpm>=35&&e.bpm<=120);assert.ok(e.plan.length>=3&&e.form&&e.source);for(const n of events)assert.ok(n.beat%e.meter+n.duration<=e.meter,e.title+' '+n.beat)}
});
test('小星星完整ABA、铃儿响叮当含主副歌、双音版保留旋律时值',()=>{
  const twinkle=D.exercises[28],jingle=D.exercises[33],a=C.sliceMeasures(twinkle.sequence,4,1,4),reprise=C.sliceMeasures(twinkle.sequence,4,9,12);
  assert.equal(C.measures(twinkle.sequence),12);assert.deepEqual(a.map(e=>[...e.notes,e.duration]),reprise.map(e=>[...e.notes,e.duration]));assert.equal(C.measures(jingle.sequence),32);assert.equal(jingle.sequence.at(-1)[0],60);
  for(const [single,duet] of [[28,37],[31,38]]){const a=C.events(D.exercises[single].sequence),b=C.events(D.exercises[duet].sequence);assert.equal(a.length,b.length);for(let i=0;i<a.length;i++){assert.equal(a[i].duration,b[i].duration);assert.ok(a[i].notes.every(n=>b[i].notes.includes(n)));assert.ok(b[i].notes.length<=2)}assert.ok(b.some(e=>e.notes.length===2))}
});
test('挑战曲五线谱包含附点八分、双符尾十六分与短休止',()=>{
  const N=require('../web/notation.js'),html=N.staff(C.events(D.exercises[36].sequence),{meter:3});assert.match(html,/short-rest/);assert.match(html,/duration-dot/);const note=html.match(/<g data-score-index="6"[^]*?<\/g>/)[0];assert.equal((note.match(/note-flag/g)||[]).length,2);
});
