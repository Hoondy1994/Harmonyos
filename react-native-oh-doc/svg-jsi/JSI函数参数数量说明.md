# JSI 函数参数数量说明

## ❌ 误解澄清

**错误理解**: JSI 函数必须传 3 个参数

**正确理解**: JSI 函数可以有**任意数量的参数**（0个、1个、2个、3个、4个...）

---

## 📊 当前项目中的示例

### 示例 1: `toDataURL` - 3 个参数

```cpp
// C++ 函数签名
void toDataURL(jsi::Runtime &rt, Int32_t tag, Object object, Callback &&callback);

// JavaScript 调用
RNSVGSvgViewModule.toDataURL(tag, options, callback);
//                            ↑     ↑        ↑
//                          3个参数
```

**注册**:
```cpp
methodMap_["toDataURL"] = MethodMetadata{3, __hostFunction_...};
//                                        ↑
//                                   参数个数：3
```

---

### 示例 2: `getSVGSize` - 2 个参数

```cpp
// C++ 函数签名
jsi::Object getSVGSize(jsi::Runtime &rt, Int32_t tag, Object options);

// JavaScript 调用
RNSVGSvgViewModule.getSVGSize(tag, options);
//                            ↑     ↑
//                          2个参数
```

**注册**:
```cpp
methodMap_["getSVGSize"] = MethodMetadata{2, __hostFunction_...};
//                                         ↑
//                                    参数个数：2
```

---

## 🎯 参数数量规则

### 规则 1: 参数数量由函数设计决定

```cpp
// 0 个参数
void noParams() { ... }
// JavaScript: module.noParams()

// 1 个参数
void oneParam(int32_t value) { ... }
// JavaScript: module.oneParam(42)

// 2 个参数
void twoParams(int32_t a, int32_t b) { ... }
// JavaScript: module.twoParams(1, 2)

// 3 个参数
void threeParams(int32_t a, int32_t b, int32_t c) { ... }
// JavaScript: module.threeParams(1, 2, 3)

// 4 个参数
void fourParams(int32_t a, int32_t b, int32_t c, int32_t d) { ... }
// JavaScript: module.fourParams(1, 2, 3, 4)
```

---

### 规则 2: 注册时指定参数个数

```cpp
// 注册 0 个参数的方法
methodMap_["noParams"] = MethodMetadata{0, __hostFunction_...};

// 注册 1 个参数的方法
methodMap_["oneParam"] = MethodMetadata{1, __hostFunction_...};

// 注册 2 个参数的方法
methodMap_["twoParams"] = MethodMetadata{2, __hostFunction_...};

// 注册 3 个参数的方法
methodMap_["threeParams"] = MethodMetadata{3, __hostFunction_...};
```

**注意**: `MethodMetadata` 中的数字是**JavaScript 传递的参数个数**，不包括 `rt` 和 `turboModule`（这两个是框架自动传递的）

---

## 📝 完整示例对比

### 0 个参数示例

```cpp
// C++ 函数
void getVersion() {
    return "1.0.0";
}

// JavaScript 调用
const version = module.getVersion();  // 0 个参数

// 注册
methodMap_["getVersion"] = MethodMetadata{0, __hostFunction_...};
```

---

### 1 个参数示例

```cpp
// C++ 函数
void setValue(int32_t value) {
    // ...
}

// JavaScript 调用
module.setValue(42);  // 1 个参数

// 注册
methodMap_["setValue"] = MethodMetadata{1, __hostFunction_...};
```

---

### 2 个参数示例（getSVGSize）

```cpp
// C++ 函数
jsi::Object getSVGSize(jsi::Runtime &rt, Int32_t tag, Object options);

// JavaScript 调用
const result = module.getSVGSize(tag, options);  // 2 个参数

// 注册
methodMap_["getSVGSize"] = MethodMetadata{2, __hostFunction_...};
```

---

### 3 个参数示例（toDataURL）

```cpp
// C++ 函数
void toDataURL(jsi::Runtime &rt, Int32_t tag, Object object, Callback &&callback);

// JavaScript 调用
module.toDataURL(tag, options, callback);  // 3 个参数

// 注册
methodMap_["toDataURL"] = MethodMetadata{3, __hostFunction_...};
```

---

### 4 个参数示例

```cpp
// C++ 函数
void processData(int32_t a, int32_t b, int32_t c, int32_t d) {
    // ...
}

// JavaScript 调用
module.processData(1, 2, 3, 4);  // 4 个参数

// 注册
methodMap_["processData"] = MethodMetadata{4, __hostFunction_...};
```

---

## 🔍 桥接函数中的参数解析

### 0 个参数

```cpp
static jsi::Value __hostFunction_MyModule_getVersion(
    jsi::Runtime &rt,
    react::TurboModule &turboModule,
    const jsi::Value *args,
    size_t count) {
    
    // count == 0
    // 不需要解析 args
    
    return jsi::String::createFromUtf8(rt, "1.0.0");
}
```

---

### 1 个参数

```cpp
static jsi::Value __hostFunction_MyModule_setValue(
    jsi::Runtime &rt,
    react::TurboModule &turboModule,
    const jsi::Value *args,
    size_t count) {
    
    // count == 1
    // 解析 args[0]
    int32_t value = args[0].asNumber();
    
    // 调用 C++ 函数
    static_cast<MyModule *>(&turboModule)->setValue(value);
    
    return jsi::Value::undefined();
}
```

---

### 2 个参数

```cpp
static jsi::Value __hostFunction_MyModule_add(
    jsi::Runtime &rt,
    react::TurboModule &turboModule,
    const jsi::Value *args,
    size_t count) {
    
    // count == 2
    // 解析 args[0] 和 args[1]
    int32_t a = args[0].asNumber();
    int32_t b = args[1].asNumber();
    
    // 调用 C++ 函数
    int32_t result = static_cast<MyModule *>(&turboModule)->add(a, b);
    
    return jsi::Value(result);
}
```

---

### 3 个参数（toDataURL）

```cpp
static jsi::Value __hostFunction_RNSVGSvgViewModule_toDataURL(
    jsi::Runtime &rt,
    react::TurboModule &turboModule,
    const jsi::Value *args,
    size_t count) {
    
    // count == 3
    // 解析 args[0], args[1], args[2]
    auto tag = args[0].asNumber();
    auto options = args[1].getObject(rt);
    auto callback = args[2].getObject(rt).getFunction(rt);
    
    // 调用 C++ 函数
    static_cast<RNSVGSvgViewModule *>(&turboModule)
        ->toDataURL(rt, tag, options, callback);
    
    return jsi::Value::undefined();
}
```

---

## 📊 参数数量对照表

| JavaScript 调用 | 参数个数 | MethodMetadata | 桥接函数中的 count |
|----------------|----------|----------------|-------------------|
| `module.getVersion()` | 0 | `MethodMetadata{0, ...}` | `count == 0` |
| `module.setValue(42)` | 1 | `MethodMetadata{1, ...}` | `count == 1` |
| `module.getSVGSize(tag, options)` | 2 | `MethodMetadata{2, ...}` | `count == 2` |
| `module.toDataURL(tag, options, callback)` | 3 | `MethodMetadata{3, ...}` | `count == 3` |
| `module.processData(a, b, c, d)` | 4 | `MethodMetadata{4, ...}` | `count == 4` |

---

## 🎯 关键点总结

### ✅ JSI 函数参数数量

1. **可以是任意数量**: 0个、1个、2个、3个、4个...都可以
2. **由函数设计决定**: 根据实际需求设计参数
3. **注册时指定**: 在 `MethodMetadata` 中指定参数个数

### ✅ 当前项目中的示例

- **`toDataURL`**: 3 个参数（tag, options, callback）
- **`getSVGSize`**: 2 个参数（tag, options）

### ✅ 参数个数的作用

- **验证**: 检查 JavaScript 传递的参数个数是否正确
- **安全**: 避免访问 `args[count]` 越界
- **文档**: 明确函数需要多少个参数

---

## 💡 设计建议

### 参数数量选择

1. **0 个参数**: 获取常量、版本号等
   ```typescript
   const version = module.getVersion();
   ```

2. **1 个参数**: 简单的操作
   ```typescript
   module.setValue(42);
   ```

3. **2 个参数**: 常见的配置模式
   ```typescript
   const result = module.getSVGSize(tag, options);
   ```

4. **3 个参数**: 带回调的异步操作
   ```typescript
   module.toDataURL(tag, options, callback);
   ```

5. **多个参数**: 复杂操作（建议使用对象参数）
   ```typescript
   // 不推荐：太多参数
   module.process(a, b, c, d, e, f);
   
   // 推荐：使用对象
   module.process({ a, b, c, d, e, f });
   ```

---

**文档版本**: 1.0  
**最后更新**: 2024-12-19  
**适用项目**: rntpc_ios

