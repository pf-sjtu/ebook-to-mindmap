# UI流量限制配置说明

## 功能概述

在配置对话框的"AI服务配置"标签页中，新增了"AI流量限制配置"模块，允许用户灵活配置API流量限制时的重试策略。

## 配置位置

1. 打开应用配置对话框
2. 选择"AI服务配置"标签页
3. 在"代理设置"下方找到"AI流量限制配置"模块

## 配置选项

### 1. 最大重试次数
- **类型**: 数字输入
- **范围**: 0-10次
- **默认值**: 3次
- **说明**: 当API返回流量限制错误时的最大重试次数

### 2. 重试等待时间（秒）
- **类型**: 数字输入
- **范围**: 1-300秒
- **默认值**: 60秒
- **说明**: 流量限制时的等待时间，测试环境可设置较短时间

## 配置特点

### ✅ 实时生效
- 配置更改立即应用到当前会话
- 无需重启应用或刷新页面

### ✅ 智能重试
- 自动识别429状态码
- 支持token_quota_exceeded等错误代码
- 智能等待时间调整

### ✅ 详细日志
- 完整的重试过程记录
- 包含错误详情和上下文信息
- 便于调试和监控

## 使用建议

### 生产环境
```typescript
maxRetries: 3
baseRetryDelay: 60秒
```

### 开发测试环境
```typescript
maxRetries: 2
baseRetryDelay: 10秒
```

### 高负载环境
```typescript
maxRetries: 5
baseRetryDelay: 120秒
```

## 修复说明

### 问题
用户设置了60秒重试间隔，但实际运行仍显示10秒重试。

### 原因
在`executeWithRetry`方法中，等待时间计算逻辑有误：
- 原逻辑：只有当`baseRetryDelay < 1000`时才使用用户配置
- 否则使用API返回的默认10秒

### 修复
更新等待时间计算逻辑：
- 新逻辑：优先使用用户配置的`baseRetryDelay`
- 如果API返回了`retryAfter`，则使用两者中较大的值
- 确保用户配置得到尊重

### 代码变更
```typescript
// 修复前
const actualWaitTime = this.baseRetryDelay < 1000 ? this.baseRetryDelay : waitTime

// 修复后  
const actualWaitTime = Math.max(this.baseRetryDelay, retryAfterTime)
```

## 技术实现

### 状态管理
- 使用Zustand store管理配置
- 支持持久化存储到localStorage
- 提供响应式状态更新

### 配置传递
- 通过AIServiceOptions接口传递配置
- 在AIService实例化时应用配置
- 支持配置的动态更新

### UI组件
- 使用Tailwind CSS样式
- 支持深色/浅色主题
- 响应式布局设计

## 相关文件

- `src/stores/configStore.ts` - 配置状态管理
- `src/components/project/ConfigDialog.tsx` - UI配置界面
- `src/services/aiService.ts` - AI服务实现
- `src/App.tsx` - 主应用组件

## 注意事项

1. **浏览器兼容性**: 配置在所有现代浏览器中均可正常使用
2. **数据持久化**: 配置会自动保存到浏览器本地存储
3. **配置验证**: 输入值会进行范围验证，确保配置合理
4. **错误处理**: 配置错误时会显示友好的错误提示

## 更新日志

- 2024-11-01: 初始版本发布，支持基础重试配置
- 支持实时配置更新
- 添加详细的配置说明和帮助信息
