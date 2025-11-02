# Markdown 阅读器

一个功能丰富、界面优雅的 Markdown 阅读器，支持深色模式、字体调节和实时预览。

## ✨ 特性

- 🌙 **深色/浅色模式** - 自适应系统主题，保护眼睛
- 📝 **字体大小调节** - 50%-200% 缩放范围，自定义阅读体验
- 📄 **实时预览编辑** - 所见即所得的 Markdown 编辑
- 🎨 **优雅样式** - 精美的排版和马克笔高亮效果
- 📁 **文件上传** - 支持 .md 和 .markdown 文件
- 🚀 **快速响应** - 基于 Vite + React + TypeScript

## 🛠️ 技术栈

- **前端框架**: React 18 + TypeScript
- **构建工具**: Vite
- **样式方案**: Tailwind CSS
- **Markdown 渲染**: react-markdown + remark-gfm + remark-cjk-friendly
- **UI 组件**: 基于 Radix UI 的自定义组件
- **图标**: Lucide React

## 📦 依赖说明

### 核心依赖
- `react` & `react-dom`: React 框架
- `react-markdown`: Markdown 渲染引擎
- `remark-gfm`: GitHub Flavored Markdown 支持
- `remark-cjk-friendly`: 中日韩友好排版
- `lucide-react`: 现代化图标库

### UI 组件
- `@radix-ui/react-slot`: 无样式组件基础
- `class-variance-authority`: 组件变体管理
- `clsx` & `tailwind-merge`: 样式工具

### 开发工具
- `vite`: 构建工具
- `typescript`: 类型支持
- `tailwindcss`: CSS 框架
- `@vitejs/plugin-react`: React 支持

## 🚀 快速开始

### 安装依赖
\`\`\`bash
npm install
\`\`\`

### 启动开发服务器
\`\`\`bash
npm run dev
\`\`\`

### 构建生产版本
\`\`\`bash
npm run build
\`\`\`

### 预览生产版本
\`\`\`bash
npm run preview
\`\`\`

## 🎨 样式特色

### 马克笔高亮效果
- **粗体文本**: 黄色马克笔底色效果
- **斜体文本**: 淡色马克笔底色效果
- **深色模式**: 青色马克笔效果

### 响应式设计
- 移动端友好布局
- 自适应字体大小
- 优化的滚动条样式

### 深色模式
- 完整的深色主题支持
- 自动检测系统主题
- 平滑的切换动画

## 📁 项目结构

\`\`\`
md_reader/
├── src/
│   ├── components/
│   │   ├── ui/                 # 基础 UI 组件
│   │   │   ├── button.tsx
│   │   │   └── card.tsx
│   │   ├── theme-provider.tsx  # 主题提供者
│   │   ├── dark-mode-toggle.tsx # 深色模式切换
│   │   ├── font-size-control.tsx # 字体大小控制
│   │   └── markdown-reader.tsx  # 主阅读器组件
│   ├── lib/
│   │   └── utils.ts            # 工具函数
│   ├── App.tsx                 # 主应用组件
│   ├── main.tsx               # 入口文件
│   └── index.css              # 全局样式
├── public/                    # 静态资源
├── index.html                 # HTML 模板
├── package.json               # 项目配置
├── tailwind.config.js         # Tailwind 配置
├── tsconfig.json              # TypeScript 配置
└── vite.config.ts             # Vite 配置
\`\`\`

## 🌟 功能演示

### 支持的 Markdown 语法

- **标题**: H1-H6 各级标题
- **文本**: 粗体、斜体、删除线等
- **列表**: 有序和无序列表
- **代码**: 行内代码和代码块
- **引用**: 块引用和嵌套引用
- **链接**: 内联链接和引用链接
- **表格**: GitHub Flavored 表格
- **分割线**: 水平分割线
- **图片**: Markdown 图片语法

### 交互功能

- 📤 **文件上传**: 点击按钮选择本地 Markdown 文件
- ✏️ **实时编辑**: 切换编辑模式修改内容
- 👁️ **预览模式**: 实时预览渲染效果
- 🌓 **主题切换**: 深色/浅色模式一键切换
- 🔤 **字体调节**: 滑块调节字体大小

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

享受舒适的 Markdown 阅读体验！ 📚✨
