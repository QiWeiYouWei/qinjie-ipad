# 琴阶 iPad 版：Windows 打包与安装

版本：1.4.0（构建5）；目标：iPadOS 16及以上的iPad。无需实体钢琴。

## 当前交付状态

已完成离线iPad原生外壳、Xcode工程、共享课程与曲库、文件导入/分享、云端构建脚本，以及不含安卓签名密钥和个人练习记录的源码压缩包。

2026年10月13日已在GitHub云端Mac上使用Xcode 16.4编译成功，生成并下载`release/ios/Qinjie-1.4.0-iPad-unsigned.ipa`。本地检查通过：ARM64原生程序、iPad/系统/版本信息、全部离线资源、编译后的启动页与图标、下载哈希。**IPA尚未签名，尚未做iPad真机测试；不能直接点开安装。**

私有仓库：[QiWeiYouWei/qinjie-ipad](https://github.com/QiWeiYouWei/qinjie-ipad)。成功构建：[运行38277648988](https://github.com/QiWeiYouWei/qinjie-ipad/actions/runs/38277648988)。源码提交：`6422eaa0244f81a959825a1fcb87d096bb221b44`。IPA SHA256：`14da779bcab2956d49860f6e37596592dbb7a4b0a7354274dfc912eeaf6a899f`。

**现在可直接从下列流程第4步开始安装本地IPA。** 前三步用于以后更新或重新构建；现有仓库已经建立并上传源码，无需重复新建。

## Windows 用户的路线

1. 在GitHub创建空的私有仓库，把`Qinjie-iPad-Source-1.4.0.zip`解压后的内容上传到仓库根目录。使用Git或GitHub Desktop提交整个目录，确保隐藏的`.github/workflows/build-ipad.yml`也上传；不要只上传压缩包。上传源码会将这些文件交给GitHub保存，先确认你愿意使用该服务。
2. 在仓库的**Actions → Build iPad IPA → Run workflow**手动运行。构建使用GitHub托管的`macos-15`，不需要你拥有Mac，也不需要在构建里填写苹果账号、证书或密码。若GitHub要求启用Actions，先启用。账号额度或付费要求以该账号显示为准。
3. 等待构建成功，下载该次运行下的`Qinjie-iPad-unsigned`产物，解压得到`Qinjie-1.4.0-iPad-unsigned.ipa`。产物保留7天。失败时下载/查看日志，请把失败步骤和错误信息给我修复，失败的任务不会产生可用安装包。
4. 按AltStore Classic的[官方Windows安装指南](https://faq.altstore.io/altstore-classic/how-to-install-altstore-windows)安装AltServer及其要求的Apple组件，用USB连接并信任舍友的iPad，安装AltStore。账号由你们直接填入本机工具，不需要发给我。首次使用可能需要在iPad设置里信任开发者并开启开发者模式，按指南操作。
5. 把IPA保存到iPad“文件”中，在AltStore的My Apps页面通过“＋”选择该IPA，完成签名安装。安装后打开“琴阶”，横屏弹奏、竖屏阅读。安装异常时记录AltStore的实际报错。
6. 使用免费Apple账号时，AltStore安装的应用需要在7天有效期内续签。使用AltStore的Refresh All刷新；AltServer连接条件请遵循官方说明。续签和覆盖更新前先在琴阶设置页导出备份，避免卸载造成记录丢失。

参考：[GitHub托管运行器](https://docs.github.com/en/actions/reference/runners/github-hosted-runners)、[构建产物](https://docs.github.com/en/actions/concepts/workflows-and-actions/workflow-artifacts)、[AltStore续签说明](https://faq.altstore.io/altstore-classic/your-altstore)。

## 舍友的iPad怎样使用

- 课程、39项内置练习、11首完整旋律及两个双音版、乐理讲解、每日计划和成长记录均在包内，使用时不依赖网页服务器。
- 简谱、五线谱、对照三种显示方式沿用安卓版。多点触控弹奏、示范、选段循环和练习回放复用同一套代码。
- 曲目页“导入歌曲”打开系统文件选择器，选`.qinjie.json`，在应用预览后确认；格式和限制与《歌曲定制与导入规则.md》相同。
- “导出我的曲库”和设置页“导出记录”打开系统分享面板，可选“存储到文件”、AirDrop等系统提供的方式。记录备份包含自定义曲库，可在安卓与iPad版间迁移；导入备份需在应用中确认替换。
- 切出应用时停止弹奏与示范，返回后通过触屏重新开始声音。不申请麦克风或蓝牙权限。琴音是本地合成，实际延迟与音量需要真机确认。

## 后续签名与发布选项

免费账号的个人安装适合先试用，需要持续续签。如果希望通过TestFlight邀请舍友试用，或发布App Store，需要Apple Developer Program账号和对应签名、上传及审核流程。当前流程只构建未签名应用，没有代购签名或企业证书。

参考：[Apple账号能力](https://developer.apple.com/help/account/basics/about-your-developer-account/)、[Apple测试与发布流程](https://developer.apple.com/documentation/xcode/distributing-your-app-for-beta-testing-and-releases)。

## 工程维护与Mac本地构建

共享前端在`web/`，iPad副本在`ios/Web/`。修改课程或声音后执行`node scripts/sync-ios-web.cjs`，再构建；不要只改副本。`ios/Bridge.js`把原有四个文件操作交给iPad外壳。原生代码在`ios/Sources/`，采用WKWebView、UIDocumentPicker与UIActivityViewController，打开范围限制在本地Web资源目录。

有Mac时运行：

```bash
bash build-ipa.sh
```

也可以用Xcode打开`ios/Qinjie.xcodeproj`，选Qinjie scheme与连接的iPad，在Signing & Capabilities选择自己的Team。身份签名和设备注册由Xcode管理。云端脚本关闭签名，以便在Windows路线中自行签名安装。

代码检查：

```bash
node scripts/sync-ios-web.cjs
node --test tests/core.test.cjs tests/content.test.cjs tests/library.test.cjs tests/ios-package.test.cjs
node scripts/validate-song-pack.cjs release/曲库模板/示例歌曲包.qinjie.json
```

浏览器检查`tests/ios-bridge-ui.cjs`需另装Playwright与Chrome，设置`CHROME_PATH`时可使用自己的Chrome路径。它模拟iPad尺寸和原生消息，不能验证Swift编译、系统选择器、签名或WKWebView兼容性。

## 真机验收清单

云端编译与签名安装成功后，至少检查：冷启动离线打开；横竖屏与分屏；同按两个音、多次松手无短促啪声；切到后台停止声音；歌曲导入取消/确认/错误提示；导出到文件后重新导入；导入记录的取消与确认；关闭重开保留记录；备份后覆盖更新并核对数据。

请告知舍友的iPad型号、iPadOS版本和实际安装错误。源代码检查通过不代表以上真机项目已通过。
