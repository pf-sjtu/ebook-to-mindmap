import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ChevronDown, ChevronRight, Eye, EyeOff, CheckCircle, Circle, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

interface Chapter {
  id: string
  title: string
  summary?: string
  mindMap?: any
  processed: boolean
}

interface ChapterNavigationProps {
  chapters: Chapter[]
  processingMode: 'summary' | 'mindmap' | 'combined-mindmap'
  onChapterClick: (chapterId: string) => void
  processing?: boolean
}

export function ChapterNavigation({ 
  chapters, 
  processingMode, 
  onChapterClick, 
  processing = false 
}: ChapterNavigationProps) {
  const { t } = useTranslation()
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set())
  const [currentChapter, setCurrentChapter] = useState<string | null>(null)
  
  const toggleChapter = (chapterId: string) => {
    const newExpanded = new Set(expandedChapters)
    if (newExpanded.has(chapterId)) {
      newExpanded.delete(chapterId)
    } else {
      newExpanded.add(chapterId)
    }
    setExpandedChapters(newExpanded)
  }

  const scrollToChapter = (chapterId: string) => {
    const element = document.getElementById(`chapter-${chapterId}`)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setCurrentChapter(chapterId)
      onChapterClick(chapterId)
      
      // 高亮效果
      element.classList.add('ring-2', 'ring-blue-500', 'ring-opacity-50')
      setTimeout(() => {
        element.classList.remove('ring-2', 'ring-blue-500', 'ring-opacity-50')
      }, 2000)
    }
  }

  const processedCount = chapters.filter(ch => ch.processed).length
  const totalCount = chapters.length

  if (chapters.length === 0) {
    return null
  }

  return (
    <Card className="w-80 h-fit sticky top-4 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <span>{t('chapterNavigation.title')}</span>
          <Badge variant="secondary" className="text-xs">
            {processedCount}/{totalCount}
          </Badge>
        </CardTitle>
        {processing && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{t('progress.processing')}</span>
          </div>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-96">
          <div className="p-4 space-y-2">
            {chapters.map((chapter, index) => {
              const isExpanded = expandedChapters.has(chapter.id)
              const isProcessed = chapter.processed
              const hasContent = processingMode === 'summary' ? chapter.summary : chapter.mindMap
              const isCurrent = currentChapter === chapter.id
              
              return (
                <div 
                  key={chapter.id} 
                  className={cn(
                    "border rounded-lg transition-all duration-200",
                    isCurrent && "ring-2 ring-blue-500 ring-opacity-50",
                    isProcessed && "border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20"
                  )}
                >
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start h-auto p-3 text-left transition-colors",
                      isProcessed && "hover:bg-green-100/50 dark:hover:bg-green-900/30",
                      !isProcessed && !processing && "opacity-50 cursor-not-allowed"
                    )}
                    onClick={() => isProcessed && scrollToChapter(chapter.id)}
                    disabled={!isProcessed && !processing}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          {processing && !isProcessed ? (
                            <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />
                          ) : isProcessed ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <Circle className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {index + 1}. {chapter.title}
                          </div>
                          {processingMode === 'summary' && hasContent && isExpanded && (
                            <div className="text-xs text-muted-foreground mt-1 line-clamp-3">
                              {hasContent.substring(0, 150)}...
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {isProcessed && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 ml-2 flex-shrink-0"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleChapter(chapter.id)
                          }}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </Button>
                  
                  {isExpanded && isProcessed && hasContent && (
                    <div className="px-3 pb-3 text-sm text-muted-foreground border-t">
                      {processingMode === 'summary' ? (
                        <div className="pt-2 whitespace-pre-wrap max-h-32 overflow-y-auto">
                          {hasContent}
                        </div>
                      ) : (
                        <div className="pt-2 text-xs flex items-center gap-1">
                          <CheckCircle className="h-3 w-3 text-green-500" />
                          {t('chapterNavigation.mindMapGenerated')}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
