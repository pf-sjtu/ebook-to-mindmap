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
import { ConfigDialog } from './components/project/ConfigDialog'
import type { MindElixirData, Options } from 'mind-elixir'
import type { Summary } from 'node_modules/mind-elixir/dist/types/summary'
import { LanguageSwitcher } from './components/LanguageSwitcher'
import { ThemeSwitcher } from './components/ThemeSwitcher'
import { MarkdownCard } from './components/MarkdownCard'
import { MindMapCard } from './components/MindMapCard'
import { EpubReader } from './components/EpubReader'
import { PdfReader } from './components/PdfReader'
import { toast } from 'sonner'
import { Toaster } from '@/components/ui/sonner'
import { scrollToTop, openInMindElixir, downloadMindMap } from './utils'
import { notificationService } from './services/notificationService'


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
import { useAIConfig, useProcessingOptions, useConfigStore } from './stores/configStore'
const cacheService = new CacheService()

function App() {
  const { t } = useTranslation()
  const [currentStepIndex, setCurrentStepIndex] = useState(1) // 1: 配置步骤, 2: 处理步骤
  const [activeTab, setActiveTab] = useState<'setup' | 'processing'>('setup') // 新增tab状态
  const [file, setFile] = useState<File | null>(null)
  const [processing, setProcessing] = useState(false)
  const [extractingChapters, setExtractingChapters] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState('')
  const [bookSummary, setBookSummary] = useState<BookSummary | null>(null)
  const [bookMindMap, setBookMindMap] = useState<BookMindMap | null>(null)
  const [extractedChapters, setExtractedChapters] = useState<ChapterData[] | null>(null)
  const [selectedChapters, setSelectedChapters] = useState<Set<string>>(new Set())
  const [bookData, setBookData] = useState<{ title: string; author: string } | null>(null)
  const [fullBookData, setFullBookData] = useState<EpubBookData | PdfBookData | null>(null)
  const [customPrompt, setCustomPrompt] = useState('')
  const [showBackToTop, setShowBackToTop] = useState(false)
  const [currentReadingChapter, setCurrentReadingChapter] = useState<ChapterData | null>(null)



  // 使用zustand store管理配置
  const aiConfig = useAIConfig()
  const processingOptions = useProcessingOptions()

  // 从store中解构状态值
  const { apiKey } = aiConfig
  const { processingMode, bookType, useSmartDetection, skipNonEssentialChapters } = processingOptions

  // zustand的persist中间件会自动处理配置的加载和保存

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

  // 处理书籍
  const processBook = useCallback(async () => {
    if (!file || !extractedChapters || selectedChapters.size === 0) return

    setProcessing(true)
    setProgress(0)
    setCurrentStepIndex(2)
    setActiveTab('processing') // 自动切换到处理tab

    try {
      // 步骤1: 生成章节总结
      setCurrentStep(t('progress.generatingSummaries'))
      setProgress(10)

      const aiService = new AIService(aiConfig)
      const selectedChapterData = extractedChapters.filter(ch => selectedChapters.has(ch.id))
      
      const processedChapters: Chapter[] = []
      
      for (let i = 0; i < selectedChapterData.length; i++) {
        const chapter = selectedChapterData[i]
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
        
        processedChapters.push({
          id: chapter.id,
          title: chapter.title,
          content: chapter.content,
          summary,
          processed: true
        })
        
        setProgress(10 + (i + 1) * 30 / selectedChapterData.length)
      }

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
      cacheService.setCache(file.name, 'summary', summary)
      
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
  }, [extractedChapters, selectedChapters, file, bookData, aiConfig, bookType, customPrompt, processingOptions, t])

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
    }
    
    toast.success(t('cache.specificCleared'))
  }, [file, bookSummary, t])

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
      <div className="max-w-6xl space-y-4 w-[800px] shrink-0">
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

        {/* 顶部Tab切换 */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'setup' | 'processing')} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="setup" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              {t('tabs.setup')}
            </TabsTrigger>
            <TabsTrigger value="processing" className="flex items-center gap-2" disabled={!file && !bookSummary}>
              <Brain className="h-4 w-4" />
              {t('tabs.processing')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="setup" className="mt-4">
            {/* 初始界面 - 文件上传和配置 */}
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
                  <Input
                    id="file"
                    type="file"
                    accept=".epub,.pdf"
                    onChange={handleFileChange}
                    disabled={processing}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <FileText className="h-4 w-4" />
                    {t('upload.selectedFile')}: {file?.name || t('upload.noFileSelected')}
                  </div>
                  <div className="flex items-center gap-2">
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
                      <div key={chapter.id} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
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
                          onClick={() => setCurrentReadingChapter(chapter)}
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
                    disabled={!apiKey || selectedChapters.size === 0 || processing}
                    className="w-full"
                    size="lg"
                  >
                    {processing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t('progress.processing')}
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

            {/* 配置对话框 */}
            <ConfigDialog processing={processing} file={file} />
          </TabsContent>

          <TabsContent value="processing" className="mt-4">
            {/* 处理界面 - 处理结果 */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    {t('results.title')}
                  </CardTitle>
                  <Button
                    variant="outline"
                    onClick={() => setActiveTab('setup')}
                    disabled={processing}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    {t('common.back')}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {processing && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{currentStep}</span>
                      <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="w-full" />
                  </div>
                )}

                {!processing && bookSummary && processingMode === 'summary' && (
                  <Tabs defaultValue="chapters" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="chapters">{t('results.tabs.chapterSummaries')}</TabsTrigger>
                      <TabsTrigger value="connections">{t('results.tabs.connections')}</TabsTrigger>
                      <TabsTrigger value="overall">{t('results.tabs.overallSummary')}</TabsTrigger>
                    </TabsList>

                    <TabsContent value="chapters" className="space-y-4">
                      {bookSummary.chapters.map((chapter, index) => (
                        <MarkdownCard
                          key={chapter.id}
                          id={chapter.id}
                          title={chapter.title}
                          content={chapter.content}
                          markdownContent={chapter.summary || ''}
                          index={index}
                          defaultCollapsed={index > 0}
                          onClearCache={() => clearChapterCache(chapter.id)}
                          onReadChapter={() => {
                            // 根据章节ID找到对应的ChapterData
                            const chapterData = extractedChapters?.find(ch => ch.id === chapter.id)
                            if (chapterData) {
                              setCurrentReadingChapter(chapterData)
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
                )}

                {!processing && !bookSummary && (
                  <div className="text-center py-8">
                    <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">
                      {t('results.noResults')}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* 阅读组件插入到这里 */}
        {currentReadingChapter && fullBookData && file && (
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
