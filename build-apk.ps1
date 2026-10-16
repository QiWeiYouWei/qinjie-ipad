$ErrorActionPreference = 'Stop'
$taskRoot = $PSScriptRoot
Set-Location -LiteralPath $taskRoot
$taskBuild = Join-Path $taskRoot '.build'
$taskPlatform = Get-ChildItem -LiteralPath (Join-Path $taskBuild 'sdk\platforms') -Filter android.jar -Recurse | Select-Object -First 1
$taskAapt = Get-ChildItem -LiteralPath (Join-Path $taskBuild 'sdk\build-tools') -Filter aapt2.exe -Recurse | Select-Object -First 1
if (-not $taskPlatform -or -not $taskAapt) { throw 'Download official Android platform 35 and build-tools 35 first.' }
$taskTools = $taskAapt.Directory.FullName
$taskOutput = Join-Path $taskRoot 'release'
New-Item -ItemType Directory -Force -Path $taskOutput,(Join-Path $taskBuild 'classes'),(Join-Path $taskBuild 'dex'),(Join-Path $taskBuild 'generated') | Out-Null
function Invoke-Checked { param([string]$Program,[string[]]$Arguments) & $Program @Arguments; if ($LASTEXITCODE -ne 0) { throw "$Program failed ($LASTEXITCODE)" } }
Invoke-Checked $taskAapt.FullName @('compile','--dir','android/res','-o','.build/resources.zip')
Invoke-Checked $taskAapt.FullName @('link','-o','.build/unsigned.apk','-I','.build/sdk/platforms/android-35/android.jar','--manifest','android/AndroidManifest.xml','-A','web','--java','.build/generated','.build/resources.zip')
Invoke-Checked 'javac' @('-encoding','UTF-8','-source','8','-target','8','-bootclasspath',$taskPlatform.FullName,'-d',(Join-Path $taskBuild 'classes'),(Join-Path $taskRoot 'android\src\cn\qinjie\piano\MainActivity.java'),(Join-Path $taskRoot 'android\src\cn\qinjie\piano\PianoSampleStore.java'))
Invoke-Checked 'jar' @('cf',(Join-Path $taskBuild 'classes.jar'),'-C',(Join-Path $taskBuild 'classes'),'.')
Invoke-Checked (Join-Path $taskTools 'd8.bat') @('--lib',$taskPlatform.FullName,'--min-api','26','--output',(Join-Path $taskBuild 'dex'),(Join-Path $taskBuild 'classes.jar'))
Invoke-Checked 'jar' @('uf',(Join-Path $taskBuild 'unsigned.apk'),'-C',(Join-Path $taskBuild 'dex'),'classes.dex')
New-Item -ItemType Directory -Force -Path (Join-Path $taskBuild 'apk-paths-tool') | Out-Null
Invoke-Checked 'javac' @('-encoding','UTF-8','-d',(Join-Path $taskBuild 'apk-paths-tool'),(Join-Path $taskRoot 'scripts\NormalizeApkPaths.java'))
Invoke-Checked 'java' @('-cp',(Join-Path $taskBuild 'apk-paths-tool'),'NormalizeApkPaths',(Join-Path $taskBuild 'unsigned.apk'),(Join-Path $taskBuild 'portable.apk'))
Invoke-Checked (Join-Path $taskTools 'zipalign.exe') @('-f','4','.build/portable.apk','.build/aligned.apk')
$taskKey = if ($env:QINJIE_KEYSTORE) { $env:QINJIE_KEYSTORE } else { Join-Path $taskBuild 'qinjie-local.keystore' }
$taskAlias = if ($env:QINJIE_KEY_ALIAS) { $env:QINJIE_KEY_ALIAS } else { 'qinjie' }
if (-not $env:QINJIE_STORE_PASSWORD -or -not $env:QINJIE_KEY_PASSWORD) {
    throw 'Set QINJIE_STORE_PASSWORD and QINJIE_KEY_PASSWORD locally before building; never commit signing credentials.'
}
if (-not (Test-Path -LiteralPath $taskKey)) { Invoke-Checked 'keytool' @('-genkeypair','-keystore',$taskKey,'-alias',$taskAlias,'-storepass:env','QINJIE_STORE_PASSWORD','-keypass:env','QINJIE_KEY_PASSWORD','-keyalg','RSA','-keysize','2048','-validity','10000','-dname','CN=Qinjie Local Build') }
$taskApk = Join-Path $taskOutput 'Qinjie-1.12.1-Android.apk'
Invoke-Checked (Join-Path $taskTools 'apksigner.bat') @('sign','--ks',$taskKey,'--ks-key-alias',$taskAlias,'--ks-pass','env:QINJIE_STORE_PASSWORD','--key-pass','env:QINJIE_KEY_PASSWORD','--out',$taskApk,(Join-Path $taskBuild 'aligned.apk'))
Invoke-Checked (Join-Path $taskTools 'apksigner.bat') @('verify','--verbose',$taskApk)
Invoke-Checked (Join-Path $taskTools 'aapt2.exe') @('dump','badging','release/Qinjie-1.12.1-Android.apk')
Get-FileHash -LiteralPath $taskApk -Algorithm SHA256
