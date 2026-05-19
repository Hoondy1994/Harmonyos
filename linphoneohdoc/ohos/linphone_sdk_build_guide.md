# Linphone SDK 编译指南

项目中有两个 SDK 目录，用途不同：

| 目录 | 用途 | 支持平台 |
|------|------|----------|
| `linphone-sdk` | 标准上游 Linphone SDK | Windows、Android、iOS、macOS、Linux |
| `ohos_linphone_sdk` | 鸿蒙改编版（含 ohos_avcodec） | OpenHarmony |

---

## 一、D:\linphoneoh\linphone-sdk 编译

### 1.1 前置依赖

- **CMake** >= 3.22
- **Python** >= 3.6，以及 `pip install pystache six`
- **yasm**、**nasm**、**doxygen**

### 1.2 初始化子模块

```bash
cd D:\linphoneoh\linphone-sdk
git submodule update --init --recursive
```

### 1.3 按平台编译

#### Windows（推荐）

**环境**：Visual Studio 2022、MSYS2、7-Zip

1. 安装 MSYS2：https://www.msys2.org/
2. 将 `C:\msys64\mingw64\bin`、`C:\msys64\usr\bin` 加入 PATH
3. 在 MSYS2 中安装：`pacman -S mingw-w64-x86_64-cmake ninja`

**配置与构建**：

```powershell
cd D:\linphoneoh\linphone-sdk

# 配置（64 位）
cmake --preset=windows-sdk -B build-windows

# 构建
cmake --build build-windows --config RelWithDebInfo --parallel 8
```

或使用 Ninja：

```powershell
cmake --preset=windows-ninja-sdk -B build-windows
cmake --build build-windows --config RelWithDebInfo --parallel 8
```

**使用 Visual Studio**：

- 打开 `build-windows\linphone-sdk.sln`
- 选择 RelWithDebInfo / x64
- 执行“生成解决方案”

#### Android

**环境**：Android SDK、NDK

```bash
cmake --preset=android-sdk -B build-android -DCMAKE_BUILD_TYPE=RelWithDebInfo
cmake --build build-android --parallel 8
```

**输出**：`build-android/` 目录

#### macOS

```bash
cmake --preset=mac-sdk -B build-mac
cmake --build build-mac --config RelWithDebInfo
```

#### Linux

```bash
cmake --preset=default -B build-linux -DCMAKE_BUILD_TYPE=RelWithDebInfo
cmake --build build-linux --parallel 8
```

### 1.4 查看可用 Preset

```bash
cmake --list-presets
```

### 1.5 常见选项

```bash
# 关闭 GPL 第三方（默认）
-DENABLE_GPL_THIRD_PARTIES=NO

# 启用 GPL 第三方（如 FFmpeg）
-DENABLE_GPL_THIRD_PARTIES=YES

# 启用非免费特性（如 H.264）
-DENABLE_NON_FREE_FEATURES=ON

# 关闭视频
-DENABLE_VIDEO=OFF
```

---

## 二、鸿蒙编译（ohos_linphone_sdk）

`linphone-sdk` 不含 OHOS 支持，鸿蒙编译需使用 `ohos_linphone_sdk`。

### 2.1 环境要求

- **Linux** 编译主机（推荐 Ubuntu）
- **OpenHarmony SDK**（含 `native/llvm`）
- **CMake** >= 3.22

### 2.2 配置环境

```bash
# 设置 OHOS SDK 路径（Linux）
export OHOS_SDK=/path/to/ohos-sdk/linux

# 示例：DevEco Studio 默认 SDK 路径
# ~/ohos-sdk/openharmony/版本号
```

### 2.3 修改 build.sh

`ohos_linphone_sdk/build.sh` 中有硬编码路径，需按本机环境修改：

```bash
# 第 5 行：CMake 路径
CMAKE="/home/huxiao/code/cmake-3.31.3-linux-x86_64/bin/cmake"
# 改为你的 CMake，例如：
CMAKE="cmake"

# 第 28 行：libyuv 路径（若不需要可删除）
-L/home/huxiao/code/linphone-sdk/build-ohos/output/lib/libyuv.so
```

### 2.4 执行编译

```bash
cd D:\linphoneoh\ohos_linphone_sdk

# 先初始化子模块
git submodule update --init --recursive

# 设置 OHOS SDK
export OHOS_SDK=/path/to/ohos-sdk/linux

# 编译（需在 Linux 或 WSL 下执行）
./build.sh

# 清理
./build.sh --clean
```

### 2.5 输出与使用

- 输出目录：`build-ohos/output/`
- 包含：`lib/`、`include/` 等
- 拷贝到 `linphone_napi` 的 `libs/arm64-v8a/` 和 `ohos_linphone/src/main/cpp/thirdparty/arm64-v8a/include/`

参考 README_zh.md：

> 在生成的目录 build-ohos 下 out 目录，里面的 lib 及 include，copy 到 ohos_linphone 的 module 中

### 2.6 在 Windows 上编译鸿蒙

需在 **WSL2** 或 **Linux 虚拟机** 中执行：

1. 安装 WSL2
2. 在 WSL 中安装 Ubuntu
3. 安装 OHOS SDK（Linux 版）
4. 在 WSL 中执行上述 `build.sh` 步骤

---

## 三、总结

| 目标 | 使用目录 | 命令 |
|------|----------|------|
| Windows 桌面 | `linphone-sdk` | `cmake --preset=windows-sdk -B build-windows` 然后 `cmake --build` |
| Android | `linphone-sdk` | `cmake --preset=android-sdk -B build-android` |
| 鸿蒙 OHOS | `ohos_linphone_sdk` | 在 Linux/WSL 中执行 `./build.sh` |

`linphone_napi` 使用的预编译库（`libs/arm64-v8a/`）来自 `ohos_linphone_sdk` 的 build 输出。
