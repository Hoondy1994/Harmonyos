# Mediastreamer2 编译指南

`D:\linphoneoh\mediastreamer2` 含 OHOS 适配（ohos_avcodec），可按以下方式编译。

---

## 一、依赖关系

**必需**：
- **BCToolbox** >= 5.3.0
- **oRTP** >= 5.3.0

**可选**：libsrtp、bzrtp、opus、speex、ffmpeg、libvpx 等。

---

## 二、方式一：通过 linphone-sdk 编译（推荐）

mediastreamer2 作为 linphone-sdk 子模块，随 SDK 一起编译，无需单独配置依赖。

### Windows

```powershell
cd D:\linphoneoh\linphone-sdk
git submodule update --init --recursive

cmake --preset=windows-sdk -B build-windows
cmake --build build-windows --config RelWithDebInfo --parallel 8
```

输出在 `build-windows/` 中，包含 mediastreamer2 等库。

### Linux

```bash
cd D:\linphoneoh\linphone-sdk
git submodule update --init --recursive

cmake --preset=default -B build-linux -DCMAKE_BUILD_TYPE=RelWithDebInfo
cmake --build build-linux --parallel 8
```

---

## 三、方式二：通过 ohos_linphone_sdk 编译（鸿蒙）

鸿蒙版 mediastreamer2（含 ohos_avcodec）在 `ohos_linphone_sdk` 中编译。

```bash
cd D:\linphoneoh\ohos_linphone_sdk

# 设置 OHOS SDK
export OHOS_SDK=/path/to/ohos-sdk/linux

# 编译（需 Linux 或 WSL2）
./build.sh
```

输出：`build-ohos/output/lib/libmediastreamer2.so` 等。

---

## 四、方式三：mediastreamer2 单独编译

需先安装或编译 BCToolbox 和 oRTP。

### 4.1 安装依赖（Linux 示例）

部分发行版可能提供包：

```bash
# Ubuntu/Debian（若仓库有）
sudo apt install libbctoolbox-dev libortp-dev

# 或从源码编译 bctoolbox、ortp，再设置 CMAKE_PREFIX_PATH
```

### 4.2 配置与编译

```bash
cd D:\linphoneoh\mediastreamer2

mkdir build && cd build

cmake .. \
    -DCMAKE_INSTALL_PREFIX=/usr/local \
    -DCMAKE_PREFIX_PATH=/path/to/bctoolbox;/path/to/ortp \
    -DCMAKE_BUILD_TYPE=Release \
    -DENABLE_STRICT=NO

make -j8
make install
```

### 4.3 Windows 单独编译

需先编译 BCToolbox 和 oRTP，再设置 `CMAKE_PREFIX_PATH` 指向安装目录。建议使用 linphone-sdk 统一编译。

---

## 五、常用 CMake 选项

| 选项 | 默认 | 说明 |
|------|------|------|
| `ENABLE_VIDEO` | YES | 视频支持 |
| `ENABLE_SOUND` | YES | 音频支持 |
| `ENABLE_STRICT` | YES | 严格编译（-Werror） |
| `ENABLE_UNIT_TESTS` | YES | 单元测试 |
| `ENABLE_DEBUG_LOGS` | NO | 调试日志 |
| `ENABLE_FFMPEG` | YES | FFmpeg 视频编解码 |

---

## 六、总结

| 目标平台 | 推荐方式 | 命令 |
|----------|----------|------|
| Windows 桌面 | linphone-sdk | `cmake --preset=windows-sdk -B build` |
| Linux 桌面 | linphone-sdk | `cmake --preset=default -B build` |
| 鸿蒙 OHOS | ohos_linphone_sdk | `./build.sh` |
| 单独编译 | 需先装 bctoolbox、ortp | `cmake .. -DCMAKE_PREFIX_PATH=...` |

**注意**：`D:\linphoneoh\mediastreamer2` 与 `ohos_linphone_sdk\mediastreamer2` 可能不同步，鸿蒙编译请使用 `ohos_linphone_sdk` 目录。
