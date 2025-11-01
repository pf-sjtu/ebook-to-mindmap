# 新功能 - Markdown预览增强

## 功能概述

本次更新大幅增强了Markdown内容预览功能，解决了链接在深色模式下显示不正常的问题，并添加了全局字体大小控制功能。

## 主要改进

### 1. 链接配色修复

**问题**：之前在深色模式下，链接颜色对比度不足，用户难以看清链接文本。

**解决方案**：
- 为`.prose a`类添加了完整的链接状态样式定义
- 浅色模式：蓝色系配色（#2563eb），hover时变深（#1d4ed8），visited状态为紫色（#7c3aed）
- 深色模式：浅蓝色系配色（#60a5fa），hover时变亮（#93c5fd），visited状态为浅紫色（#c084fc）
- 添加了平滑的颜色过渡动画（transition: color 0.2s ease）

### 2. 全局字体大小控制

**新增功能**：
- 在应用右上角添加了字体大小控制组件
- 支持字体大小在50%-200%之间调节（步进10%）
- 字体大小设置会自动保存到localStorage，刷新页面后保持设置
- 所有使用`.prose`类的内容都会响应字体大小调节

**控制组件特性**：
- 紧凑模式：适合放在header中，只显示按钮和百分比
- 完整模式：包含标题、描述和详细控制，适合独立使用
- 支持国际化（中英文）

### 3. HTML标签支持完善

**增强的标签支持**：
- **文本对齐和布局**：
  - `<center>` - 居中文本
  - `<p align="center/left/right">` - 段落对齐
  - `<div align="center/left/right">` - 容器对齐
- **文本装饰**：
  - `<u>` - 下划线文本
  - `<ins>` - 插入文本（下划线）
  - `<del>`、`<s>`、`<strikethrough>` - 删除线文本
  - `<mark>` - 标记高亮文本（深色/浅色模式自适应背景色）
- **字体大小和样式**：
  - `<sub>`、`<sup>` - 上下标（支持字体大小缩放）
  - `<small>` - 小号文本（支持字体大小缩放）
  - `<big>` - 大号文本（支持字体大小缩放）
  - `<tt>` - 等宽字体文本（代码风格）
- **引用和分隔**：
  - `<blockquote>` - 引用块（带左边框和斜体）
  - `<hr>` - 水平分隔线

## 技术实现

### CSS变量系统

```css
:root {
  --font-scale: 1;
  --base-font-size: 16px;
}

.prose {
  font-size: calc(var(--base-font-size) * var(--font-scale));
}
```

### 组件架构

- **FontSizeControl组件**：提供字体大小控制UI
- **全局CSS样式**：在`src/index.css`中定义所有样式
- **国际化支持**：在`zh.json`和`en.json`中添加相关文本

### 响应式设计

- 所有标签的相对大小都会随字体缩放
- 保持良好的行高和间距
- 支持深色/浅色主题切换

## 使用方法

### 字体大小控制

1. 在应用右上角找到字体控制按钮（A-、A+、重置）
2. 点击A-减小字体，A+增大字体
3. 点击重置恢复默认大小（100%）
4. 设置会自动保存

### 链接使用

在Markdown内容中正常使用链接语法：

```markdown
[链接文本](https://example.com)
```

链接会自动适配当前主题的颜色方案。

### HTML标签使用

在支持HTML的Markdown内容中：

```markdown
<!-- 文本对齐 -->
<center>这是居中文本</center>
<p align="center">这也是居中文本</p>

<!-- 文本装饰 -->
包含<u>下划线</u>和<mark>高亮</mark>的文本。
<ins>插入文本</ins>和<del>删除文本</del>。

<!-- 字体样式 -->
上标：X<sup>2</sup>，下标：H<sub>2</sub>O
<small>小号文本</small>和<big>大号文本</big>
<tt>等宽字体文本</tt>

<!-- 引用和分隔 -->
<blockquote>这是一个引用块</blockquote>
<hr>
```

## 测试验证

### 测试文件

- `test/markdown-preview-test.html` - 基础功能测试页面
- `test/complete-html-tags-test.html` - 完整HTML标签测试页面
- `test/font-size-control.tsx` - React组件测试
- `test/html-formatting.test.tsx` - 格式支持测试

### 测试要点

1. **深色模式链接显示**：确保链接在深色背景下清晰可见
2. **字体大小调节**：验证所有文本元素都能正确缩放
3. **HTML标签渲染**：检查所有支持的HTML标签正确显示
4. **主题切换**：验证深色/浅色模式切换时样式正确
5. **设置持久化**：确认字体大小设置在页面刷新后保持

## 兼容性

- ✅ 支持所有现代浏览器
- ✅ 支持深色/浅色主题
- ✅ 支持响应式设计
- ✅ 向后兼容现有内容
- ✅ 国际化支持（中英文）

## 配置选项

### CSS变量自定义

```css
:root {
  --font-scale: 1.2;        /* 默认字体缩放 */
  --base-font-size: 18px;   /* 基础字体大小 */
}
```

### 组件属性

```tsx
<FontSizeControl 
  variant="compact"         // 'compact' | 'full'
  showLabel={true}          // 是否显示标签
  className="custom-class"  // 自定义CSS类
/>
```

## 未来扩展

1. **更多字体选项**：支持字体族选择
2. **行高调节**：独立的行高控制
3. **主题自定义**：用户自定义颜色方案
4. **快捷键支持**：键盘快捷键调节字体大小

## 相关文件

- `src/components/FontSizeControl.tsx` - 字体控制组件
- `src/index.css` - 全局样式定义
- `src/i18n/locales/zh.json` - 中文国际化
- `src/i18n/locales/en.json` - 英文国际化
- `src/App.tsx` - 主应用集成
- `test/` - 测试文件目录

---

**更新时间**：2025年11月1日  
**版本**：v1.2.0  
**影响范围**：UI预览区域、全局样式
