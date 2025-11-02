import React, { useState, useRef, useCallback, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkCjkFriendly from "remark-cjk-friendly";
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { 
  FileText, 
  Upload, 
  Download, 
  Trash2, 
  Eye, 
  EyeOff, 
  Settings, 
  Cloud,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  RotateCcw
} from 'lucide-react';
import { DarkModeToggle } from './dark-mode-toggle';
import { FontSizeControl } from './font-size-control';
import { WebDAVFileBrowser } from './webdav-file-browser';
import { WebDAVSettingsDialog } from './webdav-settings-dialog';
import { useWebDAVConfig } from '../stores/webdavStore';
import { webdavService } from '../services/webdavService';
import { 
  AlertCircle, X, Clock, UploadCloud, Replace
} from 'lucide-react';

interface MarkdownReaderProps {
  initialContent?: string;
  title?: string;
}

interface RecentFile {
  name: string;
  content: string;
  timestamp: number;
}

interface TocItem {
  id: string;
  title: string;
  level: number;
  children: TocItem[];
  isCollapsed?: boolean;
}

export const MarkdownReaderEnhanced: React.FC<MarkdownReaderProps> = ({
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

  // 新增状态
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [tocItems, setTocItems] = useState<TocItem[]>([]);
  const [isTocCollapsed, setIsTocCollapsed] = useState(false);
  const [isReplaceDialogOpen, setIsReplaceDialogOpen] = useState(false);
  const [replaceText, setReplaceText] = useState('');
  const [replaceWith, setReplaceWith] = useState('');
  const [originalContent, setOriginalContent] = useState(initialContent);
  const [isSyncing, setIsSyncing] = useState(false);
  const [webdavFilePath, setWebdavFilePath] = useState<string | null>(null);
  
  // 撤回功能相关状态
  const [editHistory, setEditHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // WebDAV相关状态
  const [isWebDAVBrowserOpen, setIsWebDAVBrowserOpen] = useState(false);
  const [isWebDAVSettingsOpen, setIsWebDAVSettingsOpen] = useState(false);
  const webdavConfig = useWebDAVConfig();

  // 统计信息
  const [stats, setStats] = useState({
    totalWords: 0,
    editedWords: 0,
    currentTime: new Date().toLocaleTimeString('zh-CN')
  });

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

  // 更新时间
  useEffect(() => {
    const timer = setInterval(() => {
      setStats(prev => ({
        ...prev,
        currentTime: new Date().toLocaleTimeString('zh-CN')
      }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 更新统计信息
  useEffect(() => {
    const totalWords = content.length;
    const editedWords = Math.abs(content.length - originalContent.length);
    setStats(prev => ({
      ...prev,
      totalWords,
      editedWords
    }));
  }, [content, originalContent]);

  // 生成目录
  useEffect(() => {
    const generateToc = () => {
      const lines = content.split('\n');
      const items: TocItem[] = [];
      const stack: TocItem[] = [];

      lines.forEach((line, index) => {
        // 支持跨行标题 - 检查当前行是否只有 # 符号
        const headingMatch = line.match(/^(#{1,6})\s*(.*)$/);
        
        if (headingMatch) {
          const level = headingMatch[1].length;
          let title = headingMatch[2].trim();
          
          // 如果当前行只有 # 符号，检查下一行是否有标题内容
          if (!title && index + 1 < lines.length) {
            const nextLine = lines[index + 1].trim();
            if (nextLine && !nextLine.startsWith('#')) {
              title = nextLine;
            }
          }
          
          // 如果仍然没有标题，跳过
          if (!title) {
            return;
          }
          
          // 去除标题中的格式标记（加粗、斜体、下划线等）
          title = title
            .replace(/\*\*(.*?)\*\*/g, '$1') // 去除加粗
            .replace(/\*(.*?)\*/g, '$1') // 去除斜体
            .replace(/_(.*?)_/g, '$1') // 去除下划线
            .replace(/`(.*?)`/g, '$1') // 去除行内代码
            .replace(/\[(.*?)\]\(.*?\)/g, '$1') // 去除链接，保留文本
            .trim();

          // 生成唯一的ID，使用行号和标题文本
          const id = `heading-${index}-${title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '-')}`;

          // 设置默认折叠状态：三级及之后标题默认折叠，二级标题默认展开
          const isCollapsed = level >= 3;

          const item: TocItem = {
            id,
            title,
            level,
            children: [],
            isCollapsed
          };

          // 构建树形结构
          while (stack.length > 0 && stack[stack.length - 1].level >= level) {
            stack.pop();
          }

          if (stack.length === 0) {
            items.push(item);
          } else {
            stack[stack.length - 1].children.push(item);
          }

          stack.push(item);
        }
      });

      const applyDefaultCollapseState = (items: TocItem[]): TocItem[] => {
        return items.map(item => ({
          ...item,
          isCollapsed: item.level >= 3,
          children: applyDefaultCollapseState(item.children)
        }));
      };

      setTocItems(applyDefaultCollapseState(items));
    };

    generateToc();
  }, [content]);

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'h') {
        e.preventDefault();
        setIsReplaceDialogOpen(true);
      } else if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        if (isEditing) {
          handleSaveEdit();
        }
      } else if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        if (isEditing) {
          handleUndo();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isEditing, editContent, historyIndex]);

  // 添加到编辑历史
  const addToHistory = useCallback((newContent: string) => {
    setEditHistory(prev => {
      // 如果内容没有变化，不添加到历史
      if (prev.length > 0 && prev[prev.length - 1] === newContent) {
        return prev;
      }
      
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(newContent);
      // 最多保留10条历史记录
      return newHistory.slice(-10);
    });
    setHistoryIndex(prev => Math.min(prev + 1, 9));
  }, [historyIndex]);

  // 撤回功能
  const handleUndo = useCallback(() => {
    console.log('撤回操作 - 当前历史索引:', historyIndex, '历史长度:', editHistory.length);
    
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setEditContent(editHistory[newIndex]);
      console.log('撤回到索引:', newIndex, '内容:', editHistory[newIndex]?.substring(0, 50) + '...');
    } else {
      console.log('无法撤回：已在最早的历史记录');
    }
  }, [historyIndex, editHistory]);

  // 切换目录项折叠状态
  const toggleTocItemCollapse = (itemId: string) => {
    const updateCollapseState = (items: TocItem[]): TocItem[] => {
      return items.map(item => {
        if (item.id === itemId) {
          return { ...item, isCollapsed: !item.isCollapsed };
        }
        if (item.children.length > 0) {
          return { ...item, children: updateCollapseState(item.children) };
        }
        return item;
      });
    };
    
    setTocItems(prev => updateCollapseState(prev));
  };

  // 一键折叠/展开所有目录项
  const toggleAllTocItems = (collapse: boolean) => {
    const updateAllCollapseState = (items: TocItem[]): TocItem[] => {
      return items.map(item => ({
        ...item,
        isCollapsed: collapse,
        children: updateAllCollapseState(item.children)
      }));
    };
    
    setTocItems(prev => updateAllCollapseState(prev));
    setIsTocCollapsed(collapse);
  };

  // 重置为默认折叠状态（二级展开，三级及之后折叠）
  const resetTocToDefault = () => {
    const resetToDefaultState = (items: TocItem[]): TocItem[] => {
      return items.map(item => ({
        ...item,
        isCollapsed: item.level >= 3,
        children: resetToDefaultState(item.children)
      }));
    };
    
    setTocItems(prev => resetToDefaultState(prev));
    setIsTocCollapsed(false);
  };

  const addToRecentFiles = useCallback((name: string, content: string) => {
    const newFile: RecentFile = {
      name,
      content,
      timestamp: Date.now()
    };

    setRecentFiles(prev => {
      const filtered = prev.filter(f => f.name !== name);
      const updated = [newFile, ...filtered].slice(0, 10); // 保留最近10个文件
      localStorage.setItem('recentMarkdownFiles', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const validateFile = (file: File): boolean => {
    const validTypes = ['.md', '.markdown', '.txt'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!validTypes.includes(fileExtension)) {
      setError('不支持的文件类型，请上传 .md、.markdown 或 .txt 文件');
      return false;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB
      setError('文件大小超过10MB，请选择较小的文件');
      return false;
    }

    return true;
  };

  const processFile = useCallback((file: File, filePath?: string) => {
    setError(null);
    
    if (!validateFile(file)) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setContent(text);
      setEditContent(text);
      setOriginalContent(text);
      setFileName(file.name);
      setWebdavFilePath(filePath || null);
      addToRecentFiles(file.name, text);
      
      // 初始化编辑历史
      setEditHistory([text]);
      setHistoryIndex(0);
    };
    
    reader.onerror = () => {
      setError('文件读取失败，请重试');
    };
    
    reader.readAsText(file);
  }, [addToRecentFiles]);

  // 处理WebDAV文件选择
  const handleWebDAVFileSelect = useCallback((file: File, filePath?: string) => {
    processFile(file, filePath);
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
    setOriginalContent('');
    setFileName(null);
    setWebdavFilePath(null);
    setError(null);
    setEditHistory([]);
    setHistoryIndex(-1);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const loadRecentFile = (file: RecentFile) => {
    setContent(file.content);
    setEditContent(file.content);
    setOriginalContent(file.content);
    setFileName(file.name);
    setWebdavFilePath(null);
    setError(null);
    
    // 初始化编辑历史
    setEditHistory([file.content]);
    setHistoryIndex(0);
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
    // 保存后重置历史记录
    setEditHistory([editContent]);
    setHistoryIndex(0);
    console.log('保存编辑，重置历史记录');
  };

  const handleCancelEdit = () => {
    setEditContent(content);
    setIsEditing(false);
    // 取消后重置历史记录
    setEditHistory([content]);
    setHistoryIndex(0);
    console.log('取消编辑，重置历史记录');
  };

  // 开始编辑时初始化历史记录
  const handleStartEdit = () => {
    setIsEditing(true);
    // 初始化历史记录为当前内容
    setEditHistory([editContent]);
    setHistoryIndex(0);
    console.log('开始编辑，初始化历史记录');
  };

  // 处理编辑内容变化
  const handleEditContentChange = (newContent: string) => {
    setEditContent(newContent);
    // 添加到历史记录（防抖处理）
    const timeoutId = setTimeout(() => {
      addToHistory(newContent);
    }, 500);
    
    return () => clearTimeout(timeoutId);
  };

  // 替换文本功能
  const handleReplace = () => {
    if (!replaceText) return;
    
    const newContent = editContent.replace(new RegExp(replaceText, 'g'), replaceWith);
    setEditContent(newContent);
    setContent(newContent);
    setIsReplaceDialogOpen(false);
    setReplaceText('');
    setReplaceWith('');
  };

  // 同步到云端功能
  const handleSyncToCloud = async () => {
    if (!webdavConfig.enabled || !webdavFilePath || !fileName) {
      setError('无法同步：WebDAV未配置或文件不是从云端打开的');
      return;
    }

    if (stats.editedWords === 0) {
      setError('文件没有修改，无需同步');
      return;
    }

    setIsSyncing(true);
    setError(null);

    try {
      console.log('开始同步文件到云端:', webdavFilePath);
      
      // 确保WebDAV服务已初始化
      if (!webdavService.isInitialized()) {
        const initResult = await webdavService.initialize(webdavConfig);
        if (!initResult.success) {
          throw new Error(initResult.error || 'WebDAV服务初始化失败');
        }
      }
      
      // 上传文件内容
      const uploadResult = await webdavService.putFileContents(webdavFilePath, content, true);
      
      if (!uploadResult.success) {
        throw new Error(uploadResult.error || '上传失败');
      }
      
      // 更新原始内容标记
      setOriginalContent(content);
      
      // 显示成功消息
      console.log('文件同步成功');
      
    } catch (error) {
      console.error('同步失败:', error);
      setError(`同步失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // 渲染目录树
  const renderTocItem = (item: TocItem, level: number = 0) => {
    const paddingLeft = `${level * 16}px`;
    const hasChildren = item.children.length > 0;
    
    return (
      <div key={item.id}>
        <div
          className="flex items-center gap-1 py-1 px-2 hover:bg-muted/50 rounded cursor-pointer text-sm group"
          style={{ paddingLeft }}
        >
          {/* 折叠/展开图标 */}
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleTocItemCollapse(item.id);
              }}
              className="h-4 w-4 p-0 hover:bg-muted rounded transition-transform duration-200"
              style={{ transform: item.isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
            >
              <ChevronDown className="h-3 w-3" />
            </button>
          )}
          
          {/* 标题文本 */}
          <div
            className="flex-1 flex items-center gap-1"
            onClick={() => {
              // 查找对应的标题元素
              const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
              let targetElement: Element | null = null;
              
              // 通过标题文本匹配找到对应元素
              for (const heading of headings) {
                if (heading.textContent?.includes(item.title)) {
                  targetElement = heading;
                  break;
                }
              }
              
              if (targetElement) {
                // 给标题元素添加ID以便后续跳转
                if (!targetElement.id) {
                  targetElement.id = item.id;
                }
                
                // 滚动到目标位置
                targetElement.scrollIntoView({ 
                  behavior: 'smooth',
                  block: 'start'
                });
                
                // 高亮效果
                (targetElement as HTMLElement).style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
                setTimeout(() => {
                  (targetElement as HTMLElement).style.backgroundColor = '';
                }, 2000);
              } else {
                console.warn('未找到标题元素:', item.title);
              }
            }}
          >
            <span className="truncate">{item.title}</span>
          </div>
        </div>
        
        {/* 子项 */}
        {hasChildren && !item.isCollapsed && (
          <div className="ml-2">
            {item.children.map(child => renderTocItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background relative">
      {/* 左侧抽屉导航 - 悬浮层 */}
      <div className={`fixed left-0 top-0 h-full bg-background border-r shadow-lg z-50 transition-all duration-300 ${
        isDrawerOpen ? 'w-64' : 'w-0'
      } overflow-hidden`}>
        <div className="p-4 h-full flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm">目录</h3>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={resetTocToDefault}
                className="h-6 w-6 p-0"
                title="重置为默认状态"
              >
                <RotateCcw className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleAllTocItems(!isTocCollapsed)}
                className="h-6 w-6 p-0"
                title={isTocCollapsed ? "展开所有" : "折叠所有"}
              >
                {isTocCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {tocItems.length > 0 ? (
              <div className="space-y-1">
                {tocItems.map(item => renderTocItem(item))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">暂无目录</p>
            )}
          </div>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className={`transition-all duration-300 ${isDrawerOpen ? 'ml-64' : 'ml-0'}`}>
        <div className="flex flex-col h-screen">
          {/* 头部控制栏 */}
          <Card className="m-4 flex-shrink-0">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsDrawerOpen(!isDrawerOpen)}
                    className="h-8 w-8 p-0"
                  >
                    {isDrawerOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </Button>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    {title}
                    {fileName && (
                      <span className="text-sm font-normal text-muted-foreground ml-2">
                        - {fileName}
                      </span>
                    )}
                  </CardTitle>
                </div>
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
                    onClick={() => isEditing ? handleSaveEdit() : handleStartEdit()}
                    className="flex items-center gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    {isEditing ? '预览' : '编辑'}
                  </Button>
                  
                  {/* 同步到云端按钮 */}
                  {webdavConfig.enabled && webdavFilePath && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSyncToCloud}
                      disabled={isSyncing || stats.editedWords === 0}
                      className="flex items-center gap-2"
                    >
                      <UploadCloud className="h-4 w-4" />
                      {isSyncing ? '同步中...' : '同步到云端'}
                    </Button>
                  )}
                  
                  {/* 替换文本按钮 */}
                  {isEditing && (
                    <Dialog open={isReplaceDialogOpen} onOpenChange={setIsReplaceDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="flex items-center gap-2">
                          <Replace className="h-4 w-4" />
                          替换 (Ctrl+H)
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>替换文本</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="replace-text">查找文本</Label>
                            <Input
                              id="replace-text"
                              value={replaceText}
                              onChange={(e) => setReplaceText(e.target.value)}
                              placeholder="输入要替换的文本"
                            />
                          </div>
                          <div>
                            <Label htmlFor="replace-with">替换为</Label>
                            <Input
                              id="replace-with"
                              value={replaceWith}
                              onChange={(e) => setReplaceWith(e.target.value)}
                              placeholder="输入替换后的文本"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button onClick={handleReplace} disabled={!replaceText}>
                              替换全部
                            </Button>
                            <Button variant="outline" onClick={() => setIsReplaceDialogOpen(false)}>
                              取消
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                  
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

        {/* 内容区域 */}
        <div className="flex-1 p-4">
          {content ? (
            <Card className="h-full">
              <CardContent className="p-6 h-full">
                {isEditing ? (
                  <div className="h-full flex flex-col">
                    <textarea
                      value={editContent}
                      onChange={(e) => {
                        setEditContent(e.target.value);
                        // 简单的防抖处理
                        const timeoutId = setTimeout(() => {
                          addToHistory(e.target.value);
                        }, 1000);
                        // 清理之前的定时器
                        if ((window as any).editTimeout) {
                          clearTimeout((window as any).editTimeout);
                        }
                        (window as any).editTimeout = timeoutId;
                      }}
                      className="flex-1 w-full p-4 border rounded-md bg-background text-foreground font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="在此输入 Markdown 内容..."
                    />
                    <div className="flex gap-2 mt-4">
                      <Button onClick={handleSaveEdit} size="sm">
                        保存 (Ctrl+S)
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={handleCancelEdit} 
                        size="sm"
                      >
                        取消
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={handleUndo} 
                        size="sm"
                        disabled={historyIndex <= 0}
                        className="flex items-center gap-2"
                      >
                        撤回 (Ctrl+Z)
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="h-full overflow-y-auto markdown-content prose prose-sm max-w-none">
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
            <Card 
              className={`h-full flex items-center justify-center cursor-pointer transition-all ${
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
                  <p>• 📋 目录导航</p>
                  <p>• 🔄 文本替换功能</p>
                  <p>• ☁️ 云端同步</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* 底部状态栏 */}
        <Card className="m-4">
          <CardContent className="p-2">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center gap-4">
                <span>总字数: {stats.totalWords}</span>
                {stats.editedWords > 0 && (
                  <span className="text-orange-600">已编辑: {stats.editedWords > 0 ? '+' : ''}{stats.editedWords}</span>
                )}
              </div>
              <div className="flex items-center gap-4">
                {fileName && <span>文件: {fileName}</span>}
                <span>{stats.currentTime}</span>
              </div>
            </div>
          </CardContent>
        </Card>
    </div>
      </div>

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
  );
};
