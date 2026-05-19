# 聊天室 / 会话与联系人 - 鸿蒙（NAPI + ArkTS）待开发接口清单

本文档列出 **linphone_napi** 要达到与 **linphone-android** 相近的「联系人 + 聊天室/会话」能力时，需要在 **ohos_linphone（NAPI）**、**Entry ArkTS** 与 **HarmonyOS 系统** 侧补齐的接口与类型。当前 `Core` 以通话与 `MagicSearch` 为主，下列项多数为 **待实现**。

---

## 1. NAPI - `Core` 类待增方法（C API 映射）

以下方法名建议与 ArkTS 侧 `Core.ets` 保持一致，底层对应 `linphone_core.h` 等同名能力（以实际 SDK 版本为准）。

### 1.1 聊天室 / 会话

| ArkTS / NAPI 方法名（建议） | liblinphone 方向（参考） | 说明 |
|----------------------------|-------------------------|------|
| `getChatRooms` | `linphone_core_get_chat_rooms` | 返回会话列表 |
| `findChatRoom` | `linphone_core_find_chat_room` | 按参数查找 |
| `searchChatRoom` | `linphone_core_search_chat_room` | 若 SDK 提供 |
| `createChatRoom` | `linphone_core_create_chat_room` | 创建会话 |
| `createDefaultChatRoom` | 视 SDK | 默认参数创建 |
| `getDefaultChatRoomParams` | 若存在 | 默认 `ChatRoomParams` |
| `encodeChatRoomId` / `decodeChatRoomId` | 若使用 id 编码 API | 与 Android `getConversationId` 逻辑对齐时可能需要 |

### 1.2 会议 / 群聊（语音视频会议 + 会话内聊天）

| ArkTS / NAPI 方法名（建议） | liblinphone 方向（参考） | 说明 |
|----------------------------|-------------------------|------|
| `createConferenceParams` | `linphone_core_create_conference_params` | |
| `createConferenceWithParams` | `linphone_core_create_conference_with_params` | 群会议 |
| `createConferenceSchedulerWithType` | `linphone_core_create_conference_scheduler_...` | SIP / CCMP |
| `findConferenceInformationFromUri` | `linphone_core_find_conference_information_from_uri` | 来电/会话关联 |
| `getConferenceList` | 若 SDK 提供 | 当前会议列表 |

### 1.3 好友 / 地址本（配合 MagicSearch 与本地列表）

| ArkTS / NAPI 方法名（建议） | liblinphone 方向（参考） | 说明 |
|----------------------------|-------------------------|------|
| `getFriendLists` / `getDefaultFriendList` | 好友列表枚举 | |
| `createFriendList` | | 如 `Native address-book` 独立列表 |
| `createFriend` / `createFriendWithAddress` | | |
| `findFriends` | | 搜索好友 |
| `getVcardContext` 等 | 若使用 vCard | 已有 `vcard.cpp` 可扩展绑定 |

### 1.4 其它 Core 能力（联系人/聊天链路常用）

| 方法（建议） | 说明 |
|-------------|------|
| `isLimeX3DhEnabled` 及 LIME 相关 setter/getter | 端到端加密聊天 |
| `getCallLogs`（若要做会话与通话联动） | 可选 |
| 推送与聊天联动 | 已有部分 push 回调时可扩展 payload 解析 |

**已有（无需重复开发）**：`createMagicSearch`、`inviteAddress`、`createCallParams`、`getDefaultAccount`、`createAccountParams`、音视频设备相关方法等（见 `core.cpp` `Export`）。

---

## 2. NAPI - 新建导出类（独立 `napi_define_class`）

每类需：`Constructor`、生命周期（`unref`/`ref` 策略）、与 C 指针包装一致。

| 类名（建议） | 主要方法（示例） | 说明 |
|-------------|------------------|------|
| `ChatRoom` | `getPeerAddress`、`getIdentifier`、`hasCapability`、`getState`、`getHistory`、消息发送封装 | 与 `ChatRoom` C API 对齐 |
| `ChatRoomParams` | backend、加密、主题等 | 对应 Flexisip / Basic |
| `ChatParams` | `ephemeralLifetime`、`backend` | |
| `ChatMessage` | 正文、文件、状态、回复 | |
| `ChatMessageListener` | 状态变更 | |
| `Friend` | 姓名、地址列表、vcard、photo | |
| `FriendList` | `addFriend`、`removeFriend`、`addListener` | |
| `FriendListListener` | 列表变更回调 | |
| `Conference` | 参与者、录音等（按产品） | |
| `ConferenceParams` | `isChatEnabled`、`isVideoEnabled`、`securityLevel`、`subject`、`account` | |
| `ConferenceInfo` | 预约会议信息 | |
| `ConferenceScheduler` | SIP/CCMP 调度 | |
| `SearchResult` | 已有 `magic_search_result.cpp`，按需补全字段访问子 | |
| `Vcard` | 与 `vcard.cpp` 对齐扩展 | 可选 |

---

## 3. NAPI - `Core::AddListener` 待增回调

当前已绑定（示例）：注册状态、呼叫状态、push、`global_state`、`call_stats_updated`。

**建议增加（聊天/会话）**：

| 回调名（建议） | C callback setter（参考） | 说明 |
|---------------|---------------------------|------|
| `onChatRoomStateChanged` | `linphone_core_cbs_set_chat_room_state_changed` | 列表增删、状态 |
| `onMessageSent` | `linphone_core_cbs_set_message_sent` 或等价 | |
| `onMessagesReceived` | `linphone_core_cbs_set_messages_received` 或等价 | |
| `onChatMessageReceived` | 若 SDK 分立事件 | |
| `onIsComposingReceived` | 正在输入 | 可选 |
| `onEcMissingMutualAgreement` 等安全相关 | 若启用 LIME | 可选 |

ArkTS 侧需扩展 `CoreListener` 接口对象，与现有 `call_state_changed` 形式一致。

---

## 4. NAPI - `MagicSearch` 补全（可选）

| 项目 | 说明 |
|------|------|
| `getContactsListAsync` | 已有 |
| `getLastSearch` | 已有 |
| LDAP / `onLdapHaveMoreResults` | C 层已有空回调，可按需暴露到 ArkTS |
| `SearchResult` 字段 | `friend`、`sourceFlags`、地址等与 Android 对齐 |

---

## 5. Account / AccountParams（已部分具备，建议核对）

与群聊/会议强相关字段需在 ArkTS 层可读可写，并与 Android `LinphoneUtils` 判断一致：

- `conferenceFactoryUri`
- `audioVideoConferenceFactoryAddress`（已有 C++ 绑定示例）
- `ccmpServerUrl`
- `limeServerUrl`

---

## 6. ArkTS 应用层（entry）建议接口 / 模块

| 模块（建议路径或职责） | 接口职责 |
|------------------------|----------|
| `ContactSyncService`（新建） | 调用鸿蒙通讯录 Kit → 转换为 `Friend` → 写入 `FriendList` |
| `ContactsRepository`（新建） | 封装 `MagicSearch` + 本地 FriendList + 系统联系人合并 |
| `ConversationsListViewModel`（新建） | 监听 `Core` 聊天回调，维护会话列表模型 |
| `ConversationViewModel`（新建） | 单聊消息列表、发送、附件 |
| `ConferenceService`（新建） | 封装 `createConferenceWithParams`、.scheduler |

与现有 `CoreContext.ets` 集成：在 `start()` 后注入上述仓库或挂载 listener。

---

## 7. HarmonyOS 系统能力（联系人）

| 能力 | 方向（以官方文档为准） |
|------|-------------------------|
| 读取设备联系人 | Contacts Kit / 联系人数据服务；权限声明与用户授权 |
| 头像与 URI | 与 `Friend.refKey` / 自定义映射字段对齐 |
| 后台同步 | 作业调度或账户同步策略（按产品） |

无需与 Android `ContactsContract` 同名，但建议在 **`ContactSyncService`** 内统一映射到与 Android 相同的 **`FriendList` 命名策略**（如 `Native address-book`），便于配置复用。

---

## 8. 实现顺序建议

1. 扩展 `Core` listener：聊天室状态 + 消息收发。  
2. 绑定 `ChatRoom`、`ChatMessage`、创建会话 API。  
3. 绑定 `Friend` / `FriendList` + 与 `MagicSearch` 联调。  
4. 绑定 `ConferenceParams` / `Conference` / `ConferenceScheduler`。  
5. ArkTS 会话列表与聊天页 + 鸿蒙通讯录同步。

---

## 9. 参考对照

- Android 清单：`linphone-android/docs/chat_contacts_interfaces_android.md`
- 当前鸿蒙 Core 导出：`ohos_linphone/src/main/cpp/core/core.cpp`（`Core::Export`）
