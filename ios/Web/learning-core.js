(function(root){
  'use strict';
  const R=typeof module!=='undefined'?require('./learning-content.js'):root.PianoLearningContent;
  const ids=new Set([...Array.from({length:28},(_,i)=>'lesson.'+i),...R.units.map(u=>u.id)]),intervals=[1,3,7,14,30];
  const validId=id=>ids.has(id),validCard=id=>typeof id==='string'&&['a','b'].includes(id.split('.').at(-1))&&validId(id.slice(0,-2));
  function dateValue(text){if(typeof text!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(text))return null;const d=new Date(text+'T00:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===text?d.getTime():null}
  function addDays(day,n){const t=dateValue(day);if(t===null||!Number.isInteger(n))throw Error('复习日期无效');return new Date(t+n*86400000).toISOString().slice(0,10)}
  const count=n=>Number.isInteger(n)&&n>=0?Math.min(n,100000):0;
  function safeState(value){
    const out={bookmarks:[],notes:{},scheduled:{},history:[],lastViewed:null,textSize:'normal'};if(!value||typeof value!=='object'||Array.isArray(value))return out;
    if(value.textSize==='large')out.textSize='large';if(Array.isArray(value.bookmarks))out.bookmarks=[...new Set(value.bookmarks.filter(validId))].slice(0,40);
    if(value.lastViewed&&validId(value.lastViewed.id)&&dateValue(value.lastViewed.date)!==null)out.lastViewed={id:value.lastViewed.id,date:value.lastViewed.date};
    if(value.notes&&typeof value.notes==='object')for(const [id,n] of Object.entries(value.notes))if(validId(id)&&n&&typeof n.text==='string'&&dateValue(n.date)!==null&&n.text.trim())out.notes[id]={text:n.text.slice(0,1200),date:n.date};
    if(value.scheduled&&typeof value.scheduled==='object')for(const [id,r] of Object.entries(value.scheduled))if(validCard(id)&&r&&dateValue(r.due)!==null){const observed=dateValue(r.lastDay)!==null;out.scheduled[id]={box:Number.isInteger(r.box)&&r.box>=0&&r.box<=5?r.box:0,due:r.due,lastDay:observed?r.lastDay:null,lastChoice:observed&&Number.isInteger(r.lastChoice)&&r.lastChoice>=0&&r.lastChoice<10?r.lastChoice:null,lastCorrect:observed&&typeof r.lastCorrect==='boolean'?r.lastCorrect:null,correct:count(r.correct),wrong:count(r.wrong)}}
    if(Array.isArray(value.history))out.history=value.history.slice(-200).filter(h=>h&&validCard(h.id)&&dateValue(h.date)!==null&&typeof h.correct==='boolean'&&Number.isInteger(h.choice)&&h.choice>=0&&h.choice<10).map(h=>({id:h.id,date:h.date,correct:h.correct,choice:h.choice,source:h.source==='review'?'review':'learn'}));return out;
  }
  function catalog(lessons){const cards=[];lessons.slice(0,28).forEach((l,i)=>[l,l.reviewQuestion].forEach((q,j)=>cards.push({id:`lesson.${i}.${j?'b':'a'}`,owner:'lesson.'+i,title:l.title,question:q.question,options:q.options,answer:q.answer,explanation:q.explanation||l.answerExplanation})));R.units.forEach(u=>u.questions.forEach((q,j)=>cards.push({id:u.id+'.'+(j?'b':'a'),owner:u.id,title:u.title,...q})));return cards}
  function enroll(state,id,day,{immediate=false}={}){if(!validId(id)||dateValue(day)===null)return false;let changed=false;for(const suffix of ['a','b']){const card=id+'.'+suffix;if(!state.scheduled[card]){state.scheduled[card]={box:0,due:immediate?day:addDays(day,1),lastDay:null,lastChoice:null,lastCorrect:null,correct:0,wrong:0};changed=true}}return changed}
  function syncCompleted(state,completed,day){let changed=false;for(const id of completed)if(Number.isInteger(id)&&id>=0&&id<28)changed=enroll(state,'lesson.'+id,day,{immediate:true})||changed;return changed}
  function due(state,day,cards,limit=10){if(dateValue(day)===null)return [];return cards.filter(q=>{const r=state.scheduled[q.id];return r&&r.due<=day&&r.lastDay!==day}).sort((a,b)=>state.scheduled[a.id].due.localeCompare(state.scheduled[b.id].due)||state.scheduled[b.id].wrong-state.scheduled[a.id].wrong||a.id.localeCompare(b.id)).slice(0,Math.max(0,Math.min(80,limit)))}
  function grade(state,id,choice,correct,day,source='learn'){
    if(!validCard(id)||!Number.isInteger(choice)||choice<0||choice>=10||typeof correct!=='boolean'||dateValue(day)===null)return {accepted:false};
    const previous=state.scheduled[id];if(previous?.lastDay===day||previous?.lastDay>day)return {accepted:false,record:previous};
    const r=previous||{box:0,correct:0,wrong:0};r.box=correct?Math.min(5,r.box+1):0;r.due=addDays(day,correct?intervals[Math.max(0,r.box-1)]:1);r.lastDay=day;r.lastChoice=choice;r.lastCorrect=correct;if(correct)r.correct=Math.min(100000,r.correct+1);else r.wrong=Math.min(100000,r.wrong+1);state.scheduled[id]=r;state.history.push({id,date:day,choice,correct,source:source==='review'?'review':'learn'});state.history=state.history.slice(-200);return {accepted:true,record:r};
  }
  function bookmark(state,id){if(!validId(id))return false;const i=state.bookmarks.indexOf(id);if(i>=0)state.bookmarks.splice(i,1);else state.bookmarks.push(id);return state.bookmarks.includes(id)}
  function note(state,id,text,day){if(!validId(id)||typeof text!=='string'||dateValue(day)===null)return false;if(text.trim())state.notes[id]={text:text.slice(0,1200),date:day};else delete state.notes[id];return true}
  function visit(state,id,day){if(!validId(id)||dateValue(day)===null)return false;state.lastViewed={id,date:day};return true}
  const api={safeState,catalog,enroll,syncCompleted,due,grade,bookmark,note,visit,dateValue,addDays,validId,validCard,intervals};if(typeof module!=='undefined')module.exports=api;else root.PianoLearningCore=api;
})(typeof window==='undefined'?globalThis:window);
