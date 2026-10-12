#!/bin/bash
set -euo pipefail
task_root="$(cd "$(dirname "$0")" && pwd)"
cd "$task_root"
if [[ "$(uname -s)" != "Darwin" ]] || ! command -v xcodebuild >/dev/null; then
  echo "This build needs macOS with Xcode. On Windows, use the Build iPad IPA GitHub Actions workflow." >&2
  exit 1
fi
node scripts/sync-ios-web.cjs
node --test tests/ios-package.test.cjs
xcodebuild -version
xcodebuild -project ios/Qinjie.xcodeproj -scheme Qinjie -configuration Release \
  -sdk iphoneos -destination 'generic/platform=iOS' -derivedDataPath .build/ios-derived \
  CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO CODE_SIGN_IDENTITY='' build
app="$task_root/.build/ios-derived/Build/Products/Release-iphoneos/Qinjie.app"
test -f "$app/Qinjie"
lipo "$app/Qinjie" -verify_arch arm64
plutil -lint "$app/Info.plist"
test -f "$app/Web/index.html"
test -f "$app/Bridge.js"
mkdir -p .build release/ios
stage="$(mktemp -d "$task_root/.build/ipa-stage.XXXXXX")"
mkdir -p "$stage/Payload"
ditto "$app" "$stage/Payload/Qinjie.app"
output="$task_root/release/ios/Qinjie-1.4.0-iPad-unsigned.ipa"
(cd "$stage" && ditto -c -k --keepParent Payload "$output")
unzip -t "$output"
python3 tests/verify_ipa.py "$output"
shasum -a 256 "$output" > "$output.sha256"
echo "Unsigned IPA created: $output. Sign it before installation."
