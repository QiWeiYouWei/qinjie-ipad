from pathlib import Path
import zipfile, hashlib

root = Path(__file__).resolve().parent.parent
apk = root / 'release' / 'Qinjie-1.12.1-Android.apk'
with zipfile.ZipFile(apk) as package:
    # Windows Python silently replaces '\\' with '/' in .filename; inspect
    # orig_filename to match the raw entry names used by Android/Java.
    assert all('\\' not in info.orig_filename for info in package.infolist()), 'Nonportable APK asset path'
    assert package.testzip() is None, 'Archive CRC failure'
    assert package.read('classes.dex').startswith(b'dex\n'), 'Missing executable DEX'
    assert b'Lcn/qinjie/piano/MainActivity;' in package.read('classes.dex'), 'Activity missing'
    for name in [p.relative_to(root/'web').as_posix() for p in (root/'web').rglob('*') if p.is_file()]:
        assert package.read('assets/' + name) == (root / 'web' / name).read_bytes(), f'Outdated packaged asset: {name}'
    assert 'AndroidManifest.xml' in package.namelist()
    print('PASS: APK CRC, activity DEX, manifest, all packaged assets match tested source')
    print('SHA256:', hashlib.sha256(apk.read_bytes()).hexdigest())
