# linphone-android 涉及 Android 知识体系详解

> 本文档面向阅读 `linphone-android` 源码与架构时的技术背景补充，内容按模块展开，力求在工程维度上**可对照、可深入**。目录与 `docs/android_knowledge.svg` / `docs/linphone_android_flow.svg` 中的泳道划分大致一致。
>
> **扩展（通用基础）**：[平台分层、四大组件详解、JNI 原理与鸿蒙概念对照 → `android_platform_components_jni.md`](android_platform_components_jni.md)

---

## 目录

1. [应用进程与 UI 架构](#1-应用进程与-ui-架构)
2. [前台服务与后台限制](#2-前台服务与后台限制)
3. [Android Telecom 与系统通话集成](#3-android-telecom-与系统通话集成)
4. [音频子系统](#4-音频子系统)
5. [相机与视频管线](#5-相机与视频管线)
6. [推送、通知与保活](#6-推送通知与保活)
7. [JNI、NDK 与 Linphone SDK](#7-jnindk-与-linphone-sdk)
8. [网络与实时媒体协议](#8-网络与实时媒体协议)
9. [Gradle 构建与发布工程化](#9-gradle-构建与发布工程化)
10. [存储、权限与安全](#10-存储权限与安全)
11. [Kotlin 异步与状态管理](#11-kotlin-异步与状态管理)
12. [UI、无障碍与国际化](#12-ui无障碍与国际化)
13. [与鸿蒙 linphone_napi 的粗略对照](#13-与鸿蒙-linphone_napi-的粗略对照)

---

## 1. 应用进程与 UI 架构

### 1.1 Application 单例与进程模型

- **进程边界**：Android 中每个应用默认跑在一个 Linux 用户 UID 下的一个或多个进程里；**`Application` 先于任何 `Activity` 创建**，且在同一进程内通常只有一个实例（除非多进程声明）。
- **职责**：做**一次性、跨 Activity 的全局初始化**：日志目录、配置拷贝、第三方 SDK 初始化、`CoreContext` 启动等。`LinphoneApplication.onCreate` 即承担此角色。
- **线程模型**：`onCreate` 跑在**主线程（UI 线程）**。任何可能超过数十毫秒的工作（磁盘 IO、复杂解析、网络）应挪到**后台线程**，否则触发 **ANR（Application Not Responding）**。

### 1.2 Activity 生命周期与 VoIP 场景

典型顺序：`onCreate` → `onStart` → `onResume` → *交互* → `onPause` → `onStop` → `onDestroy`。

在 VoIP 中常见特殊点：

- **来电全屏**：`CallActivity` 常配合 `showWhenLocked`、`turnScreenOn`，在锁屏上拉起界面（需 Manifest 与系统策略配合）。
- **画中画（PiP）**：`enterPictureInPictureMode`：用户按 Home 时通话界面缩小为悬浮窗；需在 Manifest 声明 `android:supportsPictureInPicture`。
- **配置变更**：旋转屏幕会默认**重建 Activity**；若不想重建可声明 `android:configChanges`，但需谨慎——视频 Surface、Camera Session 往往仍需在 `onConfigurationChanged` 或回调里重新对齐。

### 1.3 Fragment 与 Jetpack Navigation

- **Fragment** 依附于 Activity，有自己的视图与子生命周期；适合**按通话状态拆界面**（来电 / 去电 / 通话中 / 会议），与 `CallActivity` + `call_nav_graph.xml` 的模式一致。
- **Navigation Component**：用 **NavGraph** 声明目的地（Destination）与 Action，用 **NavController** 导航；好处是**集中管理转场**、减少手写 `FragmentTransaction` 错误。
- **ViewModel 作用域**：`Activity` 级 ViewModel 可跨同 Activity 内多个 Fragment **共享状态**（如 `SharedCallViewModel`）；注意**不要**在 ViewModel 里持有 `Activity`/`View` 引用，避免泄漏。

### 1.4 MVVM 在本项目中的含义

| 层次 | 典型内容（概念） | 在 Linphone 思路中的对应 |
|------|------------------|---------------------------|
| Model | 数据与领域规则 | `Core`、Account、Call、底层 SIP/RTP（经 SDK） |
| ViewModel | 可测试的展示逻辑 | `CurrentCallViewModel`、`CallsViewModel`、`MainViewModel` 等 |
| View | XML/Compose + Fragment | `CallActivity`、各 `*Fragment` |

**关键点**：SIP 与媒体操作的**线程约束**由 `CoreContext`（`HandlerThread`）统一保证；ViewModel 通过 **`postOnCoreThread { }`** 把对 `Core`/`Call` 的调用派发到专用线程，避免在 UI 线程直接触碰 native 栈。

### 1.5 HandlerThread 与「单线程事件循环」

- **`HandlerThread`**：内部带 **`Looper`** 的工作线程；可不断 `Handler.post` 任务排队执行，形成**单线程串行**语义。
- **为何 VoIP 常用这种模式**：SIP 状态机、媒体图（mediastreamer2）内部大量**非线程安全**假设；若多线程乱入易导致崩溃或状态错乱。**「所有 Core 调用进一条队列」**是高一致性工程折中。
- **与 Kotlin 协程的关系**：协程可编排异步 UI 逻辑，但 **不替代** SDK 要求的底层线程模型；典型做法是 **协程里调用封装好的 `postOnCoreThread`**。

---

## 2. 前台服务与后台限制

### 2.1 前台服务（Foreground Service）

- **定义**：在通知栏展示**持续通知**、声明为前台类型的 Service；系统允许其在**后台限制**下仍保持较高优先级运行。
- **典型用途**：**通话中**维持 SIP/媒体（`CoreInCallService`）、**推送唤醒**后短时间建链（`CorePushService`）。
- **Android 8+**：`startForeground(id, notification)` 有**时限**要求；否则系统抛异常或杀进程。
- **Android 10+**：前台服务需声明 `foregroundServiceType`（如 `phoneCall`、`dataSync`），与 Manifest 中权限、用户可见说明一致。

### 2.2 后台执行限制（Doze、App Standby）

- **Doze**：设备静置时批量推迟网络与唤醒；纯定时轮询不可靠。
- **影响**：无 FCM 时，靠「定时 REGISTER」的保活方案效果受限；**合规做法**是优先走推送 + 用户可感知的**有限保活**，或引导用户关闭电池优化（因厂商策略而异，不可依赖）。

### 2.3 BroadcastReceiver 与隐式广播限制

- 许多「全局广播」在 Android 8+ 被限制；应用内事件优先 **`LocalBroadcastManager`**（已弃用趋势下可用 EventBus/Flow）或显式组件。
- 通知栏按钮 → **`PendingIntent` → 显式 `BroadcastReceiver`**：仍是常见模式（Linphone 的 `NotificationBroadcastReceiver` 即此类）。

---

## 3. Android Telecom 与系统通话集成

### 3.1 Telecom 解决的问题

把第三方 VoIP **注册为系统可识别的“通话”**，从而：

- 锁屏/耳机上的**接听挂断**可路由到应用；
- **通话状态**可与系统 UI、车载等模块协同；
- 与蓝牙 HFP 等路径更好集成（细节依赖机型与 `PhoneAccount` 能力）。

### 3.2 核心类与注册流程（概念）

- **`TelecomManager`**：系统服务入口；可 `placeCall` / `addNewIncomingCall` 等（具体 API 依实现与权限而定）。
- **`ConnectionService`**：应用实现的服务，系统在有来电/去电时回调 **`onCreateIncomingConnection`** / **`onCreateOutgoingConnection`**，返回 **`Connection`** 子类实例。
- **`PhoneAccount`**：`PhoneAccountHandle` + 能力位（如 `CAPABILITY_SELF_MANAGED`）；**SELF_MANAGED** 表示应用自管音频路由与 UI，更贴近典型 VoIP。

### 3.3 Connection 回调与 Linphone Call 的映射

典型映射关系（概念上）：

| Telecom / Connection 事件 | SIP / Linphone 侧 |
|----------------------------|-------------------|
| `onAnswer` | `call.accept` / `acceptWithParams` |
| `onDisconnect` | `call.terminate` / `decline` |
| `onSetActive` / `onSetHeld` | `resume` / `pause` |

**难点**：系统 Telecom 与 Linphone **双状态机**；需保证**只在一侧为权威**，另一侧通过监听同步，避免重复接听或死锁。

### 3.4 音频路由与 Telecom

- **`AudioManager`** 设置扬声器/听筒/蓝牙；
- **蓝牙 SCO**：面向语音通路的窄带模式，延迟相对较低；与 A2DP（音乐）不同。
- 设备插拔时 **`AudioDeviceCallback`** → 刷新 Linphone 设备列表（`reloadSoundDevices`）是降低「无声」类 bug 的关键。

---

## 4. 音频子系统

### 4.1 数据通路概览（概念）

```
麦克风 → 采集(AAudio/OpenSL/Record) → PCM → 编码器(Opus/G711/…) → RTP → 网络
网络 → RTP → Jitter Buffer → 解码器 → PCM → 播放(Track/OpenSL/AAudio)
```

Linphone 在 **mediastreamer2** 中用 Filter 串联；Android 侧底层实现常是 **OpenSL/AAudio** 或等价路径（具体以 SDK 编译配置为准）。

### 4.2 AAudio 与 OpenSL ES

- **OpenSL ES**：较老、C API、兼容面广；适合需要广泛机型的 native 媒体引擎。
- **AAudio**：更现代，**低延迟路径**友好；在部分设备上可与 **MMAP** 模式配合。
- **缓冲区与延迟**：缓冲区过小易 **underrun（爆音/断音）**；过大则 **口型不同步**。实时通话需在延迟与稳定性间调参。

### 4.3 AudioFocus 与用户体验

- **`AUDIOFOCUS_GAIN_TRANSIENT`**：短暂获得焦点（通话常见）；失去焦点时应**暂停**本地播放、降低音量等。
- 与 VoIP 并列场景：音乐 App、导航播报、游戏；未正确处理会导致用户感知「声音乱套」。

### 4.4 回声消除 AEC / NS / AGC

- **AEC（Acoustic Echo Cancellation）**：远端声音从扬声器回到麦克风，若不消除会产生回声。
- **软件 AEC**（如 Speex）与 **硬件 AEC**（厂商在 Record 链路）效果差很大；Linphone 配置里常能开关与选择策略。
- **AGC/NS**：自动增益与噪声抑制，同样影响清晰度与带宽浪费（噪声大会驱动编码器浪费码率）。

---

## 5. 相机与视频管线

### 5.1 Camera2 基本模型

1. **`CameraManager`** 枚举摄像头 ID；根据 **`LENS_FACING`** 区分前后置。
2. **`CameraDevice`**：打开具体设备。
3. **`CaptureSession`**：把 **若干 `Surface`** 绑定为输出（可同时预览、编码、拍照等）。
4. **`CaptureRequest`**：逐帧参数（自动对焦、曝光、目标 FPS 等）。

### 5.2 Surface 角色

| Surface 消费者 | 作用 |
|----------------|------|
| **`SurfaceTexture` / `TextureView`** | UI 预览、便于变换与动画 |
| **`ImageReader`** | CPU 可读 YUV/NV21 等 buffer，给软编或算法 |
| **`MediaCodec` input Surface** | **零拷贝或低开销**送编码器（若链路支持） |

**mediastreamer2** 的 Android 采集 Filter 通常走 **Camera → YUV/NV21 → ms2 内存块（mblk_t）** 再进编码器；与鸿蒙侧 `ImageReceiver` + NV21 思路类似，只是 API 面不同。

### 5.3 MediaCodec 编码与 H.264/H.265

- **异步模式**：`setCallback` 后在 **`onInputBufferAvailable` / `onOutputBufferAvailable`** 中喂数据/取码流。
- **关键参数**：分辨率、帧率、码率、GOP（I 帧间隔）、Profile/Level。
- **容错**：硬件编码器实现各异；**分辨率/Profile 不支持**时需降级或切软编（若集成）。

### 5.4 解码与渲染

- 解码输出可直接 **`Surface`**；配合 **`SurfaceTexture` + OpenGL** 做缩放、镜像、显示比例裁剪。
- **时间戳同步**：RTP 时间戳、解码器输出时间、显示刷新率需一致理解，否则卡顿或抖动。

---

## 6. 推送、通知与保活

### 6.1 FCM 与高优先级推送

- **FCM** 依赖 Google Play 服务（国内环境需单独评估可用性）。
- **数据消息 vs 通知消息**：VoIP 唤醒常用 **data payload** + 应用内拉起服务；需注意各 Android 版本对**后台启动 Activity** 的限制。

### 6.2 NotificationChannel

- Android 8+ **必须**建渠道；用户可在系统设置里**关闭某渠道**。
- 来电类通知通常使用**高重要性**渠道，并考虑 **full-screen intent**（Android 10+ 权限收紧）。

### 6.3 PendingIntent 与 FLAG

- **`FLAG_IMMUTABLE`**（推荐默认）：防止 PendingIntent 被恶意篡改填充。
- **`FLAG_UPDATE_CURRENT`**：复用同名 PendingIntent 时更新 extras。

### 6.4 无推送时的 KeepAlive（工程现实）

- 依赖**周期性任务**维系 SIP 注册；受 Doze/厂商杀后台影响大。
- 产品层面往往需要：**耗电说明**、**自启动/电池优化白名单引导**（合规且体验差，需谨慎）。

---

## 7. JNI、NDK 与 Linphone SDK

### 7.1 应用层看不到 native 的原因

`linphone-android` **应用模块**里通常**没有**手写 `external fun` + `System.loadLibrary`：这些都**封装在 Linphone SDK（AAR）**里。AAR 内含 **`jni/<abi>/*.so`**，由 SDK 初始化流程加载。

### 7.2 JNI 基础（仍须理解）

- 更系统的 JNI 线程模型、引用与注册机制见 **[`android_platform_components_jni.md` 第 9 节](android_platform_components_jni.md#9-jnijava-native-interface-原理)**。
- Java/Kotlin **`native`** 方法对应 C/C++ 中的 **`Java_packagename_Classname_method`**（或 `RegisterNatives` 动态注册）。
- **`JNIEnv*`**：线程局部；**不可跨线程**直接复用别处拿到的 `JNIEnv`（需 `AttachCurrentThread`）。
- **局部引用 vs 全局引用**：.native 层若要把对象**长期保存**，需 `NewGlobalRef`，否则函数返回后局部引用失效。

### 7.3 ABI 与 `abiFilters`

- **armeabi-v7a**：32 位 ARM；**arm64-v8a**：64 位 ARM（主流）。
- 同时打多个 ABI 会增大包体；只打 arm64 可减小体积但失去老旧 32 位设备支持。

### 7.4 调试 native 崩溃

- **`logcat`**、`tombstone`、**ndk-stack** 符号化；
- **AddressSanitizer / HWASan**（工程成本更高）用于内存越界类问题。

---

## 8. 网络与实时媒体协议

### 8.1 SIP 与 SDP

- **SIP**：呼叫信令（INVITE/ACK/BYE…）；通常基于 **UDP**，也可 **TCP/TLS**。
- **SDP**：在 SIP 消息体中携带**媒体能力**：编解码列表、端口、**ICE 候选**、DTLS fingerprint 等。

### 8.2 RTP / RTCP 与抖动缓冲

- **RTP**：承载音视频负载；**序列号/时间戳/SSRC** 是重排序与同步基础。
- **RTCP**：统计与反馈（丢包、抖动、SR/RR）。
- **Jitter Buffer**：吸收网络抖动；过大增加延迟，过小易卡顿。

### 8.3 ICE / STUN / TURN

- **ICE**：收集多种候选地址（host、srflx、relay），做**连通性检查**选最优路径。
- **STUN**：发现反射地址（NAT 后可见的 ip:port）。
- **TURN**：中继（最后手段，成本低但带宽与服务器压力大）。

### 8.4 SRTP / ZRTP（安全）

- **SRTP**：对 RTP 加密；密钥可通过 **SDES** 或 **DTLS-SRTP** 交换（后者更安全）。
- **ZRTP**：端到端协商，带 **SAS 短验证码** 供用户防中间人（依赖产品交互）。

---

## 9. Gradle 构建与发布工程化

### 9.1 Kotlin DSL (`build.gradle.kts`)

- 类型更安全、IDE 补全更好；与 Groovy DSL 概念一一对应。
- **`compileSdk`**：编译期 API；**`minSdk`**：最低运行版本；**`targetSdk`**：向系统声明适配目标行为（权限、后台限制等）。

### 9.2 Version Catalog (`libs.versions.toml`)

- 集中管理依赖版本，减少多模块漂移。

### 9.3 R8 / ProGuard

- **收缩（shrink）**：删未用代码；
- **混淆（obfuscate）**：改类名方法名（提高逆向成本）；
- **`keep` 规则**：SDK 若靠反射/JNI 名字匹配，必须保留符号，否则运行期崩溃。

### 9.4 测试金字塔（建议）

- 单元测试：ViewModel 纯逻辑；
- Android 测试：关键 Activity 启动、权限流；
- Firebase Test Lab：碎片化真机矩阵抽样。

---

## 10. 存储、权限与安全

### 10.1 分区存储（Scoped Storage）

- Android 10+ 强化：应用**默认**不能随意遍历公共目录；应使用 **`MediaStore` / SAF (`ACTION_OPEN_DOCUMENT`)**。
- 私密配置仍放 **`getFilesDir()`**；缓存放 **`cacheDir`**（可被系统清理）。

### 10.2 运行时权限模型

危险权限需 **运行时申请**；权限永久拒绝后需引导用户进设置页。VoIP 核心权限常见：

- `RECORD_AUDIO`、`CAMERA`、`POST_NOTIFICATIONS`（13+）；
- 蓝牙相关 **`BLUETOOTH_CONNECT`**（31+）；
- 联系人 **`READ_CONTACTS`**（若集成系统通讯录）。

### 10.3 FileProvider

- 分享应用内文件给**其他应用**时必须通过 **FileProvider URI**，避免 `file://` 泄露路径与权限问题。

---

## 11. Kotlin 异步与状态管理

### 11.1 协程与线程

- `suspend` 不保证切换线程；**调度器**决定运行在 Main/IO/Default。
- **结构化并发**：`coroutineScope` / `supervisorScope` 控制异常传播。

### 11.2 Flow / StateFlow

- **StateFlow**：总有当前值，适合 UI **状态机**（通话状态、静音、视频开关）。
- **SharedFlow**：事件流（如一次性导航事件 `NavigateToCall`）。

### 11.3 LiveData

- 生命周期感知；在传统 XML + Fragment 项目里仍常见。
- 与 Flow 的迁移是长期趋势，但不必强行一次改完。

---

## 12. UI、无障碍与国际化

### 12.1 无障碍（a11y）

- **`contentDescription`**：屏幕阅读器朗读；
- **最小触控区域**、对比度；
- VoIP 产品若面向企业/政务，a11y 常是硬性验收项。

### 12.2 国际化（i18n）与 RTL

- 字符串全部进 **`strings.xml`**，禁止硬编码中文/英文混在布局；
- **RTL**：阿语等布局镜像；用 `start/end` 替代 `left/right`。

### 12.3 深色模式

- `DayNight` 主题 + `values-night` 资源；
- 视频通话 UI 注意** OLED 烧屏与对比度**（长时间通话界面）。

---

## 13. 与鸿蒙 linphone_napi 的粗略对照

| Android（linphone-android） | HarmonyOS / OpenHarmony（linphone_napi + mediastreamer2 ohos） |
|----------------------------|------------------------------------------------------------------|
| JVM + JNI → `liblinphone.so` | ArkTS + NAPI → `libohos_linphone.so` |
| `HandlerThread` + `postOnCoreThread` | 同类需求：单独线程迭代 / 任务队列（实现名可能不同） |
| Camera2 + `SurfaceTexture` | Camera Kit + `OH_ImageReceiverNative` / Surface |
| MediaCodec H.264 | `OH_VideoEncoder` / `OH_AVCodec` |
| OpenSL ES / AAudio | OHAudio `OH_AudioCapturer` / `OH_AudioRenderer` |
| FCM + `FirebaseMessagingService` | 厂商推送 + `pushService` / `dataSync` 型前台服务思路类似 |
| Telecom `ConnectionService` | `CallServiceKit` / `voipCall` 上报（能力集不同，勿强行一一等价） |

**注意**：对照表只能是**工程类比**，系统 API、权限模型、进程策略均有本质差异；联调时以各平台官方文档为准。

---

## 附录 A：推荐阅读顺序（结合本仓库）

1. `LinphoneApplication.kt` → `CoreContext.kt`：初始化与线程模型。  
2. `MainActivity.kt`、主导航与拨号入口。  
3. `CallActivity` + `call_nav_graph.xml` + `CurrentCallViewModel`：通话 UI 与 Core 调用边界。  
4. `TelecomManager.kt`：系统通话集成。  
5. `NotificationsManager.kt` + `NotificationBroadcastReceiver.kt`：通知与 PendingIntent。  
6. `CorePushService.kt`、`CorePushReceiver.kt`：推送路径。  
7. `AndroidManifest.xml` + `app/build.gradle.kts`：权限、服务类型、ABI、依赖。

---

## 附录 B：文档与流程图文件

| 文件 | 内容 |
|------|------|
| `docs/linphone_android_flow.svg` | linphone-android 端到端流程（泳道图） |
| `docs/android_knowledge.svg` | Android 知识点分块总览（泳道图） |
| `docs/android_knowledge_detailed.md` | 本文：文字详解 |
| `docs/android_platform_components_jni.md` | 平台架构、四大组件、JNI 原理与鸿蒙对照（扩展） |

---

*文档生成日期：2026-05-13。若 Android / Linphone SDK 版本升级，请以对应官方 Release Note 更新「后台限制、前台服务类型、权限」等章节。*
