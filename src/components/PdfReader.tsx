import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileText, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import type { ChapterData, BookData } from '@/services/pdfProcessor'
import { PdfProcessor } from '@/services/pdfProcessor'
import { cn } from '@/lib/utils'

interface PdfReaderProps {
  chapter: ChapterData
  bookData?: BookData | any // 支持不同类型的BookData
  onClose: () => void
  className?: string
}

interface PageContent {
  canvas?: HTMLCanvasElement
}

export function PdfReader({ chapter, bookData, onClose, className }: PdfReaderProps) {
  const [chapterPages, setChapterPages] = useState<PageContent[]>([])
  const [currentPageIndex, setCurrentPageIndex] = useState(0)
  const [isLoadingPages, setIsLoadingPages] = useState(false)
  const [pdfProcessor] = useState(() => new PdfProcessor())
  const canvasContainerRef = useRef<HTMLDivElement>(null)

  // 加载章节的页面内容
  useEffect(() => {
    const loadChapterPages = async () => {
      if (!chapter || !bookData?.pdfDocument) {
        setChapterPages([])
        return
      }

      setIsLoadingPages(true)
      try {
        const pages = await pdfProcessor.getChapterPages(bookData.pdfDocument, chapter)
        setChapterPages(pages)
        setCurrentPageIndex(0)
      } catch (error) {
        console.error('加载PDF章节页面失败:', error)
        // 如果获取页面失败，设置空数组
        setChapterPages([])
      } finally {
        setIsLoadingPages(false)
      }
    }

    loadChapterPages()
  }, [chapter, bookData, pdfProcessor])

  // 渲染当前页面的canvas
  useEffect(() => {
    if (chapterPages[currentPageIndex]?.canvas && canvasContainerRef.current) {
      const canvas = chapterPages[currentPageIndex].canvas!
      canvasContainerRef.current.innerHTML = ''
      canvasContainerRef.current.appendChild(canvas)

      // 设置canvas样式
      canvas.style.maxWidth = '100%'
      canvas.style.height = 'auto'
      canvas.style.border = '1px solid #e5e7eb'
      canvas.style.borderRadius = '8px'
      canvas.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
    }
  }, [currentPageIndex, chapterPages])

  const currentPage = chapterPages[currentPageIndex]
  const totalPages = chapterPages.length

  const goToPreviousPage = () => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex(currentPageIndex - 1)
    }
  }

  const goToNextPage = () => {
    if (currentPageIndex < totalPages - 1) {
      setCurrentPageIndex(currentPageIndex + 1)
    }
  }

  return (
    <div className={cn("w-full", className)}>
      {/* 主要阅读区域 */}
      <Card className='gap-0'>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {chapter.title}
              {chapter.startPage && chapter.endPage && (
                <Badge variant="secondary" className="ml-2">
                  第{chapter.startPage}-{chapter.endPage}页
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
              >
                关闭
              </Button>
            </div>
          </div>

          {/* 页面导航 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={goToPreviousPage}
                disabled={currentPageIndex === 0}
                className="flex items-center gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                上一页
              </Button>

              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  第 {currentPageIndex + 1} 页，共 {totalPages} 页
                </span>
                {chapter.startPage && (
                  <Badge variant="outline" className="text-xs">
                    PDF第{(chapter.startPage || 1) + currentPageIndex}页
                  </Badge>
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={goToNextPage}
                disabled={currentPageIndex === totalPages - 1}
                className="flex items-center gap-1"
              >
                下一页
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardHeader>

        <CardContent className="pt-6">
          <ScrollArea className="h-[70vh]">
            {isLoadingPages ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>正在加载PDF页面...</span>
              </div>
            ) : (
              <div className="flex justify-center">
                <div
                  ref={canvasContainerRef}
                  className="max-w-full"
                />
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}