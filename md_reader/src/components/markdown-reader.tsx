import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkCjkFriendly from "remark-cjk-friendly";
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { DarkModeToggle } from './dark-mode-toggle';
import { FontSizeControl } from './font-size-control';
import { Upload, FileText, Eye } from 'lucide-react';

interface MarkdownReaderProps {
  initialContent?: string;
  title?: string;
}

export const MarkdownReader: React.FC<MarkdownReaderProps> = ({
  initialContent = '',
  title = 'Markdown 阅读器'
}) => {
  const [content, setContent] = useState(initialContent);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(initialContent);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'text/markdown') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setContent(text);
        setEditContent(text);
      };
      reader.readAsText(file);
    }
  };

  const handleSaveEdit = () => {
    setContent(editContent);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditContent(content);
    setIsEditing(false);
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* 头部控制栏 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {title}
              </CardTitle>
              <div className="flex items-center gap-2">
                <FontSizeControl variant="compact" />
                <DarkModeToggle />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 flex-wrap">
              <label htmlFor="file-upload">
                <Button variant="outline" size="sm" asChild>
                  <span className="flex items-center gap-2 cursor-pointer">
                    <Upload className="h-4 w-4" />
                    上传 Markdown 文件
                  </span>
                </Button>
                <input
                  id="file-upload"
                  type="file"
                  accept=".md,.markdown"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              
              {content && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                  className="flex items-center gap-2"
                >
                  <Eye className="h-4 w-4" />
                  {isEditing ? '预览' : '编辑'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 内容区域 */}
        {content ? (
          <Card>
            <CardContent className="p-6">
              {isEditing ? (
                <div className="space-y-4">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full h-96 p-4 border rounded-md bg-background text-foreground font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="在此输入 Markdown 内容..."
                  />
                  <div className="flex gap-2">
                    <Button onClick={handleSaveEdit} size="sm">
                      保存
                    </Button>
                    <Button variant="outline" onClick={handleCancelEdit} size="sm">
                      取消
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="markdown-content prose prose-sm max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkCjkFriendly]}
                  >
                    {content}
                  </ReactMarkdown>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">欢迎使用 Markdown 阅读器</h3>
              <p className="text-muted-foreground mb-4">
                上传 Markdown 文件或直接编辑内容开始使用
              </p>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>支持的功能：</p>
                <p>• 🌙 深色/浅色模式切换</p>
                <p>• 📝 字体大小调节</p>
                <p>• 📄 Markdown 实时预览</p>
                <p>• 🎨 优雅的样式和高亮</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 示例内容 */}
        {!content && (
          <Card>
            <CardHeader>
              <CardTitle>示例内容</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="markdown-content prose prose-sm max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkCjkFriendly]}
                >
                  {`# Markdown 阅读器示例

这是一个功能丰富的 **Markdown 阅读器**，具有以下特性：

## 🎯 主要功能

- 🌙 **深色模式支持** - 保护您的眼睛
- 📝 **字体大小调节** - 自定义阅读体验  
- 📄 **实时预览** - 所见即所得编辑
- 🎨 **优雅样式** - 精美的排版效果

## 📋 支持的 Markdown 语法

### 文本格式

- **粗体文本** 使用黄色马克笔效果
- *斜体文本* 使用淡色马克笔效果
- \`行内代码\` 保持清晰可读

### 列表支持

1. 有序列表项一
2. 有序列表项二
3. 有序列表项三

- 无序列表项一
- 无序列表项二  
- 无序列表项三

### 代码块

\`\`\`javascript
function greet(name) {
  return \`Hello, \${name}!\`;
}

console.log(greet("World"));
\`\`\`

### 引用

> 这是一段引用文本，在深色模式下会有特殊的样式效果。

### 链接和表格

[访问 GitHub](https://github.com)

| 功能 | 状态 | 描述 |
|------|------|------|
| 深色模式 | ✅ | 支持深色/浅色切换 |
| 字体调节 | ✅ | 50%-200% 缩放范围 |
| 文件上传 | ✅ | 支持 .md 文件 |

---

开始使用这个阅读器，享受舒适的 Markdown 阅读体验！`}
                </ReactMarkdown>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
