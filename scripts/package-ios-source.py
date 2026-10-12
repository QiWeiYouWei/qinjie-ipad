"""Create a source-only, explicitly whitelisted cloud-build package."""
from pathlib import Path
import hashlib
import json
import zipfile

root = Path(__file__).resolve().parents[1]
target = root / 'release/ios/Qinjie-iPad-Source-1.4.0.zip'
files = [
    'build-ipa.sh', '.gitignore', '.github/workflows/build-ipad.yml',
    'scripts/sync-ios-web.cjs', 'scripts/create-ios-icons.py',
    'scripts/validate-song-pack.cjs', 'scripts/package-ios-source.py',
    'tests/core.test.cjs', 'tests/content.test.cjs', 'tests/library.test.cjs',
    'tests/ios-package.test.cjs', 'tests/ios-bridge-ui.cjs',
    'docs/iPad安装与云端打包.md', 'docs/iPad验证说明.md',
    '歌曲定制与导入规则.md', 'release/曲库模板/示例歌曲包.qinjie.json'
]
files += ['web/'+n for n in ['index.html','style.css','app.js','core.js','content.js','teaching.js','repertoire.js','notation.js','audio.js','library.js']]
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
