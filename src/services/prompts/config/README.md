# Prompt配置说明

本目录包含了从代码中分离出来的系统默认prompt配置，使用YAML格式存储，方便修改和维护。

## 文件结构

- `v1-prompts.yaml` - V1版本的prompt配置
- `v2-prompts.yaml` - V2版本的prompt配置（优化版）
- `promptLoader.ts` - Prompt配置加载器
- `README.md` - 本说明文件

## 配置格式

每个YAML文件包含以下类型的prompt：

### 章节总结提示词 (chapterSummary)
- `fiction` - 小说类章节总结
- `nonFiction` - 社科类章节总结

### 思维导图提示词 (mindmap)
- `chapter` - 章节思维导图
- `arrow` - 思维导图箭头连接
- `combined` - 整书思维导图

### 其他提示词
- `connectionAnalysis` - 章节关联分析
- `overallSummary` - 全书总结
- `system.testConnection` - 系统测试连接

## 使用方法

### 1. 修改Prompt配置

直接编辑对应的YAML文件即可修改prompt内容。修改后需要重新构建应用：

```bash
npm run build
```

### 2. 添加新版本

要添加新的prompt版本：

1. 复制现有的YAML文件（如`v2-prompts.yaml`）
2. 重命名为新版本（如`v3-prompts.yaml`）
3. 修改内容
4. 更新`promptLoader.ts`中的导入语句
5. 更新类型定义和加载逻辑

### 3. 在代码中使用

```typescript
import { 
  getChapterSummaryPrompt,
  getMindmapPrompt,
  getConnectionAnalysisPrompt,
  getOverallSummaryPrompt,
  getSystemPrompt
} from '../config/promptLoader'

// 获取V1版本的小说类章节总结prompt
const fictionPrompt = getChapterSummaryPrompt('v1', 'fiction')

// 获取V2版本的思维导图prompt
const mindmapPrompt = getMindmapPrompt('v2', 'chapter')

// 获取系统测试连接prompt
const testPrompt = getSystemPrompt('testConnection')
```

## 注意事项

1. **YAML语法**：确保YAML文件语法正确，注意缩进和特殊字符的转义
2. **变量占位符**：保持现有的变量占位符格式，如`{{title}}`、`{{content}}`等
3. **版本兼容**：修改prompt时注意保持向后兼容性
4. **测试验证**：修改后建议运行测试确保功能正常

## 变量占位符说明

常用的变量占位符：

- `{{title}}` - 章节标题
- `{{content}}` - 章节内容
- `{{chapterSummaries}}` - 章节总结列表
- `{{chapterInfo}}` - 章节信息
- `{{connections}}` - 章节关联分析
- `{{bookTitle}}` - 书籍标题

这些占位符会在运行时被实际内容替换。
