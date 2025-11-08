# Vercel部署指南

## 部署步骤

### 1. 确保文件结构正确

```
md_reader/
├── api/
│   ├── webdav.js    # WebDAV代理服务器
│   └── test.js      # 测试函数
├── vercel.json      # Vercel配置
├── package.json     # 项目配置
└── ...其他文件
```

### 2. 检查关键文件

#### api/webdav.js
- 使用ES模块语法 (`export default handler`)
- 支持所有WebDAV方法
- 包含CORS头部处理

#### vercel.json
- 配置了`api/webdav.js`和`api/test.js`的运行时
- 设置了正确的CORS头部

### 3. 部署到Vercel

1. 推送代码到Git仓库
2. Vercel会自动检测`api/`目录并部署Serverless Functions
3. 等待部署完成

### 4. 测试部署

#### 基础测试
访问: `https://your-domain.vercel.app/api/test`
应该返回JSON响应

#### WebDAV代理测试
1. 打开 `test/vercel-function-test.html`
2. 测试基础Function连接
3. 测试WebDAV代理功能

## 故障排除

### 404错误
- 检查`api/`目录是否存在
- 确认文件名正确（`.js`而不是`.ts`）
- 检查`vercel.json`配置

### CORS错误
- 确认`vercel.json`中的headers配置
- 检查函数是否正确返回CORS头部

### 函数不执行
- 检查导出语法 (`export default handler`)
- 查看Vercel函数日志
- 确认运行时配置正确

## 调试方法

1. 查看浏览器网络面板
2. 检查Vercel函数日志
3. 使用测试页面验证功能
4. 对比本地和生产环境差异

## 预期结果

部署成功后，WebDAV功能应该：
- 在Vercel环境自动使用Serverless Function代理
- 在本地开发环境使用Vite代理
- 无需用户手动配置
