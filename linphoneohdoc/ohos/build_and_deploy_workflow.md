# LinphoneOH 编译与部署流程

本文档说明：从 **ohos_linphone_sdk** 编译出 so，再部署到 **linphone_napi** 工程运行的完整流程。

---

## 一、流程概览

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  1. (可选) 用 D:\linphoneoh\mediastreamer2 替换 ohos_linphone_sdk 中的源码    │
├─────────────────────────────────────────────────────────────────────────────┤
│  2. 在 ohos_linphone_sdk 中执行 ./build.sh 编译                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  3. 将 build-ohos/output 中的 lib 和 include 拷贝到 linphone_napi            │
├─────────────────────────────────────────────────────────────────────────────┤
│  4. 用 DevEco Studio 打开 linphone_napi 工程运行                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 二、详细步骤

### 步骤 1：是否替换 mediastreamer2 源码

**ohos_linphone_sdk** 已包含 mediastreamer2（子模块 `ohos-mediastreamer2`），一般可直接编译。

若要用 **D:\linphoneoh\mediastreamer2** 的修改版本：

```bash
# 备份并替换
cd D:\linphoneoh\ohos_linphone_sdk
rm -rf mediastreamer2
cp -r D:\linphoneoh\mediastreamer2 mediastreamer2
```

或在 Windows 中：删除 `ohos_linphone_sdk\mediastreamer2`，将 `D:\linphoneoh\mediastreamer2` 复制为 `ohos_linphone_sdk\mediastreamer2`。

> 注意：两处 mediastreamer2 都含 ohos_avcodec，替换前确认 D:\linphoneoh\mediastreamer2 版本与 ohos_linphone_sdk 其他依赖兼容。

---

### 步骤 2：编译 ohos_linphone_sdk

```bash
cd D:\linphoneoh\ohos_linphone_sdk

# 初始化子模块（首次或更新后）
git submodule update --init --recursive

# 设置 OHOS SDK 路径
export OHOS_SDK=/path/to/ohos-sdk/linux

# 编译（需 Linux 或 WSL2）
./build.sh
```

**输出目录**：`build-ohos/output/`

```
build-ohos/output/
├── lib/           # 所有 .so 库
│   ├── liblinphone.so
│   ├── libmediastreamer2.so
│   ├── libortp.so
│   ├── libbctoolbox.so
│   ├── libbelle-sip.so
│   ├── libbelr.so
│   └── ...
└── include/       # 头文件
    ├── linphone/
    ├── mediastreamer2/
    └── ...
```

---

### 步骤 3：拷贝到 linphone_napi

根据 `linphone_napi/ohos_linphone/src/main/cpp/CMakeLists.txt`：

- 库路径：`${CMAKE_CURRENT_SOURCE_DIR}/../../../libs/${OHOS_ARCH}/`  
  从 `ohos_linphone/src/main/cpp` 向上三级为 `ohos_linphone`，故 libs 在 **`ohos_linphone/libs/arm64-v8a/`**
- 头路径：`thirdparty/${OHOS_ARCH}/include/`  
  即 **`ohos_linphone/src/main/cpp/thirdparty/arm64-v8a/include/`**

**拷贝命令示例**：

```bash
# 进入 ohos_linphone_sdk 的 build 输出目录
cd D:\linphoneoh\ohos_linphone_sdk\build-ohos\output

# 创建目标目录
mkdir -p D:\linphoneoh\linphone_napi\ohos_linphone\libs\arm64-v8a
mkdir -p D:\linphoneoh\linphone_napi\ohos_linphone\src\main\cpp\thirdparty\arm64-v8a\include

# 拷贝 so 库
cp lib/*.so D:\linphoneoh\linphone_napi\ohos_linphone\libs\arm64-v8a\

# 拷贝头文件（保持目录结构）
cp -r include/* D:\linphoneoh\linphone_napi\ohos_linphone\src\main\cpp\thirdparty\arm64-v8a\include\
```

> 若 CMake 中 `../../../` 解析为 linphone_napi 根目录，则 libs 可能在 `linphone_napi/libs/arm64-v8a/`。若链接报错找不到库，可尝试将 so 放到 `linphone_napi/libs/arm64-v8a/`。

---

### 步骤 4：在 linphone_napi 中运行

1. 用 **DevEco Studio** 打开 `D:\linphoneoh\linphone_napi`
2. 连接鸿蒙设备或模拟器
3. 选择 `entry` 模块运行

---

## 三、目录结构对照

| 来源 | 目标 |
|------|------|
| `ohos_linphone_sdk/build-ohos/output/lib/*.so` | `linphone_napi/ohos_linphone/libs/arm64-v8a/` |
| `ohos_linphone_sdk/build-ohos/output/include/*` | `linphone_napi/ohos_linphone/src/main/cpp/thirdparty/arm64-v8a/include/` |

---

## 四、常见问题

### 1. 找不到 libmediastreamer2

确认 `libs/arm64-v8a/` 下存在 `libmediastreamer2.so`，且路径与 CMake 中 `target_link_directories` 一致。

### 2. 头文件找不到

确认 `thirdparty/arm64-v8a/include/` 下有 `mediastreamer2/`、`linphone/` 等目录，且包含所需头文件。

### 3. 需要其他架构（如 arm64-v8a 以外的）

为对应架构再编译一次，并建立 `libs/<架构>/`、`thirdparty/<架构>/include/`，在 CMake 中按 `OHOS_ARCH` 选择。

---

## 五、总结

| 步骤 | 操作 |
|------|------|
| 1 | （可选）用 `D:\linphoneoh\mediastreamer2` 替换 `ohos_linphone_sdk/mediastreamer2` |
| 2 | 在 `ohos_linphone_sdk` 中执行 `./build.sh` |
| 3 | 将 `build-ohos/output/lib/*.so` 和 `include/*` 拷贝到 linphone_napi 对应目录 |
| 4 | 用 DevEco Studio 打开 linphone_napi 并运行 |

整体流程就是：**ohos_linphone_sdk 编译 → 拷贝产物到 linphone_napi → 在 DevEco 中运行**。
