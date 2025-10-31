import React, { useState } from 'react'
import { Upload, Cloud, Check, AlertCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from './ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { Alert, AlertDescription } from './ui/alert'
import { useWebDAVConfig } from '../stores/configStore'
import { webdavService } from '../services/webdavService'
import { toast } from 'sonner'

interface UploadToWebDAVButtonProps {
  bookSummary: any
  file: File | null
  className?: string
}

export const UploadToWebDAVButton: React.FC<UploadToWebDAVButtonProps> = ({
  bookSummary,
  file,
  className = ""
}) => {
  const { t } = useTranslation()
  const webdavConfig = useWebDAVConfig()
  const [isUploading, setIsUploading] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'exists' | 'uploaded' | 'error'>('idle')
  const [fileName, setFileName] = useState('')

  // 生成markdown内容
  const generateMarkdownContent = () => {
    if (!bookSummary || !file) return ''
    
    let markdownContent = `# ${bookSummary.title}\n\n`
    markdownContent += `**作者**: ${bookSummary.author}\n\n`
    markdownContent += `---\n\n`
    
    // 添加章节总结
    bookSummary.chapters.forEach((chapter: any, index: number) => {
      markdownContent += `## ${index + 1}. ${chapter.title}\n\n`
      if (chapter.summary) {
        markdownContent += `${chapter.summary}\n\n`
      }
    })
    
    return markdownContent
  }

  // 生成文件名
  const generateFileName = () => {
    if (!bookSummary) return ''
    const sanitizedTitle = bookSummary.title.replace(/[^\w\s-]/g, '').trim()
    return `${sanitizedTitle}-完整摘要.md`
  }

  // 检查文件是否已存在
  const checkFileExists = async () => {
    if (!webdavConfig.enabled) return false
    
    try {
      const fileName = generateFileName()
      const remotePath = `${webdavConfig.syncPath}/${fileName}`
      const exists = await webdavService.fileExists(remotePath)
      
      if (exists) {
        setUploadStatus('exists')
        setFileName(fileName)
      } else {
        setUploadStatus('idle')
      }
      
      return exists
    } catch (error) {
      console.error('检查文件存在失败:', error)
      setUploadStatus('error')
      return false
    }
  }

  // 上传文件到WebDAV
  const uploadToWebDAV = async (forceOverwrite = false) => {
    if (!webdavConfig.enabled) {
      toast.error('WebDAV未启用，请先在设置中配置WebDAV')
      return
    }

    if (!bookSummary || !file) {
      toast.error('没有可上传的内容')
      return
    }

    setIsUploading(true)
    setUploadStatus('idle')

    try {
      const markdownContent = generateMarkdownContent()
      const fileName = generateFileName()
      const remotePath = `${webdavConfig.syncPath}/${fileName}`

      // 检查是否需要覆盖确认
      if (!forceOverwrite && await webdavService.fileExists(remotePath)) {
        setFileName(fileName)
        setShowConfirmDialog(true)
        setIsUploading(false)
        return
      }

      // 上传文件
      console.log('🚀 开始上传到WebDAV:')
      console.log('   远程路径:', remotePath)
      console.log('   内容长度:', markdownContent.length)
      console.log('   内容预览:', markdownContent.substring(0, 100) + '...')
      
      const uploadResult = await webdavService.uploadFile(remotePath, markdownContent)
      
      console.log('📤 上传结果:', uploadResult)
      
      if (!uploadResult.success) {
        throw new Error(uploadResult.error || '上传失败')
      }
      
      // 验证文件是否真的上传成功
      console.log('🔍 验证上传结果...')
      const verifyResult = await webdavService.fileExists(remotePath)
      console.log('📁 文件存在检查:', verifyResult)
      
      if (!verifyResult) {
        throw new Error('文件上传后验证失败：文件在服务器上未找到')
      }
      
      setUploadStatus('uploaded')
      toast.success(`文件已上传到WebDAV: ${fileName}`)
      
    } catch (error) {
      console.error('上传失败:', error)
      setUploadStatus('error')
      toast.error('上传失败: ' + (error instanceof Error ? error.message : '未知错误'))
    } finally {
      setIsUploading(false)
    }
  }

  // 确认覆盖上传
  const confirmOverwrite = async () => {
    setShowConfirmDialog(false)
    await uploadToWebDAV(true)
  }

  // 组件挂载时检查文件状态
  React.useEffect(() => {
    if (webdavConfig.enabled && bookSummary) {
      checkFileExists()
    }
  }, [webdavConfig.enabled, bookSummary])

  // 如果WebDAV未启用，不显示按钮
  if (!webdavConfig.enabled) {
    return null
  }

  // 根据状态显示不同的按钮
  const renderButton = () => {
    if (isUploading) {
      return (
        <Button variant="outline" size="sm" disabled className={className}>
          <Upload className="h-4 w-4 mr-1 animate-spin" />
          {t('upload.uploading', { defaultValue: '上传中...' })}
        </Button>
      )
    }

    if (uploadStatus === 'uploaded') {
      return (
        <Button variant="outline" size="sm" className={className}>
          <Check className="h-4 w-4 mr-1 text-green-600" />
          {t('upload.uploaded', { defaultValue: '已上传' })}
        </Button>
      )
    }

    if (uploadStatus === 'exists') {
      return (
        <Button variant="outline" size="sm" className={className}>
          <Cloud className="h-4 w-4 mr-1 text-blue-600" />
          {t('upload.exists', { defaultValue: '云端已存在' })}
        </Button>
      )
    }

    return (
      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => uploadToWebDAV()}
        className={className}
        title={t('upload.uploadToWebDAV', { defaultValue: '上传到WebDAV' })}
      >
        <Upload className="h-4 w-4 mr-1" />
        {t('upload.upload', { defaultValue: '上传' })}
      </Button>
    )
  }

  return (
    <>
      {renderButton()}
      
      {/* 覆盖确认对话框 */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              {t('upload.confirmOverwrite', { defaultValue: '确认覆盖文件' })}
            </DialogTitle>
            <DialogDescription>
              <Alert className="mt-2">
                <AlertDescription>
                  {t('upload.fileExistsMessage', { 
                    defaultValue: '文件 "{fileName}" 在WebDAV云端已存在，是否要覆盖它？',
                    fileName 
                  })}
                </AlertDescription>
              </Alert>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowConfirmDialog(false)}
              disabled={isUploading}
            >
              {t('common.cancel', { defaultValue: '取消' })}
            </Button>
            <Button 
              onClick={confirmOverwrite}
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <Upload className="h-4 w-4 mr-1 animate-spin" />
                  {t('upload.uploading', { defaultValue: '上传中...' })}
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-1" />
                  {t('upload.overwrite', { defaultValue: '覆盖' })}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
