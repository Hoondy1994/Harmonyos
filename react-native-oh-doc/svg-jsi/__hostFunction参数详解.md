# __hostFunction 参数详解

## 📖 函数签名

```cpp
static jsi::Value __hostFunction_RNSVGSvgViewModule_toDataURL(
    jsi::Runtime &rt,                    // 参数 1
    react::TurboModule &turboModule,     // 参数 2
    const jsi::Value *args,              // 参数 3
    size_t count)                        // 参数 4
```

---

## 🔍 参数 1: `jsi::Runtime &rt`

### 类型
- `jsi::Runtime &` - JSI Runtime 的引用

### 作用
**JSI Runtime 是 JavaScript 引擎的接口**，提供以下能力：

1. **创建 JSI 对象**
   ```cpp
   jsi::Object obj(rt);  // 创建 JavaScript 对象
   jsi::String str = jsi::String::createFromUtf8(rt, "hello");  // 创建字符串
   ```

2. **访问 JavaScript 对象属性**
   ```cpp
   auto value = obj.getProperty(rt, "key");  // 获取属性
   obj.setProperty(rt, "key", jsi::Value(42));  // 设置属性
   ```

3. **调用 JavaScript 函数**
   ```cpp
   callback->call(rt, {jsi::Value(42)});  // 调用函数
   ```

4. **类型转换**
   ```cpp
   std::string str = jsValue.asString(rt).utf8(rt);  // 转换为 C++ 字符串
   ```

### 为什么需要引用（&）？

1. **性能**: 避免复制整个 Runtime 对象（可能很大）
2. **效率**: 引用传递比值传递更快
3. **必要性**: Runtime 对象不应该被复制，应该共享同一个实例

### 为什么必须传递？

- **所有 JSI 操作都需要 Runtime**: 创建对象、调用函数、类型转换都需要它
- **Runtime 是 JavaScript 引擎的句柄**: 没有它就无法与 JavaScript 交互
- **每个 JavaScript 调用都有对应的 Runtime**: 框架会自动传递

---

## 🔍 参数 2: `react::TurboModule &turboModule`

### 类型
- `react::TurboModule &` - TurboModule 基类的引用

### 作用
**TurboModule 实例，包含模块的状态和方法**

1. **访问模块实例**
   ```cpp
   // 需要转换为具体的模块类型
   auto svgModule = static_cast<RNSVGSvgViewModule *>(&turboModule);
   ```

2. **调用模块方法**
   ```cpp
   svgModule->toDataURL(rt, tag, options, callback);
   ```

3. **访问模块状态**
   - 模块可能包含内部状态
   - 模块可能持有资源（如 `jsInvoker_`）

### 为什么是基类引用？

1. **统一接口**: 所有 TurboModule 都继承自 `react::TurboModule`
2. **多态性**: 框架不需要知道具体的模块类型
3. **类型安全**: 通过 `static_cast` 可以安全转换为具体类型

### 为什么需要引用（&）？

1. **避免复制**: TurboModule 可能包含大量状态
2. **共享实例**: 所有桥接函数应该操作同一个模块实例
3. **生命周期**: 确保模块实例在调用期间有效

### 为什么必须传递？

- **需要知道调用哪个模块**: 同一个桥接函数可能被多个模块使用（虽然这里不是）
- **访问模块方法**: 需要调用具体的 C++ 方法
- **访问模块状态**: 可能需要访问模块的内部状态

---

## 🔍 参数 3: `const jsi::Value *args`

### 类型
- `const jsi::Value *` - JSI 值的指针数组（C 风格数组）

### 作用
**包含 JavaScript 传递的所有参数**

```cpp
// JavaScript 调用:
module.toDataURL(1, {width: 100}, (base64) => {...})

// 对应到 args:
args[0] → jsi::Value (number: 1)
args[1] → jsi::Value (object: {width: 100})
args[2] → jsi::Value (function: (base64) => {...})
```

### 为什么是指针（*）？

1. **数组传递**: C++ 中数组作为参数时自动退化为指针
2. **性能**: 避免复制所有参数值
3. **灵活性**: 可以处理任意数量的参数

### 为什么是 const？

1. **只读**: 桥接函数不应该修改原始参数
2. **安全**: 防止意外修改 JavaScript 传递的值
3. **约定**: JSI 约定参数应该是只读的

### 为什么是 jsi::Value？

1. **统一类型**: JavaScript 的所有类型都可以表示为 `jsi::Value`
2. **类型擦除**: 在桥接层不关心具体类型，由桥接函数解析
3. **灵活性**: 可以处理任意 JavaScript 类型

### 为什么必须传递？

- **包含所有参数**: JavaScript 传递的所有参数都在这里
- **需要解析**: 桥接函数需要从数组中提取并转换参数
- **框架约定**: JSI 标准约定所有参数通过数组传递

---

## 🔍 参数 4: `size_t count`

### 类型
- `size_t` - 无符号整数类型，表示参数个数

### 作用
**告诉桥接函数有多少个参数**

```cpp
// JavaScript 调用:
module.toDataURL(1, {}, callback)  // count = 3

// 在桥接函数中:
if (count < 3) {
    // 参数不足，处理错误
}
```

### 为什么需要？

1. **参数验证**: 检查参数个数是否正确
2. **安全访问**: 避免访问 `args[count]` 越界
3. **灵活性**: 支持可选参数

### 为什么是 size_t？

1. **标准类型**: C++ 标准库使用 `size_t` 表示大小
2. **无符号**: 参数个数不可能是负数
3. **平台无关**: `size_t` 在不同平台有不同大小，但都是合适的

### 为什么必须传递？

- **知道参数个数**: 需要知道 `args` 数组有多少个元素
- **参数验证**: 可以检查参数个数是否符合预期
- **安全访问**: 避免数组越界

---

## 🎯 为什么需要这些参数？设计原因

### 1. **JSI 标准约定**

这是 React Native JSI 的标准函数签名，所有 `__hostFunction` 都必须遵循：

```cpp
jsi::Value hostFunction(
    jsi::Runtime &rt,              // Runtime 必须
    react::TurboModule &module,    // 模块实例必须
    const jsi::Value *args,        // 参数数组必须
    size_t count)                  // 参数个数必须
```

### 2. **框架调用约定**

当 JavaScript 调用方法时，框架会：

```cpp
// 伪代码：框架如何调用桥接函数
jsi::Value result = __hostFunction_RNSVGSvgViewModule_toDataURL(
    rt,                    // 当前 JavaScript 引擎的 Runtime
    *this,                 // TurboModule 实例（this 指针）
    args,                  // JavaScript 传递的参数数组
    argCount               // 参数个数
);
```

### 3. **解耦设计**

- **Runtime**: 桥接函数不需要知道具体的 JavaScript 引擎（Hermes/V8）
- **TurboModule**: 桥接函数不需要知道具体的模块实现
- **args**: 桥接函数不需要知道参数的具体类型和个数

---

## 📊 参数使用示例

### 完整示例

```cpp
static jsi::Value __hostFunction_RNSVGSvgViewModule_toDataURL(
    jsi::Runtime &rt,                    // 1. Runtime: 用于所有 JSI 操作
    react::TurboModule &turboModule,     // 2. TurboModule: 需要转换为具体类型
    const jsi::Value *args,              // 3. args: 参数数组
    size_t count) {                      // 4. count: 参数个数
    
    // ========== 使用 Runtime ==========
    // 创建 JSI 对象
    jsi::Object options(rt);
    
    // 转换字符串
    std::string str = args[0].asString(rt).utf8(rt);
    
    // ========== 使用 TurboModule ==========
    // 转换为具体类型
    auto svgModule = static_cast<RNSVGSvgViewModule *>(&turboModule);
    
    // 调用模块方法
    svgModule->toDataURL(rt, tag, options, callback);
    
    // ========== 使用 args ==========
    // 解析参数
    auto tag = args[0].asNumber();           // args[0]: tag
    auto options = args[1].getObject(rt);    // args[1]: options
    auto callback = args[2].getObject(rt).getFunction(rt);  // args[2]: callback
    
    // ========== 使用 count ==========
    // 验证参数个数
    if (count < 3) {
        throw jsi::JSError(rt, "toDataURL requires 3 arguments");
    }
    
    // 安全访问
    if (count > 0 && !args[0].isUndefined()) {
        // 使用 args[0]
    }
    
    return jsi::Value::undefined();
}
```

---

## 🔄 参数传递流程

```
┌─────────────────────────────────────────────────────────────┐
│  JavaScript 调用                                             │
│  module.toDataURL(1, {}, callback)                          │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  JSI Runtime (框架层)                                        │
│  ───────────────────────────────────────────────────────────│
│  1. 获取当前 Runtime (rt)                                   │
│  2. 获取 TurboModule 实例 (turboModule)                     │
│  3. 收集参数到数组 (args = [1, {}, callback])              │
│  4. 计算参数个数 (count = 3)                                │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  调用桥接函数                                                │
│  __hostFunction_RNSVGSvgViewModule_toDataURL(               │
│      rt,              ← Runtime (当前 JS 引擎)              │
│      turboModule,      ← TurboModule 实例                   │
│      args,            ← 参数数组 [1, {}, callback]          │
│      count            ← 参数个数 3                          │
│  )                                                           │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  桥接函数内部                                                │
│  ───────────────────────────────────────────────────────────│
│  1. 使用 rt 创建 JSI 对象、调用函数                         │
│  2. 使用 turboModule 调用 C++ 方法                          │
│  3. 使用 args 解析参数                                      │
│  4. 使用 count 验证参数个数                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 💡 为什么这样设计？

### 1. **统一接口**

所有 `__hostFunction` 都使用相同的签名，框架可以统一处理：

```cpp
// 框架可以统一调用所有桥接函数
for (auto& [methodName, metadata] : methodMap_) {
    auto result = metadata.invoker(rt, *this, args, count);
}
```

### 2. **类型安全**

- `jsi::Runtime &`: 确保 Runtime 有效
- `react::TurboModule &`: 确保模块实例有效
- `const jsi::Value *`: 防止修改原始参数
- `size_t count`: 确保参数个数正确

### 3. **性能优化**

- 引用传递（&）: 避免复制大对象
- 指针传递（*）: 避免复制参数数组
- const 修饰: 允许编译器优化

### 4. **灵活性**

- 可以处理任意数量的参数
- 可以处理任意类型的参数
- 可以访问模块的所有方法

---

## 📝 参数访问模式

### 模式 1: 基本参数访问

```cpp
// 假设 JavaScript 调用: method(42, "hello")
int32_t num = args[0].asNumber();              // 42
std::string str = args[1].asString(rt).utf8(rt);  // "hello"
```

### 模式 2: 可选参数

```cpp
// 假设 JavaScript 调用: method(42) 或 method(42, "hello")
int32_t num = args[0].asNumber();  // 必须
std::string str = (count > 1 && !args[1].isUndefined())
    ? args[1].asString(rt).utf8(rt)
    : "default";
```

### 模式 3: 对象参数

```cpp
// 假设 JavaScript 调用: method({width: 100, height: 200})
jsi::Object obj = args[0].getObject(rt);
double width = obj.getProperty(rt, "width").asNumber();   // 100
double height = obj.getProperty(rt, "height").asNumber(); // 200
```

### 模式 4: 回调函数

```cpp
// 假设 JavaScript 调用: method((result) => {...})
jsi::Function callback = args[0].getObject(rt).getFunction(rt);
auto callbackPtr = std::make_shared<jsi::Function>(std::move(callback));

// 稍后调用
callbackPtr->call(rt, {jsi::Value(42)});
```

---

## ⚠️ 注意事项

### 1. Runtime 生命周期

```cpp
// ❌ 错误: 在异步回调中使用引用
auto endCallback = [&rt](std::string result) {
    // rt 可能已经失效！
    jsi::String::createFromUtf8(rt, result);
};

// ✅ 正确: 使用 jsInvoker_ 或捕获 Runtime 的共享指针
jsInvoker_->invokeAsync([rt = std::weak_ptr<...>(rt), result] {
    // 安全使用
});
```

### 2. 参数边界检查

```cpp
// ❌ 错误: 不检查参数个数
auto tag = args[0].asNumber();  // 如果 count == 0，会崩溃

// ✅ 正确: 检查参数个数
if (count < 1) {
    throw jsi::JSError(rt, "Missing required argument: tag");
}
auto tag = args[0].asNumber();
```

### 3. 类型检查

```cpp
// ❌ 错误: 不检查类型
auto tag = args[0].asNumber();  // 如果 args[0] 是字符串，会崩溃

// ✅ 正确: 检查类型
if (args[0].isNumber()) {
    auto tag = args[0].asNumber();
} else {
    throw jsi::JSError(rt, "tag must be a number");
}
```

### 4. TurboModule 类型转换

```cpp
// ❌ 错误: 不检查类型
auto svgModule = static_cast<RNSVGSvgViewModule *>(&turboModule);

// ✅ 正确: 使用 dynamic_cast（如果可能）
auto svgModule = dynamic_cast<RNSVGSvgViewModule *>(&turboModule);
if (!svgModule) {
    throw jsi::JSError(rt, "Invalid TurboModule type");
}
```

---

## 🎯 总结

### ✅ 参数作用总结

| 参数 | 类型 | 作用 | 为什么需要 |
|------|------|------|------------|
| `rt` | `jsi::Runtime &` | JavaScript 引擎接口 | 所有 JSI 操作都需要 |
| `turboModule` | `react::TurboModule &` | TurboModule 实例 | 调用模块方法需要 |
| `args` | `const jsi::Value *` | 参数数组 | 包含所有 JavaScript 参数 |
| `count` | `size_t` | 参数个数 | 知道数组有多少元素 |

### ✅ 设计原因

1. **JSI 标准**: 遵循 React Native JSI 标准约定
2. **统一接口**: 所有桥接函数使用相同签名
3. **类型安全**: 通过类型系统保证安全
4. **性能优化**: 使用引用和指针避免复制
5. **灵活性**: 支持任意参数类型和个数

---

**文档版本**: 1.0  
**最后更新**: 2024-12-19  
**适用项目**: rntpc_ios



