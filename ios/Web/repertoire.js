/* Complete teaching arrangements. Existing exercise IDs 0–25 remain unchanged.
   Source notes and arrangement scope are documented in release/曲库说明.md. */
(()=>{
  'use strict';
  const D=PianoContent,C=PianoCore;
  const pitch={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
  function music(text){return text.split('|').flatMap(bar=>bar.trim().split(/\s+/).filter(Boolean).map(token=>{
    const [key,duration='1']=token.split(':');if(key==='R')return [[],Number(duration)];
    const m=/^([A-G])(#?)([3-5])$/.exec(key);if(!m)throw Error('Invalid music token: '+token);
    return [(Number(m[3])+1)*12+pitch[m[1]]+(m[2]?1:0),Number(duration)];
  }))}
  function add(title,tier,meter,bpm,text,skills,plan,form,source){
    const sequence=music(text),bars=C.measures(sequence,meter),id=D.exercises.length;
    D.exercises.push({title,level:Math.min(2,tier),tier,meter,bpm,sequence,complete:true,work:title.split(' · ')[0],version:'完整单声部旋律',skills,plan,form,source,desc:`${bars}小节 · ${skills.join('、')}。${plan[0]}`});
    return id;
  }
  D.songTiers=['01 · 起步：少量音与长短拍','02 · 基础：重复音与短句连接','03 · 提升：附点、弱起与完整结构','04 · 挑战：变化音与双音协调'];
  const hot=add('热十字面包 · 完整旋律',0,4,60,
    'E4:2 D4:2 | C4:4 | E4:2 D4:2 | C4:4 | C4 C4 C4 C4 | D4 D4 D4 D4 | E4:2 D4:2 | C4:4',
    ['三个白键','两拍与四拍'],['先只找1、2、3，长音只按一次。','循环第5—6小节，把重复音松开再按。','连完8小节，再用60—75 BPM跟拍。'],'三个短句，完整8小节。','传统英国童谣；旋律作时值加倍的入门编排。');
  const mary=add('玛丽有只小羊羔 · 完整旋律',0,4,65,
    'E4 D4 C4 D4 | E4 E4 E4:2 | D4 D4 D4:2 | E4 G4 G4:2 | E4 D4 C4 D4 | E4 E4 E4 E4 | D4 D4 E4 D4 | C4:4',
    ['相邻音','重复起音'],['先练第1—2小节的3 2 1 2。','第6小节四个相同音都需要重新按下。','隐藏提示，完整弹完8小节。'],'完整一轮旋律，8小节。','传统童谣；参考Mary Had a Little Lamb通行旋律，自编C调单线。');
  const twinkle=add('小星星 · 完整旋律',0,4,65,
    'C4 C4 G4 G4 | A4 A4 G4:2 | F4 F4 E4 E4 | D4 D4 C4:2 | G4 G4 F4 F4 | E4 E4 D4:2 | G4 G4 F4 F4 | E4 E4 D4:2 | C4 C4 G4 G4 | A4 A4 G4:2 | F4 F4 E4 E4 | D4 D4 C4:2',
    ['重复音','五度跳进','ABA结构'],['先练第1—4小节，再练中段第5—8小节。','第9—12小节回到开头，留意最后的两拍1。','完整弹完开头、中段、再现三部分。'],'A（1—4）—B（5—8）—A（9—12），完整12小节。','传统法国旋律；对照Wikimedia Commons的Twinkle Twinkle Sheet Music公开乐谱。');
  const jacques=add('两只老虎 · 完整旋律',1,4,65,
    'C4 D4 E4 C4 | C4 D4 E4 C4 | E4 F4 G4:2 | E4 F4 G4:2 | G4:0.5 A4:0.5 G4:0.5 F4:0.5 E4 C4 | G4:0.5 A4:0.5 G4:0.5 F4:0.5 E4 C4 | C4 G3 C4:2 | C4 G3 C4:2',
    ['八分音符','低音5','四组短句'],['前四小节先读1231与345。','第5—6小节把半拍均匀分开，先用50 BPM。','最后两小节有下点5（G3），保持原旋律音区。'],'四组乐句各重复两次，完整8小节。','传统法国Frère Jacques旋律；John Chambers ABC资料。');
  const london=add('伦敦桥 · 完整旋律',1,4,60,
    'G4:1.5 A4:0.5 G4 F4 | E4 F4 G4:2 | D4 E4 F4:2 | E4 F4 G4:2 | G4:1.5 A4:0.5 G4 F4 | E4 F4 G4:2 | D4:2 G4:2 | E4 C4:3',
    ['附点长短','相邻音连接'],['先拍出第一小节“长、短、一拍、一拍”。','第1与第5小节相同，分别练稳后再连接。','末句回到1，数满三拍再结束。'],'完整一轮旋律，8小节。','传统英国童谣London Bridge Is Falling Down；自编C调慢练旋律。');
  const ode=add('欢乐颂 · 完整主题',1,4,65,
    'E4 E4 F4 G4 | G4 F4 E4 D4 | C4 C4 D4 E4 | E4:1.5 D4:0.5 D4:2 | E4 E4 F4 G4 | G4 F4 E4 D4 | C4 C4 D4 E4 | D4:1.5 C4:0.5 C4:2 | D4 D4 E4 C4 | D4 E4:0.5 F4:0.5 E4 C4 | D4 E4:0.5 F4:0.5 E4 D4 | C4 D4 G3:2 | E4 E4 F4 G4 | G4 F4 E4 D4 | C4 C4 D4 E4 | D4:1.5 C4:0.5 C4:2',
    ['附点结尾','对比乐段','半拍连接'],['先分别练1—4与5—8小节，比较两种结尾。','第9—12小节是新内容，单独循环。','最后接回熟悉主题，完整连成16小节。'],'完整16小节主题（A—A变化—B—A变化），不是第九交响曲全曲。','Beethoven主题；Mutopia-2009/08/05-528，Peter Chubb，Public Domain；主旋律移至C调。');
  const longago=add('多年以前 · 完整旋律',2,4,65,
    'R:3 C4 | C4 C4:0.5 D4:0.5 E4 E4:0.5 F4:0.5 | G4 A4:0.5 G4:0.5 E4:2 | G4 F4:0.5 E4:0.5 D4:2 | F4 E4:0.5 D4:0.5 C4:2 | C4 C4:0.5 D4:0.5 E4 E4:0.5 F4:0.5 | G4 A4:0.5 G4:0.5 E4:2 | G4 F4:0.5 E4:0.5 D4 E4:0.5 D4:0.5 | C4:2 R E4 | G4:0.5 F4:0.5 F4:0.5 E4:0.5 D4 G3 | F4:0.5 E4:0.5 E4:0.5 D4:0.5 C4:2 | G4:0.5 F4:0.5 F4:0.5 E4:0.5 D4 G3 | F4:0.5 E4:0.5 E4:0.5 D4:0.5 C4:2 | C4 C4:0.5 D4:0.5 E4 E4:0.5 F4:0.5 | G4 A4:0.5 G4:0.5 E4:2 | G4 F4:0.5 E4:0.5 D4 E4:0.5 D4:0.5 | C4:2 R:2',
    ['长乐句','弱起','半拍连接'],['先空三拍，从第四拍的1进入第一乐段。','第10—13小节是对比乐段，单独练半拍与低音5。','连接A、B两乐段，数完末尾空拍。'],'完整A、B两乐段各一次；弱起补空拍，17个显示小节。','Thomas Haynes Bayly（1797—1839）；参考Elias Howe《The Musician’s Companion》1844第3部第1曲完整旋律，自编C调慢练版。');
  const verse='G3 E4 D4 C4 | G3:3 G3:0.5 G3:0.5 | G3 E4 D4 C4 | A3:4 | A3 F4 E4 D4 | B3:3 G4 | A4 G4 F4 D4 | E4:4 | G3 E4 D4 C4 | G3:3 G3:0.5 G3:0.5 | G3 E4 D4 C4 | A3:3 A3 | A3 F4 E4 D4 | G4 G4 G4 G4 | A4 G4 F4 D4 | C4:2 G4:2';
  const chorus='E4 E4 E4:2 | E4 E4 E4:2 | E4 G4 C4:1.5 D4:0.5 | E4 C4 D4 E4 | F4 F4 F4:1.5 F4:0.5 | F4 E4 E4 E4:0.5 E4:0.5 | E4 D4 D4 E4 | D4:2 G4:2 | E4 E4 E4:2 | E4 E4 E4:2 | E4 G4 C4:1.5 D4:0.5 | E4 C4 D4 E4 | F4 F4 F4:1.5 F4:0.5 | F4 E4 E4 E4:0.5 E4:0.5 | G4 G4 F4 D4 | C4:4';
  const jingle=add('铃儿响叮当 · 主歌与副歌',2,4,75,verse+' | '+chorus,
    ['低音区','附点与半拍','完整主副歌'],['先练第17—24小节熟悉的副歌，再补第1—16小节主歌。','循环第22、30小节的半拍重复音。','按主歌→副歌连完32小节，末尾回到1。'],'主歌16小节＋副歌16小节，各一次，完整歌曲旋律一轮。','James Lord Pierpont（1822—1893）；参考Rahan Comhaltas 2016曲集中的传统旋律，自编C调4/4慢练版。');
  const auld=add('友谊地久天长 · 完整旋律',2,4,60,
    'R:3 G3 | C4:1.5 C4:0.5 C4 E4 | D4 C4 D4 E4 | C4:0.5 C4:1.5 E4 G4 | A4:3 C5 | G4:1.5 E4:0.5 E4 C4 | D4:1.5 C4:0.5 D4 E4 | C4:0.5 A3:1.5 A3:1.5 G3:0.5 | C4:2 R G4 | G4:1.5 E4:0.5 E4:1.5 C4:0.5 | D4:1.5 C4:0.5 D4:1.5 G4:0.5 | G4:0.5 E4:1.5 E4:1.5 G4:0.5 | A4:3 C5 | G4:1.5 E4:0.5 E4 C4 | D4:1.5 C4:0.5 D4 E4 | C4:0.5 A3:1.5 A3:1.5 G3:0.5 | C4:2 R:2',
    ['弱起','附点','跨音区'],['第一小节先空三拍，第四拍进入下点5。','主歌与副歌分开练，重点练附点后的半拍。','完整连17小节，感受结尾回到1。'],'开头补三拍休止展示弱起；主歌＋副歌各一次，17个显示小节。','苏格兰传统旋律；参考Mutopia-2007/11/10-1121（Horetzky / Stan Sanderson），Public Domain；提取上声部、移调并简化重复。');
  const grace=add('奇异恩典 · 完整旋律',2,3,60,
    'R:2 G3 | C4:2 E4:0.5 C4:0.5 | E4:2 D4 | C4:2 A3 | G3:2 G3 | C4:2 E4:0.5 C4:0.5 | E4:2 D4:0.5 E4:0.5 | G4:2 D4:0.5 E4:0.5 | G4:2 E4:0.5 C4:0.5 | E4:2 E4:0.5 D4:0.5 | C4:2 A3 | G3:2 G3 | C4:2 E4:0.5 C4:0.5 | E4:2 D4 | C4:2 R',
    ['三拍子','弱起','句末长音'],['先空两拍再进入弱起，稳稳数“1、2、3”。','第7—9小节半拍变化集中，降低速度分段练。','一轮旋律结束后留一拍安静，不抢下一句。'],'传统NEW BRITAIN完整一轮旋律；弱起补空拍，15个显示小节。','NEW BRITAIN传统曲调；1835 Southern Harmony旋律声部参考，去除伴奏，自编触屏音区。');
  const greens=add('绿袖子 · 完整简编旋律',3,3,55,
    'R:2 R:0.5 A4:0.5 | C5 D5:0.5 E5:0.75 F5:0.25 E5:0.5 | D5 B4:0.5 G4:0.75 A4:0.25 B4:0.5 | C5 A4:0.5 A4:0.75 G#4:0.25 A4:0.5 | B4 G#4:0.5 E4 A4:0.5 | C5 D5:0.5 E5:0.75 F5:0.25 E5:0.5 | D5 B4:0.5 G4:0.75 A4:0.25 B4:0.5 | C5:0.75 B4:0.25 A4:0.5 G#4:0.75 F#4:0.25 G#4:0.5 | A4:1.5 A4 R:0.5 | G5:1.5 G5:0.75 F#5:0.25 E5:0.5 | D5 B4:0.5 G4:0.75 A4:0.25 B4:0.5 | C5 A4:0.5 A4:0.75 G#4:0.25 A4:0.5 | B4 G#4:0.5 E4:1.5 | G5:1.5 G5:0.75 F#5:0.25 E5:0.5 | D5 B4:0.5 G4:0.75 A4:0.25 B4:0.5 | C5:0.75 B4:0.25 A4:0.5 G#4:0.75 F#4:0.25 G#4:0.5 | A4:1.5 A4 R:0.5',
    ['十六分音符','变化音','宽音域'],['先用找音模式认识♯5、♯4对应的黑键。','每小节单独慢练，区分0.75拍与0.25拍。','主歌与副歌各8小节，熟悉后尝试55—70 BPM。'],'完整主歌＋副歌各一次；弱起补空拍。按3/4逐拍慢练，保留完整旋律并简化装饰与反复。','16世纪英国传统曲调Greensleeves；常见小调旋律自编3/4教学版，不是完整历史钢琴原谱。');
  function duet(id,title,bass){const e=D.exercises[id];let beat=0;const sequence=e.sequence.map(([notes,duration])=>{const melody=Array.isArray(notes)?notes:[notes],bar=Math.floor(beat/(e.meter||4));const group=melody.length&&Math.abs(beat%(e.meter||4))<.001?[bass[bar%bass.length],...melody]:melody;beat+=duration;return [group,duration]});const total=C.measures(sequence,e.meter||4);D.exercises.push({...e,title,work:e.work,tier:3,level:2,version:'完整双音简编',sequence,skills:['旋律＋小节首拍伴奏','双音同时按','全曲连接'],plan:['先弹熟单声部完整旋律。','小节首拍同时按伴奏与旋律；其余拍只弹旋律。','找音模式练协调，再以50—65 BPM完整跟拍。'],form:`${total}小节，保留全部旋律；首拍加入高音区简化伴奏。`,desc:`${total}小节 · 小节首拍双音挑战；先练同名的单声部版。`,source:e.source+' 双音伴奏为琴阶原创教学编排。'})}
  duet(twinkle,'小星星 · 完整双音挑战',[72,72,72,79,72,79,72,79,72,72,72,79]);
  duet(ode,'欢乐颂 · 完整双音挑战',[72,79,72,79,72,79,72,72,79,79,79,79,72,79,72,72]);
  D.fullSongIds=D.exercises.map((e,i)=>e.complete?i:null).filter(i=>i!==null);
})();
