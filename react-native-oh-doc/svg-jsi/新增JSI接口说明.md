# 新增 JSI 接口：getSVGSize

## 📋 概述

本次新增了一个 JSI 接口 `getSVGSize`，用于获取 SVG 组件的尺寸信息。这是一个**同步接口**，与 `toDataURL`（异步）不同，可以直接返回结果。

---

## 🎯 接口功能

**功能**: 获取指定 tag 的 SVG 组件的宽度和高度

**JavaScript 调用**:
```typescript
const sizeInfo = RNSVGSvgViewModule.getSVGSize(tag);
// 返回: { width: number, height: number, success: boolean, error: string | null }
```

---

## 📝 实现步骤

### 步骤 1: 在头文件中声明方法

**文件**: `RNSVGSvgViewModule.h`

```cpp
class RNSVGSvgViewModule : public ArkTSTurboModule {
public:
    // 新增方法声明
    jsi::Object getSVGSize(jsi::Runtime &rt, Int32_t tag);
};
```

**说明**:
- `jsi::Object` 是返回类型（JavaScript 对象）
- `jsi::Runtime &rt` 是 JSI Runtime 引用
- `Int32_t` 是可选整数类型（tag）

---

### 步骤 2: 实现 C++ 函数

**文件**: `RNSVGSvgViewModule.cpp`

```cpp
jsi::Object RNSVGSvgViewModule::getSVGSize(jsi::Runtime &rt, Int32_t tag) {
    // 1. 创建返回对象
    jsi::Object result(rt);
    
    // 2. 验证参数
    if (!tag.has_value()) {
        result.setProperty(rt, "success", jsi::Value(false));
        result.setProperty(rt, "error", jsi::String::createFromUtf8(rt, "Tag is null"));
        return result;
    }
    
    // 3. 获取 SVG 节点
    auto weakSvgNode = SvgViewManager::getInstance().getSvgViewByTag(*tag);
    
    // 4. 获取尺寸
    if (weakSvgNode.lock()) {
        auto svgRootNode = weakSvgNode.lock();
        auto size = svgRootNode->GetSize();
        
        // 5. 设置返回对象属性
        result.setProperty(rt, "width", jsi::Value(size.Width()));
        result.setProperty(rt, "height", jsi::Value(size.Height()));
        result.setProperty(rt, "success", jsi::Value(true));
        result.setProperty(rt, "error", jsi::Value::null());
    } else {
        result.setProperty(rt, "success", jsi::Value(false));
        result.setProperty(rt, "error", jsi::String::createFromUtf8(rt, "SVG node not found"));
    }
    
    return result;
}
```

**关键点**:
- 使用 `jsi::Object(rt)` 创建 JavaScript 对象
- 使用 `setProperty()` 设置对象属性
- 使用 `jsi::Value()` 创建 JavaScript 值
- 使用 `jsi::String::createFromUtf8()` 创建字符串

---

### 步骤 3: 创建桥接函数

**文件**: `RNSVGSvgViewModule.cpp`

```cpp
static jsi::Value __hostFunction_RNSVGSvgViewModule_getSVGSize(
    jsi::Runtime &rt,
    react::TurboModule &turboModule,
    const jsi::Value *args,
    size_t count) {
    
    // 1. 解析参数
    auto tag = args[0].isNull() || args[0].isUndefined()
        ? std::nullopt
        : std::make_optional(args[0].asNumber());
    
    // 2. 调用 C++ 函数
    auto result = static_cast<RNSVGSvgViewModule *>(&turboModule)
        ->getSVGSize(rt, tag);
    
    // 3. 返回结果
    return jsi::Value(rt, result);
}
```

**关键点**:
- 函数名格式: `__hostFunction_<TurboModuleName>_<MethodName>`
- 参数解析: `args[0].asNumber()` 将 JavaScript number 转换为 C++ int32_t
- 类型转换: `static_cast<RNSVGSvgViewModule *>` 将基类转换为具体类型
- 返回值: `jsi::Value(rt, result)` 将 C++ 对象转换为 JavaScript 值

---

### 步骤 4: 注册到 methodMap_

**文件**: `RNSVGSvgViewModule.cpp` (构造函数)

```cpp
RNSVGSvgViewModule::RNSVGSvgViewModule(...) {
    // 注册 toDataURL
    methodMap_["toDataURL"] = MethodMetadata{1, __hostFunction_RNSVGSvgViewModule_toDataURL};
    
    // 注册 getSVGSize
    methodMap_["getSVGSize"] = MethodMetadata{1, __hostFunction_RNSVGSvgViewModule_getSVGSize};
}
```

**关键点**:
- `methodMap_` 是方法映射表
- 键名 `"getSVGSize"` 是 JavaScript 中调用的方法名
- `MethodMetadata{1, ...}` 中 `1` 是参数个数
- 第二个参数是桥接函数指针

---

### 步骤 5: JavaScript 中使用

**文件**: `example/src/svg/index.tsx`

```typescript
const handleGetSVGSize = () => {
    const RNSVGSvgViewModule = TurboModuleRegistry.get('RNSVGSvgViewModule');
    
    // 获取 SVG tag
    const svgTag = findNodeHandle(svgRef.current) || 1;
    
    // 调用 JSI 接口（同步调用）
    const sizeInfo = RNSVGSvgViewModule.getSVGSize(svgTag);
    
    if (sizeInfo.success) {
        console.log(`SVG Size: ${sizeInfo.width} x ${sizeInfo.height}`);
        setResult(`SVG Size: ${sizeInfo.width} x ${sizeInfo.height}`);
    } else {
        console.error('Error:', sizeInfo.error);
        setResult(`Error: ${sizeInfo.error}`);
    }
};
```

---

## 🔄 完整调用流程

```
┌─────────────────────────────────────────────────────────────┐
│  JavaScript 层                                               │
│  const sizeInfo = module.getSVGSize(tag)                   │
└───────────────────────┬─────────────────────────────────────┘
                        │ JSI 调用
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  JSI Runtime                                                │
│  查找 methodMap_["getSVGSize"]                             │
│  找到: MethodMetadata{1, __hostFunction_...}                │
└───────────────────────┬─────────────────────────────────────┘
                        │ 调用桥接函数
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  桥接函数                                                   │
│  __hostFunction_RNSVGSvgViewModule_getSVGSize()            │
│  1. 解析 args[0] → tag                                     │
│  2. 调用 C++ 函数                                           │
└───────────────────────┬─────────────────────────────────────┘
                        │ 调用 C++ 函数
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  C++ 函数                                                   │
│  RNSVGSvgViewModule::getSVGSize()                          │
│  1. 获取 SVG 节点                                            │
│  2. 获取尺寸                                                 │
│  3. 创建返回对象                                             │
│  4. 返回 jsi::Object                                        │
└───────────────────────┬─────────────────────────────────────┘
                        │ 返回结果
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  JavaScript 层                                               │
│  sizeInfo = { width: 100, height: 100, success: true }    │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 与 toDataURL 的对比

| 特性 | toDataURL | getSVGSize |
|------|-----------|------------|
| **调用方式** | 异步（带回调） | 同步（直接返回） |
| **参数个数** | 3 (tag, options, callback) | 1 (tag) |
| **返回值** | undefined（通过回调返回） | jsi::Object（直接返回） |
| **用途** | 转换为 Base64 | 获取尺寸信息 |

---

## 🎯 关键知识点

### 1. 同步 vs 异步

**同步接口** (`getSVGSize`):
- 直接返回结果
- 使用 `return jsi::Value(rt, result)`
- JavaScript 可以直接使用返回值

**异步接口** (`toDataURL`):
- 立即返回 `undefined`
- 通过回调返回结果
- 使用 `jsInvoker_->invokeAsync()` 异步执行回调

### 2. 返回对象创建

```cpp
// 创建对象
jsi::Object result(rt);

// 设置属性
result.setProperty(rt, "width", jsi::Value(100.0));
result.setProperty(rt, "height", jsi::Value(200.0));
result.setProperty(rt, "success", jsi::Value(true));
result.setProperty(rt, "error", jsi::Value::null());

// 返回
return result;
```

### 3. 类型转换

| C++ 类型 | JavaScript 类型 | 转换方法 |
|----------|----------------|----------|
| `double` | `number` | `jsi::Value(100.0)` |
| `bool` | `boolean` | `jsi::Value(true)` |
| `std::string` | `string` | `jsi::String::createFromUtf8(rt, "hello")` |
| `null` | `null` | `jsi::Value::null()` |

---

## 🧪 测试方法

1. **编译项目**
   ```bash
   # 在项目根目录执行
   npm run build
   ```

2. **运行应用**
   - 启动应用
   - 点击 "调用 getSVGSize (新接口)" 按钮
   - 查看控制台日志和界面显示

3. **查看日志**
   ```bash
   # 查看 C++ 日志
   adb logcat | grep -E "\[getSVGSize"
   ```

---

## 📝 返回对象结构

```typescript
interface SVGSizeInfo {
    width: number;      // SVG 宽度
    height: number;     // SVG 高度
    success: boolean;   // 是否成功
    error: string | null; // 错误信息（如果失败）
}
```

**成功示例**:
```json
{
    "width": 100,
    "height": 100,
    "success": true,
    "error": null
}
```

**失败示例**:
```json
{
    "width": 0,
    "height": 0,
    "success": false,
    "error": "SVG node not found"
}
```

---

## 🎓 学习要点

通过这个示例，你可以学习到：

1. ✅ **如何添加新的 JSI 接口**
   - 在头文件中声明
   - 在 .cpp 中实现
   - 创建桥接函数
   - 注册到 methodMap_

2. ✅ **同步接口的实现**
   - 直接返回 `jsi::Object`
   - 不需要回调函数

3. ✅ **类型转换**
   - C++ 类型 → JavaScript 类型
   - 使用 `jsi::Value`、`jsi::Object` 等

4. ✅ **错误处理**
   - 返回包含 `success` 和 `error` 的对象
   - JavaScript 可以根据 `success` 判断是否成功

---

## 🔍 调试技巧

### 查看 C++ 日志

```bash
# 查看所有 getSVGSize 相关日志
adb logcat | grep "\[getSVGSize"

# 查看 JSI 桥接函数日志
adb logcat | grep "\[getSVGSize-JSI\]"

# 查看 C++ 函数日志
adb logcat | grep "\[getSVGSize\]"
```

### 查看 JavaScript 日志

在浏览器控制台或 React Native Debugger 中查看：
```javascript
console.log('[App] getSVGSize result:', sizeInfo);
```

---

## 📚 相关文件

| 文件 | 修改内容 |
|------|----------|
| `RNSVGSvgViewModule.h` | 添加 `getSVGSize` 方法声明 |
| `RNSVGSvgViewModule.cpp` | 实现 C++ 函数和桥接函数，注册到 methodMap_ |
| `index.tsx` | 添加调用示例和按钮 |

---

**文档版本**: 1.0  
**最后更新**: 2024-12-19  
**适用项目**: rntpc_ios

