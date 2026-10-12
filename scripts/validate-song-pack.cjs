const fs=require('node:fs'),path=require('node:path'),L=require('../web/library.js'),C=require('../web/core.js');
const file=process.argv[2];
if(!file){console.error('用法：node scripts/validate-song-pack.cjs 歌曲.qinjie.json');process.exitCode=1}
else try{
  const resolved=path.resolve(file),pack=L.parse(fs.readFileSync(resolved,'utf8'));
  console.log(`PASS：${pack.songs.length}首歌曲，协议${pack.format}/${pack.version}`);
  for(const s of pack.songs){const notes=s.sequence.flatMap(e=>e[0]),beats=s.sequence.reduce((n,e)=>n+e[1],0);console.log(`${s.id} · 第${s.revision}版 · ${s.title} · ${C.measures(s.sequence,s.meter)}小节 · ${s.meter}/4 · ${s.bpm} BPM · ${C.name(Math.min(...notes))}—${C.name(Math.max(...notes))} · 约${Math.round(beats*60/s.bpm)}秒`)}
  console.log('结构校验通过；旋律、编排完整性与谱源需要另外核对。');
}catch(e){console.error('FAIL：'+e.message);process.exitCode=1}
