"""Create a source-only, explicitly whitelisted cloud-build package."""
from pathlib import Path
import hashlib
import json
import zipfile

root = Path(__file__).resolve().parents[1]
target = root / 'release/ios/Qinjie-iPad-Source-1.12.1.zip'
files = [
    'build-ipa.sh', '.gitignore', '.github/workflows/build-ipad.yml',
    'scripts/sync-ios-web.cjs', 'scripts/create-ios-icons.py',
    'scripts/validate-song-pack.cjs', 'scripts/package-ios-source.py', 'scripts/prepare-piano-samples.py',
    'docs/安卓音源路径修复说明.md', 'tests/rhythm.test.cjs', 'tests/rhythm-ui.cjs', 'docs/节拍器与节奏训练说明.md', 'docs/声音检查与触屏说明.md', 'tests/audio-progress.test.cjs', 'tests/audio-experience-ui.cjs',
    'docs/钢琴音源说明.md', 'tests/audio.test.cjs', 'tests/audio-ui.cjs', 'tests/timbre-ui.cjs',
    'tests/practice-review.test.cjs', 'tests/practice-review-ui.cjs', 'docs/错点复习说明.md',
    'tests/learning.test.cjs', 'tests/learning-ui.cjs', 'scripts/build-learning-pack.cjs', 'docs/学习资源与复习说明.md', 'release/曲库模板/知识专题例谱.qinjie.json',
    'tests/coach.test.cjs', 'tests/coach-ui.cjs', 'scripts/build-drill-repertoire.cjs', 'docs/训练处方与趋势说明.md', 'release/曲库模板/训练处方.qinjie.json', 'tests/exam.test.cjs', 'tests/exam-ui.cjs', 'tests/exam-poly-ui.cjs', 'scripts/build-exam-repertoire.cjs', 'docs/考核评分说明.md', 'release/曲库模板/考核专项.qinjie.json',
    'tests/training.test.cjs', 'tests/training-ui.cjs', 'tests/core.test.cjs', 'tests/content.test.cjs', 'tests/library.test.cjs',
    'tests/ios-package.test.cjs', 'tests/ios-bridge-ui.cjs', 'tests/verify_ipa.py',
    'docs/iPad安装与云端打包.md', 'docs/iPad验证说明.md',
    '歌曲定制与导入规则.md', 'release/曲库模板/示例歌曲包.qinjie.json'
]
files += ['web/'+n for n in ['index.html','style.css','app.js','core.js','content.js','teaching.js','repertoire.js','notation.js','audio.js','library.js','training.js','exam-core.js','exam-content.js','exam.js','coach.js','drill-content.js','learning-content.js','learning-core.js','learning-ui.js','practice-review.js','rhythm-core.js','rhythm-ui.js']]
files += [p.relative_to(root).as_posix() for p in (root/'web/samples').glob('*') if p.is_file()]
files += [p.relative_to(root).as_posix() for p in (root/'ios').rglob('*') if p.is_file() and 'xcuserdata' not in p.parts]
files = sorted(set(files))
target.parent.mkdir(parents=True, exist_ok=True)
manifest = {}
with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED) as package:
    for name in files:
        file = root/name
        if file.is_symlink() or any(s in name.lower() for s in ['.build/', 'keystore', '.p12', '.mobileprovision', '.jks', 'backup14']):
            raise RuntimeError('Unsafe source path: '+name)
        data = file.read_bytes()
        manifest[name] = hashlib.sha256(data).hexdigest()
        package.writestr(name, data)
    package.writestr('README.md', (root/'docs/iPad安装与云端打包.md').read_bytes())
    package.writestr('SOURCE-MANIFEST.json', json.dumps(manifest, ensure_ascii=False, indent=2)+'\n')
with zipfile.ZipFile(target) as package:
    assert package.testzip() is None
    assert '.github/workflows/build-ipad.yml' in package.namelist()
    for name, expected in manifest.items():
        assert hashlib.sha256(package.read(name)).hexdigest() == expected
digest = hashlib.sha256(target.read_bytes()).hexdigest()
target.with_suffix('.zip.sha256').write_text(digest+'  '+target.name+'\n', encoding='utf8')
print(f'PASS: {len(files)} whitelisted source files; ZIP CRC and manifest verified')
print(f'{target.name}: {target.stat().st_size} bytes; SHA256 {digest}')
