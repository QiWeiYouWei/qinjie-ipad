const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {assets,transform,csp}=require('../scripts/sync-ios-web.cjs');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('iPad bundles the exact current shared curriculum, music, notation and audio',()=>{
  const bundled=fs.readdirSync(path.join(root,'ios/Web'),{recursive:true}).filter(n=>fs.statSync(path.join(root,'ios/Web',n)).isFile()).map(n=>n.replaceAll('\\','/')).sort();
  assert.deepEqual(bundled,[...assets].sort());
  for(const file of assets)assert.equal(read('ios/Web/'+file),transform(file,read('web/'+file)));
  assert.ok(read('ios/Web/index.html').includes(csp));
  assert.ok(!read('ios/Web/app.js').includes('Android 8.0及以上'));
});
test('native facade sends exactly four supported commands with unmodified Unicode JSON',()=>{
  const calls=[],context={window:{webkit:{messageHandlers:{qinjie:{postMessage:x=>calls.push(x)}}}}};
  vm.runInNewContext(read('ios/Bridge.js'),context);
  const bridge=context.window.Android,raw='{"title":"晨光\\n练习","text":"\\\"</script>"}';
  bridge.importSongs();bridge.exportSongs(raw);bridge.importData();bridge.exportData(raw);
  assert.deepEqual(JSON.parse(JSON.stringify(calls)),[{action:'importSongs'},{action:'exportSongs',data:raw},{action:'importData'},{action:'exportData',data:raw}]);
  assert.equal(Object.isFrozen(bridge),true);
});
test('project resource references and shared archive scheme resolve to the iPad target',()=>{
  const project=read('ios/Qinjie.xcodeproj/project.pbxproj'),scheme=read('ios/Qinjie.xcodeproj/xcshareddata/xcschemes/Qinjie.xcscheme');
  const objects=[...project.matchAll(/^\s*([A-F0-9]{24}) = \{isa = /gm)].map(m=>m[1]);
  assert.equal(new Set(objects).size,objects.length);
  for(const id of new Set(project.match(/A[0-9A-F]{23}/g)))assert.ok(objects.includes(id),id);
  assert.ok(scheme.includes('BlueprintIdentifier="A50000000000000000000001"'));
  for(const p of ['Sources/AppDelegate.swift','Sources/SceneDelegate.swift','Sources/PianoViewController.swift','Info.plist','Resources/LaunchScreen.storyboard','Resources/Assets.xcassets','Bridge.js','Web'])assert.ok(fs.existsSync(path.join(root,'ios',p)),p);
  assert.match(project,/TARGETED_DEVICE_FAMILY = 2/);
  assert.match(project,/IPHONEOS_DEPLOYMENT_TARGET = 16.0/);
  const icons=JSON.parse(read('ios/Resources/Assets.xcassets/AppIcon.appiconset/Contents.json'));
  for(const image of icons.images)assert.ok(fs.existsSync(path.join(root,'ios/Resources/Assets.xcassets/AppIcon.appiconset',image.filename)));
});
