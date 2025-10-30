import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Settings, ExternalLink } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useState, useEffect } from 'react'
import { useConfigStore, useAIConfig, useProcessingOptions } from '../../stores/configStore'
import type { SupportedLanguage } from '../../services/prompts/utils'
import { chapterPreviewService } from '../../services/chapterPreviewService'
import { Loader2 } from 'lucide-react'

interface ConfigDialogProps {
  processing: boolean
  file: File | null
}

export function ConfigDialog({ processing, file }: ConfigDialogProps) {
  const { t } = useTranslation()
  // 使用zustand store管理配置
  const aiConfig = useAIConfig()
  const processingOptions = useProcessingOptions()
  
  const [previewChapters, setPreviewChapters] = useState<{ title: string; preview: string }[]>([])
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)

  const {
    setAiProvider,
    setApiKey,
    setApiUrl,
    setModel,
    setTemperature,
    setProxyUrl,
    setProxyEnabled,
    setProcessingMode,
    setBookType,
    setUseSmartDetection,
    setSkipNonEssentialChapters,
    setMaxSubChapterDepth,
    setOutputLanguage,
    setChapterNamingMode,
    setEnableNotification,
    setChapterDetectionMode,
    setEpubTocDepth
  } = useConfigStore()

  // 从store中解构状态值
  const { provider: aiProvider, apiKey, apiUrl, model, temperature } = aiConfig
  const { 
    processingMode, 
    bookType, 
    useSmartDetection, 
    skipNonEssentialChapters, 
    outputLanguage,
    chapterNamingMode,
    enableNotification,
    chapterDetectionMode,
    epubTocDepth
  } = processingOptions

  // 章节预览函数
  const loadChapterPreview = async () => {
    if (!file) {
      setPreviewChapters([])
      return
    }

    setIsPreviewLoading(true)
    try {
      const chapters = await chapterPreviewService.previewChapters(
        file,
        chapterDetectionMode,
        epubTocDepth,
        chapterNamingMode,
        20 // 最多预览20个章节
      )
      setPreviewChapters(chapters)
    } catch (error) {
      console.error('加载章节预览失败:', error)
      setPreviewChapters([])
    } finally {
      setIsPreviewLoading(false)
    }
  }

  // 当章节识别模式或文件改变时，重新加载预览
  useEffect(() => {
    loadChapterPreview()
  }, [file, chapterDetectionMode, epubTocDepth, chapterNamingMode])

  const providerSettings = {
    gemini: {
      apiKeyLabel: 'Gemini API Key',
      apiKeyPlaceholder: t('config.enterGeminiApiKey'),
      modelPlaceholder: t('config.geminiModelPlaceholder'),
      apiUrlPlaceholder: '', // Gemini does not use a separate API URL input in this UI
      url: 'https://ai.google.dev/',
    },
    openai: {
      apiKeyLabel: 'API Token',
      apiKeyPlaceholder: t('config.enterApiToken'),
      apiUrlPlaceholder: 'https://api.openai.com/v1',
      modelPlaceholder: t('config.modelPlaceholder'),
      url: 'https://platform.openai.com/',
    },
    ollama: {
      apiKeyLabel: 'API Token',
      apiKeyPlaceholder: 'API Token',
      apiUrlPlaceholder: 'http://localhost:11434',
      modelPlaceholder: 'llama2, mistral, codellama...',
      url: 'https://ollama.com/',
    },
    '302.ai': {
      apiKeyLabel: 'API Token',
      apiKeyPlaceholder: t('config.enterApiToken'),
      apiUrlPlaceholder: 'https://api.302.ai/v1',
      modelPlaceholder: t('config.modelPlaceholder'),
      url: 'https://share.302.ai/BJ7iSL',
    },
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={processing}
          className="flex items-center gap-1"
        >
          <Settings className="h-3.5 w-3.5" />
          {t('config.title')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {t('config.aiServiceConfig')}
          </DialogTitle>
          <DialogDescription>
            {t('config.description')}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4">
            {/* AI 服务配置 */}
            <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border dark:border-gray-700">
              <div className="flex items-center gap-2 mb-3">
                <Settings className="h-4 w-4" />
                <Label className="text-sm font-medium">{t('config.aiServiceConfig')}</Label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ai-provider">{t('config.aiProvider')}</Label>
                  <div className="flex flex-col items-start gap-2">
                    <Select
                      value={aiProvider}
                      onValueChange={(value: 'gemini' | 'openai' | 'ollama' | '302.ai') => {
                        setAiProvider(value)
                        if (value === '302.ai') {
                          setApiUrl('https://api.302.ai/v1')
                        }
                      }}
                      disabled={processing}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('config.selectAiProvider')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gemini">Google Gemini</SelectItem>
                        <SelectItem value="openai">{t('config.openaiCompatible')}</SelectItem>
                        <SelectItem value="ollama">Ollama</SelectItem>
                        <SelectItem value="302.ai">302.AI</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="link" className="p-0 h-auto text-xs shrink-0" asChild>
                      <a href={providerSettings[aiProvider].url} target="_blank" rel="noopener noreferrer">
                        {t('config.visitSite')}
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="apikey">
                    {providerSettings[aiProvider].apiKeyLabel}
                  </Label>
                  <Input
                    id="apikey"
                    type="password"
                    placeholder={providerSettings[aiProvider].apiKeyPlaceholder}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    disabled={processing}
                  />
                </div>
              </div>

              {(aiProvider === 'openai' || aiProvider === 'ollama' || aiProvider === '302.ai') && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="api-url">{t('config.apiUrl')}</Label>
                      <Input
                        id="api-url"
                        type="url"
                        placeholder={providerSettings[aiProvider].apiUrlPlaceholder}
                        value={apiUrl}
                        onChange={(e) => setApiUrl(e.target.value)}
                        disabled={processing || aiProvider === '302.ai'}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="model">{t('config.modelName')}</Label>
                      <Input
                        id="model"
                        type="text"
                        placeholder={providerSettings[aiProvider].modelPlaceholder}
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        disabled={processing}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="openai-temperature">{t('config.temperature')}</Label>
                    <Input
                      id="openai-temperature"
                      type="number"
                      min="0"
                      max="2"
                      step="0.1"
                      placeholder="0.7"
                      value={temperature}
                      onChange={(e) => setTemperature(parseFloat(e.target.value))}
                      disabled={processing}
                    />
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {t('config.temperatureDescription')}
                    </p>
                  </div>
                </>
              )}

              {aiProvider === 'gemini' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="gemini-model">{t('config.modelName')}</Label>
                    <Input
                      id="gemini-model"
                      type="text"
                      placeholder={providerSettings.gemini.modelPlaceholder}
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      disabled={processing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gemini-temperature">{t('config.temperature')}</Label>
                    <Input
                      id="gemini-temperature"
                      type="number"
                      min="0"
                      max="2"
                      step="0.1"
                      placeholder="0.7"
                      value={temperature}
                      onChange={(e) => setTemperature(parseFloat(e.target.value) || 0.7)}
                      disabled={processing}
                    />
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {t('config.temperatureDescription')}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* 代理设置 */}
            <div className="space-y-4 p-4 bg-orange-50 dark:bg-orange-950/50 rounded-lg border dark:border-orange-800">
              <div className="flex items-center gap-2 mb-3">
                <Settings className="h-4 w-4" />
                <Label className="text-sm font-medium">{t('config.proxySettings') || '代理设置'}</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="proxy-enabled"
                  checked={aiConfig.proxyEnabled || false}
                  onCheckedChange={setProxyEnabled}
                  disabled={processing}
                />
                <Label htmlFor="proxy-enabled" className="text-sm">
                  {t('config.enableProxy') || '启用代理'}
                </Label>
              </div>

              {aiConfig.proxyEnabled && (
                <div className="space-y-2">
                  <Label htmlFor="proxy-url">{t('config.proxyUrl') || '代理服务器地址'}</Label>
                  <Input
                    id="proxy-url"
                    type="url"
                    placeholder="http://proxy.example.com:8080"
                    value={aiConfig.proxyUrl || ''}
                    onChange={(e) => setProxyUrl(e.target.value)}
                    disabled={processing}
                  />
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {t('config.proxyUrlDescription') || '输入代理服务器的完整URL地址，例如：http://proxy.example.com:8080'}
                  </p>
                </div>
              )}
            </div>

            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/50 rounded-lg border dark:border-indigo-800">
              <div className="space-y-2">
                <Label htmlFor="output-language" className="text-sm font-medium">
                  {t('config.outputLanguage')}
                </Label>
                <Select value={outputLanguage} onValueChange={(value: SupportedLanguage) => setOutputLanguage(value)} disabled={processing}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('config.selectOutputLanguage')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">{t('config.outputLanguageAuto')}</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="zh">中文</SelectItem>
                    <SelectItem value="ja">日本語</SelectItem>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="de">Deutsch</SelectItem>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="ru">Русский</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-600">
                  {t('config.outputLanguageDescription')}
                </p>
              </div>
            </div>

            <div className="p-3 bg-purple-50 dark:bg-purple-950/50 rounded-lg border dark:border-purple-800">
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="processing-mode" className="text-sm font-medium">
                    {t('config.processingMode')}
                  </Label>
                  <Select value={processingMode} onValueChange={(value: 'summary' | 'mindmap' | 'combined-mindmap') => setProcessingMode(value)} disabled={processing}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('config.selectProcessingMode')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="summary">{t('config.summaryMode')}</SelectItem>
                      <SelectItem value="mindmap">{t('config.mindmapMode')}</SelectItem>
                      <SelectItem value="combined-mindmap">{t('config.combinedMindmapMode')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-600">
                    {t('config.processingModeDescription')}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="book-type" className="text-sm font-medium">
                    {t('config.bookType')}
                  </Label>
                  <Select value={bookType} onValueChange={(value: 'fiction' | 'non-fiction') => setBookType(value)} disabled={processing}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('config.selectBookType')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="non-fiction">{t('config.socialType')}</SelectItem>
                      <SelectItem value="fiction">{t('config.novelType')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-600">
                    {t('config.bookTypeDescription', { type: processingMode === 'summary' ? t('config.summary') : t('config.mindmap') })}
                  </p>
                </div>
              </div>
            </div>

            {/* 章节和通知设置 */}
            <div className="space-y-4 p-4 bg-green-50 dark:bg-green-950/50 rounded-lg border dark:border-green-800">
              <div className="flex items-center gap-2 mb-3">
                <Settings className="h-4 w-4" />
                <Label className="text-sm font-medium">{t('config.chapterAndNotificationSettings') || '章节和通知设置'}</Label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="chapter-naming-mode" className="text-sm font-medium">
                    {t('config.chapterNamingMode') || '章节命名模式'}
                  </Label>
                  <Select value={chapterNamingMode} onValueChange={(value: 'auto' | 'numbered') => setChapterNamingMode(value)} disabled={processing}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('config.selectChapterNamingMode') || '选择章节命名模式'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">{t('config.autoNaming') || '自动识别章节名称'}</SelectItem>
                      <SelectItem value="numbered">{t('config.numberedNaming') || '第x章格式'}</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {t('config.chapterNamingModeDescription') || '选择章节标题的命名方式'}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    {t('config.notificationSettings') || '通知设置'}
                  </Label>
                  <div className="flex items-center space-x-2 pt-2">
                    <Switch
                      id="enable-notification"
                      checked={enableNotification}
                      onCheckedChange={setEnableNotification}
                      disabled={processing}
                    />
                    <Label htmlFor="enable-notification" className="text-sm">
                      {t('config.enableNotification') || '启用任务完成通知'}
                    </Label>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {t('config.notificationDescription') || '任务执行完成后发送浏览器通知'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/50 rounded-lg border dark:border-green-800">
              <div className="space-y-1">
                <Label htmlFor="skip-non-essential" className="text-sm font-medium">
                  {t('config.skipIrrelevantChapters')}
                </Label>
                <p className="text-xs text-gray-600">
                  {t('config.skipIrrelevantChaptersDescription')}
                </p>
              </div>
              <Switch
                id="skip-non-essential"
                checked={skipNonEssentialChapters}
                onCheckedChange={setSkipNonEssentialChapters}
                disabled={processing}
              />
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/50 rounded-lg border dark:border-amber-800">
              <div className="space-y-2">
                <Label htmlFor="max-sub-chapter-depth" className="text-sm font-medium">
                  {t('config.recursionDepth')}
                </Label>
                <Select
                  value={processingOptions.maxSubChapterDepth?.toString()}
                  onValueChange={(value) => useConfigStore.getState().setMaxSubChapterDepth(parseInt(value))}
                  disabled={processing}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('config.selectRecursionDepth')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">{t('config.noRecursion')}</SelectItem>
                    <SelectItem value="1">{t('config.recursion1Layer')}</SelectItem>
                    <SelectItem value="2">{t('config.recursion2Layers')}</SelectItem>
                    <SelectItem value="3">{t('config.recursion3Layers')}</SelectItem>
                    <SelectItem value="4">{t('config.recursion4Layers')}</SelectItem>
                    <SelectItem value="5">{t('config.recursion5Layers')}</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-600">
                  {t('config.recursionDepthDescription')}
                </p>
              </div>
            </div>

            {/* 章节识别模式设置 */}
            <div className="space-y-4 p-4 bg-blue-50 dark:bg-blue-950/50 rounded-lg border dark:border-blue-800">
              <div className="flex items-center gap-2 mb-3">
                <Settings className="h-4 w-4" />
                <Label className="text-sm font-medium">{t('config.chapterDetectionMode') || '智能检测章节'}</Label>
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    {t('config.selectDetectionMode') || '选择章节识别模式'}
                  </Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="normal-mode"
                        name="chapter-detection-mode"
                        value="normal"
                        checked={chapterDetectionMode === 'normal'}
                        onChange={(e) => setChapterDetectionMode(e.target.value as 'normal' | 'smart' | 'epub-toc')}
                        disabled={processing}
                      />
                      <Label htmlFor="normal-mode" className="text-sm font-normal">
                        {t('config.normalMode') || '普通模式'}
                      </Label>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 ml-6">
                      {t('config.normalModeDescription') || '使用基础的章节识别算法，适用于大多数书籍'}
                    </p>

                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="smart-mode"
                        name="chapter-detection-mode"
                        value="smart"
                        checked={chapterDetectionMode === 'smart'}
                        onChange={(e) => setChapterDetectionMode(e.target.value as 'normal' | 'smart' | 'epub-toc')}
                        disabled={processing}
                      />
                      <Label htmlFor="smart-mode" className="text-sm font-normal">
                        {t('config.smartDetectionMode') || '智能检测章节模式'}
                      </Label>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 ml-6">
                      {t('config.smartDetectionModeDescription') || '使用AI智能识别章节边界，准确率更高但处理时间较长'}
                    </p>

                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="epub-toc-mode"
                        name="chapter-detection-mode"
                        value="epub-toc"
                        checked={chapterDetectionMode === 'epub-toc'}
                        onChange={(e) => setChapterDetectionMode(e.target.value as 'normal' | 'smart' | 'epub-toc')}
                        disabled={processing}
                      />
                      <Label htmlFor="epub-toc-mode" className="text-sm font-normal">
                        {t('config.epubTocMode') || '以epub目录读取章节的模式'}
                      </Label>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 ml-6">
                      {t('config.epubTocModeDescription') || '严格按照EPUB文件的目录结构提取章节，保持原始层级关系'}
                    </p>
                  </div>
                </div>

                {chapterDetectionMode === 'epub-toc' && (
                  <div className="space-y-2">
                    <Label htmlFor="epub-toc-depth" className="text-sm font-medium">
                      {t('config.epubTocDepth') || '关注第几级目录'}
                    </Label>
                    <Select value={epubTocDepth.toString()} onValueChange={(value) => setEpubTocDepth(parseInt(value))} disabled={processing}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('config.selectEpubTocDepth') || '选择目录深度'} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">{t('config.epubTocDepth1') || '第1级目录（主要章节）'}</SelectItem>
                        <SelectItem value="2">{t('config.epubTocDepth2') || '第2级目录（子章节）'}</SelectItem>
                        <SelectItem value="3">{t('config.epubTocDepth3') || '第3级目录（小节）'}</SelectItem>
                        <SelectItem value="4">{t('config.epubTocDepth4') || '第4级目录（详细小节）'}</SelectItem>
                        <SelectItem value="5">{t('config.epubTocDepth5') || '第5级目录（最细粒度）'}</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {t('config.epubTocDepthDescription') || '选择要提取的目录层级深度，数值越大提取的章节越详细'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* 章节预览 */}
            {file && (
              <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border dark:border-gray-700">
                <div className="flex items-center gap-2 mb-3">
                  <Settings className="h-4 w-4" />
                  <Label className="text-sm font-medium">
                    {t('config.chapterPreview') || '章节预览'}
                    {isPreviewLoading && <Loader2 className="h-3 w-3 animate-spin ml-2" />}
                  </Label>
                </div>

                {previewChapters.length > 0 ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {previewChapters.map((chapter, index) => (
                      <div key={index} className="flex items-start gap-2 p-2 bg-white dark:bg-gray-900 rounded border dark:border-gray-600">
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-mono shrink-0 w-8">
                          {index + 1}.
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {chapter.title}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400 truncate">
                            {chapter.preview}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : !isPreviewLoading ? (
                  <div className="text-sm text-gray-600 dark:text-gray-400 text-center py-4">
                    {t('config.noChaptersFound') || '未找到章节预览'}
                  </div>
                ) : (
                  <div className="text-sm text-gray-600 dark:text-gray-400 text-center py-4">
                    {t('config.loadingPreview') || '正在加载章节预览...'}
                  </div>
                )}
              </div>
            )}

          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}