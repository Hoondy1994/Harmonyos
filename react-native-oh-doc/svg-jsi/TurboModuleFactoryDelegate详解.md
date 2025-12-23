# TurboModuleFactoryDelegate 详解

## 📖 什么是 TurboModuleFactoryDelegate？

`TurboModuleFactoryDelegate` 是一个**工厂代理接口**，它的作用是：**根据模块名称创建对应的 TurboModule 实例**。

简单来说，它是一个**"工厂模式的委托"**：
- 框架说："我需要一个名为 'RNSVGSvgViewModule' 的 TurboModule"
- `TurboModuleFactoryDelegate` 说："好的，我来创建它！"

---

## 🎯 核心作用

### 1. **解耦创建逻辑**

框架不需要知道如何创建每个 TurboModule，只需要：
- 告诉 `TurboModuleFactoryDelegate`："给我一个叫 'XXX' 的模块"
- `TurboModuleFactoryDelegate` 负责具体的创建逻辑

### 2. **按需创建**

TurboModule 不是一次性全部创建的，而是：
- JavaScript 调用 `TurboModuleRegistry.get('RNSVGSvgViewModule')` 时才创建
- 这样可以减少内存占用，提高性能

### 3. **多 Package 支持**

不同的 Package（如 SVGPackage、RNOHCorePackage）可以提供各自的 `TurboModuleFactoryDelegate`：
- 每个 Package 负责创建自己相关的 TurboModule
- 框架统一管理所有委托，按需调用

---

## 📐 类定义

**文件**: `RNOH/TurboModuleFactory.h`

```cpp
class TurboModuleFactoryDelegate {
 public:
  using Context = ArkTSTurboModule::Context;
  using SharedTurboModule = std::shared_ptr<facebook::react::TurboModule>;

  virtual ~TurboModuleFactoryDelegate(){};
  
  // 核心方法：根据名称创建 TurboModule
  virtual SharedTurboModule createTurboModule(
      Context ctx,           // TurboModule 的上下文（包含 JSI Runtime、Invoker 等）
      const std::string& name) const = 0;  // 模块名称，如 "RNSVGSvgViewModule"
};
```

**关键点**:
- 这是一个**抽象基类**（纯虚函数）
- 子类必须实现 `createTurboModule()` 方法
- 返回的是 `SharedTurboModule`（共享指针）

---

## 🔧 实现示例：SvgTurboModuleFactoryDelegate

**文件**: `SVGPackage.cpp`

```cpp
// 实现 TurboModuleFactoryDelegate 接口
class SvgTurboModuleFactoryDelegate : public TurboModuleFactoryDelegate {
public:
    SharedTurboModule createTurboModule(Context ctx, const std::string &name) const override {
        // 根据名称创建对应的 TurboModule
        if (name == "RNSVGSvgViewModule") {
            return std::make_shared<RNSVGSvgViewModule>(ctx, name);
        }
        if (name == "RNSVGRenderableModule") {
            return std::make_shared<RNSVGRenderableModule>(ctx, name);
        }
        if (name == "RNSVGImageModule") {
            return std::make_shared<RNSVGImageModule>(ctx, name);
        }
        // 如果名称不匹配，返回 nullptr（表示这个委托不负责创建该模块）
        return nullptr;
    };
};

// Package 提供工厂代理的方法
std::unique_ptr<TurboModuleFactoryDelegate> SVGPackage::createTurboModuleFactoryDelegate() {
    return std::make_unique<SvgTurboModuleFactoryDelegate>();
}
```

**工作流程**:
1. SVGPackage 实现 `createTurboModuleFactoryDelegate()` 方法
2. 返回一个 `SvgTurboModuleFactoryDelegate` 实例
3. 这个实例知道如何创建 SVG 相关的 TurboModule

---

## 🔄 完整工作流程

### 第一步：应用启动时注册

**文件**: `RNInstanceFactory.h`

```cpp
// 在创建 RNInstance 时
for (auto& package : packages) {
    // 1. 从每个 Package 获取 TurboModuleFactoryDelegate
    auto turboModuleFactoryDelegate = package->createTurboModuleFactoryDelegate();
    
    // 2. 如果不为空，加入委托列表
    if (turboModuleFactoryDelegate != nullptr) {
        turboModuleDelegates.push_back(std::move(turboModuleFactoryDelegate));
    }
}

// 3. 将所有委托传给 TurboModuleFactory
auto turboModuleFactory = std::make_shared<TurboModuleFactory>(
    // ... 其他参数
    turboModuleDelegates,  // 委托列表
    // ...
);
```

**结果**: 框架收集了所有 Package 提供的 `TurboModuleFactoryDelegate`

---

### 第二步：JavaScript 请求 TurboModule

**JavaScript 代码**:
```javascript
const RNSVGSvgViewModule = TurboModuleRegistry.get('RNSVGSvgViewModule');
```

**内部流程**:
1. React Native 框架拦截这个调用
2. 调用 `TurboModuleFactory::create('RNSVGSvgViewModule')`

---

### 第三步：TurboModuleFactory 查找委托

**文件**: `TurboModuleFactory.cpp` (简化版)

```cpp
SharedTurboModule TurboModuleFactory::create(
    const std::string& name) const {
    
    // 遍历所有委托，找到能创建该模块的委托
    for (auto& delegate : m_delegates) {
        // 调用委托的 createTurboModule 方法
        auto turboModule = delegate->createTurboModule(ctx, name);
        
        // 如果不返回 nullptr，说明创建成功
        if (turboModule != nullptr) {
            return turboModule;
        }
    }
    
    // 如果所有委托都返回 nullptr，说明没有找到对应的模块
    return nullptr;
}
```

**流程**:
1. 遍历所有 `TurboModuleFactoryDelegate`
2. 逐个调用 `createTurboModule(ctx, "RNSVGSvgViewModule")`
3. 如果某个委托返回非空，说明创建成功
4. 如果所有委托都返回 `nullptr`，说明该模块不存在

---

### 第四步：委托创建 TurboModule

当 `SvgTurboModuleFactoryDelegate::createTurboModule()` 被调用时：

```cpp
SharedTurboModule SvgTurboModuleFactoryDelegate::createTurboModule(
    Context ctx, 
    const std::string &name) const {
    
    if (name == "RNSVGSvgViewModule") {
        // 创建实例
        return std::make_shared<RNSVGSvgViewModule>(ctx, name);
    }
    
    return nullptr;  // 不是这个委托负责的模块
}
```

---

## 📊 架构图

```
┌─────────────────────────────────────────────────────────────┐
│  React Native 框架层                                        │
│  ───────────────────────────────────────────────────────────│
│                                                              │
│  TurboModuleFactory                                         │
│  ├─ m_delegates: [                                          │
│  │    SvgTurboModuleFactoryDelegate,                        │
│  │    RNOHCoreTurboModuleFactoryDelegate,                   │
│  │    OtherPackageTurboModuleFactoryDelegate,               │
│  │    ...                                                   │
│  │  ]                                                       │
│  │                                                          │
│  └─ create(name) {                                         │
│       遍历所有 delegate → delegate->createTurboModule()    │
│     }                                                       │
└─────────────────────────────────────────────────────────────┘
                          ▲
                          │ 被框架调用
                          │
┌─────────────────────────┴───────────────────────────────────┐
│  各个 Package 提供的委托                                      │
│  ───────────────────────────────────────────────────────────│
│                                                              │
│  SvgTurboModuleFactoryDelegate                              │
│  └─ createTurboModule(ctx, name) {                         │
│       if (name == "RNSVGSvgViewModule")                    │
│         return new RNSVGSvgViewModule(ctx, name);          │
│       return nullptr;                                       │
│     }                                                       │
│                                                              │
│  RNOHCoreTurboModuleFactoryDelegate                         │
│  └─ createTurboModule(ctx, name) {                         │
│       if (name == "AccessibilityManager")                  │
│         return new AccessibilityManagerTurboModule(...);   │
│       ...                                                   │
│     }                                                       │
└─────────────────────────────────────────────────────────────┘
                          ▲
                          │ 继承
                          │
┌─────────────────────────┴───────────────────────────────────┐
│  接口定义                                                    │
│  ───────────────────────────────────────────────────────────│
│                                                              │
│  TurboModuleFactoryDelegate (抽象基类)                      │
│  └─ virtual createTurboModule(ctx, name) = 0;             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎨 设计模式：工厂模式 + 委托模式

### 工厂模式

```
工厂（TurboModuleFactory）
  ↓ 请求创建
委托（TurboModuleFactoryDelegate）
  ↓ 实际创建
产品（TurboModule 实例）
```

### 为什么用委托而不是直接创建？

1. **解耦**: 框架不需要知道每个 TurboModule 的具体类型
2. **扩展性**: 新增 Package 只需要实现 `TurboModuleFactoryDelegate`
3. **职责分离**: 每个 Package 负责创建自己的模块
4. **懒加载**: 只在需要时才创建，节省内存

---

## 📝 Package 接口

**文件**: `RNOH/Package.h`

```cpp
class Package {
public:
    // Package 可以提供 TurboModuleFactoryDelegate（可选）
    virtual std::unique_ptr<TurboModuleFactoryDelegate>
    createTurboModuleFactoryDelegate() {
        return nullptr;  // 默认返回空（表示不提供 TurboModule）
    }
    
    // Package 还可以提供其他东西：
    // - ComponentDescriptorProviders（组件描述）
    // - ComponentJSIBinders（JSI Binder）
    // - GlobalJSIBinders（全局 JSI Binder）
    // - EventEmitRequestHandlers（事件处理器）
    // ...
};
```

**关键点**:
- 这是一个**可选方法**（默认返回 `nullptr`）
- 如果 Package 不提供 TurboModule，可以不实现或返回 `nullptr`
- 如果提供，需要返回一个 `TurboModuleFactoryDelegate` 实例

---

## 💡 实际应用场景

### 场景 1: SVG Package

```cpp
// SVGPackage.cpp
class SvgTurboModuleFactoryDelegate : public TurboModuleFactoryDelegate {
public:
    SharedTurboModule createTurboModule(Context ctx, const std::string &name) const override {
        if (name == "RNSVGSvgViewModule") {
            return std::make_shared<RNSVGSvgViewModule>(ctx, name);
        }
        if (name == "RNSVGRenderableModule") {
            return std::make_shared<RNSVGRenderableModule>(ctx, name);
        }
        return nullptr;
    };
};
```

### 场景 2: RNOH Core Package

```cpp
// RNOHCorePackage.h
class RNOHCoreTurboModuleFactoryDelegate : public TurboModuleFactoryDelegate {
public:
    SharedTurboModule createTurboModule(Context ctx, const std::string& name) const override {
        if (name == "AccessibilityManager") {
            return std::make_shared<AccessibilityManagerTurboModule>(ctx, name);
        } else if (name == "AlertManager") {
            return std::make_shared<AlertManagerTurboModule>(ctx, name);
        } else if (name == "AppState") {
            return std::make_shared<AppStateTurboModule>(ctx, name);
        }
        // ... 更多核心模块
        return nullptr;
    }
};
```

---

## 🔍 关键要点总结

### ✅ TurboModuleFactoryDelegate 的作用

1. **统一接口**: 提供统一的创建接口，框架不需要知道具体实现
2. **按需创建**: 只在 JavaScript 请求时才创建 TurboModule
3. **职责分离**: 每个 Package 负责创建自己的模块
4. **扩展性强**: 新增模块只需要在对应的委托中添加判断

### ✅ 工作流程

1. **启动时**: 框架收集所有 Package 的 `TurboModuleFactoryDelegate`
2. **请求时**: JavaScript 调用 `TurboModuleRegistry.get(name)`
3. **查找时**: 框架遍历所有委托，找到能创建该模块的委托
4. **创建时**: 委托创建 TurboModule 实例并返回

### ✅ 设计优势

- **解耦**: 框架和具体 TurboModule 实现解耦
- **灵活**: 可以动态添加新的 Package 和模块
- **高效**: 懒加载机制，只创建需要的模块
- **清晰**: 每个 Package 的职责明确

---

## 📚 相关文件

| 文件 | 作用 |
|------|------|
| `RNOH/TurboModuleFactory.h` | 定义 `TurboModuleFactoryDelegate` 接口 |
| `RNOH/TurboModuleFactory.cpp` | 实现 `TurboModuleFactory`，管理所有委托 |
| `RNOH/Package.h` | 定义 `Package` 接口，包含 `createTurboModuleFactoryDelegate()` |
| `SVGPackage.cpp` | 实现 `SvgTurboModuleFactoryDelegate` |
| `RNInstanceFactory.h` | 收集所有 Package 的 `TurboModuleFactoryDelegate` |

---

**文档版本**: 1.0  
**最后更新**: 2024-12-19  
**适用项目**: rntpc_ios



