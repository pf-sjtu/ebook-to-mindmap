import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { BookOpen, Loader2 } from 'lucide-react'
import type { ChapterData, BookData } from '@/services/epubProcessor'
import { EpubProcessor } from '@/services/epubProcessor'
import { cn } from '@/lib/utils'

interface EpubReaderProps {
  chapter: ChapterData
  bookData?: BookData
  onClose: () => void
  className?: string
}

export function EpubReader({ chapter, bookData, onClose, className }: EpubReaderProps) {
  const [chapterHtmlContent, setChapterHtmlContent] = useState<string>('')
  const [isLoadingHtml, setIsLoadingHtml] = useState(false)
  const [epubProcessor] = useState(() => new EpubProcessor())

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
      }
    }

    loadChapterHtml()
  }, [chapter, bookData, epubProcessor])

  return (
    <div className={cn("w-full space-y-4", className)}>
      {/* 阅读器头部 */}
      <Card>
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
              关闭
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* 主要阅读区域 */}
      <Card>
        <CardContent className="pt-6">
          <ScrollArea className="h-96">
            <div className="prose prose-sm max-w-none">
              {isLoadingHtml ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <span>正在加载章节内容...</span>
                </div>
              ) : (
                <div 
                  className="leading-relaxed text-gray-800 dark:text-gray-200 epub-content"
                  dangerouslySetInnerHTML={{ __html: chapterHtmlContent || chapter.content }}
                  style={{
                    fontSize: '16px',
                    lineHeight: '1.6',
                    fontFamily: 'system-ui, -apple-system, sans-serif'
                  }}
                />
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}