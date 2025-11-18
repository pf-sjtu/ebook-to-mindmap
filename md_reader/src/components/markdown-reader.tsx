import React, { useState, useRef, useCallback, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkCjkFriendly from "remark-cjk-friendly";
import { normalizeMarkdownTypography } from '@/lib/markdown';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { DarkModeToggle } from './dark-mode-toggle';
import { FontSizeControl } from './font-size-control';
import { WebDAVFileBrowser } from './webdav-file-browser';
import { WebDAVSettingsDialog } from './webdav-settings-dialog';
import { useWebDAVConfig } from '../stores/webdavStore';
import { Upload, FileText, Eye, AlertCircle, X, Clock, Cloud, Settings } from 'lucide-react';

interface MarkdownReaderProps {
  initialContent?: string;
  title?: string;
}

interface RecentFile {
  name: string;
  content: string;
  timestamp: number;
}

export const MarkdownReader: React.FC<MarkdownReaderProps> = ({
  initialContent = '',
  title = 'Markdown 阅读器'
}) => {
  const [content, setContent] = useState(initialContent);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(initialContent);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // WebDAV相关状态
  const [isWebDAVBrowserOpen, setIsWebDAVBrowserOpen] = useState(false);
  const [isWebDAVSettingsOpen, setIsWebDAVSettingsOpen] = useState(false);
  const webdavConfig = useWebDAVConfig();

  // Load recent files from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('recentMarkdownFiles');
    if (stored) {
      try {
        setRecentFiles(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to load recent files:', e);
      }
    }
  }, []);

  // Save recent files to localStorage when they change
  useEffect(() => {
    if (recentFiles.length > 0) {
      localStorage.setItem('recentMarkdownFiles', JSON.stringify(recentFiles));
    }
  }, [recentFiles]);

  const addToRecentFiles = useCallback((name: string, fileContent: string) => {
    const newFile: RecentFile = {
      name,
      content: fileContent,
      timestamp: Date.now()
    };

    setRecentFiles(prev => {
      // Remove existing file with same name if it exists
      const filtered = prev.filter(f => f.name !== name);
      // Add new file at the beginning and keep only last 5
      return [newFile, ...filtered].slice(0, 5);
    });
  }, []);

  const validateFile = (file: File): boolean => {
    // Check file extension
    const validExtensions = ['.md', '.markdown', '.txt'];
    const hasValidExtension = validExtensions.some(ext => 
      file.name.toLowerCase().endsWith(ext)
    );
    
    if (!hasValidExtension) {
      setError('请选择有效的 Markdown 文件 (.md, .markdown, .txt)');
      return false;
    }

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('文件大小不能超过 10MB');
      return false;
    }

    return true;
  };

  const processFile = useCallback((file: File) => {
    setError(null);
    
    if (!validateFile(file)) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setContent(text);
      setEditContent(text);
      setFileName(file.name);
      addToRecentFiles(file.name, text);
    };
    
    reader.onerror = () => {
      setError('文件读取失败，请重试');
    };
    
    reader.readAsText(file);
  }, [addToRecentFiles]);

  // 处理WebDAV文件选择
  const handleWebDAVFileSelect = useCallback((file: File) => {
    processFile(file);
  }, [processFile]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  }, [processFile]);

  const clearError = () => {
    setError(null);
  };

  const clearFile = () => {
    setContent('');
    setEditContent('');
    setFileName(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const loadRecentFile = (file: RecentFile) => {
    setContent(file.content);
    setEditContent(file.content);
    setFileName(file.name);
    setError(null);
  };

  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) {
      return '刚刚';
    } else if (diffHours < 24) {
      return `${diffHours}小时前`;
    } else {
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}天前`;
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
                {fileName && (
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    - {fileName}
                  </span>
                )}
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
                  ref={fileInputRef}
                  type="file"
                  accept=".md,.markdown,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {/* WebDAV文件浏览按钮 */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsWebDAVBrowserOpen(true)}
                className="flex items-center gap-2"
                disabled={!webdavConfig.enabled}
              >
                <Cloud className="h-4 w-4" />
                从WebDAV打开
              </Button>

              {/* WebDAV设置按钮 */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsWebDAVSettingsOpen(true)}
                className="flex items-center gap-2"
              >
                <Settings className="h-4 w-4" />
                WebDAV设置
              </Button>
              
              {content && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(!isEditing)}
                    className="flex items-center gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    {isEditing ? '预览' : '编辑'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearFile}
                    className="flex items-center gap-2"
                  >
                    <X className="h-4 w-4" />
                    清除文件
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 错误提示 */}
        {error && (
          <Card className="border-destructive">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{error}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearError}
                  className="ml-auto h-6 w-6 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

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
                    {normalizeMarkdownTypography(content)}
                  </ReactMarkdown>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card 
            className={`transition-all duration-200 ${
              isDragging 
                ? 'border-primary border-2 bg-primary/5' 
                : 'border-dashed border-2'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <CardContent className="p-12 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">
                {isDragging ? '释放文件以打开' : '欢迎使用 Markdown 阅读器'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {isDragging 
                  ? '拖拽 Markdown 文件到这里' 
                  : '上传 Markdown 文件、拖拽文件到此处或直接编辑内容开始使用'
                }
              </p>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>支持的功能：</p>
                <p>• 🌙 深色/浅色模式切换</p>
                <p>• 📝 字体大小调节</p>
                <p>• 📄 Markdown 实时预览</p>
                <p>• 🎨 优雅的样式和高亮</p>
                <p>• 🖱️ 拖拽文件支持</p>
                <p>• 🕐 最近文件历史</p>
                <p>• ☁️ WebDAV云端文件访问</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 最近打开的文件 */}
        {!content && recentFiles.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                最近打开的文件
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {recentFiles.map((file) => (
                  <div
                    key={`${file.name}-${file.timestamp}`}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => loadRecentFile(file)}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm font-medium truncate">
                        {file.name}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatTimestamp(file.timestamp)}
                    </span>
                  </div>
                ))}
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
                  {normalizeMarkdownTypography(`# Markdown 阅读器示例

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
开始使用这个阅读器，享受舒适的 Markdown 阅读体验！`)}
                </ReactMarkdown>
              </div>
            </CardContent>
          </Card>
        )}

        {/* WebDAV文件浏览器对话框 */}
        <WebDAVFileBrowser
          isOpen={isWebDAVBrowserOpen}
          onClose={() => setIsWebDAVBrowserOpen(false)}
          onFileSelect={handleWebDAVFileSelect}
          allowedExtensions={['.md', '.markdown', '.txt']}
        />

        {/* WebDAV设置对话框 */}
        <WebDAVSettingsDialog
          isOpen={isWebDAVSettingsOpen}
          onClose={() => setIsWebDAVSettingsOpen(false)}
        />
      </div>
    </div>
  );
};
