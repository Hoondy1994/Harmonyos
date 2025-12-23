# __hostFunction 桥接函数详解

## 📖 什么是 __hostFunction？

`__hostFunction_RNSVGSvgViewModule_toDataURL` 是一个 **JSI 桥接函数**，它的作用是：

**将 JavaScript 的调用转换为 C++ 函数调用**

简单来说，它是 JavaScript 和 C++ 之间的"翻译官"：
- JavaScript 说："我要调用 toDataURL(1, {}, callback)"
- 桥接函数说："好的，我来翻译并调用 C++ 的 toDataURL() 函数"

---

## 🎯 核心作用

### 1. **类型转换**

将 JavaScript 的类型转换为 C++ 类型：
- JavaScript `number` → C++ `int32_t` / `double`
- JavaScript `object` → C++ `jsi::Object`
- JavaScript `function` → C++ `jsi::Function`

### 2. **参数解析**

从 JSI 的参数数组中提取并验证参数：
- `args[0]` → tag (number)
- `args[1]` → options (object)
- `args[2]` → callback (function)

### 3. **调用转发**

将解析后的参数传递给实际的 C++ 函数：
```cpp
static_cast<RNSVGSvgViewModule *>(&turboModule)
    ->toDataURL(rt, tag, options, callback);
```

---

## 📐 函数签名

```cpp
static jsi::Value __hostFunction_RNSVGSvgViewModule_toDataURL(
    jsi::Runtime &rt,                    // JSI Runtime 引用（JavaScript 引擎）
    react::TurboModule &turboModule,     // TurboModule 实例引用
    const jsi::Value *args,              // JavaScript 传递的参数数组
    size_t count)                        // 参数个数
```

**参数说明**:
- `rt`: JSI Runtime，用于创建 JSI 对象、字符串等
- `turboModule`: TurboModule 实例，需要转换为具体的 `RNSVGSvgViewModule` 类型
- `args`: 参数数组，包含 JavaScript 传递的所有参数
- `count`: 参数个数

**返回值**: `jsi::Value`，通常是 `undefined`（因为异步函数）

---

## 🔍 完整实现解析

```cpp
static jsi::Value __hostFunction_RNSVGSvgViewModule_toDataURL(
    jsi::Runtime &rt, 
    react::TurboModule &turboModule,
    const jsi::Value *args, 
    size_t count) {
    
    // ========== 第一步：解析参数 ==========
    
    // 解析 args[0] (tag: number)
    auto tag = args[0].isNull() || args[0].isUndefined() 
        ? std::nullopt 
        : std::make_optional(args[0].asNumber());
    
    // 解析 args[1] (options: object)
    auto options = args[1].isNull() || args[1].isUndefined() 
        ? std::nullopt 
        : std::make_optional(args[1].getObject(rt));
    
    // ========== 第二步：处理回调函数 ==========
    
    if (args[2].isObject()) {
        // 将 JavaScript 函数转换为 C++ jsi::Function
        auto callback = std::make_shared<jsi::Function>(
            std::move(args[2].getObject(rt).getFunction(rt))
        );
        
        // 创建 C++ 回调包装器
        // 这个包装器会在 C++ 函数完成后调用 JavaScript 回调
        auto endCallback = [&rt, callback = std::move(callback)](std::string base64) {
            // 将 C++ std::string 转换为 JSI String
            auto base64Value = jsi::String::createFromUtf8(rt, base64);
            // 调用 JavaScript 回调函数
            callback->call(rt, {std::move(base64Value)});
        };
        
        // ========== 第三步：调用 C++ 函数 ==========
        
        // 将 TurboModule 转换为具体的 RNSVGSvgViewModule 类型
        static_cast<RNSVGSvgViewModule *>(&turboModule)
            ->toDataURL(rt, tag, std::move(options), std::move(endCallback));
        
        // 返回 undefined（因为是异步函数）
        return jsi::Value::undefined();
    }
    
    // 如果没有回调，使用空回调
    static_cast<RNSVGSvgViewModule *>(&turboModule)
        ->toDataURL(rt, tag, std::move(options), [](std::string base64) {});
    
    return jsi::Value::undefined();
}
```

---

## 🔄 完整调用流程

```
┌─────────────────────────────────────────────────────────────┐
│  JavaScript 层                                               │
│  ───────────────────────────────────────────────────────────│
│  RNSVGSvgViewModule.toDataURL(1, {}, (base64) => {...})    │
└───────────────────────┬─────────────────────────────────────┘
                        │ JSI 调用
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  JSI Runtime                                                │
│  ───────────────────────────────────────────────────────────│
│  1. 查找 methodMap_["toDataURL"]                           │
│  2. 找到: MethodMetadata{1, __hostFunction_...}            │
│  3. 调用桥接函数                                            │
└───────────────────────┬─────────────────────────────────────┘
                        │ 调用桥接函数
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  桥接函数                                                   │
│  __hostFunction_RNSVGSvgViewModule_toDataURL()            │
│  ───────────────────────────────────────────────────────────│
│  1. 解析 args[0] → tag (number → int32_t)                 │
│  2. 解析 args[1] → options (object → jsi::Object)          │
│  3. 解析 args[2] → callback (function → jsi::Function)     │
│  4. 创建 C++ 回调包装器                                     │
│  5. 调用 C++ 函数                                           │
└───────────────────────┬─────────────────────────────────────┘
                        │ 调用 C++ 函数
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  C++ 函数                                                   │
│  RNSVGSvgViewModule::toDataURL()                           │
│  ───────────────────────────────────────────────────────────│
│  1. 获取 SVG 节点                                            │
│  2. 创建 Bitmap 和 Canvas                                   │
│  3. 绘制 SVG                                                │
│  4. 转换为 Base64                                           │
│  5. 调用 endCallback(base64)                               │
└───────────────────────┬─────────────────────────────────────┘
                        │ 回调包装器执行
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  回调包装器                                                 │
│  endCallback(std::string base64)                           │
│  ───────────────────────────────────────────────────────────│
│  1. 将 base64 (std::string) 转换为 JSI String              │
│  2. 调用 JavaScript 回调: callback.call(rt, [base64Value]) │
└───────────────────────┬─────────────────────────────────────┘
                        │ 调用 JavaScript 回调
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  JavaScript 回调                                             │
│  (base64) => { console.log(base64); }                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔑 关键点解析

### 1. 为什么需要桥接函数？

**直接原因**: JavaScript 和 C++ 的类型系统不同

- JavaScript 是动态类型，C++ 是静态类型
- JavaScript 的参数是 `jsi::Value` 数组，需要转换为具体类型
- JavaScript 的回调是 `jsi::Function`，需要包装成 C++ 回调

**设计原因**: 解耦和类型安全

- 桥接函数负责类型转换和验证
- C++ 函数可以专注于业务逻辑
- 如果参数类型错误，桥接函数可以提前发现

---

### 2. 参数解析详解

#### 解析 tag (number)

```cpp
auto tag = args[0].isNull() || args[0].isUndefined() 
    ? std::nullopt 
    : std::make_optional(args[0].asNumber());
```

**步骤**:
1. 检查是否为 `null` 或 `undefined`
2. 如果是，返回 `std::nullopt`（可选类型为空）
3. 如果不是，调用 `asNumber()` 转换为数字，包装为 `std::optional`

#### 解析 options (object)

```cpp
auto options = args[1].isNull() || args[1].isUndefined() 
    ? std::nullopt 
    : std::make_optional(args[1].getObject(rt));
```

**步骤**:
1. 检查是否为 `null` 或 `undefined`
2. 如果是，返回 `std::nullopt`
3. 如果不是，调用 `getObject(rt)` 转换为 `jsi::Object`

#### 解析 callback (function)

```cpp
if (args[2].isObject()) {
    auto callback = std::make_shared<jsi::Function>(
        std::move(args[2].getObject(rt).getFunction(rt))
    );
}
```

**步骤**:
1. 检查是否为对象（JavaScript 中函数也是对象）
2. 调用 `getObject(rt)` 获取对象
3. 调用 `getFunction(rt)` 获取函数
4. 用 `std::make_shared` 创建共享指针（延长生命周期）

---

### 3. 回调包装器的作用

```cpp
auto endCallback = [&rt, callback = std::move(callback)](std::string base64) {
    // 将 C++ std::string 转换为 JSI String
    auto base64Value = jsi::String::createFromUtf8(rt, base64);
    // 调用 JavaScript 回调函数
    callback->call(rt, {std::move(base64Value)});
};
```

**作用**:
1. **类型转换**: `std::string` → `jsi::String`
2. **调用 JavaScript**: 通过 `callback->call()` 调用 JavaScript 回调
3. **生命周期管理**: 使用 `std::shared_ptr` 确保回调函数在需要时仍然存在

**为什么需要包装器？**
- C++ 函数返回的是 `std::string`
- JavaScript 回调期望的是 JavaScript 字符串
- 包装器负责这个转换

---

### 4. 类型转换

#### JavaScript → C++

| JavaScript 类型 | JSI 类型 | C++ 类型 | 转换方法 |
|-----------------|----------|----------|----------|
| `number` | `jsi::Value` | `int32_t` / `double` | `args[0].asNumber()` |
| `string` | `jsi::Value` | `std::string` | `args[0].asString(rt).utf8(rt)` |
| `object` | `jsi::Value` | `jsi::Object` | `args[0].getObject(rt)` |
| `function` | `jsi::Value` | `jsi::Function` | `args[0].getObject(rt).getFunction(rt)` |
| `array` | `jsi::Value` | `jsi::Array` | `args[0].asArray(rt)` |
| `null` / `undefined` | `jsi::Value` | `std::nullopt` | `args[0].isNull()` |

#### C++ → JavaScript

| C++ 类型 | JSI 类型 | JavaScript 类型 | 转换方法 |
|----------|----------|-----------------|----------|
| `int32_t` | `jsi::Value` | `number` | `jsi::Value(42)` |
| `std::string` | `jsi::String` | `string` | `jsi::String::createFromUtf8(rt, "hello")` |
| `jsi::Object` | `jsi::Object` | `object` | `jsi::Object(rt)` |
| `jsi::Function` | `jsi::Function` | `function` | `callback->call(rt, {...})` |

---

## 📝 命名规则

### `__hostFunction_` 前缀

- `__` 双下划线：表示这是内部实现细节
- `hostFunction`：表示这是"主机函数"（C++ 端提供的函数）
- `RNSVGSvgViewModule`：TurboModule 名称
- `toDataURL`：方法名称

### 完整命名格式

```
__hostFunction_<TurboModuleName>_<MethodName>
```

**示例**:
- `__hostFunction_RNSVGSvgViewModule_toDataURL`
- `__hostFunction_AccessibilityManager_isAccessibilityEnabled`
- `__hostFunction_AlertManager_alert`

---

## 🔗 与 methodMap_ 的关系

### 注册桥接函数

```cpp
RNSVGSvgViewModule::RNSVGSvgViewModule(...) {
    // 将方法名映射到桥接函数
    methodMap_["toDataURL"] = MethodMetadata{
        1,  // 参数个数（注意：实际是 3，这里可能是错误的）
        __hostFunction_RNSVGSvgViewModule_toDataURL  // 桥接函数指针
    };
}
```

### 调用流程

1. JavaScript 调用 `module.toDataURL(...)`
2. JSI Runtime 查找 `methodMap_["toDataURL"]`
3. 找到 `MethodMetadata{1, __hostFunction_RNSVGSvgViewModule_toDataURL}`
4. 调用桥接函数 `__hostFunction_RNSVGSvgViewModule_toDataURL`
5. 桥接函数解析参数并调用 C++ 函数

---

## 💡 实际应用场景

### 场景 1: 同步函数

```cpp
static jsi::Value __hostFunction_MyModule_getValue(
    jsi::Runtime &rt,
    react::TurboModule &turboModule,
    const jsi::Value *args,
    size_t count) {
    
    // 解析参数
    int32_t value = args[0].asNumber();
    
    // 调用 C++ 函数
    auto result = static_cast<MyModule *>(&turboModule)
        ->getValue(value);
    
    // 返回结果
    return jsi::Value(result);
}
```

### 场景 2: 异步函数（带回调）

```cpp
static jsi::Value __hostFunction_MyModule_asyncOperation(
    jsi::Runtime &rt,
    react::TurboModule &turboModule,
    const jsi::Value *args,
    size_t count) {
    
    // 解析回调
    auto callback = std::make_shared<jsi::Function>(
        std::move(args[0].getObject(rt).getFunction(rt))
    );
    
    // 创建 C++ 回调包装器
    auto endCallback = [&rt, callback](std::string result) {
        auto jsResult = jsi::String::createFromUtf8(rt, result);
        callback->call(rt, {std::move(jsResult)});
    };
    
    // 调用 C++ 函数
    static_cast<MyModule *>(&turboModule)
        ->asyncOperation(std::move(endCallback));
    
    // 返回 undefined（异步函数）
    return jsi::Value::undefined();
}
```

---

## ⚠️ 注意事项

### 1. 参数验证

桥接函数应该验证参数：
- 检查参数个数是否正确
- 检查参数类型是否正确
- 处理 `null` / `undefined` 的情况

### 2. 异常处理

```cpp
try {
    auto tag = args[0].asNumber();
} catch (const std::exception &e) {
    // 处理异常
    return jsi::Value::undefined();
}
```

### 3. 生命周期管理

- JavaScript 回调函数需要用 `std::shared_ptr` 管理
- 确保回调在异步操作完成时仍然有效

### 4. 线程安全

- JSI Runtime 可能在不同线程
- 确保回调在正确的线程执行

---

## 📚 相关文件

| 文件 | 作用 |
|------|------|
| `RNSVGSvgViewModule.cpp` | 定义桥接函数和 C++ 函数 |
| `ArkTSTurboModule.h` | 定义 `methodMap_` 和 `get()` 方法 |
| JSI Runtime | 提供类型转换和函数调用能力 |

---

## 🎯 总结

### ✅ 桥接函数的作用

1. **类型转换**: JavaScript 类型 → C++ 类型
2. **参数解析**: 从 JSI 参数数组中提取参数
3. **调用转发**: 调用实际的 C++ 函数
4. **回调包装**: 将 C++ 回调转换为 JavaScript 回调

### ✅ 工作流程

1. JavaScript 调用方法
2. JSI Runtime 查找 `methodMap_`
3. 调用桥接函数
4. 桥接函数解析参数
5. 调用 C++ 函数
6. C++ 函数执行并回调
7. 回调包装器调用 JavaScript 回调

### ✅ 设计优势

- **解耦**: JavaScript 和 C++ 实现解耦
- **类型安全**: 在桥接层进行类型检查和转换
- **灵活性**: 可以处理各种参数类型和回调模式
- **可维护性**: 桥接逻辑集中管理

---

**文档版本**: 1.0  
**最后更新**: 2024-12-19  
**适用项目**: rntpc_ios



