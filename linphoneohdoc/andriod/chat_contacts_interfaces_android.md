# 聊天室 / 会话与联系人 - Android 开发与接口清单

本文档归纳 **linphone-android** 在「联系人管理」与「聊天室（会话/群聊）管理」相关的能力边界：应用层接口、Linphone SDK 调用面、以及 Android 系统 API。便于维护、联调或与鸿蒙侧对齐时对照。

---

## 1. 应用层需实现或对接的接口（Kotlin）

### 1.1 联系人

| 类型 | 路径（参考） | 说明 |
|------|----------------|------|
| `ContactsListener` | `contacts/ContactsManager.kt` | `onContactsLoaded()`、`onContactFoundInRemoteDirectory(friend)` |
| `ContactsManager` | `contacts/ContactsManager.kt` | 单例式管理器：MagicSearch、FriendList 缓存、头像、远端目录、与 Core 联动 |
| `ContactLoader` | `contacts/ContactLoader.kt` | 实现 `LoaderManager.LoaderCallbacks`，类型参数为 `android.database.Cursor`；系统通讯录写入 `Friend` / `FriendList` |

### 1.2 聊天 / 会话列表

| 类型 | 路径（参考） | 说明 |
|------|----------------|------|
| `ConversationsListViewModel` | `ui/main/chat/viewmodel/ConversationsListViewModel.kt` | 依赖 `CoreListenerStub`：`onChatRoomStateChanged`、`onMessageSent`、`onMessagesReceived` 等 |
| `ConversationViewModel` / `AbstractConversationViewModel` | `ui/main/chat/viewmodel/` | 单会话消息流、参与者 |
| `ConversationModel` 等 | `ui/main/chat/model/` | UI 数据模型 |

### 1.3 工具与统一入口

| 类型 | 路径（参考） | 说明 |
|------|----------------|------|
| `LinphoneUtils`（object） | `utils/LinphoneUtils.kt` | 群聊可用性、会议/工厂 URI、`ChatRoom` 能力、`ConferenceScheduler`、创建群会议等 |
| `ShortcutUtils` | `utils/ShortcutUtils.kt` | 会话快捷方式：`createShortcutsToChatRooms`、`removeShortcutToChatRoom` |
| `TelecomManager` | `telecom/TelecomManager.kt` | 来电显示联系人：`contactsManager.findContactByAddress` |

---

## 2. Linphone SDK（Java API）- 联系人相关

以下为应用层实际依赖的 **Core / 搜索 / 好友** 能力（命名以 SDK 为准，随版本可能微调）。

### 2.1 `Core`

- 好友与列表：`defaultFriendList`、`friendLists`、`findFriends`、`findContact`（若使用）、`createFriend`、`createFriendWithAddress` 等（以当前 AAR 为准）。
- 魔法搜索：`createMagicSearch()`，与 `MagicSearch` 配合。
- 与聊天：`chatRooms`、`getChatRoom`、`createChatRoom` / `searchChatRoom`（以 SDK 为准）、`findChatRoom`。
- 会议：`createConferenceParams`、`createConferenceWithParams`、`createConferenceSchedulerWithType`、`findConferenceInformationFromUri` 等。

### 2.2 `MagicSearch` / `MagicSearchListener`

- 异步拉取：`getContactsListAsync`（或等价 API）。
- 配置：`setLimitedSearch`、`setSearchLimit` 等。
- 回调：`onSearchResultsReceived` 等。

### 2.3 `Friend` / `FriendList` / `FriendListListener`

- 列表：`addFriend`、`removeFriend`、监听列表变更。
- 好友字段：姓名、`addresses`、`refKey`（绑定系统联系人）、`photo`、`vcard` 等。
- 应用扩展：`ContactsManager.kt` 内对 `Friend` 的扩展方法（头像 URI、`Person`、SIP 地址列表等）。

### 2.4 `Account` / `AccountParams`（群组与加密聊天前置条件）

- `conferenceFactoryUri`、`audioVideoConferenceFactoryAddress`、`ccmpServerUrl`、`limeServerUrl` 等（与 `LinphoneUtils.isGroupChatAvailable`、`isRemoteConferencingAvailable`、`isEndToEndEncryptedChatAvailable` 一致）。

---

## 3. Linphone SDK - 聊天室 / 会话相关

### 3.1 `ChatRoom`

- 状态：`ChatRoom.State`（如 `Created`、`Deleted`）。
- 能力：`ChatRoom.Capabilities`（`OneToOne`、`Conference`、`Encrypted` 等），`hasCapability`。
- 参数：创建/查找时使用的 `ChatRoomParams`、与 `ConferenceParams` / `chatParams` 的关联（Flexisip 后端、 ephemeral 等）。

### 3.2 `ChatMessage` / 消息事件

- 发送/接收：`CoreListener` 中 `onMessageSent`、`onMessagesReceived`。
- 消息操作：回复、反应、文件传输等（见各 `*ViewModel`）。

### 3.3 `Conference` / `ConferenceInfo` / `ConferenceScheduler`

- 群呼叫：`LinphoneUtils.createGroupCall` 调用 `core.createConferenceWithParams`。
- 预约/日历：`ConferenceInfo`、iCal 解析（`LinphoneUtils` 内相关辅助）。
- 调度：`createConferenceSchedulerWithType`（SIP / CCMP）。

### 3.4 `CoreListener`（聊天相关节选）

- `onChatRoomStateChanged(core, chatRoom, state)`
- `onMessageSent` / `onMessagesReceived`
- 其它：根据产品还需 `onChatMessageReceived`（若分事件）、安全提醒等（以 SDK 为准）。

---

## 4. Android 系统 API（平台适配）

| 能力 | API / 组件 |
|------|-------------|
| 读取通讯录 | `ContactsContract`、`ContentResolver`、`CursorLoader` |
| 运行时权限 | `READ_CONTACTS`（`Manifest` + `ActivityCompat`） |
| 快捷方式 | `ShortcutManagerCompat`、`ShortcutInfoCompat`、`Person` |
| 富内容与可访问性 | `ContentCaptureContext.forLocusId`（会话 id，API 29+） |

---

## 5. 可选：与鸿蒙对齐时的中间层

若未来抽取共用「业务契约」，可在 Android 侧新增纯 Kotlin 接口（示例命名，非现成代码）：

- `ContactDirectorySync`：从系统通讯录增量同步到 `FriendList`。
- `ConversationRepository`：封装 `getChatRooms`、监听 `ChatRoom` 状态。
- `ConferenceFacade`：封装 `ConferenceScheduler` 与群会议创建。

当前工程可直接以 **`ContactsManager` + chat 包下 ViewModel** 为事实标准。

---

## 6. 文件索引（实现导航）

- 联系人核心：`app/src/main/java/org/linphone/contacts/`
- 联系人 UI：`app/src/main/java/org/linphone/ui/main/contacts/`
- 会话 UI：`app/src/main/java/org/linphone/ui/main/chat/`
- 会议 / 会话工具：`utils/LinphoneUtils.kt`、`utils/ShortcutUtils.kt`
