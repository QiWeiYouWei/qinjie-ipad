const fs=require('node:fs'),path=require('node:path'),L=require('../web/library.js');
const root=path.resolve(__dirname,'..');
const tech=[
  [[60,1],[62,1],[64,1],[65,1],[67,2],[65,1],[64,1],[62,2],[60,2],[[],2],[60,2]],
  [[60,1],[62,1],[64,1],[65,1],[67,1],[69,1],[71,1],[72,1],[71,1],[69,1],[67,1],[65,1],[64,1],[62,1],[60,2]],
  [[60,.5],[64,.5],[67,1],[72,2],[67,.5],[64,.5],[60,1],[[],2],[[60,64],2],[[62,65],2],[[64,67],2],[[60,67],2]],
  [[60,.5],[61,.5],[62,.5],[64,.5],[65,.5],[66,.5],[67,1],[69,.5],[70,.5],[72,1],[70,.5],[69,.5],[67,1],[[60,64],1.5],[[62,65],.5],[[64,67],1],[[],1],[[60,67],2],[60,2]]
];
const piece=[
  [[60,1],[62,1],[64,2],[65,1],[64,1],[62,2],[60,1],[64,1],[67,2],[64,2],[60,2]],
  [[60,1],[64,1],[67,2],[69,1],[67,1],[64,1],[[],1],[62,1],[65,1],[69,2],[67,1],[64,1],[60,2]],
  [[60,.5],[62,.5],[64,1],[67,2],[[60,64],1],[[62,65],1],[[64,67],2],[69,.5],[67,.5],[65,1],[[],2],[[60,67],2],[60,2]],
  [[60,1.5],[62,.5],[64,1],[67,1],[[60,64],1.5],[[62,65],.5],[66,1],[67,1],[69,.75],[70,.25],[72,1],[[],1],[67,1],[[60,67],2],[64,1],[60,1]]
];
const songs=[];for(let level=0;level<4;level++)for(const [kind,music] of [['tech',tech[level]],['piece',piece[level]]]){
  songs.push({id:`qinjie.exam.${kind}.${level}`,revision:1,title:(kind==='tech'?'技术专项':'考核短曲')+' · '+['五指','音阶','双音','附点'][level],composer:'琴阶原创教学练习',source:'原创四小节教学考题，按触屏能力范围编写；没有使用官方考级规定曲目，不对应官方钢琴等级。技术项目只覆盖谱面音高、时值和起落，不测真实指法。',arrangement:level>=2?'duet':'melody',complete:true,level,meter:4,bpm:[60,66,72,80][level],form:'完整四小节原创考题，16拍；末句回到中央C并保持谱面时值。非专业钢琴原谱。',skills:[['五指位置','长音'],['一个八度','稳定节拍'],['短琶音','双音起落'],['附点','变化音']][level],plan:['先在普通练习中认熟谱面，区分音级与指法。','按谱面保持时值，休止时松开，双音尽量同时起落。','进入考核前按规定速度连完四小节，最后一个音保持完整。'],sequence:music.map(([n,d])=>[Array.isArray(n)?n:[n],d])});
}
const pack=L.validate({format:'qinjie-song-pack',version:1,songs});
const target=path.join(root,'release/曲库模板/考核专项.qinjie.json');fs.writeFileSync(target,JSON.stringify(pack,null,2)+'\n');
fs.writeFileSync(path.join(root,'web/exam-content.js'),'/* Generated from release/曲库模板/考核专项.qinjie.json; original teaching material. */\nwindow.PianoExamContent='+JSON.stringify(pack)+';\n');
console.log('Prepared 8 original four-bar exam tasks without changing builtin song IDs.');
