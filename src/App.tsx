import { useState, useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Upload, BookOpen, Brain, FileText, Loader2, Network, Trash2, List, ChevronUp, ExternalLink } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { EpubProcessor } from './services/epubProcessor'
import { PdfProcessor } from './services/pdfProcessor'
import { AIService } from './services/geminiService'
import { CacheService } from './services/cacheService'
import MindElixirReact from './components/project/MindElixirReact'
import { ConfigDialog } from './components/project/ConfigDialog'
import { ViewContentDialog } from './components/ViewContentDialog'
import { CopyButton } from './components/ui/copy-button'
import type { MindElixirData } from 'mind-elixir'
import type { Summary } from 'node_modules/mind-elixir/dist/types/summary'
import type { MindElixirReactRef } from './components/project/MindElixirReact'
import { DownloadMindMapButton } from './components/DownloadMindMapButton'
import { LanguageSwitcher } from './components/LanguageSwitcher'
import { toast } from 'sonner'
import { Toaster } from '@/components/ui/sonner'
import { launchMindElixir } from '@mind-elixir/open-desktop'
import { downloadMethodList } from '@mind-elixir/export-mindmap'


const options = { direction: 1, alignment: 'nodes' } as const

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

function App() {
  const { t } = useTranslation()
  const [file, setFile] = useState<File | null>(null)
  const [processing, setProcessing] = useState(false)
  const [extractingChapters, setExtractingChapters] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState('')
  const [bookSummary, setBookSummary] = useState<BookSummary | null>(null)
  const [bookMindMap, setBookMindMap] = useState<BookMindMap | null>(null)
  const [extractedChapters, setExtractedChapters] = useState<any[] | null>(null)
  const [selectedChapters, setSelectedChapters] = useState<Set<string>>(new Set())
  const [bookData, setBookData] = useState<{ title: string; author: string } | null>(null)
  // error状态已移除，改用toast通知
  const [cacheService] = useState(new CacheService())
  const [showBackToTop, setShowBackToTop] = useState(false)

  // MindElixir 实例引用
  const chapterMindElixirRefs = useRef<{ [key: string]: MindElixirReactRef | null }>({})
  const combinedMindElixirRef = useRef<MindElixirReactRef | null>(null)
  const wholeMindElixirRef = useRef<MindElixirReactRef | null>(null)

  // 使用zustand store管理配置
  const aiConfig = useAIConfig()
  const processingOptions = useProcessingOptions()

  // 从store中解构状态值
  const { provider: aiProvider, apiKey, apiUrl, model } = aiConfig
  const { processingMode, bookType, useSmartDetection, skipNonEssentialChapters } = processingOptions

  // zustand的persist中间件会自动处理配置的加载和保存

  // 监听滚动事件，控制回到顶部按钮显示
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 300)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // 回到顶部函数
  const scrollToTop = useCallback(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }, [])

  // 在MindElixir中打开思维导图
  const openInMindElixir = useCallback(async (mindmapData: MindElixirData, title: string) => {
    try {
      await launchMindElixir(mindmapData)
      toast.success(`已成功发送"${title}"到 Mind Elixir Desktop`, {
        duration: 3000,
        position: 'top-center',
      })
    } catch (error) {
      console.error('启动 Mind Elixir 失败:', error)
      toast.error(t('mindElixir.launchError'), {
        duration: 5000,
        position: 'top-center',
      })
    }
  }, [])

  // 下载思维导图函数
  const downloadMindMap = useCallback(async (mindElixirInstance: any, title: string, format: string) => {
    try {
      // 查找对应的下载方法
      const method = downloadMethodList.find(item => item.type === format)
      if (!method) {
        throw new Error(`不支持的格式: ${format}`)
      }

      // 执行下载
      await method.download(mindElixirInstance)

      toast.success(`${title} 已成功导出为 ${format} 格式`, {
        duration: 3000,
        position: 'top-center',
      })
    } catch (error) {
      console.error('导出思维导图失败:', error)
      toast.error(t('mindElixir.exportError', { format, error: error instanceof Error ? error.message : t('common.error') }), {
        duration: 5000,
        position: 'top-center',
      })
    }
  }, [])

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile && (selectedFile.name.endsWith('.epub') || selectedFile.name.endsWith('.pdf'))) {
      setFile(selectedFile)
      // 重置章节提取状态
      setExtractedChapters(null)
      setSelectedChapters(new Set())
      setBookData(null)
      setBookSummary(null)
      setBookMindMap(null)
    } else {
      toast.error(t('upload.invalidFile'), {
        duration: 3000,
        position: 'top-center',
      })
    }
  }, [])

  // 清除章节缓存的函数
  const clearChapterCache = useCallback((chapterId: string) => {
    if (!file) return

    // 根据处理模式确定缓存键
    const cacheKey = processingMode === 'summary'
      ? `${file.name}_${chapterId}_summary`
      : processingMode === 'mindmap'
        ? `${file.name}_${chapterId}_mindmap`
        : `${file.name}_${chapterId}_combined`

    // 删除缓存
    if (cacheService.delete(cacheKey)) {
      // 使用toast显示提示信息
      toast.success('已清除缓存，下次处理将重新生成内容', {
        duration: 3000,
        position: 'top-center',
      })
    }
  }, [file, processingMode, cacheService])

  // 章节选择处理函数
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

  // 全选/取消全选处理函数
  const handleSelectAll = useCallback((checked: boolean) => {
    if (!extractedChapters) return

    if (checked) {
      setSelectedChapters(new Set(extractedChapters.map(chapter => chapter.id)))
    } else {
      setSelectedChapters(new Set())
    }
  }, [extractedChapters])

  // 清除整本书缓存的函数
  const clearBookCache = useCallback(() => {
    if (!file) return

    // 计数器，记录删除的缓存项数量
    let deletedCount = 0

    // 根据当前处理模式确定要清除的缓存类型
    let cacheTypes: string[] = []
    let chapterCacheSuffix = ''

    if (processingMode === 'summary') {
      // 文字总结模式：清除章节总结、章节关联、全书总结相关缓存
      cacheTypes = ['connections', 'overall-summary']
      chapterCacheSuffix = '_summary'
    } else if (processingMode === 'mindmap') {
      // 章节思维导图模式：清除章节思维导图、思维导图箭头相关缓存
      cacheTypes = ['mindmap-arrows']
      chapterCacheSuffix = '_mindmap'
    } else if (processingMode === 'combined-mindmap') {
      // 整书思维导图模式：清除整书思维导图相关缓存
      cacheTypes = ['combined-mindmap']
      chapterCacheSuffix = '_combined'
    }

    // 删除使用CacheService.generateKey生成的缓存
    cacheTypes.forEach(type => {
      const cacheKey = CacheService.generateKey(file.name, type, 'v1')
      if (cacheService.delete(cacheKey)) {
        deletedCount++
      }
    })

    // 删除章节级别的缓存（使用旧的命名方式）
    const stats = cacheService.getStats()
    const bookPrefix = `${file.name}_`
    stats.keys.forEach(key => {
      if (key.startsWith(bookPrefix) && key.endsWith(chapterCacheSuffix)) {
        cacheService.delete(key)
        deletedCount++
      }
    })

    // 使用toast显示提示信息
    const modeNames = {
      'summary': '文字总结',
      'mindmap': '章节思维导图',
      'combined-mindmap': '整书思维导图'
    }

    if (deletedCount > 0) {
      toast.success(`已清除${deletedCount}项${modeNames[processingMode]}缓存，下次处理将重新生成内容`, {
        duration: 3000,
        position: 'top-center',
      })
    } else {
      toast.info(`没有找到可清除的${modeNames[processingMode]}缓存`, {
        duration: 3000,
        position: 'top-center',
      })
    }
  }, [file, cacheService, processingMode])

  // 提取章节的函数
  const extractChapters = useCallback(async () => {
    if (!file) {
      toast.error(t('upload.pleaseSelectFile'), {
        duration: 3000,
        position: 'top-center',
      })
      return
    }

    setExtractingChapters(true)
    setProgress(0)
    setCurrentStep('')

    try {
      let extractedBookData: { title: string; author: string }
      let chapters: any[]

      const isEpub = file.name.endsWith('.epub')
      const isPdf = file.name.endsWith('.pdf')

      if (isEpub) {
        const epubProcessor = new EpubProcessor()

        // 步骤1: 解析EPUB文件
        setCurrentStep('正在解析 EPUB 文件...')
        const epubData = await epubProcessor.parseEpub(file)
        extractedBookData = { title: epubData.title, author: epubData.author }
        setProgress(50)

        // 步骤2: 提取章节
        setCurrentStep('正在提取章节内容...')
        chapters = await epubProcessor.extractChapters(epubData.book, useSmartDetection, skipNonEssentialChapters, processingOptions.maxSubChapterDepth)
        setProgress(100)
      } else if (isPdf) {
        const pdfProcessor = new PdfProcessor()

        // 步骤1: 解析PDF文件
        setCurrentStep('正在解析 PDF 文件...')
        const pdfData = await pdfProcessor.parsePdf(file)
        extractedBookData = { title: pdfData.title, author: pdfData.author }
        setProgress(50)

        // 步骤2: 提取章节
        setCurrentStep('正在提取章节内容...')
        chapters = await pdfProcessor.extractChapters(file, useSmartDetection, skipNonEssentialChapters, processingOptions.maxSubChapterDepth)
        setProgress(100)
      } else {
        throw new Error('不支持的文件格式')
      }

      setBookData(extractedBookData)
      setExtractedChapters(chapters)
      // 默认选中所有章节
      setSelectedChapters(new Set(chapters.map(chapter => chapter.id)))
      setCurrentStep(`章节提取完成！共提取到 ${chapters.length} 个章节`)

      toast.success(`成功提取 ${chapters.length} 个章节`, {
        duration: 3000,
        position: 'top-center',
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('progress.extractionError'), {
        duration: 5000,
        position: 'top-center',
      })
    } finally {
      setExtractingChapters(false)
    }
  }, [file, useSmartDetection, skipNonEssentialChapters, processingOptions.maxSubChapterDepth])

  const processEbook = useCallback(async () => {
    if (!extractedChapters || !bookData || !apiKey) {
      toast.error(t('chapters.extractAndApiKey'), {
        duration: 3000,
        position: 'top-center',
      })
      return
    }
    if (!file) return

    if (selectedChapters.size === 0) {
      toast.error(t('chapters.selectAtLeastOne'), {
        duration: 3000,
        position: 'top-center',
      })
      return
    }

    // 开始新任务时清空上次显示的内容
    setBookSummary(null)
    setBookMindMap(null)
    setProcessing(true)
    setProgress(0)
    setCurrentStep('')

    try {
      const aiService = new AIService(() => {
        const currentState = useConfigStore.getState()
        const currentAiConfig = currentState.aiConfig
        return {
          provider: currentAiConfig.provider,
          apiKey: currentAiConfig.apiKey,
          apiUrl: currentAiConfig.provider === 'openai' ? currentAiConfig.apiUrl : undefined,
          model: currentAiConfig.model || undefined,
          temperature: currentAiConfig.temperature
        }
      })

      // 只处理选中的章节
      const chapters = extractedChapters.filter(chapter => selectedChapters.has(chapter.id))

      const totalChapters = chapters.length
      const processedChapters: Chapter[] = []

      // 根据模式初始化状态
      if (processingMode === 'summary') {
        setBookSummary({
          title: bookData.title,
          author: bookData.author,
          chapters: [],
          connections: '',
          overallSummary: ''
        })
      } else if (processingMode === 'mindmap' || processingMode === 'combined-mindmap') {
        setBookMindMap({
          title: bookData.title,
          author: bookData.author,
          chapters: [],
          combinedMindMap: null
        })
      }

      // 步骤3: 逐章处理
      for (let i = 0; i < chapters.length; i++) {
        const chapter = chapters[i]
        setCurrentStep(`正在处理第 ${i + 1}/${totalChapters} 章: ${chapter.title}`)

        let processedChapter: Chapter

        if (processingMode === 'summary') {
          // 文字总结模式
          const cacheKey = `${file.name}_${chapter.id}_summary`
          let summary = cacheService.get(cacheKey)

          if (!summary) {
            summary = await aiService.summarizeChapter(chapter.title, chapter.content, bookType)
            cacheService.set(cacheKey, summary)
          }

          processedChapter = {
            ...chapter,
            summary,
            processed: true
          }

          processedChapters.push(processedChapter)

          setBookSummary(prevSummary => ({
            ...prevSummary!,
            chapters: [...processedChapters]
          }))
        } else if (processingMode === 'mindmap') {
          // 章节思维导图模式
          const cacheKey = `${file.name}_${chapter.id}_mindmap`
          let mindMap: MindElixirData = cacheService.get(cacheKey)

          if (!mindMap) {
            mindMap = await aiService.generateChapterMindMap(chapter.content)
            cacheService.set(cacheKey, mindMap)
          }

          if (!mindMap.nodeData) continue // 无需总结的章节
          processedChapter = {
            ...chapter,
            mindMap,
            processed: true
          }

          processedChapters.push(processedChapter)

          setBookMindMap(prevMindMap => ({
            ...prevMindMap!,
            chapters: [...processedChapters]
          }))
        } else if (processingMode === 'combined-mindmap') {
          // 整书思维导图模式 - 只收集章节内容，不生成单独的思维导图
          processedChapter = {
            ...chapter,
            processed: true
          }

          processedChapters.push(processedChapter)

          setBookMindMap(prevMindMap => ({
            ...prevMindMap!,
            chapters: [...processedChapters]
          }))
        }

        setProgress(20 + (i + 1) / totalChapters * 60)
      }

      if (processingMode === 'summary') {
        // 文字总结模式的后续步骤
        // 步骤4: 分析章节关联
        setCurrentStep('正在分析章节关联...')
        const connectionsCacheKey = CacheService.generateKey(file.name, 'connections', 'v1')
        let connections = cacheService.get(connectionsCacheKey)
        if (!connections) {
          console.log('🔄 [DEBUG] 缓存未命中，开始分析章节关联')
          connections = await aiService.analyzeConnections(processedChapters)
          cacheService.set(connectionsCacheKey, connections)
          console.log('💾 [DEBUG] 章节关联已缓存')
        } else {
          console.log('✅ [DEBUG] 使用缓存的章节关联')
        }

        setBookSummary(prevSummary => ({
          ...prevSummary!,
          connections
        }))
        setProgress(85)

        // 步骤5: 生成全书总结
        setCurrentStep('正在生成全书总结...')
        const overallSummaryCacheKey = CacheService.generateKey(file.name, 'overall-summary', 'v1')
        let overallSummary = cacheService.get(overallSummaryCacheKey)
        if (!overallSummary) {
          console.log('🔄 [DEBUG] 缓存未命中，开始生成全书总结')
          overallSummary = await aiService.generateOverallSummary(
            bookData.title,
            processedChapters,
            connections
          )
          cacheService.set(overallSummaryCacheKey, overallSummary)
          console.log('💾 [DEBUG] 全书总结已缓存')
        } else {
          console.log('✅ [DEBUG] 使用缓存的全书总结')
        }

        setBookSummary(prevSummary => ({
          ...prevSummary!,
          overallSummary
        }))
      } else if (processingMode === 'mindmap') {
        // 章节思维导图模式的后续步骤
        // 步骤4: 合并章节思维导图
        setCurrentStep('正在合并章节思维导图...')
        // 创建根节点
        const rootNode = {
          topic: bookData.title,
          id: '0',
          tags: ['全书'],
          children: processedChapters.map((chapter, index) => ({
            topic: chapter.title,
            id: `chapter_${index + 1}`,
            children: chapter.mindMap?.nodeData?.children || []
          }))
        }

        let combinedMindMap: MindElixirData = {
          nodeData: rootNode,
          arrows: [],
          summaries: processedChapters.reduce((acc, chapter) => acc.concat(chapter.mindMap?.summaries || []), [] as Summary[])
        }

        setProgress(85)

        // 步骤5: 生成思维导图箭头和全书总结节点
        // setCurrentStep('正在生成思维导图连接和总结...')
        // const arrowsCacheKey = CacheService.generateKey(file.name, 'mindmap-arrows', 'v1')
        // let arrowsData = cacheService.get(arrowsCacheKey)

        // if (!arrowsData) {
        //   console.log('🔄 [DEBUG] 缓存未命中，开始生成箭头')
        //   arrowsData = await aiService.generateMindMapArrows(combinedMindMap)
        //   cacheService.set(arrowsCacheKey, arrowsData)
        //   console.log('💾 [DEBUG] 思维导图箭头已缓存', arrowsData)
        // } else {
        //   console.log('✅ [DEBUG] 使用缓存的思维导图箭头', arrowsData)
        // }

        // // 合并箭头数据
        // if (arrowsData?.arrows) {
        //   combinedMindMap.arrows = arrowsData.arrows
        // }

        setBookMindMap(prevMindMap => ({
          ...prevMindMap!,
          combinedMindMap
        }))
      } else if (processingMode === 'combined-mindmap') {
        // 整书思维导图模式的后续步骤
        // 步骤4: 生成整书思维导图
        setCurrentStep('正在生成整书思维导图...')
        const combinedMindMapCacheKey = CacheService.generateKey(file.name, 'combined-mindmap', 'v1')
        let combinedMindMap = cacheService.get(combinedMindMapCacheKey)
        if (!combinedMindMap) {
          console.log('🔄 [DEBUG] 缓存未命中，开始生成整书思维导图')
          combinedMindMap = await aiService.generateCombinedMindMap(bookData.title, processedChapters)
          cacheService.set(combinedMindMapCacheKey, combinedMindMap)
          console.log('💾 [DEBUG] 整书思维导图已缓存')
        } else {
          console.log('✅ [DEBUG] 使用缓存的整书思维导图')
        }

        setBookMindMap(prevMindMap => ({
          ...prevMindMap!,
          combinedMindMap
        }))
        setProgress(85)
      }

      setProgress(100)
      setCurrentStep('处理完成！')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('progress.processingError'), {
        duration: 5000,
        position: 'top-center',
      })
    } finally {
      setProcessing(false)
    }
  }, [extractedChapters, bookData, apiKey, file, selectedChapters, aiProvider, apiUrl, model, processingMode, bookType, cacheService])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Toaster />
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-gray-900 flex items-center justify-center gap-2">
            <BookOpen className="h-8 w-8 text-blue-600" />
            {t('app.title')}
          </h1>
          <p className="text-gray-600">{t('app.description')}</p>
          <div className="flex justify-center mt-4">
            <LanguageSwitcher />
          </div>
        </div>

        {/* 文件上传和配置 */}
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
              <div className="flex items-center gap-2 text-sm text-gray-600">
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
                《{bookData.title}》- {bookData.author} | {t('chapters.totalChapters', { count: extractedChapters.length })}，{t('chapters.selectedChapters', { count: selectedChapters.size })}
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
                {extractedChapters.map((chapter, index) => (
                  <div key={chapter.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <Checkbox
                      id={`chapter-${chapter.id}`}
                      checked={selectedChapters.has(chapter.id)}
                      onCheckedChange={(checked) => handleChapterSelect(chapter.id, checked as boolean)}
                    />
                    <Badge variant="outline" className="text-xs">
                      {index + 1}
                    </Badge>
                    <Label
                      htmlFor={`chapter-${chapter.id}`}
                      className="text-sm truncate cursor-pointer flex-1"
                      title={chapter.title}
                    >
                      {chapter.title}
                    </Label>
                  </div>
                ))}
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
                  processEbook()
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
                    {t('chapters.startProcessing')}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}
        {/* {t('progress.title')} */}
        {(processing || extractingChapters) && (
          <Card>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{currentStep}</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="w-full" />
              </div>
            </CardContent>
          </Card>
        )}


        {/* 结果展示 */}
        {(bookSummary || bookMindMap) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {processingMode === 'summary' ? (
                  <><BookOpen className="h-5 w-5" />{t('results.summaryTitle', { title: bookSummary?.title })}</>
                ) : processingMode === 'mindmap' ? (
                  <><Network className="h-5 w-5" />{t('results.chapterMindMapTitle', { title: bookMindMap?.title })}</>
                ) : (
                  <><Network className="h-5 w-5" />{t('results.wholeMindMapTitle', { title: bookMindMap?.title })}</>
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
                      <Card key={chapter.id} className='gap-0'>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline"># {index + 1}</Badge>
                              {chapter.title}
                            </div>
                            <div className="flex items-center gap-2">
                              <CopyButton
                                content={chapter.summary}
                                successMessage={t('common.copiedToClipboard')}
                                title={t('common.copyChapterSummary')}
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => clearChapterCache(chapter.id)}
                                title={t('common.clearCache')}
                              >
                                <Trash2 className="h-4 w-4 " />
                              </Button>
                              <ViewContentDialog
                                title={chapter.title}
                                content={chapter.content}
                                chapterIndex={index}
                              />
                            </div>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-gray-700 leading-relaxed prose prose-sm max-w-none">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {chapter.summary || ''}
                            </ReactMarkdown>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </TabsContent>

                  <TabsContent value="connections">
                    <Card>
                      <CardContent>
                        <div className="prose max-w-none text-gray-700 leading-relaxed">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {bookSummary.connections}
                          </ReactMarkdown>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="overall">
                    <Card>
                      <CardContent>
                        <div className="prose max-w-none text-gray-700 leading-relaxed">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {bookSummary.overallSummary}
                          </ReactMarkdown>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              ) : processingMode === 'mindmap' && bookMindMap ? (
                <Tabs defaultValue="chapters" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="chapters">{t('results.tabs.chapterMindMaps')}</TabsTrigger>
                    <TabsTrigger value="combined">{t('results.tabs.combinedMindMap')}</TabsTrigger>
                  </TabsList>

                  <TabsContent value="chapters" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {bookMindMap.chapters.map((chapter, index) => (
                      <Card key={chapter.id} className='gap-2'>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg w-full overflow-hidden">
                            <div className="truncate w-full">
                              {chapter.title}
                            </div>
                            <div className="flex items-center gap-2">
                              {chapter.mindMap && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openInMindElixir(chapter.mindMap!, chapter.title)}
                                    title={t('common.openInMindElixir')}
                                  >
                                    <ExternalLink className="h-4 w-4 mr-1" />
                                  </Button>
                                  <DownloadMindMapButton
                                    mindElixirRef={() => chapterMindElixirRefs.current[chapter.id]}
                                    title={chapter.title}
                                    downloadMindMap={downloadMindMap}
                                  />
                                </>
                              )}
                              <CopyButton
                                content={chapter.content}
                                successMessage={t('common.copiedToClipboard')}
                                title={t('common.copyChapterContent')}
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => clearChapterCache(chapter.id)}
                                title={t('common.clearCache')}
                              >
                                <Trash2 className="h-4 w-4 " />
                              </Button>
                              <ViewContentDialog
                                title={chapter.title}
                                content={chapter.content}
                                chapterIndex={index}
                              />
                            </div>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {chapter.mindMap && (
                            <div className="border rounded-lg">
                              <MindElixirReact
                                ref={(ref) => {
                                  chapterMindElixirRefs.current[chapter.id] = ref
                                }}
                                data={chapter.mindMap}
                                fitPage={false}
                                options={options}
                                className="aspect-square w-full max-w-[500px] mx-auto"
                              />
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </TabsContent>

                  <TabsContent value="combined">
                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">整书思维导图</CardTitle>
                          {bookMindMap.combinedMindMap && (
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openInMindElixir(bookMindMap.combinedMindMap!, `《${bookMindMap.title}》整书思维导图`)}
                                title={t('common.openInMindElixir')}
                              >
                                <ExternalLink className="h-4 w-4 mr-1" />
                              </Button>
                              <DownloadMindMapButton
                                mindElixirRef={combinedMindElixirRef}
                                title={`《${bookMindMap.title}》整书思维导图`}
                                downloadMindMap={downloadMindMap}
                              />
                            </div>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        {bookMindMap.combinedMindMap ? (
                          <div className="border rounded-lg">
                            <MindElixirReact
                              ref={combinedMindElixirRef}
                              data={bookMindMap.combinedMindMap}
                              fitPage={false}
                              options={options}
                              className="aspect-square w-full h-[600px] mx-auto"
                            />
                          </div>
                        ) : (
                          <div className="text-center text-gray-500 py-8">
                            {t('results.generatingMindMap')}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              ) : processingMode === 'combined-mindmap' && bookMindMap ? (
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">整书思维导图</CardTitle>
                      {bookMindMap.combinedMindMap && (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openInMindElixir(bookMindMap.combinedMindMap!, `《${bookMindMap.title}》整书思维导图`)}
                            title={t('common.openInMindElixir')}
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                          </Button>
                          <DownloadMindMapButton
                            mindElixirRef={wholeMindElixirRef}
                            title={`《${bookMindMap.title}》整书思维导图`}
                            downloadMindMap={downloadMindMap}
                          />
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {bookMindMap.combinedMindMap ? (
                      <div className="border rounded-lg">
                        <MindElixirReact
                          ref={wholeMindElixirRef}
                          data={bookMindMap.combinedMindMap}
                          fitPage={false}
                          options={options}
                          className="w-full h-[600px] mx-auto"
                        />
                      </div>
                    ) : (
                      <div className="text-center text-gray-500 py-8">
                        {t('results.generatingMindMap')}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : null}
            </CardContent>
          </Card>
        )}
      </div>

      {/* 回到顶部按钮 */}
      {showBackToTop && (
        <Button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-50 rounded-full w-12 h-12 shadow-lg hover:shadow-xl transition-all duration-300 bg-blue-600 hover:bg-blue-700"
          size="icon"
          aria-label={t('common.backToTop')}
        >
          <ChevronUp className="h-6 w-6" />
        </Button>
      )}
    </div>
  )
}

export default App
