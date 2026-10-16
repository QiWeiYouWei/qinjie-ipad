"""Inspect a real unsigned iPad IPA; this cannot prove successful device installation."""
from pathlib import Path
import hashlib
import plistlib
import struct
import sys
import zipfile

root = Path(__file__).resolve().parents[1]
ipa = Path(sys.argv[1]) if len(sys.argv) > 1 else root/'release/ios/Qinjie-1.10.0-iPad-unsigned.ipa'
with zipfile.ZipFile(ipa) as package:
    assert package.testzip() is None, 'IPA archive CRC failure'
    prefix = 'Payload/Qinjie.app/'
    names = package.namelist()
    info = plistlib.loads(package.read(prefix+'Info.plist'))
    assert info['CFBundleIdentifier'] == 'cn.qinjie.piano'
    assert info['CFBundleShortVersionString'] == '1.10.0'
    assert str(info['CFBundleVersion']) == '11'
    assert info['UIDeviceFamily'] == [2], 'Not an iPad target'
    assert info['MinimumOSVersion'] == '16.0'
    binary = package.read(prefix+info['CFBundleExecutable'])
    assert len(binary) > 4096, 'Missing native executable'
    magic, cpu = struct.unpack('<II', binary[:8])
    assert magic == 0xFEEDFACF and cpu == 0x0100000C, 'Expected a native ARM64 Mach-O executable'
    for file in (root/'ios/Web').rglob('*'):
        if file.is_file():
            name=file.relative_to(root/'ios/Web').as_posix()
            assert package.read(prefix+'Web/'+name) == file.read_bytes(), 'Outdated web asset: '+name
    assert package.read(prefix+'Bridge.js') == (root/'ios/Bridge.js').read_bytes()
    assert prefix+'Assets.car' in names, 'Compiled icons missing'
    assert any(name.startswith(prefix+'LaunchScreen.storyboardc/') for name in names), 'Compiled launch screen missing'
    assert not any(name.startswith(prefix+'_CodeSignature/') for name in names), 'This verifier expects the unsigned build'
    assert prefix+'embedded.mobileprovision' not in names
    print('PASS: real ARM64 executable, iPad/OS/version metadata, all offline assets, compiled launch screen and icons, unsigned state')
print('SHA256:', hashlib.sha256(ipa.read_bytes()).hexdigest())
print('Signing, installation and real iPad behavior remain separate checks.')
