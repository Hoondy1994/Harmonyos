# react-native-skia Instance 切换显示问题汇报

## 问题概述

**问题现象：**
- 第一次进入包含 Skia Canvas 组件的 Details 页面时，圆圈正常显示
- 退出页面后再次进入 Details 页面时，Skia Canvas 绘制的圆圈消失，页面其他内容正常显示

**影响范围：**
- 所有使用 `BasePrecreateView` 组件且包含 `@shopify/react-native-skia` 的 Canvas 组件的页面
- 使用预创建机制（Instance 预创建）的场景

**严重程度：**
- **中高**：影响用户体验，但页面其他功能正常

---

## 引入原因

### 1. 预创建机制的设计目标

为了优化页面切换性能，`BasePrecreateView` 组件实现了**预创建机制**：

- **目标**：在用户进入页面时，后台提前创建下一个页面需要的 RNInstance，并提前运行 bundle
- **效果**：下次进入页面时，可以直接使用预创建的 Instance，无需等待 bundle 加载，提升首屏速度

### 2. 预创建机制的实现方式

```typescript
// BasePrecreateView.ets

aboutToAppear() {
  this.init();              // 获取或创建 Instance，运行 bundle
  this.precreateInstance(); // 在后台预创建下一个 Instance
}

private async precreateInstance() {
  if (instances.length === 0) {
    // 创建新的 Instance
    const rnInstance = await rnohCoreContext.createAndRegisterRNInstance({...});
    
    // 在后台运行 bundle（此时没有 UI surface）
    await rnInstance.runJSBundle(provider);
    
    // 标记为已完成，存入预创建池
    instance.status = "DONE";
    instances.add(instance);
  }
}
```

### 3. 预创建机制的工作流程

**第一次进入页面：**
```
1. 创建 Instance A，运行 bundle，显示页面 ✅
2. （后台）创建 Instance B，运行 bundle，存入池中
```

**第二次进入页面：**
```
1. 从池中取出 Instance B（bundle 已运行）
2. 直接显示页面 ✅（无需等待）
```

### 4. 问题引入的根本原因

预创建机制在**后台**运行 bundle 时：
- ✅ JS 代码正常执行
- ✅ React 组件正常创建
- ❌ **没有实际的 UI surface**（因为页面还没显示）
- ❌ Skia 的 Canvas 组件需要 attach 到 surface 才能创建 GPU context
- ❌ 后台运行时，Skia 组件无法 attach，GPU context 未创建

**第二次进入时：**
- Instance 的 bundle 已经运行完成
- 代码逻辑上认为可以直接显示
- 但 Skia 组件在第一次运行时没有成功 attach
- 第二次进入时，虽然显示了页面，但 Skia 组件**没有重新 attach**
- 导致 Canvas 无法渲染，圆圈消失

---

## 根因分析

### 1. Skia Canvas 组件的渲染机制

Skia Canvas 组件的渲染依赖于：

1. **原生组件创建**：`RNCSkiaDomView`（ArkTS 自定义组件）
2. **GPU Context 初始化**：需要在 surface attach 时创建
3. **Surface 绑定**：Canvas 需要绑定到实际的 UI surface

### 2. 预创建 Instance 的执行环境

**预创建 Instance 运行 bundle 时：**
```
后台执行环境
├── JS 引擎：✅ 正常运行
├── JS 线程：✅ 正常执行
├── React 组件：✅ 正常创建
├── UI Surface：❌ 不存在（页面还没显示）
└── GPU Context：❌ 无法创建（没有 surface）
```

**正常 Instance 运行 bundle 时：**
```
前台执行环境
├── JS 引擎：✅ 正常运行
├── JS 线程：✅ 正常执行
├── React 组件：✅ 正常创建
├── UI Surface：✅ 已存在（页面正在显示）
└── GPU Context：✅ 正常创建（有 surface）
```

### 3. 问题发生的时序

#### 第一次进入（正常）

```
t0: 进入页面
t1: 创建 Instance A
t2: 运行 bundle
t3: 创建 RNSurface（有 UI surface）
t4: Skia Canvas attach 到 surface ✅
t5: GPU Context 创建 ✅
t6: 圆圈显示 ✅
```

#### 预创建阶段（问题发生）

```
t7: （后台）创建 Instance B
t8: 运行 bundle
t9: React 组件创建（包括 Canvas）
t10: 尝试 attach 到 surface ❌（没有 surface）
t11: GPU Context 创建失败 ❌
t12: Instance B 标记为 "DONE"，存入池
```

#### 第二次进入（问题显现）

```
t13: 从池中取出 Instance B
t14: 检查 status = "DONE"，跳过重新运行 bundle
t15: 创建 RNSurface（有 UI surface）
t16: 但 Skia Canvas 没有重新 attach ❌
t17: GPU Context 仍然不存在 ❌
t18: 圆圈不显示 ❌
```

### 4. 代码层面的分析

**BasePrecreateView.init() 的逻辑：**

```typescript
const jsBundleExecutionStatus = instance.status;

if (jsBundleExecutionStatus === "DONE") {
  // 预创建的 Instance，bundle 已运行
  this.shouldShow = true;  // 直接显示
  // ❌ 问题：没有重新运行 bundle，Skia 组件没有重新 attach
} else {
  // 新创建的 Instance，需要运行 bundle
  await this.rnInstance.runJSBundle(this.jsBundleProvider);
  this.shouldShow = true;
  // ✅ 正常：运行 bundle 时，surface 已存在，Skia 可以 attach
}
```

**问题根源：**
- 预创建的 Instance 在后台运行时，**没有 UI surface**
- Skia 组件需要**在 surface attach 时**创建 GPU context
- 第二次进入时，虽然有了 surface，但**没有重新运行 bundle**，Skia 组件**没有重新 attach**

---

## 解决方案

### 方案：强制重新加载机制

**核心思路：** 对于包含 Skia 等需要重新 attach 的组件的页面，强制每次进入都重新运行 bundle，确保组件重新 mount 和 attach。

### 实现方式

#### 1. 添加 forceReloadOnAppear 开关

```typescript
// BasePrecreateView.ets
export struct BasePrecreateView {
  public forceReloadOnAppear: boolean = false;  // 新增开关
  
  private shouldForceReload(): boolean {
    return this.forceReloadOnAppear;
  }
  
  private async init() {
    const shouldForceReload = this.shouldForceReload();
    
    // 即使 status = "DONE"，如果 forceReloadOnAppear = true，也强制重新运行
    if (this.jsBundleProvider && (jsBundleExecutionStatus === undefined || shouldForceReload)) {
      if (shouldForceReload) {
        console.log("BasePrecreateView force reload enabled");
      }
      await this.rnInstance.runJSBundle(this.jsBundleProvider);  // 强制重新运行
      this.shouldShow = true;
      return;
    }
    // ... 其他逻辑
  }
}
```

#### 2. 禁用预创建（当 forceReloadOnAppear = true 时）

```typescript
private async getOrCreateRNInstance(): Promise<CachedInstance> {
  const shouldSkipCache: boolean = this.shouldForceReload();
  
  // 如果 forceReloadOnAppear = true，跳过预创建池
  if (!shouldSkipCache && this.rnInstances.length > 0) {
    const instance = this.rnInstances.removeByIndex(0);
    return instance;
  }
  
  // 创建新的 Instance
  const instance = await this.rnohCoreContext!.createAndRegisterRNInstance({...});
  return { rnInstance: instance };
}

private async precreateInstance() {
  // 如果 forceReloadOnAppear = true，不预创建
  if (instances.length === 0 && !this.shouldForceReload()) {
    // 预创建逻辑
  }
}
```

#### 3. 在页面中启用强制重新加载

```typescript
// PrecreateRN.ets
@Component
export default struct PrecreateRN {
  @Prop forceReloadOnAppear: boolean = false;
  
  build() {
    BasePrecreateView({
      appKey: this.moduleName,
      bundlePath: this.bundlePath,
      initialProps: this.initProps,
      forceReloadOnAppear: this.forceReloadOnAppear  // 透传开关
    })
  }
}

// Goods.ets
@Builder
PageMap(name: string, param: string) {
  if (name === 'Details' || name === 'Details2') {
    PrecreateRN({ forceReloadOnAppear: true })  // 启用强制重新加载
  }
}
```

### 解决方案的效果

**修复后的流程：**

```
第二次进入页面：
1. 从池中取出预创建的 Instance B
2. 检查 forceReloadOnAppear = true
3. 强制重新运行 bundle ✅
4. 此时 surface 已存在
5. Skia Canvas 重新 attach ✅
6. GPU Context 重新创建 ✅
7. 圆圈正常显示 ✅
```

### 方案优缺点

**优点：**
- ✅ 彻底解决 Skia 组件不显示的问题
- ✅ 适用于所有需要重新 attach 的组件
- ✅ 实现简单，只需添加一个开关

**缺点：**
- ⚠️ 牺牲了预创建带来的性能优化（每次进入都需要重新运行 bundle）
- ⚠️ 首屏速度可能略有下降（但仍在可接受范围内）

---

## 影响分析

### 对性能的影响

**修复前：**
- 第一次进入：需要运行 bundle（耗时）
- 第二次进入：直接使用预创建的 Instance（快速）✅
- 但 Skia 组件不显示 ❌

**修复后：**
- 第一次进入：需要运行 bundle（耗时）
- 第二次进入：强制重新运行 bundle（耗时）⚠️
- Skia 组件正常显示 ✅

**性能权衡：**
- 牺牲了预创建的性能优势
- 但保证了功能的正确性
- 对于包含 Skia 的页面，这是必要的权衡

### 对其他组件的影响

**不受影响的组件：**
- ✅ 普通 React Native 组件（View、Text、Image 等）
- ✅ TurboModule 调用
- ✅ 事件处理

**受影响的组件：**
- ⚠️ 所有需要 attach 到 surface 的组件（如 Skia Canvas）
- ⚠️ 依赖 GPU context 的组件

---

## 建议

### 短期方案（已实施）

1. ✅ 为包含 Skia 的页面启用 `forceReloadOnAppear: true`
2. ✅ 确保功能正确性

### 长期优化方案（建议）

1. **组件级别的预创建控制**
   - 检测 bundle 中是否包含需要重新 attach 的组件
   - 自动决定是否使用预创建机制

2. **Skia 组件的 attach 机制优化**
   - 在 surface 创建时，检查并重新 attach Skia 组件
   - 避免强制重新运行整个 bundle

3. **预创建机制的改进**
   - 区分"可以预创建"和"需要重新 attach"的组件
   - 只对可以预创建的组件使用预创建机制

---

## 总结

### 问题本质

预创建机制在后台运行 bundle 时，**没有 UI surface**，导致 Skia 等需要 attach 到 surface 的组件无法正确初始化。第二次进入时，虽然有了 surface，但组件没有重新 attach，导致不显示。

### 解决方案

通过 `forceReloadOnAppear` 开关，强制每次进入都重新运行 bundle，确保组件在 surface 存在时重新 mount 和 attach。

### 经验教训

1. **预创建机制不适用于所有场景**：需要 attach 到 surface 的组件不适合预创建
2. **组件生命周期的重要性**：某些组件需要在 surface 存在时才能正确初始化
3. **性能与正确性的权衡**：在保证功能正确性的前提下，可以牺牲部分性能优化

---

*汇报时间：2024年*
*问题修复版本：包含 forceReloadOnAppear 开关的版本*

