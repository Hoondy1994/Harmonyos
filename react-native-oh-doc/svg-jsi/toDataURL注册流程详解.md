# toDataURL 注册流程详解

本文档详细说明 `toDataURL` 函数在 C++ 和 JavaScript 中的完整注册流程。

---

## 📋 目录

1. [C++ 端注册流程](#c-端注册流程)
2. [JavaScript 端获取流程](#javascript-端获取流程)
3. [JSI 桥接机制](#jsi-桥接机制)
4. [完整调用链](#完整调用链)
5. [关键代码位置](#关键代码位置)

---

## C++ 端注册流程

### 第一步：SVGPackage 创建 TurboModuleFactoryDelegate

**文件**: `SVGPackage.cpp`

```cpp
class SvgTurboModuleFactoryDelegate : public TurboModuleFactoryDelegate {
public:
    SharedTurboModule createTurboModule(Context ctx, const std::string &name) const override {
        if (name == "RNSVGSvgViewModule") {
            return std::make_shared<RNSVGSvgViewModule>(ctx, name);
        }
        // ... 其他 TurboModule
        return nullptr;
    };
};

std::unique_ptr<TurboModuleFactoryDelegate> SVGPackage::createTurboModuleFactoryDelegate() {
    return std::make_unique<SvgTurboModuleFactoryDelegate>();
}
```

**作用**: 
- 当 React Native 框架需要创建名为 `"RNSVGSvgViewModule"` 的 TurboModule 时
- 调用 `createTurboModule("RNSVGSvgViewModule")`
- 返回 `RNSVGSvgViewModule` 实例

**调用时机**: React Native 初始化时，框架会遍历所有 Package，收集 TurboModuleFactoryDelegate

---

### 第二步：RNSVGSvgViewModule 构造函数注册方法

**文件**: `RNSVGSvgViewModule.cpp`

```cpp
RNSVGSvgViewModule::RNSVGSvgViewModule(const ArkTSTurboModule::Context ctx, const std::string name)
    : ArkTSTurboModule(ctx, name) {
    // 将方法名 "toDataURL" 映射到桥接函数
    methodMap_["toDataURL"] = MethodMetadata{
        1,  // 注意：这里应该是 3（tag, options, callback），但代码中写的是 1
        __hostFunction_RNSVGSvgViewModule_toDataURL  // 桥接函数指针
    };
}
```

**作用**:
- 在 `methodMap_`（继承自 `ArkTSTurboModule`）中注册方法
- 键名: `"toDataURL"`（JavaScript 中调用时的方法名）
- 值: `MethodMetadata{参数个数, 桥接函数指针}`

**methodMap_ 结构**:
```cpp
// 在 ArkTSTurboModule 基类中定义
std::unordered_map<std::string, MethodMetadata> methodMap_;

struct MethodMetadata {
    size_t argCount;           // 参数个数
    MethodInvoker invoker;      // 桥接函数指针（函数指针类型）
};
```

---

### 第三步：桥接函数定义

**文件**: `RNSVGSvgViewModule.cpp`

```cpp
// 桥接函数：连接 JavaScript 调用和 C++ 函数
static jsi::Value __hostFunction_RNSVGSvgViewModule_toDataURL(
    jsi::Runtime &rt,                    // JSI Runtime 引用
    react::TurboModule &turboModule,     // TurboModule 引用
    const jsi::Value *args,              // JavaScript 传递的参数数组
    size_t count) {                      // 参数个数
    
    // 1. 解析参数（从 JSI 类型转换为 C++ 类型）
    auto tag = args[0].asNumber();  // number -> int32_t
    auto options = args[1].asObject(rt);  // object -> jsi::Object
    auto callback = args[2].getObject(rt).getFunction(rt);  // function -> jsi::Function
    
    // 2. 调用实际的 C++ 函数
    static_cast<RNSVGSvgViewModule *>(&turboModule)
        ->toDataURL(rt, tag, options, callback);
    
    // 3. 返回 undefined（因为是异步函数）
    return jsi::Value::undefined();
}
```

**作用**: 
- 将 JavaScript 的调用转换为 C++ 函数调用
- 处理参数类型转换（JSI 类型 → C++ 类型）
- 调用实际的 C++ 实现函数

---

### 第四步：C++ 函数实现

**文件**: `RNSVGSvgViewModule.cpp`

```cpp
void RNSVGSvgViewModule::toDataURL(
    jsi::Runtime &rt, 
    Int32_t tag, 
    Object object, 
    Callback &&callback) {
    
    // 实际的业务逻辑
    // 1. 获取 SVG 节点
    // 2. 创建 Bitmap
    // 3. 绘制 SVG 到 Bitmap
    // 4. 转换为 Base64
    // 5. 通过回调返回结果
}
```

---

## JavaScript 端获取流程

### 第一步：TurboModuleRegistry.get()

**JavaScript 代码**:
```javascript
import { TurboModuleRegistry } from 'react-native';

const RNSVGSvgViewModule = TurboModuleRegistry.get('RNSVGSvgViewModule');
```

**内部流程**:
1. `TurboModuleRegistry.get()` 查找名为 `"RNSVGSvgViewModule"` 的 TurboModule
2. React Native 框架通过 JSI 调用 C++ 端的 TurboModule 工厂
3. 工厂调用 `SvgTurboModuleFactoryDelegate::createTurboModule("RNSVGSvgViewModule")`
4. 返回 `RNSVGSvgViewModule` 实例
5. 框架将实例包装为 JavaScript 对象并返回

---

### 第二步：JavaScript 调用方法

**JavaScript 代码**:
```javascript
RNSVGSvgViewModule.toDataURL(
    1,                    // tag: number
    { width: 100 },       // options: object
    (base64) => {         // callback: function
        console.log(base64);
    }
);
```

**内部流程**:
1. JavaScript 调用 `toDataURL` 方法
2. JSI Runtime 拦截调用
3. 查找 `RNSVGSvgViewModule` 实例的 `methodMap_`
4. 找到 `methodMap_["toDataURL"]` → `MethodMetadata{1, __hostFunction_RNSVGSvgViewModule_toDataURL}`
5. 调用桥接函数 `__hostFunction_RNSVGSvgViewModule_toDataURL`

---

## JSI 桥接机制

### JSI (JavaScript Interface) 的作用

JSI 是 React Native 提供的一种机制，允许 JavaScript 和 C++ 之间**直接同步调用**，无需异步桥接。

### methodMap_ 的工作原理

```cpp
// 在 ArkTSTurboModule 基类中（简化版）
class ArkTSTurboModule : public TurboModule {
protected:
    std::unordered_map<std::string, MethodMetadata> methodMap_;
    
public:
    // 当 JavaScript 调用方法时，JSI Runtime 会调用这个函数
    jsi::Value get(jsi::Runtime &rt, const jsi::PropNameID &name) override {
        std::string methodName = name.utf8(rt);
        
        // 在 methodMap_ 中查找方法
        auto it = methodMap_.find(methodName);
        if (it != methodMap_.end()) {
            // 返回一个 JSI 函数，当被调用时会执行桥接函数
            return jsi::Function::createFromHostFunction(
                rt,
                name,
                it->second.argCount,  // 参数个数
                [this, invoker = it->second.invoker](
                    jsi::Runtime &rt,
                    const jsi::Value &thisVal,
                    const jsi::Value *args,
                    size_t count) {
                    // 调用注册的桥接函数
                    return invoker(rt, *this, args, count);
                }
            );
        }
        return jsi::Value::undefined();
    }
};
```

**流程**:
1. JavaScript 访问 `module.toDataURL`
2. JSI Runtime 调用 `get(rt, "toDataURL")`
3. 在 `methodMap_` 中查找 `"toDataURL"`
4. 找到后，返回一个 JSI 函数对象
5. JavaScript 调用这个函数时，执行桥接函数

---

## 完整调用链

```
┌─────────────────────────────────────────────────────────────┐
│  1. 应用启动阶段                                              │
│  ───────────────────────────────────────────────────────────│
│  RNInstanceFactory::createRNInstance()                      │
│    ↓                                                          │
│  收集所有 Package                                             │
│    ↓                                                          │
│  SVGPackage::createTurboModuleFactoryDelegate()             │
│    返回 SvgTurboModuleFactoryDelegate                        │
│    ↓                                                          │
│  框架注册 TurboModuleFactoryDelegate                        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  2. JavaScript 获取 TurboModule                              │
│  ───────────────────────────────────────────────────────────│
│  const module = TurboModuleRegistry.get('RNSVGSvgViewModule')│
│    ↓                                                          │
│  框架查找 TurboModule                                        │
│    ↓                                                          │
│  调用 SvgTurboModuleFactoryDelegate::createTurboModule()    │
│    ↓                                                          │
│  创建 RNSVGSvgViewModule 实例                               │
│    ↓                                                          │
│  构造函数执行:                                                │
│    methodMap_["toDataURL"] = MethodMetadata{...}            │
│    ↓                                                          │
│  返回实例给 JavaScript                                        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  3. JavaScript 调用方法                                       │
│  ───────────────────────────────────────────────────────────│
│  module.toDataURL(tag, options, callback)                   │
│    ↓                                                          │
│  JSI Runtime 拦截调用                                        │
│    ↓                                                          │
│  ArkTSTurboModule::get(rt, "toDataURL")                     │
│    ↓                                                          │
│  在 methodMap_ 中查找 "toDataURL"                           │
│    ↓                                                          │
│  找到: MethodMetadata{1, __hostFunction_...}                │
│    ↓                                                          │
│  返回 JSI 函数对象（包装桥接函数）                            │
│    ↓                                                          │
│  JavaScript 调用这个函数                                     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  4. 桥接函数执行                                              │
│  ───────────────────────────────────────────────────────────│
│  __hostFunction_RNSVGSvgViewModule_toDataURL()              │
│    ↓                                                          │
│  解析参数:                                                    │
│    args[0] → tag (number → int32_t)                         │
│    args[1] → options (object → jsi::Object)                 │
│    args[2] → callback (function → jsi::Function)            │
│    ↓                                                          │
│  调用 C++ 函数:                                               │
│    static_cast<RNSVGSvgViewModule*>(&turboModule)           │
│      ->toDataURL(rt, tag, options, callback)                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  5. C++ 函数执行                                              │
│  ───────────────────────────────────────────────────────────│
│  RNSVGSvgViewModule::toDataURL()                            │
│    ↓                                                          │
│  执行业务逻辑:                                                │
│    - 获取 SVG 节点                                            │
│    - 创建 Bitmap 和 Canvas                                   │
│    - 绘制 SVG                                                │
│    - 转换为 Base64                                           │
│    ↓                                                          │
│  异步回调:                                                    │
│    jsInvoker_->invokeAsync([base64, callback] {             │
│        callback(base64);  // 调用 JavaScript 回调            │
│    });                                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 关键代码位置

### C++ 端

| 文件 | 行数 | 作用 |
|------|------|------|
| `SVGPackage.cpp` | 101-114 | 定义 `SvgTurboModuleFactoryDelegate`，创建 TurboModule 实例 |
| `SVGPackage.cpp` | 117-119 | `createTurboModuleFactoryDelegate()` 返回工厂代理 |
| `RNSVGSvgViewModule.h` | 20-29 | 定义 `RNSVGSvgViewModule` 类，声明 `toDataURL` 方法 |
| `RNSVGSvgViewModule.cpp` | 174-179 | 构造函数，注册方法到 `methodMap_` |
| `RNSVGSvgViewModule.cpp` | 111-172 | 桥接函数 `__hostFunction_RNSVGSvgViewModule_toDataURL` |
| `RNSVGSvgViewModule.cpp` | 18-109 | C++ 函数实现 `toDataURL` |

### JavaScript 端

| 文件 | 行数 | 作用 |
|------|------|------|
| `example/src/svg/index.tsx` | 4 | 导入 `TurboModuleRegistry` |
| `example/src/svg/index.tsx` | 14 | 获取 TurboModule: `TurboModuleRegistry.get('RNSVGSvgViewModule')` |
| `example/src/svg/index.tsx` | 47-55 | 调用 `toDataURL` 方法 |

### 框架层（RNOH）

| 文件 | 作用 |
|------|------|
| `ArkTSTurboModule.h` | 基类，提供 `methodMap_` 和 `get()` 方法 |
| `RNInstanceFactory.h` | 收集所有 Package 的 TurboModuleFactoryDelegate |
| TurboModule 注册机制 | 框架自动处理 TurboModule 的注册和查找 |

---

## 关键数据结构

### MethodMetadata

```cpp
struct MethodMetadata {
    size_t argCount;        // 参数个数（用于验证）
    MethodInvoker invoker;  // 桥接函数指针
};

// MethodInvoker 是一个函数指针类型
using MethodInvoker = std::function<jsi::Value(
    jsi::Runtime &rt,
    react::TurboModule &turboModule,
    const jsi::Value *args,
    size_t count
)>;
```

### methodMap_ 的结构

```cpp
// 实际存储的数据
methodMap_ = {
    "toDataURL": MethodMetadata{
        argCount: 1,  // 注意：代码中写的是 1，实际应该是 3
        invoker: __hostFunction_RNSVGSvgViewModule_toDataURL  // 函数指针
    }
}
```

---

## 注意事项

### 1. 参数个数的问题

在 `RNSVGSvgViewModule.cpp` 第 177 行：
```cpp
methodMap_["toDataURL"] = MethodMetadata{1, __hostFunction_RNSVGSvgViewModule_toDataURL};
```

这里写的是 `1`，但实际 `toDataURL` 需要 3 个参数（tag, options, callback）。这个参数个数主要用于验证，实际解析是在桥接函数中处理的。

### 2. 异步回调机制

`toDataURL` 是异步函数：
- 立即返回 `undefined` 给 JavaScript
- 实际工作完成后，通过 `jsInvoker_->invokeAsync()` 异步执行回调
- 回调函数会将 base64 字符串传递给 JavaScript

### 3. JSI 直接调用

与传统 Bridge 不同，JSI 调用是**同步的**：
- JavaScript → C++: 同步调用（但函数内部可能异步执行）
- C++ → JavaScript: 通过 `jsInvoker_->invokeAsync()` 异步回调

---

## 总结

### 注册流程（3 步）

1. **Package 注册工厂代理** (`SVGPackage::createTurboModuleFactoryDelegate`)
   - 返回 `SvgTurboModuleFactoryDelegate`
   - 告诉框架如何创建 `RNSVGSvgViewModule`

2. **TurboModule 注册方法** (`RNSVGSvgViewModule` 构造函数)
   - 在 `methodMap_` 中注册 `"toDataURL"` → 桥接函数指针

3. **桥接函数定义** (`__hostFunction_RNSVGSvgViewModule_toDataURL`)
   - 处理参数转换
   - 调用实际 C++ 函数

### 调用流程（5 步）

1. JavaScript: `TurboModuleRegistry.get('RNSVGSvgViewModule')`
2. 框架: 通过工厂创建 TurboModule 实例
3. JavaScript: `module.toDataURL(...)`
4. JSI: 查找 `methodMap_["toDataURL"]` → 调用桥接函数
5. C++: 执行实际逻辑 → 异步回调返回结果

---

**文档版本**: 1.0  
**最后更新**: 2024-12-19  
**适用项目**: rntpc_ios



