import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Trash2, BookOpen, ChevronDown, ChevronUp } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkCjkFriendly from "remark-cjk-friendly";
import { CopyButton } from '@/components/ui/copy-button'
import { ViewContentDialog } from './ViewContentDialog'
import { useTranslation } from 'react-i18next'

interface MarkdownCardProps {
  /** 章节ID */
  id: string
  /** 章节标题 */
  title: string
  /** 章节内容（原始内容） */
  content: string
  /** Markdown格式的总结内容 */
  markdownContent: string
  /** 章节索引 */
  index: number
  /** 清除缓存的回调函数 */
  onClearCache?: (chapterId: string) => void
  /** 阅读章节的回调函数 */
  onReadChapter?: () => void
  /** 是否显示清除缓存按钮 */
  showClearCache?: boolean
  /** 是否显示查看内容按钮 */
  showViewContent?: boolean
  /** 是否显示复制按钮 */
  showCopyButton?: boolean
  /** 是否显示阅读按钮 */
  showReadButton?: boolean
  /** 自定义类名 */
  className?: string
  /** 是否默认折叠 */
  defaultCollapsed?: boolean
}

export const MarkdownCard: React.FC<MarkdownCardProps> = ({
  id,
  title,
  content,
  markdownContent,
  index,
  onClearCache,
  onReadChapter,
  showClearCache = true,
  showViewContent = true,
  showCopyButton = true,
  showReadButton = true,
  className = '',
  defaultCollapsed = false,
}) => {
  const { t } = useTranslation()
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed)

  return (
    <Card className={`gap-0 ${className}`}>
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between gap-2">
          <Badge variant="outline"># {index + 1}</Badge>
          <div className="truncate flex-1 w-1" title={title}>
            {title}
          </div>
          {showCopyButton && (
            <CopyButton
              content={markdownContent}
              successMessage={t('common.copiedToClipboard')}
              title={t('common.copyChapterSummary')}
            />
          )}
          {showClearCache && onClearCache && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onClearCache(id)}
              title={t('common.clearCache')}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          {showReadButton && onReadChapter && (
            <Button variant="outline" size="sm" onClick={onReadChapter}>
              <BookOpen className="h-3 w-3" />
            </Button>
          )}
          {showViewContent && (
            <ViewContentDialog
              title={title}
              content={content}
              chapterIndex={index}
            />
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? t('common.expand') : t('common.collapse')}
          >
            {isCollapsed ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </Button>
        </CardTitle>
      </CardHeader>
      {!isCollapsed && (
        <CardContent>
          <div className="text-gray-700 dark:text-gray-200 leading-relaxed prose prose-sm max-w-none prose-headings:text-gray-900 dark:prose-headings:text-gray-100 prose-p:text-gray-700 dark:prose-p:text-gray-200 prose-li:text-gray-700 dark:prose-li:text-gray-200 prose-strong:text-gray-900 dark:prose-strong:text-gray-100 prose-code:text-gray-800 dark:prose-code:text-gray-100 prose-pre:text-gray-200 dark:prose-pre:text-gray-200 prose-blockquote:text-gray-600 dark:prose-blockquote:text-gray-300 prose-hr:border-gray-300 dark:prose-hr:border-gray-600 w-full break-words">
            <ReactMarkdown remarkPlugins={[remarkGfm,remarkCjkFriendly]}>
              {markdownContent || ''}
            </ReactMarkdown>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
