import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog'
import { Settings } from 'lucide-react'
import { WebDAVConfig } from './webdav-config'

interface WebDAVSettingsDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function WebDAVSettingsDialog({ isOpen, onClose }: WebDAVSettingsDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            WebDAV设置
          </DialogTitle>
          <DialogDescription>
            配置WebDAV服务器连接以访问云端Markdown文件
          </DialogDescription>
        </DialogHeader>
        <WebDAVConfig />
      </DialogContent>
    </Dialog>
  )
}
