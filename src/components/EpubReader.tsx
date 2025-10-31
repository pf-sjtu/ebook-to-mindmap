import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { BookOpen, Loader2 } from 'lucide-react'
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
}

export function EpubReader({ chapter, bookData, onClose, className, showHeader = true }: EpubReaderProps) {
  const { t } = useTranslation()
  const [chapterHtmlContent, setChapterHtmlContent] = useState<string>('')
  const [isLoadingHtml, setIsLoadingHtml] = useState(false)
  const [epubProcessor] = useState(() => new EpubProcessor())
  const shadowRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // 使用 Shadow DOM 来隔离 EPUB 内容样式
  useEffect(() => {
    if (!shadowRef.current) return
    
    const content = chapterHtmlContent || chapter.content
    if (!content) return

    const shadowRoot = shadowRef.current.shadowRoot || shadowRef.current.attachShadow({ mode: 'open' })
    
    // 检测当前主题
    const isDarkMode = document.documentElement.classList.contains('dark')
    
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
        padding: 0.125rem 0.25rem;
        border-radius: 0.25rem;
        font-family: 'Courier New', monospace;
        font-size: 0.875rem;
      }
      
      pre {
        background-color: ${isDarkMode ? '#374151' : '#f3f4f6'};
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
        width: 100%;
        border-collapse: collapse;
        margin: 1rem 0;
      }
      
      th, td {
        border: 1px solid ${isDarkMode ? '#475569' : '#d1d5db'};
        padding: 0.5rem;
        text-align: left;
      }
      
      th {
        background-color: ${isDarkMode ? '#334155' : '#f9fafb'};
        font-weight: bold;
      }
    `
    
    shadowRoot.innerHTML = `<div>${content}</div>`
    
    // 添加或更新样式
    const existingStyle = shadowRoot.querySelector('style')
    if (existingStyle) {
      existingStyle.replaceWith(style)
    } else {
      shadowRoot.appendChild(style)
    }
  }, [chapterHtmlContent, chapter.content])

  // 加载章节的HTML内容
  useEffect(() => {
    const loadChapterHtml = async () => {
      if (!chapter || !bookData) {
        setChapterHtmlContent('')
        return
      }

      setIsLoadingHtml(true)
      try {
        const htmlContent = await epubProcessor.getSingleChapterHTML(bookData.book, chapter.href || '')
        setChapterHtmlContent(htmlContent)
      } catch (error) {
        console.error('加载章节HTML失败:', error)
        // 如果获取HTML失败，回退到使用原始content
        setChapterHtmlContent(chapter.content)
      } finally {
        setIsLoadingHtml(false)
        // 章节加载完成后滚动到顶部
        if (scrollAreaRef.current) {
          const scrollViewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
          if (scrollViewport) {
            scrollViewport.scrollTop = 0
          }
        }
      }
    }

    loadChapterHtml()
  }, [chapter, bookData, epubProcessor])

  return (
    <div className={cn("w-full space-y-4", className)}>
      {/* 主要阅读区域 */}
      <Card>
        {showHeader && (
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                {chapter.title}
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
              >
                {t('reader.epub.close')}
              </Button>
            </div>
          </CardHeader>
        )}
        <CardContent className={showHeader ? "pt-6" : "pt-3"}>
          <ScrollArea ref={scrollAreaRef} className={showHeader ? "h-[80vh]" : "h-[60vh]"}>
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