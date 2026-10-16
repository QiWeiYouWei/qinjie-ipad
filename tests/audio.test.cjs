const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const A=require('../web/audio.js'),C=require('../web/core.js');
test('旧记录默认三角钢琴，音色白名单保留选择和备份',()=>{
  assert.equal(C.safeState({completed:[2]}).timbre,'grand');
  assert.equal(C.safeState({timbre:'upright'}).timbre,'upright');
  assert.equal(C.safeState({timbre:'../evil'}).timbre,'grand');
});
test('实录音源完整、哈希一致且全音域最多移调两个半音',()=>{
  const manifest=JSON.parse(fs.readFileSync('web/samples/manifest.json','utf8'));
  const banks={};for(const id of ['grand','upright'])vm.runInNewContext(fs.readFileSync('web/samples/'+id+'.js','utf8'),{PianoAudio:{register:(name,data)=>banks[name]=data}});
  for(const sample of manifest.samples){const bytes=Buffer.from(banks[sample.bank][sample.note],'base64');assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),sample.encodedSha256);assert.ok(sample.seconds>.5&&sample.seconds<=12);assert.match(sample.url,/^https:\/\/raw.githubusercontent.com\//)}
  for(const [id,bank] of Object.entries(banks)){const notes=Object.keys(bank).map(Number);assert.ok(notes.length>=8);for(let n=55;n<=83;n++)assert.ok(Math.abs(A.nearest(notes,n)-n)<=2,id+' '+n)}
  assert.notEqual(banks.grand[69],banks.upright[69]);
});
test('包络起音短且收音连续归零，不延长起音延迟',()=>{
  const points=A.envelope(1,8);assert.equal(A.valueAt(points,1),0);assert.equal(A.valueAt(points,1.003),1);assert.equal(A.valueAt(points,5),1);assert.equal(A.valueAt(points,9.3),0);assert.ok(A.valueAt(points,9.1)>0);
});
