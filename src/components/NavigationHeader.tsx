import React from 'react'
import { ArrowLeft, Settings, BookOpen, BarChart3, Home } from 'lucide-react'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

interface NavigationHeaderProps {
  currentStep: string
  bookTitle?: string
  bookAuthor?: string
  onBackToConfig: () => void
  processing?: boolean
  extractingChapters?: boolean
  progress?: number
  className?: string
}

export const NavigationHeader: React.FC<NavigationHeaderProps> = ({
  currentStep,
  bookTitle,
  bookAuthor,
  onBackToConfig,
  processing = false,
  extractingChapters = false,
  progress = 0,
  className = ""
}) => {
  const { t } = useTranslation()

  // 获取步骤信息
  const getStepInfo = () => {
    if (extractingChapters) {
      return {
        icon: <BookOpen className="h-4 w-4" />,
        title: t('navigation.extractingChapters', { defaultValue: '提取章节中' }),
        color: 'blue'
      }
    }
    if (processing) {
      return {
        icon: <BarChart3 className="h-4 w-4" />,
        title: t('navigation.processing', { defaultValue: '处理中' }),
        color: 'orange'
      }
    }
    return {
      icon: <BookOpen className="h-4 w-4" />,
      title: t('navigation.processingComplete', { defaultValue: '处理完成' }),
      color: 'green'
    }
  }

  const stepInfo = getStepInfo()

  return (
    <div className={cn("bg-background border-b rounded-lg p-4 space-y-3", className)}>
      {/* 顶部导航栏 */}
      <div className="flex items-center justify-between">
        {/* 左侧：返回按钮和面包屑导航 */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onBackToConfig}
            className="flex items-center gap-2 hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('common.backToConfig')}
          </Button>
          
          {/* 面包屑导航 */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Home className="h-3 w-3" />
            <span>/</span>
            <Settings className="h-3 w-3" />
            <span>/</span>
            <BookOpen className="h-3 w-3" />
            <span className="text-foreground font-medium">
              {t('navigation.processing', { defaultValue: '处理' })}
            </span>
          </div>
        </div>

        {/* 右侧：状态指示器 */}
        {(processing || extractingChapters) && (
          <div className="flex items-center gap-2">
            <Badge 
              variant="outline" 
              className={cn(
                "flex items-center gap-1",
                stepInfo.color === 'blue' && "border-blue-200 text-blue-700 bg-blue-50",
                stepInfo.color === 'orange' && "border-orange-200 text-orange-700 bg-orange-50",
                stepInfo.color === 'green' && "border-green-200 text-green-700 bg-green-50"
              )}
            >
              {stepInfo.icon}
              {stepInfo.title}
            </Badge>
            {progress > 0 && (
              <span className="text-sm text-muted-foreground">
                {Math.round(progress)}%
              </span>
            )}
          </div>
        )}
      </div>

      {/* 书籍信息栏 */}
      {bookTitle && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-px bg-border flex-1" />
            <div className="flex items-center gap-2 text-sm">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-foreground">
                {bookTitle}
              </span>
              {bookAuthor && (
                <>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">
                    {bookAuthor}
                  </span>
                </>
              )}
            </div>
            <div className="h-px bg-border flex-1" />
          </div>
        </div>
      )}

      {/* 进度条 */}
      {(processing || extractingChapters) && progress > 0 && (
        <div className="w-full">
          <div className="relative h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className={cn(
                "absolute top-0 left-0 h-full transition-all duration-300 ease-out",
                stepInfo.color === 'blue' && "bg-blue-500",
                stepInfo.color === 'orange' && "bg-orange-500",
                stepInfo.color === 'green' && "bg-green-500"
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
