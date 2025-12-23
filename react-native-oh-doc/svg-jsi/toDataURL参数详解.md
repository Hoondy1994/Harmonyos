# toDataURL 函数参数详解

## 📖 函数签名

```cpp
void toDataURL(
    jsi::Runtime &rt,        // JSI Runtime（框架自动传递）
    Int32_t tag,             // 参数 1：SVG 组件的唯一标识符
    Object object,           // 参数 2：可选的配置对象
    Callback &&callback      // 参数 3：回调函数（异步返回结果）
);
```

---

## 🔍 参数 1: `Int32_t tag`

### 类型定义
```cpp
using Int32_t = std::optional<int32_t>;
```

### 作用
**标识要转换的 SVG 组件的唯一 ID**

### JavaScript 端传递
```typescript
// 方式 1: 通过 findNodeHandle 获取
const svgTag = findNodeHandle(svgRef.current);
// 例如: svgTag = 1

// 方式 2: 直接使用数字
const svgTag = 1;

// 调用
RNSVGSvgViewModule.toDataURL(svgTag, options, callback);
```

### C++ 端使用
```cpp
// 1. 检查 tag 是否存在
if (!tag.has_value()) {
    // tag 为空，无法继续
    return;
}

// 2. 通过 tag 查找 SVG 节点
auto weakSvgNode = SvgViewManager::getInstance().getSvgViewByTag(*tag);

// 3. 获取 SVG 节点并处理
if (weakSvgNode.lock()) {
    auto svgRootNode = weakSvgNode.lock();
    // 使用 svgRootNode 进行后续操作
}
```

### 为什么需要 tag？

- **React Native 组件标识**: 每个组件都有一个唯一的 tag（数字 ID）
- **查找组件**: 通过 tag 可以在 C++ 端找到对应的 SVG 组件实例
- **多组件支持**: 一个应用可能有多个 SVG 组件，tag 用于区分

### 获取 tag 的方法

```typescript
import { findNodeHandle } from 'react-native';

// 1. 使用 ref 获取
const svgRef = useRef(null);
<Svg ref={svgRef} ... />

const tag = findNodeHandle(svgRef.current);

// 2. 直接使用数字（测试用）
const tag = 1;
```

---

## 🔍 参数 2: `Object object`

### 类型定义
```cpp
using Object = std::optional<jsi::Object>;
```

### 作用
**可选的配置对象，用于自定义转换参数**

### JavaScript 端传递
```typescript
const options = {
  width: 100,    // 可选：指定输出宽度
  height: 100,   // 可选：指定输出高度
  // 其他可能的选项...
};

RNSVGSvgViewModule.toDataURL(tag, options, callback);
```

### C++ 端使用
```cpp
// 检查 options 是否存在
if (object.has_value()) {
    const jsi::Object& opts = *object;
    
    // 读取配置项（如果存在）
    if (opts.hasProperty(rt, "width")) {
        double width = opts.getProperty(rt, "width").asNumber();
        // 使用 width
    }
    
    if (opts.hasProperty(rt, "height")) {
        double height = opts.getProperty(rt, "height").asNumber();
        // 使用 height
    }
}
```

### 当前实现

**注意**: 在当前代码中，`options` 参数**实际上没有被使用**！

```cpp
void RNSVGSvgViewModule::toDataURL(...) {
    // options 被接收了，但没有读取任何属性
    LOG(INFO) << "[toDataURL] Options provided: " << (object.has_value() ? "yes" : "no");
    
    // 直接使用 SVG 的原始尺寸
    auto size = svgRootNode->GetSize();
    // 没有使用 options 中的 width/height
}
```

### 为什么是可选参数？

- **向后兼容**: 可以不传 options，使用默认行为
- **灵活性**: 未来可以扩展更多配置项
- **渐进增强**: 基本功能不需要 options，高级功能才需要

### 可能的配置项（未来扩展）

```typescript
const options = {
  width: 200,           // 输出宽度
  height: 200,          // 输出高度
  format: 'png',        // 输出格式：'png', 'jpg'
  quality: 0.9,         // 图片质量（0-1）
  backgroundColor: '#ffffff'  // 背景色
};
```

---

## 🔍 参数 3: `Callback &&callback`

### 类型定义
```cpp
using Callback = std::optional<std::function<void(std::string)>>;
```

### 作用
**异步回调函数，用于返回 Base64 编码的图片数据**

### JavaScript 端传递
```typescript
RNSVGSvgViewModule.toDataURL(
  tag,
  options,
  (base64: string) => {  // 回调函数
    console.log('Base64:', base64);
    // 使用 base64 数据
    // 例如：显示图片、保存到文件等
  }
);
```

### C++ 端使用
```cpp
// 1. 执行异步操作（转换 SVG 为 Base64）
std::string base64 = StringUtils::bitmapToBase64(bitmap);

// 2. 通过回调返回结果
jsInvoker_->invokeAsync([base64, endCallback = std::move(*callback)] {
    // 在 JavaScript 线程中执行回调
    endCallback(base64);  // 调用 JavaScript 回调函数
});
```

### 为什么需要回调？

1. **异步操作**: SVG 转 Base64 是耗时操作，不能阻塞 JavaScript 线程
2. **异步返回**: 操作完成后通过回调返回结果
3. **非阻塞**: 函数立即返回 `undefined`，不等待操作完成

### 回调函数签名

```typescript
// JavaScript 回调函数
(base64: string) => void

// 参数: base64 - Base64 编码的图片字符串
// 返回值: void（无返回值）
```

### 回调执行时机

```
JavaScript 调用 toDataURL()
    ↓
函数立即返回 undefined
    ↓
C++ 后台执行转换（异步）
    ↓
转换完成
    ↓
调用 JavaScript 回调函数
    ↓
JavaScript 回调执行
    ↓
处理 base64 数据
```

### 为什么是右值引用（&&）？

```cpp
Callback &&callback  // 右值引用
```

- **移动语义**: 避免复制回调函数对象
- **性能优化**: 直接移动，不复制
- **生命周期**: 确保回调在异步操作完成时仍然有效

---

## 📊 完整调用示例

### JavaScript 端

```typescript
// 1. 获取 SVG tag
const svgTag = findNodeHandle(svgRef.current) || 1;

// 2. 准备 options（可选）
const options = {
  width: 100,
  height: 100
};

// 3. 定义回调函数
const callback = (base64: string) => {
  console.log('Got base64:', base64);
  // 使用 base64 数据
  // 例如：<img src={`data:image/png;base64,${base64}`} />
};

// 4. 调用 toDataURL
RNSVGSvgViewModule.toDataURL(svgTag, options, callback);
```

### C++ 端处理流程

```cpp
void toDataURL(jsi::Runtime &rt, Int32_t tag, Object object, Callback &&callback) {
    // 1. 使用 tag 查找 SVG 节点
    auto svgNode = SvgViewManager::getInstance().getSvgViewByTag(*tag);
    
    // 2. 读取 options（当前未使用，但可以扩展）
    // if (object.has_value()) { ... }
    
    // 3. 执行转换（异步）
    std::string base64 = convertSVGToBase64(svgNode);
    
    // 4. 通过回调返回结果
    jsInvoker_->invokeAsync([base64, callback = std::move(callback)] {
        callback(base64);  // 调用 JavaScript 回调
    });
}
```

---

## 🎯 参数总结

| 参数 | 类型 | 是否必需 | 作用 | 示例值 |
|------|------|----------|------|--------|
| `tag` | `Int32_t` (optional<int32_t>) | ✅ 必需 | SVG 组件唯一标识符 | `1` |
| `object` | `Object` (optional<jsi::Object>) | ❌ 可选 | 配置对象（当前未使用） | `{ width: 100, height: 100 }` |
| `callback` | `Callback` (optional<function>) | ✅ 必需 | 异步回调函数 | `(base64) => { ... }` |

---

## 💡 关键点

### 1. tag 的作用
- **唯一标识**: 每个 React Native 组件都有唯一的 tag
- **查找组件**: 通过 tag 在 C++ 端找到对应的 SVG 实例
- **必需参数**: 没有 tag 就无法找到要转换的 SVG

### 2. object 的作用
- **配置选项**: 用于自定义转换参数
- **当前未使用**: 代码中接收了但没有读取
- **未来扩展**: 可以添加 width、height、format 等选项

### 3. callback 的作用
- **异步返回**: 因为转换是耗时操作，需要异步返回
- **结果传递**: 将 Base64 字符串传递给 JavaScript
- **必需参数**: 没有回调就无法获取结果

---

## 🔄 完整调用流程

```
JavaScript 调用
  toDataURL(tag, options, callback)
    ↓
【参数传递】
  - tag: 1 (number)
  - options: { width: 100, height: 100 } (object)
  - callback: (base64) => { ... } (function)
    ↓
C++ 函数执行
  1. 使用 tag 查找 SVG 节点
  2. 读取 options（当前未使用）
  3. 执行转换（异步）
    ↓
转换完成
  base64 = "iVBORw0KGgoAAAANS..."
    ↓
调用回调
  callback(base64)
    ↓
JavaScript 回调执行
  (base64) => {
    console.log(base64);
    // 使用 base64 数据
  }
```

---

## 📝 实际使用示例

### 示例 1: 基本用法

```typescript
const svgTag = findNodeHandle(svgRef.current);

RNSVGSvgViewModule.toDataURL(
  svgTag,
  {},  // 空 options
  (base64) => {
    console.log('Base64 length:', base64.length);
  }
);
```

### 示例 2: 使用 options

```typescript
RNSVGSvgViewModule.toDataURL(
  svgTag,
  { width: 200, height: 200 },  // options
  (base64) => {
    // 显示图片
    setImageUri(`data:image/png;base64,${base64}`);
  }
);
```

### 示例 3: 保存图片

```typescript
RNSVGSvgViewModule.toDataURL(
  svgTag,
  {},
  (base64) => {
    // 保存到文件
    saveBase64ToFile(base64, 'svg-image.png');
  }
);
```

---

## ⚠️ 注意事项

### 1. tag 必须有效
```typescript
// ❌ 错误：tag 为 null
RNSVGSvgViewModule.toDataURL(null, {}, callback);

// ✅ 正确：确保 tag 有效
const tag = findNodeHandle(svgRef.current);
if (tag) {
  RNSVGSvgViewModule.toDataURL(tag, {}, callback);
}
```

### 2. callback 必须提供
```typescript
// ❌ 错误：没有回调
RNSVGSvgViewModule.toDataURL(tag, {}, undefined);

// ✅ 正确：提供回调
RNSVGSvgViewModule.toDataURL(tag, {}, (base64) => {
  // 处理结果
});
```

### 3. options 当前未使用
```typescript
// 当前代码中，options 被接收但没有使用
// 传递空对象即可
RNSVGSvgViewModule.toDataURL(tag, {}, callback);
```

---

**文档版本**: 1.0  
**最后更新**: 2024-12-19  
**适用项目**: rntpc_ios

