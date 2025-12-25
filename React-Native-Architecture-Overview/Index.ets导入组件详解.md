# Index.ets 导入组件详解

## 组件分类

### 📦 Bundle 相关

#### 1. `ResourceJSBundleProvider`
**作用**: 从资源文件中加载 JS Bundle

**用途**: 加载打包好的 `.harmony.bundle` 文件

**使用示例**:
```typescript
// 从 rawfile 资源中加载 bundle
const provider = new ResourceJSBundleProvider(
  getContext().resourceManager,
  'bundle/basic/basic.harmony.bundle'
);
await instance.runJSBundle(provider);
```

**在代码中的使用**:
```161:162:b/c/d/e/entry/src/main/ets/pages/Index.ets
    await cpInstance.runJSBundle(new ResourceJSBundleProvider(getContext()
      .resourceManager, 'bundle/basic/basic.harmony.bundle'));
```

---

### 🏗️ Context 相关（核心架构组件）

#### 2. `RNOHCoreContext`
**作用**: React Native 的**核心上下文**，管理所有 RNInstance 的共享资源

**职责**:
- 创建和销毁 RNInstance
- 管理全局配置（调试模式、UIAbilityContext 等）
- 提供开发工具控制器（DevTools）
- 管理错误事件发射器

**特点**:
- **全局唯一**: 整个应用只有一个 RNOHCoreContext
- **跨 Instance 共享**: 所有 RNInstance 共享这个 Context
- **生命周期**: 在 EntryAbility 中创建，存储在 AppStorage

**使用示例**:
```typescript
// 从 AppStorage 获取（在 EntryAbility 中已创建）
@StorageLink('RNOHCoreContext') rnohCoreContext: RNOHCoreContext | undefined = undefined;

// 创建 RNInstance
const instance = await rnohCoreContext.createAndRegisterRNInstance({
  createRNPackages: createRNPackages,
  // ...
});
```

**在代码中的使用**:
```28:28:b/c/d/e/entry/src/main/ets/pages/Index.ets
  @StorageLink('RNOHCoreContext') rnohCoreContext: RNOHCoreContext | undefined = undefined;
```

---

#### 3. `RNOHContext`
**作用**: 特定 RNInstance 的上下文，继承自 RNOHCoreContext

**职责**:
- 提供特定 RNInstance 相关的功能
- 包含对特定 RNInstance 的引用
- 用于创建 RNComponentContext

**特点**:
- **每个 Instance 一个**: 每个 RNInstance 有对应的 RNOHContext
- **从 CoreContext 创建**: 通过 `fromCoreContext()` 静态方法创建

**使用示例**:
```typescript
// 从 RNOHCoreContext 和 RNInstance 创建
const rnohContext = RNOHContext.fromCoreContext(
  rnohCoreContext,
  rnInstance
);
```

**在代码中的使用**:
```126:126:b/c/d/e/entry/src/main/ets/pages/Index.ets
      RNOHContext.fromCoreContext(this.rnohCoreContext!, cpInstance),
```

---

#### 4. `RNComponentContext`
**作用**: 组件渲染上下文，用于渲染 React Native 组件

**职责**:
- 连接 RNInstance 和 ArkTS UI 组件
- 提供组件构建器（buildCustomComponent、buildRNComponentForTag）
- 管理自定义组件的映射

**特点**:
- **每个 Instance 一个**: 每个 RNInstance 需要创建对应的 RNComponentContext
- **用于渲染**: 在 RNSurface 或自定义组件中使用

**使用示例**:
```typescript
const ctx = new RNComponentContext(
  RNOHContext.fromCoreContext(rnohCoreContext, instance),
  wrapBuilder(buildCustomComponent),  // 自定义组件构建器
  wrapBuilder(buildRNComponentForTag), // RN 组件构建器
  new Map()  // 自定义组件映射
);
```

**在代码中的使用**:
```125:130:b/c/d/e/entry/src/main/ets/pages/Index.ets
    const ctxCp: RNComponentContext = new RNComponentContext(
      RNOHContext.fromCoreContext(this.rnohCoreContext!, cpInstance),
      wrapBuilder(buildCustomComponent),
      wrapBuilder(buildRNComponentForTag),
      new Map()
    );
```

---

### 🎯 Instance 相关

#### 5. `RNInstance`
**作用**: React Native 运行实例，独立的 JS 执行环境

**职责**:
- 管理 JS 引擎（Hermes/JSVM）
- 运行 JS Bundle
- 管理组件树和状态
- 提供 TurboModule 访问

**特点**:
- **独立环境**: 每个 RNInstance 有独立的 JS 线程和引擎
- **可创建多个**: 一个应用可以有多个 RNInstance
- **生命周期**: 通过 RNOHCoreContext 创建和销毁

**使用示例**:
```typescript
// 创建 RNInstance
const instance: RNInstance = await rnohCoreContext.createAndRegisterRNInstance({
  createRNPackages: createRNPackages,
  enableNDKTextMeasuring: true,
  // ...
});

// 加载 Bundle
await instance.runJSBundle(provider);

// 获取 TurboModule
const turboModule = instance.getTurboModule<SomeTurboModule>(SomeTurboModule.NAME);
```

**在代码中的使用**:
```118:124:b/c/d/e/entry/src/main/ets/pages/Index.ets
    const cpInstance: RNInstance = await this.rnohCoreContext.createAndRegisterRNInstance({
      createRNPackages: createRNPackages,
      enableNDKTextMeasuring: true,
      enableBackgroundExecutor: false,
      enableCAPIArchitecture: ENABLE_CAPI_ARCHITECTURE,
      arkTsComponentNames: arkTsComponentNames
    });
```

---

### 🐛 调试和错误处理

#### 6. `LogBoxDialog`
**作用**: 显示 React Native 的警告和错误日志对话框

**用途**: 开发模式下显示 JS 错误、警告信息

**特点**:
- **开发工具**: 仅在开发模式下使用
- **自动显示**: 通过 LogBoxTurboModule 的事件触发

**使用示例**:
```typescript
this.logBoxDialogController = new CustomDialogController({
  builder: LogBoxDialog({
    ctx: rnComponentContext,
    rnInstance: metroInstance,
    initialProps: {},
    buildCustomComponent: logBoxBuilder,
  })
});

// 监听显示/隐藏事件
metroInstance.getTurboModule<LogBoxTurboModule>(LogBoxTurboModule.NAME)
  .eventEmitter.subscribe("SHOW", () => {
    this.logBoxDialogController.open();
  });
```

**在代码中的使用**:
```63:90:b/c/d/e/entry/src/main/ets/pages/Index.ets
  subscribeLogBox() {
    this.logBoxDialogController = new CustomDialogController({
      cornerRadius: 0,
      customStyle: true,
      alignment: DialogAlignment.TopStart,
      backgroundColor: Color.Transparent,
      builder: LogBoxDialog({
        ctx: new RNComponentContext(
          RNOHContext.fromCoreContext(this.rnohCoreContext!, LoadManager.metroInstance),
          wrapBuilder(buildCustomComponent),
          wrapBuilder(buildRNComponentForTag),
          new Map()
        ),
        rnInstance: LoadManager.metroInstance,
        initialProps: {},
        buildCustomComponent: this.logBoxBuilder,
      })
    })

    this.cleanUpCallbacks.push(LoadManager.metroInstance.getTurboModule<LogBoxTurboModule>(LogBoxTurboModule.NAME).eventEmitter.subscribe("SHOW",
      () => {
        this.logBoxDialogController.open();
      }))
    this.cleanUpCallbacks.push(LoadManager.metroInstance.getTurboModule<LogBoxTurboModule>(LogBoxTurboModule.NAME).eventEmitter.subscribe("HIDE",
      () => {
        this.logBoxDialogController.close();
      }))
  }
```

---

#### 7. `RNOHErrorDialog`
**作用**: 显示 React Native 框架级别的错误对话框

**用途**: 显示框架错误（如 Bundle 加载失败、Native 模块错误等）

**特点**:
- **框架错误**: 显示底层框架错误，不是 JS 错误
- **自动显示**: 错误发生时自动弹出

**使用示例**:
```typescript
build() {
  Stack() {
    // 仅在调试模式且 Metro 可用时显示
    if (this.rnohCoreContext?.isDebugModeEnabled && this.isMetroAvailable) {
      RNOHErrorDialog();
    }
    // ...
  }
}
```

**在代码中的使用**:
```171:179:b/c/d/e/entry/src/main/ets/pages/Index.ets
  build() {
    Stack() {
      if (this.rnohCoreContext?.isDebugModeEnabled && this.isMetroAvailable) {
        RNOHErrorDialog();
      }
      if (this.isBundleReady) {
        MultiHome();
      }
    }
  }
```

---

#### 8. `LogBoxTurboModule`
**作用**: 控制 LogBox 显示/隐藏的 TurboModule

**用途**: 
- 监听 JS 错误/警告事件
- 控制 LogBoxDialog 的显示和隐藏

**使用示例**:
```typescript
const logBoxModule = instance.getTurboModule<LogBoxTurboModule>(LogBoxTurboModule.NAME);

// 监听显示事件
logBoxModule.eventEmitter.subscribe("SHOW", () => {
  dialogController.open();
});

// 监听隐藏事件
logBoxModule.eventEmitter.subscribe("HIDE", () => {
  dialogController.close();
});
```

**在代码中的使用**:
```82:89:b/c/d/e/entry/src/main/ets/pages/Index.ets
    this.cleanUpCallbacks.push(LoadManager.metroInstance.getTurboModule<LogBoxTurboModule>(LogBoxTurboModule.NAME).eventEmitter.subscribe("SHOW",
      () => {
        this.logBoxDialogController.open();
      }))
    this.cleanUpCallbacks.push(LoadManager.metroInstance.getTurboModule<LogBoxTurboModule>(LogBoxTurboModule.NAME).eventEmitter.subscribe("HIDE",
      () => {
        this.logBoxDialogController.close();
      }))
```

---

### 🧩 组件构建相关

#### 9. `ComponentBuilderContext`
**作用**: 组件构建时的上下文信息

**用途**: 在 `@Builder` 函数中传递组件构建信息

**包含信息**:
- `componentName`: 组件名称
- `tag`: 组件标签
- `rnComponentContext`: RN 组件上下文

**使用示例**:
```typescript
@Builder
function buildCustomComponent(ctx: ComponentBuilderContext) {
  if (ctx.componentName === 'MyCustomComponent') {
    MyCustomComponent({
      ctx: ctx.rnComponentContext,
      tag: ctx.tag
    })
  }
}
```

**在代码中的使用**:
```34:36:b/c/d/e/entry/src/main/ets/pages/Index.ets
  @Builder
  logBoxBuilder(_: ComponentBuilderContext) {
  }
```

---

#### 10. `buildRNComponentForTag`
**作用**: 根据 tag 构建 React Native 组件的构建器函数

**用途**: 在 RNComponentContext 中使用，用于渲染 RN 组件

**使用示例**:
```typescript
const ctx = new RNComponentContext(
  rnohContext,
  wrapBuilder(buildCustomComponent),
  wrapBuilder(buildRNComponentForTag),  // ← 这里
  new Map()
);
```

**在代码中的使用**:
```125:130:b/c/d/e/entry/src/main/ets/pages/Index.ets
    const ctxCp: RNComponentContext = new RNComponentContext(
      RNOHContext.fromCoreContext(this.rnohCoreContext!, cpInstance),
      wrapBuilder(buildCustomComponent),
      wrapBuilder(buildRNComponentForTag),
      new Map()
    );
```

---

## 组件关系图

```
RNOHCoreContext (全局，唯一)
  │
  ├─ createAndRegisterRNInstance()
  │   └─ 创建 RNInstance
  │
  └─ RNOHContext (每个 Instance 一个)
      │
      └─ RNComponentContext (每个 Instance 一个)
          │
          ├─ buildCustomComponent (自定义组件构建器)
          ├─ buildRNComponentForTag (RN 组件构建器)
          └─ ComponentBuilderContext (构建上下文)

RNInstance (运行实例)
  │
  ├─ runJSBundle(ResourceJSBundleProvider)
  ├─ getTurboModule<LogBoxTurboModule>()
  └─ subscribeToLifecycleEvents()

LogBoxTurboModule
  │
  └─ eventEmitter
      ├─ "SHOW" → LogBoxDialog.open()
      └─ "HIDE" → LogBoxDialog.close()

RNOHErrorDialog (自动显示框架错误)
```

---

## 使用流程

### 1. 初始化流程

```
应用启动
  ↓
EntryAbility.onCreate()
  ↓
创建 RNOHCoreContext
  ↓
存储到 AppStorage
  ↓
Index.aboutToAppear()
  ↓
从 AppStorage 获取 RNOHCoreContext
  ↓
创建 RNInstance
  ↓
创建 RNOHContext (fromCoreContext)
  ↓
创建 RNComponentContext
  ↓
加载 Bundle (ResourceJSBundleProvider)
```

### 2. 调试工具流程

```
Metro 模式启用
  ↓
创建 metroInstance
  ↓
订阅 LogBoxTurboModule 事件
  ↓
创建 LogBoxDialog
  ↓
JS 错误发生
  ↓
LogBoxTurboModule 发射 "SHOW" 事件
  ↓
打开 LogBoxDialog
```

---

## 总结

| 组件 | 作用 | 数量 | 生命周期 |
|------|------|------|----------|
| `RNOHCoreContext` | 核心上下文，管理所有 Instance | 1个（全局） | 应用生命周期 |
| `RNInstance` | JS 运行实例 | 多个（cpInstance、bpInstance等） | 可创建/销毁 |
| `RNOHContext` | Instance 上下文 | 每个 Instance 一个 | 随 Instance |
| `RNComponentContext` | 组件渲染上下文 | 每个 Instance 一个 | 随 Instance |
| `ResourceJSBundleProvider` | Bundle 加载器 | 每次加载时创建 | 临时 |
| `LogBoxDialog` | 错误日志对话框 | 1个（开发模式） | 开发模式 |
| `RNOHErrorDialog` | 框架错误对话框 | 1个（开发模式） | 开发模式 |
| `LogBoxTurboModule` | LogBox 控制模块 | 每个 Instance 一个 | 随 Instance |
| `ComponentBuilderContext` | 组件构建上下文 | 每次构建时传递 | 临时 |
| `buildRNComponentForTag` | RN 组件构建器 | 函数，可复用 | 全局 |

