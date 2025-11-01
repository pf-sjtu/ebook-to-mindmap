import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog"
import { Button } from "./ui/button"
import { ScrollArea } from "./ui/scroll-area"
import { Eye } from "lucide-react"
import { useTranslation } from 'react-i18next'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkCjkFriendly from "remark-cjk-friendly";

interface ViewContentDialogProps {
  title: string
  content: string
  chapterIndex: number
  contentType?: 'text' | 'markdown' | 'html'
}

export function ViewContentDialog({ title, content, chapterIndex, contentType = 'text' }: ViewContentDialogProps) {
  const { t } = useTranslation()
  
  const renderContent = () => {
    switch (contentType) {
      case 'markdown':
        return (
          <div className="text-gray-700 dark:text-gray-200 leading-relaxed prose prose-sm max-w-none prose-headings:text-gray-900 dark:prose-headings:text-gray-100 prose-p:text-gray-700 dark:prose-p:text-gray-200 prose-li:text-gray-700 dark:prose-li:text-gray-200 prose-strong:text-gray-900 dark:prose-strong:text-gray-100 prose-em:text-gray-900 dark:prose-em:text-gray-100 prose-code:text-gray-800 dark:prose-code:text-gray-100 prose-pre:text-gray-200 dark:prose-pre:text-gray-200 prose-blockquote:text-gray-600 dark:prose-blockquote:text-gray-300 prose-hr:border-gray-300 dark:prose-hr:border-gray-600 prose-u:underline prose-u:text-gray-700 dark:prose-u:text-gray-200 prose-ins:underline prose-ins:text-gray-700 dark:prose-ins:text-gray-200 prose-mark:bg-yellow-200 dark:prose-mark:bg-yellow-800 prose-del:line-through prose-strikethrough:line-through prose-sub:text-sm prose-sup:text-sm w-full break-words">
            <ReactMarkdown remarkPlugins={[remarkGfm, remarkCjkFriendly]}>
              {content || ''}
            </ReactMarkdown>
          </div>
        )
      case 'html':
        return (
          <div 
            className="text-gray-700 dark:text-gray-200 leading-relaxed text-sm max-w-none w-full break-words"
            dangerouslySetInnerHTML={{ __html: content || '' }}
          />
        )
      default:
        return (
          <div className="whitespace-pre-wrap text-sm leading-relaxed">
            {content}
          </div>
        )
    }
  }
  
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
        >
          <Eye className="h-4 w-4 " />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{title} - {t('viewContent.originalText')}</DialogTitle>
          <DialogDescription>
            {t('viewContent.chapterContent', { chapter: chapterIndex + 1 })}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[60vh] w-full rounded-md border p-4">
          {renderContent()}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}