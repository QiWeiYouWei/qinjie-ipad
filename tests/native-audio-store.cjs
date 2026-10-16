const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const output=path.resolve('.build/native-audio-check'),apk=path.resolve(process.argv[2]||'release/Qinjie-1.12.1-Android.apk');fs.mkdirSync(output,{recursive:true});
const hashes=[];for(const id of ['grand','upright']){let bank;vm.runInNewContext(fs.readFileSync('web/samples/'+id+'.js','utf8'),{PianoAudio:{register:(_,data)=>bank=data}});hashes.push(crypto.createHash('sha256').update(JSON.stringify(bank)).digest('hex'))}
function run(executable,args){const result=spawnSync(executable,args,{encoding:'utf8'});if(result.error)throw result.error;if(result.status!==0)throw Error(result.stderr||result.stdout);if(result.stdout.trim())console.log(result.stdout.trim())}
run(process.env.JAVA_HOME?path.join(process.env.JAVA_HOME,'bin','javac'):'javac',['-encoding','UTF-8','-d',output,'android/src/cn/qinjie/piano/PianoSampleStore.java','tests/PianoSampleStoreTest.java']);
run(process.env.JAVA_HOME?path.join(process.env.JAVA_HOME,'bin','java'):'java',['-cp',output,'cn.qinjie.piano.PianoSampleStoreTest',apk,...hashes]);
