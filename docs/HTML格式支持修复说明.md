# HTML格式支持修复说明

## 问题描述
UI的处理界面的输出预览窗格（如`data-slot=card-content`的区域）对Markdown和HTML格式支持不全，特别是`<u>`标签无法显示下划线等问题。

## 修复内容

### 1. MarkdownCard.tsx 增强
- **文件位置**: `src/components/MarkdownCard.tsx`
- **修复内容**: 增强了Tailwind prose类的样式配置，添加了对以下HTML标签的支持：
  - `<u>` - 下划线文本
  - `<ins>` - 插入文本（下划线）
  - `<mark>` - 标记文本（背景高亮）
  - `<del>` - 删除文本（删除线）
  - `<s>` - 删除线文本
  - `<sub>` - 下标
  - `<sup>` - 上标
  - `<em>` - 斜体强调

```css
/* 新增的prose样式类 */
prose-u:underline prose-u:text-gray-700 dark:prose-u:text-gray-200
prose-ins:underline prose-ins:text-gray-700 dark:prose-ins:text-gray-200
prose-mark:bg-yellow-200 dark:prose-mark:bg-yellow-800
prose-del:line-through prose-strikethrough:line-through
prose-sub:text-sm prose-sup:text-sm
```

### 2. EpubReader.tsx Shadow DOM样式增强
- **文件位置**: `src/components/EpubReader.tsx`
- **修复内容**: 在Shadow DOM的样式表中添加了完整的HTML标签支持：

```css
/* 下划线样式 */
u, ins {
  text-decoration: underline;
  color: ${isDarkMode ? '#e2e8f0' : '#1f2937'};
}

/* 删除线样式 */
del, s, strikethrough {
  text-decoration: line-through;
  color: ${isDarkMode ? '#94a3b8' : '#6b7280'};
}

/* 标记样式 */
mark {
  background-color: ${isDarkMode ? '#713f12' : '#fef3c7'};
  color: ${isDarkMode ? '#fde68a' : '#92400e'};
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
}

/* 上标和下标 */
sub, sup {
  font-size: 0.75em;
  vertical-align: sub/super;
  line-height: 0;
}
```

### 3. ViewContentDialog.tsx 功能增强
- **文件位置**: `src/components/ViewContentDialog.tsx`
- **修复内容**: 
  - 添加了`contentType`参数，支持三种内容类型：
    - `'text'` - 纯文本（默认）
    - `'markdown'` - Markdown格式
    - `'html'` - HTML格式
  - 集成了ReactMarkdown和相关插件
  - 为不同内容类型提供了相应的样式支持

### 4. 全局CSS样式增强
- **文件位置**: `src/index.css`
- **修复内容**: 在`@layer base`中添加了全局HTML标签样式支持：

```css
/* 全局HTML标签样式支持 */
.prose u { text-decoration: underline; }
.prose ins { text-decoration: underline; }
.prose del { text-decoration: line-through; }
.prose s { text-decoration: line-through; }
.prose strikethrough { text-decoration: line-through; }
.prose mark { 
  background-color: #fef3c7; 
  padding: 0.125rem 0.25rem; 
  border-radius: 0.25rem; 
}
.dark .prose mark { 
  background-color: #713f12; 
  color: #fde68a; 
}
.prose sub, .prose sup { font-size: 0.75em; }
.prose small { font-size: 0.875em; opacity: 0.8; }
```

## 支持的HTML格式

现在预览窗格完全支持以下HTML格式：

| 标签 | 描述 | 示例 |
|------|------|------|
| `<u>` | 下划线文本 | `<u>下划线文本</u>` |
| `<ins>` | 插入文本 | `<ins>插入的文本</ins>` |
| `<del>` | 删除文本 | `<del>删除的文本</del>` |
| `<s>` | 删除线文本 | `<s>删除线文本</s>` |
| `<mark>` | 标记文本 | `<mark>高亮文本</mark>` |
| `<sub>` | 下标 | `H<sub>2</sub>O` |
| `<sup>` | 上标 | `X<sup>2</sup>` |
| `<small>` | 小号文本 | `<small>小号文本</small>` |
| `<em>` | 斜体强调 | `<em>斜体文本</em>` |
| `<strong>` | 粗体强调 | `<strong>粗体文本</strong>` |

## 测试验证

创建了测试文件 `test/html-formatting.test.tsx` 来验证修复效果，包括：
- MarkdownCard中的下划线渲染测试
- ViewContentDialog的Markdown和HTML内容渲染测试
- CSS样式规则的验证

## 兼容性

- ✅ 支持亮色和暗色主题
- ✅ 支持响应式设计
- ✅ 支持中英文混排
- ✅ 向后兼容现有内容

## 使用方法

### 在MarkdownCard中使用
```tsx
<MarkdownCard
  markdownContent="包含<u>下划线</u>和<mark>标记</mark>的Markdown内容"
  // ... 其他props
/>
```

### 在ViewContentDialog中使用
```tsx
<ViewContentDialog
  content="包含<u>下划线</u>的HTML内容"
  contentType="html"
  // ... 其他props
/>
```

现在所有预览窗格都能正确显示HTML格式，包括之前无法显示的`<u>`下划线标签。
