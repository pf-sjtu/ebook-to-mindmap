import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { BookOpen, Loader2, Plus, Minus, Maximize2, Minimize2 } from 'lucide-react'
import type { ChapterData, BookData } from '@/services/epubProcessor'
import { EpubProcessor } from '@/services/epubProcessor'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'
import { useTheme } from './ThemeProvider'

interface EpubReaderProps {
  chapter: ChapterData
  bookData?: BookData
  onClose: () => void
  className?: string
  showHeader?: boolean
  externalFontSize?: number
  externalFullscreen?: boolean
  onToggleFullscreen?: () => void
}

export function EpubReader({ 
  chapter, 
  bookData, 
  onClose, 
  className, 
  showHeader = true, 
  externalFontSize, 
  externalFullscreen, 
  onToggleFullscreen 
}: EpubReaderProps) {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const [chapterHtmlContent, setChapterHtmlContent] = useState<string>('')
  const [isLoadingHtml, setIsLoadingHtml] = useState(false)
  const [epubProcessor] = useState(() => new EpubProcessor())
  const [internalFontSize, setInternalFontSize] = useState(16)
  const [internalIsFullscreen, setIsInternalFullscreen] = useState(false)
  const shadowRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  // 使用外部传入的字体大小或内部状态
  const fontSize = externalFontSize || internalFontSize
  const isFullscreen = externalFullscreen !== undefined ? externalFullscreen : internalIsFullscreen

  // 获取当前实际的主题模式
  const getCurrentTheme = () => {
    if (theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return theme
  }

  const isDarkMode = getCurrentTheme() === 'dark'

  // 字体大小调节函数（只在非外部控制时使用）
  const increaseFontSize = () => {
    if (externalFontSize === undefined) {
      setInternalFontSize(prev => Math.min(prev + 2, 24))
    }
  }

  const decreaseFontSize = () => {
    if (externalFontSize === undefined) {
      setInternalFontSize(prev => Math.max(prev - 2, 12))
    }
  }

  // 全屏切换函数（只在非外部控制时使用）
  const toggleFullscreen = () => {
    if (onToggleFullscreen) {
      onToggleFullscreen()
    } else {
      if (!cardRef.current) return
      
      if (!isFullscreen) {
        // 进入全屏
        if (cardRef.current.requestFullscreen) {
          cardRef.current.requestFullscreen()
        } else if ((cardRef.current as any).webkitRequestFullscreen) {
          (cardRef.current as any).webkitRequestFullscreen()
        } else if ((cardRef.current as any).msRequestFullscreen) {
          (cardRef.current as any).msRequestFullscreen()
        }
      } else {
        // 退出全屏
        if (document.exitFullscreen) {
          document.exitFullscreen()
        } else if ((document as any).webkitExitFullscreen) {
          (document as any).webkitExitFullscreen()
        } else if ((document as any).msExitFullscreen) {
          (document as any).msExitFullscreen()
        }
      }
    }
  }

  // 监听全屏状态变化（只在内部控制时使用）
  useEffect(() => {
    if (externalFullscreen !== undefined) return

    const handleFullscreenChange = () => {
      setIsInternalFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
    document.addEventListener('msfullscreenchange', handleFullscreenChange)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
      document.removeEventListener('msfullscreenchange', handleFullscreenChange)
    }
  }, [externalFullscreen])

  // 使用 Shadow DOM 来隔离 EPUB 内容样式
  useEffect(() => {
    if (!shadowRef.current) return
    
    const content = chapterHtmlContent || chapter.content
    if (!content) return

    const shadowRoot = shadowRef.current.shadowRoot || shadowRef.current.attachShadow({ mode: 'open' })
    
    // 创建样式
    const style = document.createElement('style')
    style.textContent = `
      :host {
        display: block;
        width: 100%;
        min-height: 200px;
      }
      
      div {
        color: ${isDarkMode ? '#e2e8f0' : '#1f2937'};
        background-color: ${isDarkMode ? '#1e293b' : '#ffffff'};
        padding: 1rem;
        border-radius: 0.5rem;
        line-height: 1.6;
        word-wrap: break-word;
        overflow-wrap: break-word;
        max-width: 100%;
        box-sizing: border-box;
        font-size: ${fontSize}px;
      }
      
      /* 确保所有文本元素都不会溢出 */
      * {
        word-wrap: break-word;
        overflow-wrap: break-word;
        max-width: 100%;
        box-sizing: border-box;
      }
      
      /* 防止长文本溢出 */
      p, span, div, text {
        word-wrap: break-word;
        overflow-wrap: break-word;
        hyphens: auto;
      }
      
      /* 标题样式 */
      h1, h2, h3, h4, h5, h6 {
        color: ${isDarkMode ? '#f1f5f9' : '#111827'};
        margin-top: 1.5rem;
        margin-bottom: 1rem;
      }
      
      /* 段落样式 */
      p {
        margin-bottom: 1rem;
        text-align: justify;
      }
      
      /* 链接样式 */
      a {
        color: ${isDarkMode ? '#60a5fa' : '#2563eb'};
        text-decoration: underline;
      }
      
      a:hover {
        color: ${isDarkMode ? '#93c5fd' : '#1d4ed8'};
      }
      
      /* 列表样式 */
      ul, ol {
        margin-bottom: 1rem;
        padding-left: 2rem;
      }
      
      li {
        margin-bottom: 0.5rem;
      }
      
      /* 引用样式 */
      blockquote {
        border-left: 4px solid ${isDarkMode ? '#475569' : '#d1d5db'};
        padding-left: 1rem;
        margin: 1rem 0;
        font-style: italic;
        color: ${isDarkMode ? '#94a3b8' : '#6b7280'};
      }
      
      /* 代码样式 */
      code {
        background-color: ${isDarkMode ? '#374151' : '#f3f4f6'};
        color: ${isDarkMode ? '#f3f4f6' : '#111827'};
        padding: 0.125rem 0.25rem;
        border-radius: 0.25rem;
        font-family: 'Courier New', monospace;
      }
      
      pre {
        background-color: ${isDarkMode ? '#374151' : '#f3f4f6'};
        color: ${isDarkMode ? '#f3f4f6' : '#111827'};
        padding: 1rem;
        border-radius: 0.5rem;
        overflow-x: auto;
        margin: 1rem 0;
      }
      
      pre code {
        background-color: transparent;
        padding: 0;
      }
      
      /* 表格样式 */
      table {
        border-collapse: collapse;
        width: 100%;
        margin: 1rem 0;
      }
      
      th, td {
        border: 1px solid ${isDarkMode ? '#475569' : '#d1d5db'};
        padding: 0.5rem;
        text-align: left;
      }
      
      th {
        background-color: ${isDarkMode ? '#374151' : '#f9fafb'};
        font-weight: bold;
      }
      
      /* 图片样式 */
      img {
        max-width: 100%;
        height: auto;
        margin: 1rem 0;
        border-radius: 0.5rem;
      }
      
      /* 强调样式 */
      strong, b {
        font-weight: bold;
        color: ${isDarkMode ? '#f1f5f9' : '#111827'};
      }
      
      em, i {
        font-style: italic;
      }
      
      /* 下划线样式 */
      u, ins {
        text-decoration: underline;
        color: ${isDarkMode ? '#e2e8f0' : '#1f2937'};
      }
      
      /* 删除线样式 */
      del, s, strikethrough {
        text-decoration: line-through;
        color: ${isDarkMode ? '#94a3b8' : '#6b7280'};
      }
      
      /* 标记样式 */
      mark {
        background-color: ${isDarkMode ? '#713f12' : '#fef3c7'};
        color: ${isDarkMode ? '#fde68a' : '#92400e'};
        padding: 0.125rem 0.25rem;
        border-radius: 0.25rem;
      }
      
      /* 上标和下标 */
      sub {
        font-size: 0.75em;
        vertical-align: sub;
        line-height: 0;
      }
      
      sup {
        font-size: 0.75em;
        vertical-align: super;
        line-height: 0;
      }
      
      /* 小号文本 */
      small {
        font-size: 0.875em;
        color: ${isDarkMode ? '#94a3b8' : '#6b7280'};
      }
    `
    
    // 清除之前的内容
    shadowRoot.innerHTML = ''
    
    // 添加样式
    shadowRoot.appendChild(style)
    
    // 创建内容容器
    const contentDiv = document.createElement('div')
    contentDiv.innerHTML = content
    
    // 添加内容到Shadow DOM
    shadowRoot.appendChild(contentDiv)
    
    // 确保内容完全渲染后滚动到顶部
    requestAnimationFrame(() => {
      if (scrollAreaRef.current) {
        const scrollViewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
        if (scrollViewport) {
          scrollViewport.scrollTop = 0
        }
      }
    })
    
  }, [chapterHtmlContent, chapter.content, chapter.title, fontSize, isDarkMode]) // 添加 isDarkMode 依赖确保主题变化时重新渲染

  // 加载章节的HTML内容
  useEffect(() => {
    const loadChapterHtml = async () => {
      if (!chapter || !bookData) {
        setChapterHtmlContent('')
        return
      }

      setIsLoadingHtml(true)
      try {
        // 增加延迟确保Shadow DOM已准备好
        await new Promise(resolve => setTimeout(resolve, 50))
        
        const htmlContent = await epubProcessor.getSingleChapterHTML(bookData.book, chapter.href || '')
        
        // 确保HTML内容有效后再设置
        if (htmlContent && htmlContent.trim()) {
          setChapterHtmlContent(htmlContent)
        } else {
          // 如果获取的HTML内容为空，回退到使用原始content
          console.warn('获取的HTML内容为空，使用原始content')
          setChapterHtmlContent(chapter.content)
        }
      } catch (error) {
        console.error('加载章节HTML失败:', error)
        // 如果获取HTML失败，回退到使用原始content
        setChapterHtmlContent(chapter.content)
      } finally {
        setIsLoadingHtml(false)
      }
    }

    loadChapterHtml()
  }, [chapter, bookData, epubProcessor])

  // 确保内容变化时重新渲染Shadow DOM
  useEffect(() => {
    if (!isLoadingHtml && shadowRef.current && chapterHtmlContent) {
      // 强制触发Shadow DOM更新
      const event = new Event('content-updated')
      shadowRef.current.dispatchEvent(event)
      
      // 确保内容完全渲染后滚动到顶部
      setTimeout(() => {
        if (scrollAreaRef.current) {
          const scrollViewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
          if (scrollViewport) {
            scrollViewport.scrollTop = 0
          }
        }
      }, 100)
    }
  }, [chapterHtmlContent, isLoadingHtml])

  // 动态调整全屏模式下的高度
  useEffect(() => {
    if (!isFullscreen || !scrollAreaRef.current) return

    const adjustHeight = () => {
      if (scrollAreaRef.current) {
        const viewportHeight = window.innerHeight
        const headerHeight = showHeader ? 80 : 40 // 头部高度
        const paddingHeight = 40 // 额外的内边距
        const targetHeight = viewportHeight - headerHeight - paddingHeight
        
        scrollAreaRef.current.style.height = `${targetHeight}px`
        
        // 同时调整 shadow DOM 的样式
        if (shadowRef.current) {
          const shadowRoot = shadowRef.current.shadowRoot
          if (shadowRoot) {
            const contentDiv = shadowRoot.querySelector('div')
            if (contentDiv) {
              contentDiv.style.maxHeight = 'none'
              contentDiv.style.height = 'auto'
            }
          }
        }
      }
    }

    adjustHeight()
    window.addEventListener('resize', adjustHeight)
    
    return () => {
      window.removeEventListener('resize', adjustHeight)
    }
  }, [isFullscreen, showHeader])

  return (
    <div 
      className={cn(
        "w-full space-y-4", 
        className,
        isFullscreen && "fixed inset-0 z-50 bg-background"
      )}
      style={isFullscreen ? { height: '100vh', width: '100vw', margin: 0, padding: 0 } : {}}
    >
      {/* 主要阅读区域 */}
      <Card 
        ref={cardRef}
        className={cn(
          "",
          isFullscreen && "w-full h-full m-0 rounded-none border-0 shadow-none"
        )}
        style={isFullscreen ? { height: '100vh', width: '100vw' } : {}}
      >
        {showHeader && (
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                {chapter.title}
              </CardTitle>
              <div className="flex items-center gap-2">
                {/* 字体大小调节按钮 - 只在非外部控制时显示 */}
                {externalFontSize === undefined && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={decreaseFontSize}
                      disabled={fontSize <= 12}
                      title={t('reader.epub.decreaseFontSize', '减小字体')}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium px-2 min-w-[3rem] text-center">
                      {fontSize}px
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={increaseFontSize}
                      disabled={fontSize >= 24}
                      title={t('reader.epub.increaseFontSize', '增大字体')}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </>
                )}
                
                {/* 全屏切换按钮 - 只在非外部控制时显示 */}
                {externalFullscreen === undefined && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleFullscreen}
                    title={isFullscreen ? t('reader.epub.exitFullscreen', '退出全屏') : t('reader.epub.enterFullscreen', '进入全屏')}
                  >
                    {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                  </Button>
                )}
                
                {/* 关闭按钮 */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClose}
                >
                  {t('reader.epub.close')}
                </Button>
              </div>
            </div>
          </CardHeader>
        )}
        <CardContent 
        className={cn(
          showHeader ? "pt-6" : "pt-3"
        )}
        style={isFullscreen ? { 
          height: showHeader ? 'calc(100vh - 120px)' : 'calc(100vh - 80px)', 
          padding: showHeader ? '1.5rem 1rem 0 1rem' : '0.75rem 1rem 0 1rem',
          flex: 1,
          overflow: 'hidden'
        } : {}}
      >
          <ScrollArea 
            ref={scrollAreaRef} 
            className={showHeader ? "h-[80vh]" : "h-[60vh]"}
          >
            <div className="prose prose-sm max-w-none">
              {isLoadingHtml ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <span>{t('reader.epub.loadingContent')}</span>
                </div>
              ) : (
                <div ref={shadowRef} className="w-full min-h-[200px]" />
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}