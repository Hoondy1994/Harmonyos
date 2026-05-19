# VoIP 通话音频采集方案

## 一、VoIP 通话的底层音频处理方式

### 1.1 总体架构

Linphone VoIP 通话的音频由 **mediastreamer2** 流媒体引擎处理，通过 **过滤器图（Filter Graph）** 串联。鸿蒙平台下，麦克风采集与扬声器播放由 **ohos_avcodec** 模块对接 OHOS 原生音频 API。

| 层级 | 组件 | 作用 |
|------|------|------|
| 应用层 | linphone_napi | NAPI 桥接，ArkTS 调用 Linphone SDK |
| SDK 层 | Linphone / liblinphone | SIP 信令、媒体会话控制 |
| 引擎层 | mediastreamer2 | 过滤器图、RTP 收发、编解码 |
| 设备层 | ohos_avcodec / ohos_dev.cpp | 对接 OHOS `OH_AudioCapturer` / `OH_AudioRenderer` |

### 1.2 音频链路（audiostream.c）

```
【发送链路】
麦克风 ─► soundread ─► 回声消除(ec) ─► 编码器 ─► RTP 发送
         ↑
    ohos_dev.cpp::ohos_create_reader()
    → OH_AudioCapturer（独占麦克风）


【接收链路】
RTP 接收 ─► 解码器 ─► recv_tee ─┬─► mixer ─► soundwrite ─► 扬声器
                                │              ↑
                                │         ohos_dev.cpp::ohos_create_writer()
                                │         → OH_AudioRenderer（独占扬声器）
                                │
                                └─► recorder_mixer ← outbound_mixer（本地）
                                        │
                                        └─► recorder → 文件（若开启录音）
```

- **soundread**：由 `ms_snd_card_create_reader(captcard)` 创建，底层即 `ohos_create_reader()` → `OH_AudioCapturer`
- **soundwrite**：由 `ms_snd_card_create_writer(playcard)` 创建，底层即 `ohos_create_writer()` → `OH_AudioRenderer`

### 1.3 是否使用 OHOS 音频 API

**是**。Linphone 在鸿蒙上通过 **ohos_dev.cpp** 使用：
- `OH_AudioCapturer`：麦克风采集，对应 mediastreamer2 的 `soundread` filter
- `OH_AudioRenderer`：扬声器播放，对应 mediastreamer2 的 `soundwrite` filter

---

## 二、OHOS AudioCapture 采集不到数据的原因

1. **麦克风被 Linphone 独占**：Linphone 内部已通过 `OH_AudioCapturer` 采集麦克风，应用层再创建 `audio.AudioCapturer` 会竞争同一设备，通常拿不到数据。
2. **AudioCapture 只采麦克风**：`audio.AudioCapturer` 采集的是**输入设备（麦克风）**，不能采集**扬声器输出**；鸿蒙一般也不提供扬声器回采能力。
3. **数据在 mediastreamer2 内部流动**：通话中的 PCM 在过滤器图内部传递（soundread → ec → encoder 等），**不经过应用层**，应用层无法直接拿到。

---

## 三、获取通话音频的正确方式

### 方案一：使用 Linphone 内置录音（需先补齐 NAPI）

Linphone SDK 底层已支持通话录音（混合音频：本地+远端），但 **linphone_napi 当前未暴露 `startRecording()` / `stopRecording()`**。

### 当前实现状态

| 接口 | 状态 |
|------|------|
| `callParams.setRecordFile(path)` | ✅ 已实现（CoreContext 中已调用） |
| `call.startRecording()` | ❌ 未暴露 |
| `call.stopRecording()` | ❌ 未暴露 |

因此即便设置了录音路径，**录音实际不会开始**。需要在 linphone_napi 的 `Call` 中增加对 `linphone_call_start_recording()` / `linphone_call_stop_recording()` 的封装。

### 1.1 补齐 NAPI 后用法示例

```typescript
// 发起/接听时已设置 setRecordFile(path)

// 通话接通后
this.currentCall?.startRecording();

// 通话结束前
this.currentCall?.stopRecording();
```

### 1.2 获取录音文件并处理

录音完成后，从 `fileName` 读取 MKV/SMFF 文件，用 FFmpeg 或 mediastreamer2 解析出 PCM 再做处理。

**优点**：底层已支持，只需补齐 NAPI 桥接。  
**缺点**：只能录到文件，实时 PCM 需方案二。

---

### 方案二：在 mediastreamer2 中增加音频回调

如需**实时 PCM 数据**，可在 mediastreamer2 的音频链路中增加 Tee 或自定义 Filter，把 PCM 回调到应用层。

### 2.1 音频链路结构（audiostream.c）

```
麦克风 → soundread(ohos) → ec → mixer → write_encoder → rtpsend
远端   → rtprecv → decoder → recv_tee → mixer → soundwrite(ohos) → 扬声器
                              ↓
                        recorder_mixer ← outbound_mixer(本地)
                              ↓
                         recorder → 文件
```

### 2.2 实现思路

1. **新增 Tee Filter**：在 `recv_tee` 或 `recorder_mixer` 输出后增加一个 Tee，一路给 recorder，一路给自定义回调 Filter。
2. **自定义 Filter**：实现一个 Filter，在 `process()` 中从输入队列取 `mblk_t`，解析 PCM 后通过 JSI/NAPI 回调传给 ArkTS。
3. **NAPI 暴露**：在 linphone_napi 中增加 `setAudioDataCallback(callback)` 等接口，供 ArkTS 注册回调。

### 2.3 参考代码位置

- 音频流：`mediastreamer2/src/voip/audiostream.c`
- 录音：`recorder_mixer` 输出到 `recorder`
- OHOS 音频：`ohos_avcodec/ohos_audio_codec/ohos_dev.cpp`

---

### 方案三：使用 Linphone 录音 + 边录边处理

若暂时不想改 mediastreamer2，可：

1. 使用 `setRecordFile()` + `startRecording()` 录音到 MKV/SMFF。
2. 在 ArkTS 中启动一个 Worker 或后台任务，定期读取录音文件末尾，解析为 PCM 并做处理。
3. 或使用支持流式读取的格式（如 SMFF），边录边读。

---

### 方案四：区分麦克风与扬声器

| 需求 | 说明 |
|------|------|
| **采集麦克风（本地说话）** | Linphone 已独占麦克风，应用层无法再开 AudioCapture。应通过 Linphone 录音或 mediastreamer2 的 `outbound_mixer` 输出获取。 |
| **采集扬声器（远端声音）** | OHOS AudioCapture 不支持，需通过 Linphone 录音或 mediastreamer2 的 `recv_tee` 输出获取。 |
| **采集混合通话** | 使用 Linphone 的 `setRecordFile()` + `startRecording()` 录音到文件即可。 |

---

## 四、快速验证（需先补齐 startRecording/stopRecording）

当前 `Call` 无 `startRecording()`，需先在 linphone_napi 中封装。补齐后：

```typescript
// 通话接通后
this.currentCall?.startRecording();

// 通话结束后
this.currentCall?.stopRecording();
// 检查录音文件: ctx.cacheDir + "/audio/" + username + "_" + timestamp + ".mkv"
```

若录音文件存在且可播放，说明录音链路正常。

---

## 五、总结

| 方案 | 适用场景 | 实现难度 |
|------|----------|----------|
| 方案一：Linphone 录音 | 录到文件后处理 | 中（需先补齐 NAPI 的 startRecording/stopRecording） |
| 方案二：mediastreamer2 回调 | 实时 PCM 处理 | 高 |
| 方案三：边录边处理 | 录到文件 + 流式处理 | 中 |
| OHOS AudioCapture | 不适合，Linphone 已占麦克风 | - |

**建议**：先在 linphone_napi 的 `Call` 中封装 `startRecording()` / `stopRecording()`，再验证录音；确认无误后可对录音文件做处理，或考虑方案二做实时 PCM 回调。
