import { Button } from '@/components/ui/button'
import { Copy } from 'lucide-react'
import { toast } from 'sonner'

interface CopyButtonProps {
  content: string | undefined
  successMessage?: string
  title?: string
  disabled?: boolean
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

export function CopyButton({
  content,
  successMessage = '已复制到剪贴板',
  title = '复制内容',
  disabled,
  variant = 'outline',
  size = 'sm'
}: CopyButtonProps) {
  const handleCopy = () => {
    if (content) {
      navigator.clipboard.writeText(content)
      toast.success(successMessage, {
        duration: 2000,
        position: 'top-center',
      })
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleCopy}
      disabled={disabled || !content}
      title={title}
    >
      <Copy className="h-4 w-4 " />
    </Button>
  )
}