# 📚 Markdown 阅读器测试文档

这是一个用于测试 **Markdown 阅读器** 功能的示例文档。

## 🎯 核心特性测试

### 文本格式化

- **粗体文本** 应该显示黄色马克笔效果
- *斜体文本* 应该显示淡色马克笔效果
- ***粗斜体*** 应该有特殊效果
- ~~删除线~~ 文本样式
- `行内代码` 应该保持等宽字体

### 列表功能

#### 有序列表
1. 第一项功能
2. 第二项功能
3. 第三项功能

#### 无序列表
- 🌙 深色模式支持
- 📝 字体大小调节
- 📄 实时预览编辑
- 🎨 优雅样式效果

### 代码块测试

```javascript
// JavaScript 示例代码
function createMarkdownRenderer(options = {}) {
  const {
    theme = 'github',
    lineNumbers = false,
    highlightSyntax = true
  } = options;
  
  return {
    render: (markdown) => {
      // 渲染逻辑
      return processedHTML;
    }
  };
}

const renderer = createMarkdownRenderer({
  theme: 'dark',
  lineNumbers: true
});
```

```python
# Python 示例代码
def greet_user(name: str, language: str = "zh") -> str:
    """向用户问好的函数"""
    greetings = {
        "zh": f"你好, {name}!",
        "en": f"Hello, {name}!",
        "ja": f"こんにちは, {name}!"
    }
    return greetings.get(language, greetings["zh"])

# 使用示例
message = greet_user("张三", "zh")
print(message)  # 输出: 你好, 张三!
```

### 引用和嵌套

> 这是一段一级引用文本，用于测试引用样式效果。
> 
> > 这是嵌套的二级引用，在深色模式下应该有不同的层次感。
> > 
> > > 三级引用，展示嵌套深度。

### 链接和图片

[访问 GitHub 主页](https://github.com)

[访问 Vite 官网](https://vitejs.dev)

### 表格功能

| 功能特性 | 支持状态 | 描述说明 |
|----------|----------|----------|
| 🌙 深色模式 | ✅ 完全支持 | 自适应系统主题 |
| 📝 字体调节 | ✅ 50%-200% | 平滑缩放体验 |
| 📄 文件上传 | ✅ 支持 | .md/.markdown 文件 |
| 🎨 语法高亮 | ✅ 丰富 | 多语言支持 |
| 📱 响应式 | ✅ 完美 | 移动端友好 |

### 分割线

---

### 任务列表（GFM）

- [x] 完成项目基础架构
- [x] 实现深色模式切换
- [x] 添加字体大小控制
- [x] 集成 Markdown 渲染
- [ ] 添加更多主题选项
- [ ] 支持导出功能
- [ ] 添加协作编辑

### 脚注和扩展

这里有一个脚注[^1]的示例。

[^1]: 这是脚注的内容，用于展示扩展语法支持。

## 🎨 样式效果展示

### 混合格式

这段文本包含了 **粗体**、*斜体*、`代码` 和 [链接](https://example.com) 的混合使用效果。

### 中英文混排

This is **English text** mixed with **中文内容**，测试字体渲染和间距效果。

### 特殊符号

© 版权符号 | ® 注册商标 | ™ 商标符号
≤ 小于等于 | ≥ 大于等于 | ≠ 不等于
± 正负号 | ∞ 无穷大 | ∑ 求和

## 📝 测试结论

这个 Markdown 阅读器具备以下优势：

1. **功能完整** - 支持标准 Markdown 和 GFM 扩展
2. **样式优雅** - 马克笔效果和深色模式
3. **交互友好** - 实时预览和字体调节
4. **技术现代** - React + TypeScript + Vite

---

*🎉 享受愉快的 Markdown 阅读体验！*
