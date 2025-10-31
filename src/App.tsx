import { useState, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Upload, BookOpen, Brain, FileText, Loader2, Network, Trash2, List, ChevronUp, ArrowLeft, Download } from 'lucide-react'
import { EpubProcessor, type ChapterData, type BookData as EpubBookData } from './services/epubProcessor'
import { PdfProcessor, type BookData as PdfBookData } from './services/pdfProcessor'
import { AIService } from './services/aiService'
import { CacheService } from './services/cacheService'
import { notificationService } from './services/notificationService'
import { webdavService } from './services/webdavService'
import { autoSyncService } from './services/autoSyncService'
import { ConfigDialog } from './components/project/ConfigDialog'
import { WebDAVFileBrowser } from './components/project/WebDAVFileBrowser'
import type { MindElixirData, Options } from 'mind-elixir'
import type { Summary } from 'node_modules/mind-elixir/dist/types/summary'
import { LanguageSwitcher } from './components/LanguageSwitcher'
import { ThemeSwitcher } from './components/ThemeSwitcher'
import { MarkdownCard } from './components/MarkdownCard'
import { MindMapCard } from './components/MindMapCard'
import { TimelineNavigation } from './components/TimelineNavigation'
import { ChapterSummaryNavigation } from './components/ChapterSummaryNavigation'
import { EpubReader } from './components/EpubReader'
import { PdfReader } from './components/PdfReader'
import { toast } from 'sonner'
import { Toaster } from '@/components/ui/sonner'
import { scrollToTop, openInMindElixir, downloadMindMap } from './utils'
import { useWebDAVConfig } from './stores/configStore'


const options = { direction: 1, alignment: 'nodes' } as Options

interface Chapter {
  id: string
  title: string
  content: string
  summary?: string
  mindMap?: MindElixirData
  processed: boolean
}

interface BookSummary {
  title: string
  author: string
  chapters: Chapter[]
  connections: string
  overallSummary: string
}

interface BookMindMap {
  title: string
  author: string
  chapters: Chapter[]
  combinedMindMap: MindElixirData | null
}

// 导入配置store
import { useAIConfig, useProcessingOptions, usePromptConfig, useConfigStore } from './stores/configStore'
const cacheService = new CacheService()

function App() {
  const { t } = useTranslation()
  const webdavConfig = useWebDAVConfig()
  
  const [currentStepIndex, setCurrentStepIndex] = useState(1) // 1: 配置步骤, 2: 处理步骤
  const [file, setFile] = useState<File | null>(null)
  const [processing, setProcessing] = useState(false)
  const [extractingChapters, setExtractingChapters] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState('')
  const [bookSummary, setBookSummary] = useState<BookSummary | null>(null)
  const [bookMindMap, setBookMindMap] = useState<BookMindMap | null>(null)
  const [extractedChapters, setExtractedChapters] = useState<ChapterData[] | null>(null)
  
  // WebDAV相关状态
  const [isWebDAVBrowserOpen, setIsWebDAVBrowserOpen] = useState(false)
  const [selectedChapters, setSelectedChapters] = useState<Set<string>>(new Set())
  const [bookData, setBookData] = useState<{ title: string; author: string } | null>(null)
  const [fullBookData, setFullBookData] = useState<EpubBookData | PdfBookData | null>(null)
  const [customPrompt, setCustomPrompt] = useState('')
  const [showBackToTop, setShowBackToTop] = useState(false)
  const [currentReadingChapter, setCurrentReadingChapter] = useState<ChapterData | null>(null)
  const [rightPanelContent, setRightPanelContent] = useState<{
    type: 'chapter' | 'content'
    chapter: ChapterData
    title: string
  } | null>(null)
  const [currentProcessingChapter, setCurrentProcessingChapter] = useState<string>('')
  const [currentViewingChapter, setCurrentViewingChapter] = useState<string>('')
  const [currentViewingChapterSummary, setCurrentViewingChapterSummary] = useState<string>('')
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set())



  // 使用zustand store管理配置
  const aiConfig = useAIConfig()
  const processingOptions = useProcessingOptions()
  const promptConfig = usePromptConfig()
  const { apiKey } = aiConfig
  const { processingMode, bookType, useSmartDetection, skipNonEssentialChapters } = processingOptions

  // zustand的persist中间件会自动处理配置的加载和保存

  // WebDAV自动连接测试
  useEffect(() => {
    const initializeWebDAVIfNeeded = async () => {
      // 如果WebDAV已启用且配置完整但服务未初始化，自动测试连接
      if (webdavConfig.enabled && 
          webdavConfig.serverUrl && 
          webdavConfig.username && 
          webdavConfig.password &&
          !webdavService.isInitialized()) {
        
        console.log('App: WebDAV配置完整，自动初始化连接...')
        
        try {
          const initResult = await webdavService.initialize(webdavConfig)
          if (initResult.success) {
            console.log('App: WebDAV自动连接成功')
            toast.success('WebDAV已自动连接')
          } else {
            console.error('App: WebDAV自动连接失败:', initResult.error)
            // 不显示错误提示，避免与配置页面的测试提示冲突
          }
        } catch (error) {
          console.error('App: WebDAV自动连接异常:', error)
        }
      }
    }

    // 延迟执行，避免组件初始化时的重复调用
    // 给WebDAVConfig组件留出时间处理配置变化
    const timer = setTimeout(initializeWebDAVIfNeeded, 3000)
    return () => clearTimeout(timer)
  }, [webdavConfig.enabled, webdavConfig.serverUrl, webdavConfig.username, webdavConfig.password])

  // 请求通知权限
  useEffect(() => {
    if (processingOptions.enableNotification) {
      notificationService.requestPermission().then(hasPermission => {
        if (!hasPermission) {
          console.warn('浏览器通知权限被拒绝')
        }
      })
    }
  }, [processingOptions.enableNotification])

  // 监听滚动事件，控制回到顶部按钮显示
  useEffect(() => {
    const scrollContainer = document.querySelector('.scroll-container')
    if (!scrollContainer) return

    const handleScroll = () => {
      setShowBackToTop(scrollContainer.scrollTop > 300)
    }

    scrollContainer.addEventListener('scroll', handleScroll)
    return () => scrollContainer.removeEventListener('scroll', handleScroll)
  }, [])

  // 处理文件上传
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0]
    if (!uploadedFile) return

    setFile(uploadedFile)
    setExtractedChapters(null)
    setBookData(null)
    setSelectedChapters(new Set())
    setBookSummary(null)
    setBookMindMap(null)
    setCurrentStepIndex(1)
  }, [])

  // 加载缓存数据
  const loadCachedData = useCallback(() => {
    if (!file) return
    
    // 加载总结缓存
    const summaryCache = cacheService.getSummary(file.name)
    if (summaryCache && summaryCache.chapters.length > 0) {
      // 需要从extractedChapters获取章节的完整信息
      const chapters: Chapter[] = summaryCache.chapters.map((cachedChapter: any) => {
        const extractedChapter = extractedChapters?.find(ch => ch.id === cachedChapter.id)
        return {
          id: cachedChapter.id,
          title: extractedChapter?.title || `Chapter ${cachedChapter.id}`,
          content: extractedChapter?.content || '',
          summary: cachedChapter.summary,
          processed: true
        }
      })
      
      const summary: BookSummary = {
        title: bookData?.title || '',
        author: bookData?.author || '',
        chapters,
        connections: summaryCache.connections || '',
        overallSummary: summaryCache.overallSummary || ''
      }
      setBookSummary(summary)
    }
    
    // 加载思维导图缓存
    const mindMapCache = cacheService.getMindMapData(file.name)
    if (mindMapCache && mindMapCache.chapters.length > 0) {
      // 需要从extractedChapters获取章节的完整信息
      const chapters: Chapter[] = mindMapCache.chapters.map((cachedChapter: any) => {
        const extractedChapter = extractedChapters?.find(ch => ch.id === cachedChapter.id)
        return {
          id: cachedChapter.id,
          title: extractedChapter?.title || `Chapter ${cachedChapter.id}`,
          content: extractedChapter?.content || '',
          mindMap: cachedChapter.mindMap,
          processed: true
        }
      })
      
      const mindMap: BookMindMap = {
        title: bookData?.title || '',
        author: bookData?.author || '',
        chapters,
        combinedMindMap: mindMapCache.combinedMindMap || null
      }
      setBookMindMap(mindMap)
    }
  }, [file, extractedChapters, bookData])

  // 当文件变化时加载缓存数据
  useEffect(() => {
    loadCachedData()
  }, [loadCachedData])

  // 处理文件变化
  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0]
    if (!uploadedFile) return

    setFile(uploadedFile)
    setExtractedChapters(null)
    setBookData(null)
    setSelectedChapters(new Set())
    setBookSummary(null)
    setBookMindMap(null)
    setCurrentStepIndex(1)
    setRightPanelContent(null)
  }, [])

  // 处理WebDAV文件选择
  const handleWebDAVFileSelect = useCallback(async (file: File) => {
    // 直接使用已经下载的File对象
    setFile(file)
    setExtractedChapters(null)
    setBookData(null)
    setSelectedChapters(new Set())
    setBookSummary(null)
    setBookMindMap(null)
    setCurrentStepIndex(1)
    setRightPanelContent(null)
    
    toast.success(`已选择文件: ${file.name}`)
  }, [])

  // 获取文件MIME类型
  const getMimeType = (fileName: string): string => {
    const extension = fileName.toLowerCase().split('.').pop()
    switch (extension) {
      case 'pdf':
        return 'application/pdf'
      case 'epub':
        return 'application/epub+zip'
      case 'txt':
        return 'text/plain'
      case 'md':
        return 'text/markdown'
      default:
        return 'application/octet-stream'
    }
  }

  // 打开WebDAV文件浏览器
  const openWebDAVBrowser = useCallback(() => {
    if (!webdavConfig.enabled) {
      toast.error('请先在设置中启用并配置WebDAV')
      return
    }
    
    if (!webdavService.isInitialized()) {
      toast.error('WebDAV服务未初始化，请先测试连接')
      return
    }
    
    setIsWebDAVBrowserOpen(true)
  }, [webdavConfig.enabled])

  // 章节导航处理（用于原文预览）
  const handleChapterNavigation = useCallback((chapterId: string) => {
    const chapter = extractedChapters?.find(ch => ch.id === chapterId)
    if (chapter) {
      setRightPanelContent({
        type: 'content',
        chapter,
        title: chapter.title
      })
      setCurrentViewingChapter(chapterId)
    }
  }, [extractedChapters])

  // 章节总结导航处理（用于跳转到章节总结）
  const handleChapterSummaryNavigation = useCallback((chapterId: string) => {
    setCurrentViewingChapterSummary(chapterId)
    // 展开目标章节，折叠其他章节
    setExpandedChapters(new Set([chapterId]))
    // 滚动到对应的章节总结
    setTimeout(() => {
      const element = document.getElementById(`chapter-summary-${chapterId}`)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }, 100)
  }, [])

  // 章节展开状态变化处理
  const handleChapterExpandChange = useCallback((chapterId: string, isExpanded: boolean) => {
    setExpandedChapters(prev => {
      const newSet = new Set(prev)
      if (isExpanded) {
        newSet.add(chapterId)
      } else {
        newSet.delete(chapterId)
      }
      return newSet
    })
  }, [])

  // 查看章节内容
  const handleViewChapterContent = useCallback((chapter: ChapterData) => {
    setRightPanelContent({
      type: 'content',
      chapter,
      title: chapter.title
    })
    setCurrentViewingChapter(chapter.id)
  }, [])

  // 关闭右侧面板
  const handleCloseRightPanel = useCallback(() => {
    setRightPanelContent(null)
    setCurrentViewingChapter('')
  }, [])

  // 提取章节
  const extractChapters = useCallback(async () => {
    if (!file) return

    setExtractingChapters(true)
    try {
      let bookData: EpubBookData & { chapters: ChapterData[] } | PdfBookData & { chapters: ChapterData[] }
      let chapters: ChapterData[]

      if (file.name.endsWith('.epub')) {
        const epubProcessor = new EpubProcessor()
        bookData = await epubProcessor.extractBookData(
          file, 
          processingOptions.useSmartDetection, 
          processingOptions.skipNonEssentialChapters, 
          processingOptions.maxSubChapterDepth,
          processingOptions.chapterNamingMode,
          processingOptions.chapterDetectionMode,
          processingOptions.epubTocDepth
        )
        chapters = bookData.chapters
      } else if (file.name.endsWith('.pdf')) {
        const pdfProcessor = new PdfProcessor()
        bookData = await pdfProcessor.extractBookData(
          file, 
          processingOptions.useSmartDetection, 
          processingOptions.skipNonEssentialChapters, 
          processingOptions.maxSubChapterDepth,
          processingOptions.chapterNamingMode,
          processingOptions.chapterDetectionMode,
          processingOptions.epubTocDepth
        )
        chapters = bookData.chapters
      } else {
        throw new Error(t('upload.unsupportedFormat'))
      }

      setFullBookData(bookData)
      setExtractedChapters(chapters)
      setBookData({
        title: bookData.title,
        author: bookData.author
      })
      
      // 默认选择所有章节
      setSelectedChapters(new Set(chapters.map(ch => ch.id)))
      
      toast.success(t('upload.chaptersExtracted', { count: chapters.length }))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('upload.extractError'))
    } finally {
      setExtractingChapters(false)
    }
  }, [file, processingOptions, t])

  // 处理章节选择
  const handleChapterSelect = useCallback((chapterId: string, checked: boolean) => {
    setSelectedChapters(prev => {
      const newSet = new Set(prev)
      if (checked) {
        newSet.add(chapterId)
      } else {
        newSet.delete(chapterId)
      }
      return newSet
    })
  }, [])

  // 全选/取消全选
  const handleSelectAll = useCallback((checked: boolean) => {
    if (!extractedChapters) return
    
    if (checked) {
      setSelectedChapters(new Set(extractedChapters.map(ch => ch.id)))
    } else {
      setSelectedChapters(new Set())
    }
  }, [extractedChapters])

  // 下载所有markdown文件
  const downloadAllMarkdown = useCallback(() => {
    if (!bookSummary || !file) return
    
    let markdownContent = `# ${bookSummary.title}\n\n`
    markdownContent += `**作者**: ${bookSummary.author}\n\n`
    markdownContent += `---\n\n`
    
    // 添加章节总结
    bookSummary.chapters.forEach((chapter, index) => {
      markdownContent += `## ${index + 1}. ${chapter.title}\n\n`
      if (chapter.summary) {
        markdownContent += `${chapter.summary}\n\n`
      }
      markdownContent += `---\n\n`
    })
    
    // 添加章节关联分析
    if (bookSummary.connections) {
      markdownContent += `## 章节关联分析\n\n`
      markdownContent += `${bookSummary.connections}\n\n`
      markdownContent += `---\n\n`
    }
    
    // 添加全书总结
    if (bookSummary.overallSummary) {
      markdownContent += `## 全书总结\n\n`
      markdownContent += `${bookSummary.overallSummary}\n\n`
    }
    
    // 创建下载链接
    const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${bookSummary.title}_总结.md`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    toast.success(t('download.downloadSuccess'))
  }, [bookSummary, file, t])
  const processBook = useCallback(async () => {
    if (!file || !extractedChapters || selectedChapters.size === 0) return

    setProcessing(true)
    setProgress(0)
    setCurrentStepIndex(2)

    try {
      const aiService = new AIService(aiConfig, promptConfig)
      const selectedChapterData = extractedChapters.filter(ch => selectedChapters.has(ch.id))
      
      if (processingMode === 'summary') {
        // 步骤1: 生成章节总结
        setCurrentStep(t('progress.generatingSummaries'))
        setProgress(10)
        
        const processedChapters: Chapter[] = []
        
        // 初始化bookSummary以便实时显示
        const initialSummary: BookSummary = {
          title: bookData?.title || '',
          author: bookData?.author || '',
          chapters: [],
          connections: '',
          overallSummary: ''
        }
        setBookSummary(initialSummary)
        
        for (let i = 0; i < selectedChapterData.length; i++) {
          const chapter = selectedChapterData[i]
          setCurrentProcessingChapter(chapter.id)
          setCurrentStep(t('progress.processingChapter', { 
            current: i + 1, 
            total: selectedChapterData.length,
            title: chapter.title 
          }))
          
          const summary = await aiService.summarizeChapter(
            chapter.title, 
            chapter.content, 
            bookType,
            processingOptions.outputLanguage,
            customPrompt
          )
          
          const processedChapter = {
            id: chapter.id,
            title: chapter.title,
            content: chapter.content,
            summary,
            processed: true
          }
          
          processedChapters.push(processedChapter)
          
          // 实时更新bookSummary以显示新处理的章节
          setBookSummary(prev => ({
            ...prev,
            chapters: [...prev.chapters, processedChapter]
          }))
          
          setProgress(10 + (i + 1) * 30 / selectedChapterData.length)
        }
        
        setCurrentProcessingChapter('')

        // 步骤2: 生成章节关联分析
        setCurrentStep(t('progress.analyzingConnections'))
        setProgress(50)

        const connections = await aiService.analyzeConnections(
          processedChapters, 
          processingOptions.outputLanguage
        )

        // 步骤3: 生成全书总结
        setCurrentStep(t('progress.generatingOverallSummary'))
        setProgress(70)

        const overallSummary = await aiService.generateOverallSummary(
          bookData?.title || '',
          processedChapters,
          connections,
          processingOptions.outputLanguage
        )

        const summary: BookSummary = {
          title: bookData?.title || '',
          author: bookData?.author || '',
          chapters: processedChapters,
          connections,
          overallSummary
        }

        setBookSummary(summary)
        
        // 保存缓存
        processedChapters.forEach(chapter => {
          if (chapter.summary) {
            cacheService.setCache(file.name, 'summary', chapter.summary, chapter.id)
          }
        })
        if (connections) {
          cacheService.setCache(file.name, 'connections', connections)
        }
        if (overallSummary) {
          cacheService.setCache(file.name, 'overall_summary', overallSummary)
        }

        // 自动同步到WebDAV
        try {
          const fileName = file.name.replace(/\.[^/.]+$/, '') // 移除文件扩展名
          await autoSyncService.syncSummary(summary, fileName)
        } catch (error) {
          console.error('自动同步失败:', error)
          // 同步失败不影响主流程，只记录错误
        }
      } else if (processingMode === 'mindmap' || processingMode === 'combined-mindmap') {
        // 步骤1: 生成章节思维导图
        setCurrentStep(t('progress.generatingMindMaps'))
        setProgress(10)
        
        const processedChapters: Chapter[] = []
        
        // 初始化bookMindMap以便实时显示
        const initialMindMap: BookMindMap = {
          title: bookData?.title || '',
          author: bookData?.author || '',
          chapters: [],
          combinedMindMap: null
        }
        setBookMindMap(initialMindMap)
        
        for (let i = 0; i < selectedChapterData.length; i++) {
          const chapter = selectedChapterData[i]
          setCurrentStep(t('progress.processingChapter', { 
            current: i + 1, 
            total: selectedChapterData.length,
            title: chapter.title 
          }))
          
          const mindMap = await aiService.generateChapterMindMap(
            chapter.content,
            processingOptions.outputLanguage,
            customPrompt
          )
          
          const processedChapter = {
            id: chapter.id,
            title: chapter.title,
            content: chapter.content,
            mindMap,
            processed: true
          }
          
          processedChapters.push(processedChapter)
          
          // 实时更新bookMindMap以显示新处理的章节
          setBookMindMap(prev => ({
            ...prev,
            chapters: [...prev.chapters, processedChapter]
          }))
          
          setProgress(10 + (i + 1) * 40 / selectedChapterData.length)
        }

        // 步骤2: 生成整书思维导图（如果是combined-mindmap模式）
        let combinedMindMap: MindElixirData | null = null
        
        if (processingMode === 'combined-mindmap') {
          setCurrentStep(t('progress.generatingCombinedMindMap'))
          setProgress(60)
          
          combinedMindMap = await aiService.generateCombinedMindMap(
            bookData?.title || '',
            processedChapters,
            customPrompt
          )
        }

        const mindMapResult: BookMindMap = {
          title: bookData?.title || '',
          author: bookData?.author || '',
          chapters: processedChapters,
          combinedMindMap
        }

        setBookMindMap(mindMapResult)
        
        // 保存缓存
        processedChapters.forEach(chapter => {
          if (chapter.mindMap) {
            cacheService.setCache(file.name, 'mindmap', chapter.mindMap, chapter.id)
          }
        })
        if (combinedMindMap) {
          cacheService.setCache(file.name, 'combined_mindmap', combinedMindMap)
        }

        // 自动同步到WebDAV
        try {
          const fileName = file.name.replace(/\.[^/.]+$/, '') // 移除文件扩展名
          await autoSyncService.syncMindMap(mindMapResult, fileName)
        } catch (error) {
          console.error('自动同步失败:', error)
          // 同步失败不影响主流程，只记录错误
        }
      }
      
      setProgress(100)
      setCurrentStep(t('progress.completed'))
      
      toast.success(t('progress.processingCompleted'))
      
      // 发送任务完成通知
      if (processingOptions.enableNotification) {
        await notificationService.sendTaskCompleteNotification(
          t('progress.bookProcessing') || '书籍处理',
          bookData?.title
        )
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('progress.processingError'), {
        duration: 5000,
        position: 'top-center',
      })
      
      // 发送错误通知
      if (processingOptions.enableNotification) {
        await notificationService.sendErrorNotification(
          error instanceof Error ? error.message : t('progress.processingError')
        )
      }
    } finally {
      setProcessing(false)
    }
  }, [extractedChapters, selectedChapters, file, bookData, aiConfig, bookType, customPrompt, processingOptions, processingMode, t])

  // 清除章节缓存
  const clearChapterCache = useCallback((chapterId: string) => {
    if (!file) return
    
    const summary = cacheService.getSummary(file.name)
    if (summary && summary.chapters) {
      const chapter = summary.chapters.find(ch => ch.id === chapterId)
      if (chapter) {
        chapter.processed = false
        chapter.summary = undefined
        cacheService.setCache(file.name, 'summary', summary)
        setBookSummary(summary)
        toast.success(t('cache.chapterCleared'))
      }
    }
  }, [file, t])

  // 清除章节思维导图缓存
  const clearChapterMindMapCache = useCallback((chapterId: string) => {
    if (!file) return
    
    const mindMap = cacheService.getCache(file.name, 'mindmap')
    if (mindMap && mindMap.chapters) {
      const chapter = mindMap.chapters.find(ch => ch.id === chapterId)
      if (chapter) {
        chapter.processed = false
        chapter.mindMap = undefined
        cacheService.setCache(file.name, 'mindmap', mindMap)
        setBookMindMap(mindMap)
        toast.success(t('cache.chapterCleared'))
      }
    }
  }, [file, t])

  // 清除特定缓存
  const clearSpecificCache = useCallback((cacheType: string) => {
    if (!file) return
    
    cacheService.clearCache(file.name, cacheType as any)
    
    if (cacheType === 'connections' && bookSummary) {
      setBookSummary({
        ...bookSummary,
        connections: ''
      })
    } else if (cacheType === 'overall_summary' && bookSummary) {
      setBookSummary({
        ...bookSummary,
        overallSummary: ''
      })
    } else if (cacheType === 'combined_mindmap' && bookMindMap) {
      setBookMindMap({
        ...bookMindMap,
        combinedMindMap: null
      })
    }
    
    toast.success(t('cache.specificCleared'))
  }, [file, bookSummary, bookMindMap, t])

  // 清除书籍缓存
  const clearBookCache = useCallback(() => {
    if (!file) return
    
    cacheService.clearBookCache(file.name)
    setBookSummary(null)
    setBookMindMap(null)
    toast.success(t('cache.bookCleared'))
  }, [file, t])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:via-blue-950 dark:to-slate-900 p-4 flex justify-center gap-4 h-screen overflow-auto scroll-container">
      <Toaster />
      <WebDAVFileBrowser
        isOpen={isWebDAVBrowserOpen}
        onClose={() => setIsWebDAVBrowserOpen(false)}
        onFileSelect={handleWebDAVFileSelect}
      />
      <div className="max-w-full xl:max-w-7xl space-y-4 w-full flex-1">
        <div className="text-center space-y-2 relative">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 flex items-center justify-center gap-2">
            <BookOpen className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            {t('app.title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-300">{t('app.description')}</p>
          <div className="flex items-center justify-center gap-4">
            <LanguageSwitcher />
            <ThemeSwitcher />
          </div>
        </div>

        {currentStepIndex === 1 ? (
          <>
            {/* 如果有缓存数据，显示切换按钮 */}
            {(bookSummary || bookMindMap) && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      发现缓存的处理结果
                    </div>
                    <Button
                      onClick={() => setCurrentStepIndex(2)}
                      className="flex items-center gap-2"
                    >
                      <Brain className="h-4 w-4" />
                      查看处理结果
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* 主内容区域：配置界面 + 右侧预览 */}
            <div className="flex gap-4">
              {/* 配置界面 */}
              <div className="flex-1 space-y-4">
                {/* 步骤1: 文件上传和配置 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Upload className="h-5 w-5" />
                      {t('upload.title')}
                    </CardTitle>
                    <CardDescription>
                      {t('upload.description')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="file">{t('upload.selectFile')}</Label>
                      <div className="flex gap-2">
                        <Input
                          id="file"
                          type="file"
                          accept=".epub,.pdf"
                          onChange={handleFileChange}
                          disabled={processing}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={openWebDAVBrowser}
                          disabled={processing}
                          className="flex items-center gap-2"
                        >
                          <Network className="h-4 w-4" />
                          WebDAV
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <FileText className="h-4 w-4" />
                        {t('upload.selectedFile')}: {file?.name || t('upload.noFileSelected')}
                      </div>
                      <div className="flex items-center gap-2">
                        <ConfigDialog processing={processing} file={file} />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={clearBookCache}
                          disabled={processing}
                          className="flex items-center gap-1 text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          {t('upload.clearCache')}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Button
                        onClick={extractChapters}
                        disabled={!file || extractingChapters || processing}
                        className="w-full"
                      >
                        {extractingChapters ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {t('upload.extractingChapters')}
                          </>
                        ) : (
                          <>
                            <List className="mr-2 h-4 w-4" />
                            {t('upload.extractChapters')}
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                {/* 章节信息 */}
                {extractedChapters && bookData && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <List className="h-5 w-5" />
                        {t('chapters.title')}
                      </CardTitle>
                      <CardDescription>
                        {bookData.title} - {bookData.author} | {t('chapters.totalChapters', { count: extractedChapters.length })}，{t('chapters.selectedChapters', { count: selectedChapters.size })}
                      </CardDescription>
                      <div className="flex items-center gap-2 mt-2">
                        <Checkbox
                          id="select-all"
                          checked={selectedChapters.size === extractedChapters.length}
                          onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                        />
                        <Label htmlFor="select-all" className="text-sm font-medium">
                          {t('chapters.selectAll')}
                        </Label>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {extractedChapters.map((chapter) => (
                          <div key={chapter.id} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                            <Checkbox
                              id={`chapter-${chapter.id}`}
                              checked={selectedChapters.has(chapter.id)}
                              onCheckedChange={(checked) => handleChapterSelect(chapter.id, checked as boolean)}
                            />
                            <Label
                              htmlFor={`chapter-${chapter.id}`}
                              className="text-sm truncate cursor-pointer flex-1"
                              title={chapter.title}
                            >
                              {chapter.title}
                            </Label>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewChapterContent(chapter)}
                            >
                              <BookOpen className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>

                      {/* 自定义提示词输入框 */}
                      <div className="space-y-2">
                        <Label htmlFor="custom-prompt" className="text-sm font-medium">
                          {t('chapters.customPrompt')}
                        </Label>
                        <Textarea
                          id="custom-prompt"
                          placeholder={t('chapters.customPromptPlaceholder')}
                          value={customPrompt}
                          onChange={(e) => setCustomPrompt(e.target.value)}
                          className="min-h-20 resize-none"
                          disabled={processing || extractingChapters}
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {t('chapters.customPromptDescription')}
                        </p>
                      </div>

                      <Button
                        onClick={() => {
                          if (!apiKey) {
                            toast.error(t('chapters.apiKeyRequired'), {
                              duration: 3000,
                              position: 'top-center',
                            })
                            return
                          }
                          processBook()
                        }}
                        disabled={!extractedChapters || processing || extractingChapters || selectedChapters.size === 0}
                        className="w-full"
                      >
                        {processing ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {t('chapters.processing')}
                          </>
                        ) : (
                          <>
                            <Brain className="mr-2 h-4 w-4" />
                            {t('progress.startProcessing')}
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* 右侧预览区域 */}
              {rightPanelContent && (
                <Card className="w-80 lg:w-96 h-fit sticky top-4">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium truncate">
                        {rightPanelContent.title}
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCloseRightPanel}
                        className="h-6 w-6 p-0"
                      >
                        ×
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="max-h-96 overflow-y-auto">
                      {file?.name.endsWith('.epub') ? (
                        <EpubReader
                          chapter={rightPanelContent.chapter}
                          bookData={fullBookData}
                          onClose={handleCloseRightPanel}
                          showHeader={false}
                        />
                      ) : (
                        <PdfReader
                          chapter={rightPanelContent.chapter}
                          bookData={fullBookData}
                          onClose={handleCloseRightPanel}
                          showHeader={false}
                        />
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </>
        ) : (
          <>
            {/* 步骤2: 处理过程和结果显示 */}
            <div className="flex items-center gap-4 mb-4">
              <Button
                variant="outline"
                onClick={() => setCurrentStepIndex(1)}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                {t('common.backToConfig')}
              </Button>
              <div className="text-lg font-medium text-gray-700 dark:text-gray-300 truncate">
                {bookData ? `${bookData.title} - ${bookData.author}` : '处理中...'}
              </div>
            </div>

            {/* 处理进度 */}
            {(processing || extractingChapters) && (
              <Card>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>{currentStep}</span>
                      </div>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="w-full" />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 主内容区域：左侧章节总结导航 + 中间结果 + 右侧预览 */}
            <div className="flex gap-4">
              {/* 左侧章节总结导航 */}
              {processingMode === 'summary' ? (
                <ChapterSummaryNavigation
                  chapters={bookSummary?.chapters || []}
                  totalChapters={extractedChapters?.length || 0}
                  currentStepIndex={currentStepIndex}
                  processingMode={processingMode}
                  onChapterClick={handleChapterSummaryNavigation}
                  processing={processing}
                  currentProcessingChapter={currentProcessingChapter}
                  currentViewingChapter={currentViewingChapterSummary}
                />
              ) : (
                <TimelineNavigation
                  chapters={bookMindMap?.chapters || []}
                  currentStepIndex={currentStepIndex}
                  processingMode={processingMode}
                  onChapterClick={handleChapterNavigation}
                  processing={processing}
                  currentProcessingChapter={currentProcessingChapter}
                />
              )}

              {/* 中间结果展示 */}
              <div className="flex-1">
                {(bookSummary || bookMindMap) && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <div className="truncate flex-1 w-1">
                          {processingMode === 'summary' ? (
                            <><BookOpen className="h-5 w-5 inline-block mr-2" />{t('results.summaryTitle', { title: bookSummary?.title })}</>
                          ) : processingMode === 'mindmap' ? (
                            <><Network className="h-5 w-5 inline-block mr-2" />{t('results.chapterMindMapTitle', { title: bookMindMap?.title })}</>
                          ) : (
                            <><Network className="h-5 w-5 inline-block mr-2" />{t('results.wholeMindMapTitle', { title: bookMindMap?.title })}</>
                          )}
                        </div>
                        {processingMode === 'summary' && bookSummary && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={downloadAllMarkdown}
                            className="flex items-center gap-2"
                          >
                            <Download className="h-4 w-4" />
                            {t('download.downloadAllMarkdown')}
                          </Button>
                        )}
                      </CardTitle>
                      <CardDescription>
                        {t('results.author', { author: bookSummary?.author || bookMindMap?.author })} | {t('results.chapterCount', { count: bookSummary?.chapters.length || bookMindMap?.chapters.length })}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {processingMode === 'summary' && bookSummary ? (
                        <Tabs defaultValue="chapters" className="w-full">
                          <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="chapters">{t('results.tabs.chapterSummary')}</TabsTrigger>
                            <TabsTrigger value="connections">{t('results.tabs.connections')}</TabsTrigger>
                            <TabsTrigger value="overall">{t('results.tabs.overallSummary')}</TabsTrigger>
                          </TabsList>

                          <TabsContent value="chapters" className="grid grid-cols-1 gap-4">
                            {bookSummary.chapters.map((chapter, index) => (
                              <MarkdownCard
                                key={chapter.id}
                                id={chapter.id}
                                title={chapter.title}
                                content={chapter.content}
                                markdownContent={chapter.summary || ''}
                                index={index}
                                defaultCollapsed={index > 0}
                                isExpanded={expandedChapters.has(chapter.id)}
                                onExpandChange={(isExpanded) => handleChapterExpandChange(chapter.id, isExpanded)}
                                onClearCache={() => clearChapterCache(chapter.id)}
                                onReadChapter={() => {
                                  // 根据章节ID找到对应的ChapterData
                                  const chapterData = extractedChapters?.find(ch => ch.id === chapter.id)
                                  if (chapterData) {
                                    handleViewChapterContent(chapterData)
                                  }
                                }}
                              />
                            ))}
                          </TabsContent>

                          <TabsContent value="connections">
                            <MarkdownCard
                              id="connections"
                              title={t('results.tabs.connections')}
                              content={bookSummary.connections}
                              markdownContent={bookSummary.connections}
                              index={0}
                              showClearCache={true}
                              showViewContent={false}
                              showCopyButton={true}
                              onClearCache={() => clearSpecificCache('connections')}
                            />
                          </TabsContent>

                          <TabsContent value="overall">
                            <MarkdownCard
                              id="overall"
                              title={t('results.tabs.overallSummary')}
                              content={bookSummary.overallSummary}
                              markdownContent={bookSummary.overallSummary}
                              index={0}
                              showClearCache={true}
                              showViewContent={false}
                              showCopyButton={true}
                              onClearCache={() => clearSpecificCache('overall_summary')}
                            />
                          </TabsContent>
                        </Tabs>
                      ) : processingMode === 'mindmap' && bookMindMap ? (
                        <Tabs defaultValue="chapters" className="w-full">
                          <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="chapters">{t('results.tabs.chapterMindMaps')}</TabsTrigger>
                            <TabsTrigger value="combined">{t('results.tabs.combinedMindMap')}</TabsTrigger>
                          </TabsList>

                          <TabsContent value="chapters" className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {bookMindMap.chapters.map((chapter, index) => (
                              chapter.mindMap && (
                                <MindMapCard
                                  key={chapter.id}
                                  id={chapter.id}
                                  title={chapter.title}
                                  content={chapter.content}
                                  mindMapData={chapter.mindMap}
                                  index={index}
                                  showCopyButton={false}
                                  onClearCache={() => clearChapterMindMapCache(chapter.id)}
                                  onOpenInMindElixir={openInMindElixir}
                                  onDownloadMindMap={downloadMindMap}
                                  mindElixirOptions={options}
                                />
                              )
                            ))}
                          </TabsContent>

                          <TabsContent value="combined">
                            {bookMindMap.combinedMindMap ? (
                              <MindMapCard
                                id="combined"
                                title={t('results.tabs.combinedMindMap')}
                                content=""
                                mindMapData={bookMindMap.combinedMindMap}
                                index={0}
                                onOpenInMindElixir={(mindmapData) => openInMindElixir(mindmapData, t('results.combinedMindMapTitle', { title: bookMindMap.title }))}
                                onDownloadMindMap={downloadMindMap}
                                onClearCache={() => clearSpecificCache('merged_mindmap')}
                                showClearCache={true}
                                showViewContent={false}
                                showCopyButton={false}
                                mindMapClassName="w-full h-[600px] mx-auto"
                                mindElixirOptions={options}
                              />
                            ) : (
                              <Card>
                                <CardContent>
                                  <div className="text-center text-gray-500 py-8">
                                    {t('results.generatingMindMap')}
                                  </div>
                                </CardContent>
                              </Card>
                            )}
                          </TabsContent>
                        </Tabs>
                      ) : processingMode === 'combined-mindmap' && bookMindMap ? (
                        bookMindMap.combinedMindMap ? (
                          <MindMapCard
                            id="whole-book"
                            title={t('results.tabs.combinedMindMap')}
                            content=""
                            mindMapData={bookMindMap.combinedMindMap}
                            index={0}
                            onOpenInMindElixir={(mindmapData) => openInMindElixir(mindmapData, t('results.combinedMindMapTitle', { title: bookMindMap.title }))}
                            onDownloadMindMap={downloadMindMap}
                            onClearCache={() => clearSpecificCache('combined_mindmap')}
                            showClearCache={true}
                            showViewContent={false}
                            showCopyButton={false}
                            mindMapClassName="w-full h-[600px] mx-auto"
                            mindElixirOptions={options}
                          />
                        ) : (
                          <Card>
                            <CardContent>
                              <div className="text-center text-gray-500 py-8">
                                {t('results.generatingMindMap')}
                              </div>
                            </CardContent>
                          </Card>
                        )
                      ) : null}
                    </CardContent>
                  </Card>
                )}

                {!bookSummary && !bookMindMap && !processing && (
                  <div className="text-center py-8">
                    <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">
                      {t('results.noResults')}
                    </p>
                  </div>
                )}
              </div>

              {/* 右侧预览区域 */}
              {rightPanelContent && (
                <Card className="w-80 lg:w-96 h-fit sticky top-4">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium truncate">
                        {rightPanelContent.title}
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCloseRightPanel}
                        className="h-6 w-6 p-0"
                      >
                        ×
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="max-h-96 overflow-y-auto">
                      {file?.name.endsWith('.epub') ? (
                        <EpubReader
                          chapter={rightPanelContent.chapter}
                          bookData={fullBookData}
                          onClose={handleCloseRightPanel}
                          showHeader={false}
                        />
                      ) : (
                        <PdfReader
                          chapter={rightPanelContent.chapter}
                          bookData={fullBookData}
                          onClose={handleCloseRightPanel}
                          showHeader={false}
                        />
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </>
        )}

        {/* 章节阅读器 */}
        {currentReadingChapter && (
          file.name.endsWith('.epub') ? (
            <EpubReader
              className="w-[800px] shrink-0 sticky top-0"
              chapter={currentReadingChapter}
              bookData={fullBookData}
              onClose={() => setCurrentReadingChapter(null)}
            />
          ) : (
            <PdfReader
              className="w-[800px] shrink-0 sticky top-0"
              chapter={currentReadingChapter}
              bookData={fullBookData}
              onClose={() => setCurrentReadingChapter(null)}
            />
          )
        )}

        {/* 回到顶部按钮 */}
        {showBackToTop && (
          <Button
            onClick={scrollToTop}
            className="fixed bottom-6 right-6 z-50 rounded-full w-12 h-12 shadow-lg hover:shadow-xl transition-all duration-300 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
            size="icon"
            aria-label={t('common.backToTop')}
          >
            <ChevronUp className="h-6 w-6" />
          </Button>
        )}
      </div>
    </div>
  )
}

export default App
