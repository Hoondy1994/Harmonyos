# react-native-svg JSI 日志查看指南

## 📋 概述

本文档说明如何查看 react-native-svg 的 JSI 调用日志，用于验证 JSI 调用流程。

## 🔍 日志位置

所有日志都使用 `LOG(INFO)` 或 `DLOG(INFO)` 输出，可以通过 `adb logcat` 查看。

## 📝 关键日志标签

### 1. JSI Binder 注册阶段

**标签**: `[SVGPackage]`

**触发时机**: 应用启动时，RNInstanceFactory 调用 `createComponentJSIBinderByName()`

**日志内容**:
```
[SVGPackage] ========== JSI Binder 注册开始 ==========
[SVGPackage] 正在注册所有 SVG 组件的 JSI Binder...
[SVGPackage] ✓ 已注册 JSI Binder: RNSVGPath
[SVGPackage] ✓ 已注册 JSI Binder: RNSVGCircle
[SVGPackage] ✓ 已注册 JSI Binder: RNSVGRect
... (共 22 个组件)
[SVGPackage] ========== JSI Binder 注册完成，共 22 个组件 ==========
```

**查看命令**:
```bash
adb logcat | grep "\[SVGPackage\]"
```

---

### 2. 组件实例创建阶段

**标签**: `[SVGPackageComponentInstanceFactoryDelegate]`

**触发时机**: Fabric 需要创建组件实例时

**日志内容**:
```
[SVGPackageComponentInstanceFactoryDelegate] ========== 创建组件实例 ==========
[SVGPackageComponentInstanceFactoryDelegate] 组件名称 componentName: RNSVGPath
[SVGPackageComponentInstanceFactoryDelegate] Tag: 123
[SVGPackageComponentInstanceFactoryDelegate] ✓ 创建 RNSVGPathComponentInstance
```

**查看命令**:
```bash
adb logcat | grep "\[SVGPackageComponentInstanceFactoryDelegate\]"
```

---

### 3. Path 组件属性更新

**标签**: `[RNSVGPathCI]`

**触发时机**: Path 组件的属性发生变化时

**日志内容**:
```
[RNSVGPathCI] ========== UpdateElementProps 调用开始 ==========
[RNSVGPathCI] 路径数据 d: M10 10 L50 50 L10 50 Z
[RNSVGPathCI] 缩放因子 pointScaleFactor: 1.0
[RNSVGPathCI] 填充颜色 fill: 已设置
[RNSVGPathCI] 描边颜色 stroke: 已设置
[RNSVGPathCI] 描边宽度 strokeWidth: 2.0
[RNSVGPathCI] 透明度 opacity: 0.8
[RNSVGPathCI] 检测到路径数据或缩放因子变化，正在更新...
[RNSVGPathCI] 旧路径数据: M10 10 L50 50
[RNSVGPathCI] 新路径数据: M10 10 L50 50 L10 50 Z
[RNSVGPathCI] ✓ 路径数据更新完成
[RNSVGPathCI] ========== UpdateElementProps 调用完成 ==========
```

**查看命令**:
```bash
adb logcat | grep "\[RNSVGPathCI\]"
```

---

### 4. Circle 组件属性更新

**标签**: `[RNSVGCircleCI]`

**触发时机**: Circle 组件的属性发生变化时

**日志内容**:
```
[RNSVGCircleCI] ========== UpdateElementProps 调用开始 ==========
[RNSVGCircleCI] 圆心 X 坐标 cx: 100
[RNSVGCircleCI] 圆心 Y 坐标 cy: 100
[RNSVGCircleCI] 半径 r: 40
[RNSVGCircleCI] 填充颜色 fill: 已设置
[RNSVGCircleCI] 描边颜色 stroke: 已设置
[RNSVGCircleCI] 描边宽度 strokeWidth: 3.0
[RNSVGCircleCI] ✓ 圆形属性更新完成
[RNSVGCircleCI] ========== UpdateElementProps 调用完成 ==========
```

**查看命令**:
```bash
adb logcat | grep "\[RNSVGCircleCI\]"
```

---

### 5. Rect 组件属性更新

**标签**: `[RNSVGRectCI]`

**触发时机**: Rect 组件的属性发生变化时

**日志内容**:
```
[RNSVGRectCI] ========== UpdateElementProps 调用开始 ==========
[RNSVGRectCI] X 坐标 x: 50
[RNSVGRectCI] Y 坐标 y: 50
[RNSVGRectCI] 宽度 width: 100
[RNSVGRectCI] 高度 height: 100
[RNSVGRectCI] 圆角 X 半径 rx: 10
[RNSVGRectCI] 圆角 Y 半径 ry: 10
[RNSVGRectCI] ✓ 矩形属性更新完成
[RNSVGRectCI] ========== UpdateElementProps 调用完成 ==========
```

**查看命令**:
```bash
adb logcat | grep "\[RNSVGRectCI\]"
```

---

### 6. SvgView 组件

**标签**: `[RNSVGSvgViewCI]`

**触发时机**: SvgView 组件创建和更新时

**日志内容**:
```
[RNSVGSvgViewCI] ========== 创建 SvgView 组件实例 ==========
[RNSVGSvgViewCI] Tag: 1
[RNSVGSvgViewCI] ✓ SvgView 组件实例创建完成
[RNSVGSvgViewCI] ========== onFinalizeUpdates 调用开始 ==========
[RNSVGSvgViewCI] 边界框宽度 bbWidth: 200
[RNSVGSvgViewCI] 边界框高度 bbHeight: 200
[RNSVGSvgViewCI] 视图框最小 X minX: 0
[RNSVGSvgViewCI] 视图框最小 Y minY: 0
[RNSVGSvgViewCI] 视图框宽度 vbWidth: 200
[RNSVGSvgViewCI] 视图框高度 vbHeight: 200
[RNSVGSvgViewCI] 缩放因子 pointScaleFactor: 1.0
[RNSVGSvgViewCI] ✓ SvgView 属性更新完成
[RNSVGSvgViewCI] ========== onFinalizeUpdates 调用完成 ==========
```

**查看命令**:
```bash
adb logcat | grep "\[RNSVGSvgViewCI\]"
```

---

## 🎯 完整 JSI 调用流程日志示例

运行 Demo 时，完整的调用流程日志如下：

```
# 1. 应用启动 - JSI Binder 注册
[SVGPackage] ========== JSI Binder 注册开始 ==========
[SVGPackage] ✓ 已注册 JSI Binder: RNSVGPath
[SVGPackage] ✓ 已注册 JSI Binder: RNSVGCircle
...

# 2. 创建 SvgView 组件
[SVGPackageComponentInstanceFactoryDelegate] 组件名称 componentName: RNSVGSvgView
[RNSVGSvgViewCI] ========== 创建 SvgView 组件实例 ==========
[RNSVGSvgViewCI] ✓ SvgView 组件实例创建完成

# 3. 创建 Path 组件
[SVGPackageComponentInstanceFactoryDelegate] 组件名称 componentName: RNSVGPath
[RNSVGPathCI] ========== UpdateElementProps 调用开始 ==========
[RNSVGPathCI] 路径数据 d: M10 10 L50 50 L10 50 Z
[RNSVGPathCI] ✓ 路径数据更新完成

# 4. 创建 Circle 组件
[SVGPackageComponentInstanceFactoryDelegate] 组件名称 componentName: RNSVGCircle
[RNSVGCircleCI] ========== UpdateElementProps 调用开始 ==========
[RNSVGCircleCI] 圆心 X 坐标 cx: 100
[RNSVGCircleCI] ✓ 圆形属性更新完成
```

---

## 📱 查看所有 SVG 相关日志

**查看所有 SVG JSI 日志**:
```bash
adb logcat | grep -E "\[SVGPackage|\[RNSVG"
```

**查看特定组件的日志**:
```bash
# Path 组件
adb logcat | grep "\[RNSVGPathCI\]"

# Circle 组件
adb logcat | grep "\[RNSVGCircleCI\]"

# Rect 组件
adb logcat | grep "\[RNSVGRectCI\]"
```

**实时查看并保存到文件**:
```bash
adb logcat | grep -E "\[SVGPackage|\[RNSVG" > svg_jsi_logs.txt
```

---

## 🔧 调试技巧

### 1. 过滤特定操作

如果只想查看属性更新：
```bash
adb logcat | grep "UpdateElementProps"
```

### 2. 查看错误日志

```bash
adb logcat | grep -E "ERROR|✗"
```

### 3. 清除旧日志后重新查看

```bash
adb logcat -c  # 清除日志
# 然后运行应用
adb logcat | grep -E "\[SVGPackage|\[RNSVG"
```

---

## 📊 日志分析

### 正常流程应该看到：

1. ✅ **启动时**: `[SVGPackage]` 注册所有 JSI Binder
2. ✅ **创建组件时**: `[SVGPackageComponentInstanceFactoryDelegate]` 创建组件实例
3. ✅ **更新属性时**: `[RNSVG*CI]` 更新组件属性

### 异常情况：

- ❌ 如果看不到 `[SVGPackage]` 日志 → JSI Binder 注册失败
- ❌ 如果看不到 `[SVGPackageComponentInstanceFactoryDelegate]` 日志 → 组件实例创建失败
- ❌ 如果看不到 `[RNSVG*CI]` 日志 → 属性更新未触发

---

## 🎓 学习 JSI 流程

通过查看这些日志，你可以清楚地看到：

1. **JSI Binder 注册**: 应用启动时，所有 SVG 组件的 JSI Binder 被注册
2. **组件实例创建**: 当 JavaScript 使用 `<Path>` 等组件时，C++ 侧创建对应的组件实例
3. **属性更新**: JavaScript 传递的属性（如 `d="M10 10"`）被传递到 C++ 侧并更新原生对象

这就是完整的 JSI 调用流程！

---

**最后更新**: 2024-12-19  
**适用项目**: rntpc_ios

