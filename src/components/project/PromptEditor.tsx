import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useTranslation } from 'react-i18next'
import { 
  usePromptConfig, 
  useProcessingOptions, 
  useConfigStore, 
  useCurrentPromptVersion,
  usePromptVersionConfig 
} from '../../stores/configStore'
import { RotateCcw, Save, Eye, Copy } from 'lucide-react'
import { 
  CHAPTER_SUMMARY_TEMPLATES, 
  MINDMAP_TEMPLATES, 
  CONNECTION_ANALYSIS_TEMPLATES, 
  OVERALL_SUMMARY_TEMPLATES,
  CHAPTER_SUMMARY_TEMPLATES_V2,
  MINDMAP_TEMPLATES_V2,
  CONNECTION_ANALYSIS_TEMPLATES_V2,
  OVERALL_SUMMARY_TEMPLATES_V2
} from '../../services/prompts/templates'

export function PromptEditor() {
  const { t } = useTranslation()
  const promptConfig = usePromptConfig()
  const processingOptions = useProcessingOptions()
  const currentPromptVersion = useCurrentPromptVersion()
  const promptVersionConfig = usePromptVersionConfig()
  const [activeTab, setActiveTab] = useState('chapterSummary')
  const [previewMode, setPreviewMode] = useState(false)
  
  // Store方法
  const { 
    setChapterSummaryPrompt, 
    setMindmapPrompt, 
    setConnectionAnalysisPrompt, 
    setOverallSummaryPrompt, 
    resetPromptsToDefault,
    setCurrentPromptVersion
  } = useConfigStore()

  // 获取当前应该显示的提示词
  const getCurrentPrompt = () => {
    switch (activeTab) {
      case 'chapterSummary':
        return processingOptions.bookType === 'fiction' 
          ? promptConfig.chapterSummary.fiction 
          : promptConfig.chapterSummary.nonFiction
      case 'mindmap':
        return processingOptions.processingMode === 'summary' 
          ? promptConfig.mindmap.chapter
          : processingOptions.processingMode === 'mindmap'
          ? promptConfig.mindmap.chapter
          : promptConfig.mindmap.combined
      case 'connectionAnalysis':
        return promptConfig.connectionAnalysis
      case 'overallSummary':
        return promptConfig.overallSummary
      default:
        return ''
    }
  }

  // 获取默认提示词（根据当前版本）
  const getDefaultPrompt = () => {
    const isV2 = currentPromptVersion === 'v2'
    switch (activeTab) {
      case 'chapterSummary':
        return processingOptions.bookType === 'fiction'
          ? (isV2 ? CHAPTER_SUMMARY_TEMPLATES_V2.fiction.template : CHAPTER_SUMMARY_TEMPLATES.fiction.template)
          : (isV2 ? CHAPTER_SUMMARY_TEMPLATES_V2.nonFiction.template : CHAPTER_SUMMARY_TEMPLATES.nonFiction.template)
      case 'mindmap':
        return processingOptions.processingMode === 'summary'
          ? (isV2 ? MINDMAP_TEMPLATES_V2.chapter.template : MINDMAP_TEMPLATES.chapter.template)
          : processingOptions.processingMode === 'mindmap'
          ? (isV2 ? MINDMAP_TEMPLATES_V2.chapter.template : MINDMAP_TEMPLATES.chapter.template)
          : (isV2 ? MINDMAP_TEMPLATES_V2.combined.template : MINDMAP_TEMPLATES.combined.template)
      case 'connectionAnalysis':
        return isV2 ? CONNECTION_ANALYSIS_TEMPLATES_V2.standard.template : CONNECTION_ANALYSIS_TEMPLATES.standard.template
      case 'overallSummary':
        return isV2 ? OVERALL_SUMMARY_TEMPLATES_V2.standard.template : OVERALL_SUMMARY_TEMPLATES.standard.template
      default:
        return ''
    }
  }

  // 复制提示词到剪贴板
  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(getCurrentPrompt())
      console.log('Prompt copied to clipboard')
    } catch (err) {
      console.error('Failed to copy prompt:', err)
    }
  }

  // 版本切换处理
  const handleVersionChange = (version: 'v1' | 'v2') => {
    setCurrentPromptVersion(version)
  }

  // 预览提示词（替换变量）
  const getPreviewPrompt = () => {
    let prompt = getCurrentPrompt()
    if (activeTab === 'chapterSummary') {
      prompt = prompt
        .replace('{{title}}', t('promptEditor.preview.title'))
        .replace('{{content}}', t('promptEditor.preview.content'))
    } else if (activeTab === 'connectionAnalysis') {
      prompt = prompt.replace('{{chapterSummaries}}', t('promptEditor.preview.chapterSummaries'))
    } else if (activeTab === 'overallSummary') {
      prompt = prompt
        .replace('{{chapterInfo}}', t('promptEditor.preview.chapterInfo'))
        .replace('{{connections}}', t('promptEditor.preview.connections'))
        .replace('{{bookTitle}}', t('promptEditor.preview.bookTitle'))
    }
    return prompt
  }

  // 重置为默认提示词
  const handleReset = () => {
    resetPromptsToDefault()
  }

  // 保存提示词
  const handleSave = () => {
    // 提示词已经通过onChange实时保存到store
    console.log('All prompts saved successfully')
  }

  // 更新提示词
  const handlePromptChange = (value: string) => {
    switch (activeTab) {
      case 'chapterSummary':
        setChapterSummaryPrompt(processingOptions.bookType, value)
        break
      case 'mindmap':
        const mindmapType = processingOptions.processingMode === 'summary' ? 'chapter' : 
                           processingOptions.processingMode === 'mindmap' ? 'chapter' : 'combined'
        setMindmapPrompt(mindmapType, value)
        break
      case 'connectionAnalysis':
        setConnectionAnalysisPrompt(value)
        break
      case 'overallSummary':
        setOverallSummaryPrompt(value)
        break
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          {t('promptEditor.title')}
        </CardTitle>
        <CardDescription>
          {t('promptEditor.description')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* 版本切换和当前配置显示 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {processingOptions.bookType === 'fiction' ? t('promptEditor.fiction') : t('promptEditor.nonFiction')}
              </Badge>
              <Badge variant="outline">
                {processingOptions.processingMode === 'summary' ? t('promptEditor.summary') : 
                 processingOptions.processingMode === 'mindmap' ? t('promptEditor.mindmap') : 
                 t('promptEditor.combinedMindmap')}
              </Badge>
            </div>
            
            {/* 版本切换 */}
            <div className="flex items-center gap-2">
              <Label htmlFor="prompt-version">{t('promptEditor.version')}:</Label>
              <Select value={currentPromptVersion} onValueChange={handleVersionChange}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="v1">V1 {t('promptEditor.original')}</SelectItem>
                  <SelectItem value="v2">V2 {t('promptEditor.optimized')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="chapterSummary">{t('promptEditor.chapterSummary')}</TabsTrigger>
              <TabsTrigger value="mindmap">{t('promptEditor.mindmap')}</TabsTrigger>
              <TabsTrigger value="connectionAnalysis">{t('promptEditor.connectionAnalysis')}</TabsTrigger>
              <TabsTrigger value="overallSummary">{t('promptEditor.overallSummary')}</TabsTrigger>
            </TabsList>

            <TabsContent value="chapterSummary" className="space-y-4">
              <div className="space-y-2">
                <Label>{t('promptEditor.chapterSummaryPrompt')}</Label>
                <Textarea
                  value={previewMode ? getPreviewPrompt() : getCurrentPrompt()}
                  onChange={(e) => handlePromptChange(e.target.value)}
                  placeholder={t('promptEditor.placeholder')}
                  className="min-h-[200px] font-mono text-sm"
                  disabled={previewMode}
                />
              </div>
            </TabsContent>

            <TabsContent value="mindmap" className="space-y-4">
              <div className="space-y-2">
                <Label>{t('promptEditor.mindmapPrompt')}</Label>
                <Textarea
                  value={previewMode ? getPreviewPrompt() : getCurrentPrompt()}
                  onChange={(e) => handlePromptChange(e.target.value)}
                  placeholder={t('promptEditor.placeholder')}
                  className="min-h-[200px] font-mono text-sm"
                  disabled={previewMode}
                />
              </div>
            </TabsContent>

            <TabsContent value="connectionAnalysis" className="space-y-4">
              <div className="space-y-2">
                <Label>{t('promptEditor.connectionAnalysisPrompt')}</Label>
                <Textarea
                  value={previewMode ? getPreviewPrompt() : getCurrentPrompt()}
                  onChange={(e) => handlePromptChange(e.target.value)}
                  placeholder={t('promptEditor.placeholder')}
                  className="min-h-[200px] font-mono text-sm"
                  disabled={previewMode}
                />
              </div>
            </TabsContent>

            <TabsContent value="overallSummary" className="space-y-4">
              <div className="space-y-2">
                <Label>{t('promptEditor.overallSummaryPrompt')}</Label>
                <Textarea
                  value={previewMode ? getPreviewPrompt() : getCurrentPrompt()}
                  onChange={(e) => handlePromptChange(e.target.value)}
                  placeholder={t('promptEditor.placeholder')}
                  className="min-h-[200px] font-mono text-sm"
                  disabled={previewMode}
                />
              </div>
            </TabsContent>
          </Tabs>

          {/* 操作按钮 */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreviewMode(!previewMode)}
              >
                <Eye className="h-4 w-4 mr-2" />
                {previewMode ? t('promptEditor.editMode') : t('promptEditor.previewMode')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                {t('promptEditor.resetToDefault')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyPrompt}
              >
                <Copy className="h-4 w-4 mr-2" />
                {t('promptEditor.copy')}
              </Button>
            </div>
            <Button size="sm" onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              {t('promptEditor.save')}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
