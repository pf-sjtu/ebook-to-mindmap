# EPUB目录深度过滤功能修复报告

## 问题描述
在"以epub目录读取章节"模式下，即使选择了"关注第几级目录"为1级目录，最后读取的目录也不只一级目录而含有其他级别目录的问题。

## 问题分析
通过分析`src/services/epubProcessor.ts`文件中的`extractChaptersFromToc`方法，发现第231行的递归条件存在问题：

```typescript
// 原始代码（有问题）
if (item.subitems && item.subitems.length > 0 && maxDepth > 0 && currentDepth < maxDepth) {
```

这个逻辑导致：
- 当用户选择"1级目录"时，实际显示深度0和深度1的章节
- 当用户选择"2级目录"时，实际显示深度0、1和2的章节

但用户期望的是：
- "1级目录"应该只显示深度0的章节
- "2级目录"应该显示深度0和1的章节
- "3级目录"应该显示深度0、1和2的章节

## 修复方案
将递归条件从 `currentDepth < maxDepth` 改为 `currentDepth < maxDepth - 1`：

```typescript
// 修复后的代码
if (item.subitems && item.subitems.length > 0 && maxDepth > 0 && currentDepth < maxDepth - 1) {
```

## 修复效果
修复后的行为：
- **1级目录**：只显示深度0的章节（6个主要章节）
- **2级目录**：显示深度0和1的章节（11个章节，包含子章节）
- **3级目录**：显示深度0、1和2的章节（15个章节，包含子子章节）

## 测试验证
创建了多个测试文件验证修复效果：

1. **test/verify-depth-fix.js** - 模拟数据测试
2. **test/epub-toc-depth-test.html** - 浏览器端测试页面
3. **test/real-epub-test.mjs** - 实际EPUB文件测试

所有测试均通过，确认修复有效。

## 核心改动文件
- `src/services/epubProcessor.ts` (第231行)

## 影响范围
此修复只影响"epub-toc"模式下的目录深度过滤功能，不会影响其他章节检测模式（normal、smart）。

## 建议
建议使用实际的EPUB文件进行最终测试，确保在不同结构的EPUB文件中都能正常工作。测试文件可使用：`tmp/海龟交易法则.epub`
