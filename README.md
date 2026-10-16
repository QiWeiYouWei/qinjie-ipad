# 琴阶 Qinjie

在安卓平板上直接用触屏学习钢琴，无需电钢琴。提供简谱、五线谱和上下对照，课程、曲目与两套钢琴实录采样均可离线使用。

当前版本 **1.12.1**（Android 构建 15）。本仓库保留原名 `qinjie-ipad`，现包含 Android、iPad 和共享前端源码。

## 下载与安装

到 [Releases](https://github.com/QiWeiYouWei/qinjie-ipad/releases) 下载 `Qinjie-1.12.1-Android.apk`。**只需安装这一个 APK**，课程、内置曲库和两套音源已经包含在内。

- Android 8.0 及以上；使用系统 Android WebView。适合横屏平板，也支持手机。
- 从系统文件管理器打开 APK 安装。已有琴阶正式包可覆盖更新；更新前可在设置中导出记录备份。
- 自行编译的 APK 使用自己的签名，无法覆盖不同签名的已安装版本。
- 应用不申请网络、麦克风或蓝牙权限；练习数据保存在设备本机，支持手动导出和导入。

## 学习功能

- **28 节课程、6 个阶段**：识谱、指法、节奏、音阶、和弦和双音；配讲解、例谱、步骤、易错点与解析题。
- **三种谱式**：简谱、五线谱、上下对照，可在练习中切换，帮助从简谱过渡到五线谱。
- **39 项内置练习**：11 首完整旋律、2 个双音挑战版与 26 项专项练习；按难度、曲名和技能查找。
- **触屏钢琴**：多指和弦、示范、分小节练习、循环、逐步跟练和最近演奏回放。
- **钢琴音色**：离线三角钢琴和立式钢琴实录采样，提供加载进度、试听、声音检查和诊断。
- **节奏工坊**：35—160 BPM 节拍器、2/4、3/4、4/4 拍、细分与重音，以及 9 种四小节拍击训练。
- **每日计划和成长**：自定目标与速度、学习日历、进度、收藏、笔记、知识复习及记录备份。
- **12 个乐理专题、15 张声音知识卡**；课程与专题共 80 道复习题。
- **阶段考核与训练处方**：技术、短曲、视奏、听辨、乐理五部分；评价音高、起音、时值、连贯、双音和休止，定位错点并推荐练习。
- **自定义曲库导入**：支持 `.qinjie.json` 单首或批量导入、预览确认、稳定 ID 更新与导出。

考核 A—D 是应用内学习阶段。触屏无法评价真实力度、指法和踏板，也不提供正式钢琴考级认证。评分维度、限制与验证范围见 [考核评分说明](docs/考核评分说明.md)。

## 1.12.1 音源修复

修复 Windows 构建时 APK 音源路径中的反斜杠导致 Android 找不到离线音源的问题。构建时在签名前统一 ZIP 路径，检查最终包两套音源的精确路径与哈希；补充原生分块读取和诊断。

86 项 Node 测试通过，并完成最终 APK 资源与 Java 精确读取检查。这些检查不能替代 Android 真机播放；本版本在用户的 Samsung Tab S10+ 上恢复声音的结果仍待确认。详见 [修复说明](docs/安卓音源路径修复说明.md)。

## 曲库定制

请先阅读 [歌曲定制与导入规则](歌曲定制与导入规则.md)。原创示例与专项曲包位于 [release/曲库模板](release/曲库模板)。导入前校验：

```bash
node scripts/validate-song-pack.cjs release/曲库模板/示例歌曲包.qinjie.json
```

当前导入格式为结构化乐谱 JSON，不直接导入 MP3、图片、MIDI 或 MusicXML。私人定制歌曲与个人练习记录不包含在公开仓库中。

## 开发与构建

目录：`web/` 为共享前端，`android/` 为 Android 原生外壳，`ios/` 为 iPad 工程，`tests/` 为测试，`docs/` 为功能说明。

### 浏览器预览

安装 Node.js 后运行：

```bash
node server.cjs
```

在本机浏览器打开 `http://127.0.0.1:5173`。浏览器预览不等同于 Android / WKWebView 真机验证。

### Android

需要 Windows PowerShell、JDK 和官方 Android SDK。将平台文件放在 `.build/sdk/platforms/android-35/`，构建工具放在 `.build/sdk/build-tools/` 的版本子目录；将 JDK 的 `bin` 加入 PATH。

在本机环境中设置 `QINJIE_STORE_PASSWORD`、`QINJIE_KEY_PASSWORD`；可选 `QINJIE_KEYSTORE` 与 `QINJIE_KEY_ALIAS`。默认密钥位置为 `.build/qinjie-local.keystore`。不存在时创建自己的本地签名密钥。请保存自己的签名文件，勿提交密码或密钥。

```powershell
.\build-apk.ps1
```

### iPad

支持 iPadOS 16 及以上。修改共享前端后先同步：

```bash
node scripts/sync-ios-web.cjs
bash build-ipa.sh
```

IPA 需要 macOS / Xcode 编译，安装还需要 Apple 签名。本仓库提供手动触发的 GitHub Actions 工作流；普通推送不会触发云端构建。1.12.1 iPad 工程已同步，尚未重新进行 Xcode 编译或 iPad 真机测试。见 [iPad 说明](docs/iPad安装与云端打包.md)。

### 测试

```bash
node --test tests/*.test.cjs
python tests/verify_apk.py
node tests/native-audio-store.cjs
```

后两项需要已构建的 1.12.1 APK；原生读取测试还需要 JDK。浏览器交互测试另需 Playwright 和 Chrome，部分脚本保留开发机路径，换机器运行时需按环境调整。

## 音源署名

- 三角钢琴：Alexander Holm 的 **Salamander Grand Piano / Yamaha C5**，采用 **CC BY 3.0**。琴阶选取根音、裁剪、淡出并转码；原说明与处理清单位于 `web/samples/`。
- 立式钢琴：Simon Dalzell / Ivy Audio 录制、Versilian Studios 发布的 **VSCO 2 CE**，采用 **CC0 1.0**。

许可原文随源码与安装包保留。完整来源、固定提交、处理方式和音质限制见 [钢琴音源说明](docs/钢琴音源说明.md)。
