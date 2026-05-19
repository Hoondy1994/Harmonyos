# Android 平台架构、四大组件与 JNI 原理（扩展）

> 本文档汇总通用 Android 基础：**系统分层**、**四大组件**（知识点与业务场景）、**JNI 原理**，以及**与鸿蒙（Stage 模型）的概念对照**。阅读 `linphone-android` 源码时可与 [`android_knowledge_detailed.md`](android_knowledge_detailed.md) 交叉参照。

---

## 目录

1. [Android 系统平台架构](#1-android-系统平台架构)
2. [应用内架构与四大组件总览](#2-应用内架构与四大组件总览)
3. [Activity](#3-activity)
4. [Service](#4-service)
5. [BroadcastReceiver](#5-broadcastreceiver)
6. [ContentProvider](#6-contentprovider)
7. [四大组件的业务分工（总表）](#7-四大组件的业务分工总表)
8. [与现代 Jetpack 的关系](#8-与现代-jetpack-的关系)
9. [JNI（Java Native Interface）原理](#9-jnijava-native-interface-原理)
10. [Native 与 Framework：Android 与鸿蒙的概念对照](#10-native-与-frameworkandroid-与鸿蒙的概念对照)
11. [四大组件与鸿蒙的对应关系](#11-四大组件与鸿蒙的对应关系)
12. [易混点：Activity 与鸿蒙 XComponent](#12-易混点activity-与鸿蒙-xcomponent)

---

## 1. Android 系统平台架构

由下至上可理解为五层（工程上常用「分层模型」，细部实现随版本演进）：

| 层级 | 含义 |
|------|------|
| **Linux 内核** | 进程/线程调度、内存、网络、设备驱动（显示、输入、相机、音频等）。应用不直接操作驱动，通过上层 API。 |
| **硬件抽象层（HAL）** | 以 C/C++ 将硬件能力封装为标准接口；Framework 通过 JNI / Binder 等间接使用。应用通常不编写 HAL。 |
| **原生库与运行时** | 如图形栈、`libc`、**ART**（执行 Java/Kotlin 字节码）、WebView/媒体等原生库。 |
| **Android Framework** | Java/Kotlin API：`ActivityManager`、`PackageManager`、`Telecom`、`AudioManager`、通知、ContentProvider 等。应用开发主要面对 Framework + Jetpack。 |
| **应用层** | 系统应用与第三方 APK；各应用运行在独立进程与沙箱（UID、权限、存储隔离）内。 |

**进程与线程**：默认**一应用一主进程**；**主线程**负责 UI，耗时工作须异步，否则 **ANR**。音视频/VoIP 工程里常见**专用工作线程**（如 `HandlerThread`）集中访问 native SDK，避免多线程破坏非线程安全假设。

---

## 2. 应用内架构与四大组件总览

| 组件 | 一句话职责 |
|------|------------|
| **Activity** | 屏幕与窗口、生命周期；适合「一页一界面」。 |
| **Service** | 后台任务；**前台 Service** 用于合规的长时间任务（如来电保持），需通知与 `foregroundServiceType`。 |
| **BroadcastReceiver** | 监听系统/应用事件；注意 **Android 8+** 对隐式广播的限制。 |
| **ContentProvider** | 跨应用数据共享（通讯录、媒体等）或统一数据门面；应用内简单场景可不强制使用。 |

---

## 3. Activity

### 3.1 业务上解决什么

- **独占一屏的交互**：列表、设置、通话界面等。
- **承载 Window**：状态栏/导航栏、多窗口、**画中画（PiP）**均以 Activity + Window 为锚点。
- **任务栈（Task）与返回栈**：用户按「返回」在同一 Task 内按后进先出收尾；桌面图标常对应拉起某入口 Activity 的 Task。

### 3.2 核心知识点

- **生命周期主线**：`onCreate` → `onStart` → `onResume` → *交互* → `onPause` → `onStop` → `onDestroy`；由 `onStop` 回到前台会经 `onRestart`。
- **状态恢复**：配置变更（如旋转）或低内存杀进程后恢复，需 **`onSaveInstanceState` / ViewModel / SavedStateHandle** 等配合，不仅依赖内存里的引用。
- **启动模式**：`standard`、`singleTop`、`singleTask`、`singleInstance` 与 **`Intent` Flag**、**`taskAffinity`** 组合影响多开、深链与分享入口，需产品设计一致。
- **`android:configChanges`**：声明后可避免 Activity 因部分配置重建，但需自行处理布局与 Surface（视频常需额外对齐逻辑）。
- **线程**：生命周期回调在**主线程**；网络与重 IO 须异步。

### 3.3 典型业务场景

| 场景 | 要点 |
|------|------|
| 登录后主界面 | `LAUNCHER` 入口；主页可用 `singleTask` 控制栈深 |
| 深链 / App Links | `intent-filter` + `onNewIntent` / `NavController` |
| 来电全屏 | `showWhenLocked`、`turnScreenOn`、Manifest 与系统策略 |
| 分享接收 | 单独 Activity 或 `ActivityResult` 接数据再落库 |

### 3.4 常见坑

- 误判 `onDestroy` 必被调用或顺序。
- **Configuration change** 与 ViewModel / Fragment 作用域不一致。
- **Android 12+**：`android:exported` 配置错误影响安装或安全审计。

---

## 4. Service

### 4.1 业务上解决什么

- **与 UI 弱绑定或无绑定的长时逻辑**：播放、同步、**维持 SIP/通话信令**等。
- 可推迟、可批量的任务更多走向 **WorkManager / JobScheduler**；Service 更侧重**持续运行**或与系统形态强绑定的场景。

### 4.2 Started Service 与 Bound Service

- **Started**：`startService` / **`startForegroundService`**（Android 8+ 后台限制下长耗时常用后者，并在时限内 **`startForeground`**）。
- **Bound**：`bindService`，通过 **`IBinder`/AIDL** 提供跨组件调用接口；**`unbind` 后**若无 **start** 则可能销毁。
- **混合 start + bind**：可同时「可绑、又可独立存活」，需明确何时 `stopSelf`。

### 4.3 版本与合规要点

- **Android 10+**：Manifest 声明 **`foregroundServiceType`**，与权限、`FOREGROUND_SERVICE_*` 声明一致。
- **`onStartCommand` 返回值**：`START_STICKY` / `START_NOT_STICKY` / `START_REDELIVER_INTENT` 影响进程被杀后是否重启与 Intent 是否重投。
- **`onStartCommand` 跑在主线程**，禁止长阻塞。

### 4.4 典型业务场景

| 场景 | 模式 |
|------|------|
| VoIP 通话中维持链路 | **前台** + 合适 `foregroundServiceType` + 持续通知 |
| 推送到达后短窗口建链 | 前台短跑或 WorkManager **expedited**（按版本与政策） |
| 模块共享长连接 | Bound 或进程内单例 + 是否要对系统声明前台 |

### 4.5 常见坑

- 误认为 Service 默认在子线程。
- **targetSdk** 升高后前台类型与权限不全导致启动失败。
- Service 持有 Activity/View 造成泄漏。

---

## 5. BroadcastReceiver

### 5.1 业务上解决什么

- **系统事件**：开机、网络、时区、屏幕等（部分场景更推荐 **Callback API**，如网络用 `ConnectivityManager` + **NetworkCallback**）。
- **应用内解耦**：同 APK 多模块；现代也可用 **Flow / 显式组件**。
- **通知动作**：`PendingIntent` → **显式** Receiver。

### 5.2 静态注册与动态注册

- **静态（Manifest）**：应用未运行时部分广播仍可送达（随政策减少）。
- **Android 8+**：大量**隐式广播**被限；须对照官方受限列表，改用 **JobScheduler/WorkManager** 或显式广播。
- **动态注册**：`registerReceiver` / `unregisterReceiver` 配对，避免泄漏与重复注册。
- **`onReceive` 默认在主线程**，须快速返回；重活应 **startForegroundService** / **WorkManager** 接力；可用 **`goAsync()`** 有限延长异步窗口。

### 5.3 有序广播

- `sendOrderedBroadcast`：可依次传递、中途 **abort**；仍需控制耗时。

### 5.4 常见坑

- Receiver 内直接做网络/重 IO → **ANR**。
- 依赖已受限的隐式广播 → 机器上「永远收不到」。
- 重复注册导致同一事件处理两次。

---

## 6. ContentProvider

### 6.1 业务上解决什么

- **跨应用**暴露结构化数据（类似系统通讯录、媒体）。
- **同应用内**：可用 Provider 统一 DB/文件 URI（老架构常见）；新代码也可用 **Room + Repository** 替代。
- **文件安全分享**：**FileProvider** + `content://` + `grantUriPermission`。

### 6.2 核心知识点

- **URI**：`content://authority/path/id`；`authorities` 在 Manifest 中唯一。
- **CRUD**：`query` / `insert` / `update` / `delete` / `getType`；注意 **Transaction** 与批量接口。
- **权限**：`readPermission` / `writePermission` / `grantUriPermissions`；危险权限在调用方 **运行时申请**。
- **Binder 传输上限**：避免一次性返回超大 Cursor；大文件用 **文件描述符**等机制。

### 6.3 常见坑

- `selection` 直接拼接用户输入 → **SQL 注入**；应用占位符。
- **FileProvider** `path` 过宽 → 路径穿越风险。
- 数据变更未 **`notifyChange`** → UI 不刷新。

---

## 7. 四大组件的业务分工（总表）

| 组件 | 最适合的业务 | 不宜单独承担的业务 |
|------|--------------|---------------------|
| Activity | 可见页、强交互、锁屏/PiP 等窗口策略 | 纯后台逻辑 |
| Service | 与系统形态匹配的**持续**任务（尤其前台）、Binder 服务 | 可延期批处理（优先 WorkManager 等） |
| BroadcastReceiver | **短**事件分流、通知点击、少量系统信号 | 长耗时、稳定实时状态（优先 Callback） |
| ContentProvider | **跨应用**数据契约、安全文件分享 | 仅应用内且简单时可直接 Room/文件 API |

---

## 8. 与现代 Jetpack 的关系

- **单 Activity + Navigation + Fragment**：「多页」不一定是多 Activity。
- **ViewModel + Repository**：状态与用例集中在 ViewModel；Activity/Fragment 偏生命周期与 UI。
- **WorkManager**：承接「从 Receiver 里拉起重同步」的演进方向，省电与可重试更可控。
- **前台 Service + NotificationChannel**：合规长跑的标配；**targetSdk** 升级须核对前台类型与权限。

---

## 9. JNI（Java Native Interface）原理

### 9.1 定位

**JNI** 是 **JVM 规范中的 C 接口**，使 **Java/Kotlin** 与 **native（C/C++）** 互相调用。Android **ART** 实现 JNI；**NDK** 用于编译 native 库并与 Java/Kotlin 链接。

### 9.2 Java → Native 的典型路径

1. `System.loadLibrary("foo")` 装载 `libfoo.so`，可执行 **`JNI_OnLoad`** 做注册或版本声明。
2. Java/Kotlin 声明 **`native`** 方法；运行时解析到 C/C++ 函数（**长命名** `Java_包_类_方法` 或 **`RegisterNatives`** 显式绑定）。
3. Native 函数签名首参一般为 **`JNIEnv*`**，实例方法第二参为 **`jobject`（this）**，静态方法为 **`jclass`**。
4. 通过 **`JNIEnv` 函数表** 创建对象、调用 Java 方法、读写字段。

### 9.3 Native → Java

同样经 **`JNIEnv`**：`FindClass`、`GetMethodID` / `GetStaticMethodID`（带 **JNI 类型描述符**）、`Call*Method`、`NewObject` 等；若 Java 侧抛异常，须 **`ExceptionCheck` / `ExceptionClear`** 或 **`ThrowNew`**。

### 9.4 `JNIEnv` 与线程

- **`JNIEnv*` 与线程绑定**；从 Java 进入 native 的当前线程可直接使用。
- **在 native 自建线程**中默认未 attach，**不能**复用其他线程的 `JNIEnv*`；应 **`JavaVM->AttachCurrentThread`**，必要时 **`DetachCurrentThread`**。

这也是许多 SDK 要求「**仅在指定线程调用 JNI**」的原因：**非线程安全的 JNIEnv 使用或未 attach** 会导致崩溃或未定义行为。

### 9.5 引用与 GC

- **局部引用（Local）**：通常在一次 native 调用退出前有效；循环 `NewObject` 过多可能导致局部引用表压力，可用 **`PushLocalFrame` / `PopLocalFrame`** 或 **`DeleteLocalRef`**。
- **全局引用（Global）**：**`NewGlobalRef`** 可跨多次调用保存 Java 对象；不用 **`DeleteGlobalRef`** 会阻止 GC，造成泄漏。
- **弱全局引用**：`NewWeakGlobalRef`，不阻止回收，使用前需检查存活。

### 9.6 注册与混淆

- **`JNI_OnLoad` + `RegisterNatives`**：不依赖超长 C 符号名，利于重构与 **R8/ProGuard**（仍需 **`keep` native 方法**若用按名查找）。
- **Kotlin**：注意**内部类**名含 `$`，JNI 侧类名签名须一致。

### 9.7 与 Linphone 类工程的联系

应用层常把 **`native`/`loadLibrary`** 封装在 **AAR** 内；业务仍须理解：**谁可以调 Core、是否必须 `postOnCoreThread`**，与 **单线程 + JNI 线程模型**一致。

更贴近本仓库的 JNI/NDK 提要见 [`android_knowledge_detailed.md` 第 7 节](android_knowledge_detailed.md#7-jnindk-与-linphone-sdk)。

---

## 10. Native 与 Framework：Android 与鸿蒙的概念对照

| 层次/角色 | Android | 鸿蒙（Stage 模型，概念级） |
|-----------|---------|---------------------------|
| 应用主流语言/框架 | Kotlin/Java + Android SDK + Jetpack | **ArkTS** + **ArkUI** + 各 **Kit**（Ability、网络、媒体等） |
| 「官方上层 API」 | Android Framework | 应用框架层（Ability、ArkUI、DataShare、CommonEvent 等） |
| 应用侧 C/C++ | **NDK** + **JNI** | Native 模块 + **NAPI** 等与 ArkTS 的桥接（角色类似 JNI） |
| 系统底层实现 | HAL、native 服务、Binder… | 系统服务与 Native API（具体以官方文档为准） |

**记忆**：Android 的 **Framework** ≈ 鸿蒙应用侧的 **Kit + ArkUI/运行时门面**；Android 的 **JNI + NDK** ≈ 鸿蒙侧 **NAPI + Native C++ 模块** 的工程角色。

---

## 11. 四大组件与鸿蒙的对应关系

**不是 API 一一名称对应**，但可作概念映射（**Stage 模型 / API 9+**）：

| Android | 鸿蒙（概念对应） |
|---------|------------------|
| **Activity** | **UIAbility**（带窗口、前台生命周期的界面单元；多页多为 Page/Router） |
| **Service** | **ServiceExtensionAbility**（后台扩展；长驻与能效以官方能力与审核为准） |
| **BroadcastReceiver** | **CommonEvent（公共事件）** + **订阅者**（Manifest 静态 + 代码动态） |
| **ContentProvider** | **DataShare** / **DataShareExtensionAbility** 等跨应用数据共享机制 |

---

## 12. 易混点：Activity 与鸿蒙 XComponent

- **Activity** 对应**整屏/窗口级**能力与生命周期，更接近 **UIAbility**，**不是** XComponent。
- **XComponent** 更接近 Android 里 **SurfaceView / TextureView / GLSurfaceView** 一类：**界面中一块 native/图形渲染区域**，而不是「一整页」。

---

## 修订说明

- 可与 [`android_knowledge_detailed.md`](android_knowledge_detailed.md) 第 1、2、7、13 节及附录对照阅读。
- 系统行为随 **API 级别**与厂商策略变化，**以当前 targetSdk 对应官方文档为准**。
