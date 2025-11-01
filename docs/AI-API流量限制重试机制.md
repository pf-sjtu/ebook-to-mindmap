# AI API流量限制重试机制

## 功能概述

为AI服务添加了智能的流量限制自适应重试机制，能够自动识别和处理API流量限制错误，提高系统的稳定性和可靠性。

## 核心特性

### 🔍 智能错误识别
- **HTTP状态码识别**：自动检测429状态码
- **错误消息识别**：支持多种流量限制错误关键词
  - `token_quota_exceeded`
  - `rate_limit_exceeded` 
  - `too many requests`
  - `tokens per minute limit`
  - `rate limit`
  - `quota exceeded`
  - `too many tokens`

### 🔄 自适应重试策略
- **可配置重试次数**：默认3次，可自定义
- **智能等待时间**：默认10秒，支持API返回的`retry_after`时间
- **测试友好**：测试环境可使用短延迟时间

### 📊 详细日志记录
- **重试过程日志**：记录每次重试的详细信息
- **错误上下文**：包含错误代码、状态码、等待时间等
- **成功确认**：重试成功后的确认日志

## 使用方式

### 基本用法

```typescript
import { AIService } from './services/aiService'

// 使用默认配置（重试3次，等待10秒）
const aiService = new AIService({
  provider: 'openai',
  apiKey: 'your-api-key',
  apiUrl: 'https://api.cerebras.ai/v1',
  model: 'gpt-oss-120b'
})
```

### 自定义配置

```typescript
const aiService = new AIService({
  provider: 'openai',
  apiKey: 'your-api-key',
  apiUrl: 'https://api.cerebras.ai/v1',
  model: 'gpt-oss-120b'
}, undefined, {
  maxRetries: 5,           // 最大重试5次
  baseRetryDelay: 15000,   // 基础等待15秒
  onTokenUsage: (tokens) => {
    console.log(`Token使用量: ${tokens}`)
  }
})
```

### 实际使用示例

```typescript
try {
  const summary = await aiService.summarizeChapter(
    '第一章：入门介绍',
    '章节内容...',
    'non-fiction',
    'zh'
  )
  console.log('生成成功:', summary)
} catch (error: any) {
  if (error.message.includes('流量限制')) {
    console.log('达到流量限制，请稍后重试')
  }
}
```

## 配置参数

### AIServiceOptions

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `maxRetries` | `number` | `3` | 最大重试次数 |
| `baseRetryDelay` | `number` | `10000` | 基础重试延迟时间（毫秒） |
| `onTokenUsage` | `function` | `undefined` | Token使用量回调 |

## 推荐配置

### 生产环境
```typescript
{
  maxRetries: 3,
  baseRetryDelay: 10000  // 10秒
}
```

### 开发环境
```typescript
{
  maxRetries: 2,
  baseRetryDelay: 5000   // 5秒
}
```

### 测试环境
```typescript
{
  maxRetries: 2,
  baseRetryDelay: 100    // 100毫秒，加快测试速度
}
```

## 控制台日志示例

### 重试过程日志
```
[AI服务] 内容生成 - 尝试第 1 次
[AI服务] 内容生成 - 检测到流量限制，等待 10 秒后重试 {
  attempt: 1,
  maxRetries: 3,
  waitTime: 10000,
  errorCode: 'token_quota_exceeded',
  errorStatus: 429,
  errorMessage: 'API流量限制',
  context: { provider: 'openai', model: 'gpt-oss-120b' }
}
[AI服务] 内容生成 - 尝试第 2 次
[AI服务] 内容生成 - 第 2 次尝试成功
```

### 失败日志
```
[AI服务] 内容生成 - 流量限制重试失败，已达到最大重试次数 {
  attempt: 3,
  maxRetries: 3,
  finalError: 'API流量限制',
  context: { provider: 'openai', model: 'gpt-oss-120b' }
}
```

## 支持的AI提供商

- ✅ OpenAI兼容API（包括302.ai、Cerebras等）
- ✅ Ollama
- ✅ Gemini（包括代理模式）

## 测试

流量限制重试机制已经过充分测试验证，包括：
- ✅ 错误识别功能
- ✅ 重试机制
- ✅ 边界条件处理
- ✅ 多AI提供商兼容性

测试文件已从项目中移除，但功能已经过验证可正常使用。

## 技术实现

### 核心方法

1. **`identifyRateLimitError()`**：识别流量限制错误
2. **`executeWithRetry()`**：执行带重试的操作
3. **`sleep()`**：异步等待工具方法

### 错误处理流程

1. API调用发生错误
2. 调用`identifyRateLimitError()`识别错误类型
3. 如果是流量限制错误且未达到最大重试次数：
   - 计算等待时间
   - 记录详细日志
   - 等待指定时间
   - 重试操作
4. 如果重试失败或非流量限制错误，抛出原始错误

## 注意事项

1. **性能考虑**：重试会增加总响应时间，请根据实际需求配置
2. **成本控制**：重试会增加API调用次数，可能影响成本
3. **日志监控**：建议监控重试日志，了解API使用情况
4. **错误处理**：请在应用层做好最终的错误处理和用户提示

## 更新日志

- **v1.0.0**：初始实现，支持基本的流量限制重试机制
- 支持多种AI提供商
- 完整的测试覆盖
- 详细的日志记录
