import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Settings, 
  Plus, 
  Copy, 
  Trash2, 
  Edit, 
  Check, 
  X, 
  ExternalLink, 
  Info, 
  Play, 
  CheckCircle, 
  XCircle, 
  Loader2,
  Bot,
  Globe,
  Shield,
  Zap
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useConfigStore } from '../../stores/configStore'
import type { AIProviderConfig } from '../../stores/configStore'
import { AIService } from '../../services/aiService'
import { toast } from 'sonner'

interface AIProviderDialogProps {
  trigger?: React.ReactNode
  provider?: AIProviderConfig
  mode: 'create' | 'edit'
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (provider: AIProviderConfig) => void
}

function AIProviderDialog({ trigger, provider, mode, open, onOpenChange, onSave }: AIProviderDialogProps) {
  const { t } = useTranslation()
  const { getAvailableAITemplates } = useConfigStore()
  
  const [formData, setFormData] = useState<Partial<AIProviderConfig>>({
    name: '',
    provider: 'gemini',
    apiKey: '',
    apiUrl: '',
    model: '',
    temperature: 0.7,
    proxyUrl: '',
    proxyEnabled: false,
    isCustom: false,
    customFields: {}
  })
  
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  const templates = getAvailableAITemplates()

  useEffect(() => {
    if (mode === 'edit' && provider) {
      setFormData(provider)
    } else if (mode === 'create') {
      setFormData({
        name: '',
        provider: 'gemini',
        apiKey: '',
        apiUrl: '',
        model: '',
        temperature: 0.7,
        proxyUrl: '',
        proxyEnabled: false,
        isCustom: false,
        customFields: {}
      })
      setSelectedTemplate('')
      setTestResult(null)
    }
  }, [mode, provider, open])

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId)
    if (template) {
      setSelectedTemplate(templateId)
      setFormData(prev => ({
        ...prev,
        provider: templateId as any,
        name: template.name,
        isCustom: false
      }))
    }
  }

  const handleTest = async () => {
    if (!formData.apiKey || !formData.apiUrl || !formData.model) {
      toast.error('请填写完整的配置信息')
      return
    }

    setIsTesting(true)
    setTestResult(null)
    
    try {
      const aiService = new AIService({
        provider: formData.provider as any,
        apiKey: formData.apiKey,
        apiUrl: formData.apiUrl,
        model: formData.model,
        temperature: formData.temperature || 0.7,
        proxyUrl: formData.proxyUrl,
        proxyEnabled: formData.proxyEnabled || false
      })
      
      const isConnected = await aiService.testConnection()
      
      if (isConnected) {
        setTestResult({ success: true, message: '连接测试成功！' })
        toast.success('AI服务连接测试成功')
      } else {
        setTestResult({ success: false, message: 'AI服务连接失败' })
        toast.error('AI服务连接测试失败')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      setTestResult({ success: false, message: errorMessage })
      toast.error('AI服务连接测试失败')
    } finally {
      setIsTesting(false)
    }
  }

  const handleSave = () => {
    if (!formData.name || !formData.apiKey || !formData.apiUrl || !formData.model) {
      toast.error('请填写完整的配置信息')
      return
    }

    const newProvider: AIProviderConfig = {
      id: provider?.id || `provider-${Date.now()}`,
      name: formData.name,
      provider: formData.provider as any,
      apiKey: formData.apiKey,
      apiUrl: formData.apiUrl,
      model: formData.model,
      temperature: formData.temperature || 0.7,
      proxyUrl: formData.proxyUrl || '',
      proxyEnabled: formData.proxyEnabled || false,
      customFields: formData.customFields || {},
      isCustom: formData.isCustom || false,
      isDefault: false, // 新创建的配置不是默认配置
      createdAt: provider?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    onSave(newProvider)
    onOpenChange(false)
    toast.success(mode === 'create' ? 'AI服务商创建成功' : 'AI服务商更新成功')
  }

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'gemini': return <Bot className="h-4 w-4" />
      case 'openai': return <Zap className="h-4 w-4" />
      case 'ollama': return <Globe className="h-4 w-4" />
      case '302.ai': return <Shield className="h-4 w-4" />
      default: return <Settings className="h-4 w-4" />
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getProviderIcon(formData.provider || 'gemini')}
            {mode === 'create' ? '创建AI服务商配置' : '编辑AI服务商配置'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create' 
              ? '基于模板创建新的AI服务商配置，或自定义配置'
              : '修改现有AI服务商配置'
            }
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-1 max-h-[60vh]">
          <div className="space-y-4 p-2 max-w-full">
            {mode === 'create' && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">选择模板</CardTitle>
                  <CardDescription className="text-xs">基于现有模板快速创建配置</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {templates.map((template) => (
                      <Button
                        key={template.id}
                        variant={selectedTemplate === template.id ? "default" : "outline"}
                        className="h-auto p-3 flex flex-col items-start justify-start text-left"
                        onClick={() => handleTemplateSelect(template.id)}
                      >
                        <div className="flex items-center gap-2 w-full">
                          {getProviderIcon(template.id)}
                          <span className="font-medium text-sm">{template.name}</span>
                        </div>
                        <span className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {template.description}
                        </span>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">基本信息</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-xs font-medium">配置名称</label>
                    <input
                      type="text"
                      value={formData.name || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="输入配置名称"
                      className="w-full h-8 px-2 text-sm border rounded-md box-border"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium">服务商类型</label>
                    <select 
                      value={formData.provider} 
                      onChange={(e) => setFormData(prev => ({ ...prev, provider: e.target.value as any }))}
                      className="w-full h-8 px-2 text-sm border rounded-md box-border"
                    >
                      <option value="gemini">Google Gemini</option>
                      <option value="openai">OpenAI GPT</option>
                      <option value="ollama">Ollama Local</option>
                      <option value="302.ai">302.AI</option>
                      <option value="custom">自定义</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-medium">API密钥</label>
                    <input
                      type="password"
                      value={formData.apiKey || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, apiKey: e.target.value }))}
                      placeholder="输入API密钥"
                      className="w-full h-8 px-2 text-sm border rounded-md box-border"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium">API地址</label>
                    <input
                      type="text"
                      value={formData.apiUrl || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, apiUrl: e.target.value }))}
                      placeholder="输入API地址"
                      className="w-full h-8 px-2 text-sm border rounded-md box-border"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">模型设置</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-xs font-medium">模型</label>
                    <input
                      type="text"
                      value={formData.model || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
                      placeholder="输入模型名称"
                      className="w-full h-8 px-2 text-sm border rounded-md box-border"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium">温度 (0-1)</label>
                    <input
                      type="number"
                      min="0"
                      max="1"
                      step="0.1"
                      value={formData.temperature || 0.7}
                      onChange={(e) => setFormData(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                      className="w-full h-8 px-2 text-sm border rounded-md box-border"
                    />
                  </div>

                  <div className="pt-2">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="proxyEnabled"
                        checked={formData.proxyEnabled || false}
                        onChange={(e) => setFormData(prev => ({ ...prev, proxyEnabled: e.target.checked }))}
                        className="h-3 w-3"
                      />
                      <label htmlFor="proxyEnabled" className="text-xs">启用代理</label>
                    </div>
                    
                    {formData.proxyEnabled && (
                      <div className="mt-2">
                        <label className="text-xs font-medium">代理地址</label>
                        <input
                          type="text"
                          value={formData.proxyUrl || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, proxyUrl: e.target.value }))}
                          placeholder="http://proxy.example.com:8080"
                          className="w-full h-8 px-2 text-sm border rounded-md box-border"
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {testResult && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">测试结果</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`flex items-center gap-2 text-sm ${testResult.success ? 'text-green-600' : 'text-red-600'}`}>
                    {testResult.success ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                    <span>{testResult.message}</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>

        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleTest()}
            disabled={isTesting || !formData.apiKey || !formData.apiUrl || !formData.model}
          >
            {isTesting ? (
              <>
                <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                测试中...
              </>
            ) : (
              <>
                <Play className="h-3 w-3 mr-2" />
                测试连接
              </>
            )}
          </Button>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button size="sm" onClick={handleSave}>
              {mode === 'create' ? '创建' : '保存'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface AIProviderListItemProps {
  provider: AIProviderConfig
  isActive: boolean
  onActivate: () => void
  onEdit: () => void
  onDuplicate: () => void
  onDelete: () => void
}

function AIProviderListItem({ provider, isActive, onActivate, onEdit, onDuplicate, onDelete }: AIProviderListItemProps) {
  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'gemini': return <Bot className="h-4 w-4" />
      case 'openai': return <Zap className="h-4 w-4" />
      case 'ollama': return <Globe className="h-4 w-4" />
      case '302.ai': return <Shield className="h-4 w-4" />
      default: return <Settings className="h-4 w-4" />
    }
  }

  const getProviderColor = (provider: string) => {
    switch (provider) {
      case 'gemini': return 'bg-blue-100 text-blue-800'
      case 'openai': return 'bg-green-100 text-green-800'
      case 'ollama': return 'bg-purple-100 text-purple-800'
      case '302.ai': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div
      className={`grid w-full items-start gap-3 p-3 border rounded-lg transition-colors sm:grid-cols-[minmax(0,1fr)_auto] ${
        isActive ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
      }`}
    >
      {/* 左侧信息区域 */}
      <div className="flex items-start gap-3 min-w-0">
        {getProviderIcon(provider.provider)}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium truncate">{provider.name}</span>
            {provider.isDefault && (
              <Badge variant="outline" className="text-xs px-1.5 py-0.5 flex-shrink-0">
                默认
              </Badge>
            )}
            <Badge className={`${getProviderColor(provider.provider)} text-xs px-1.5 py-0.5 flex-shrink-0`}>
              {provider.provider}
            </Badge>
            {isActive && (
              <Badge variant="default" className="text-xs px-1.5 py-0.5 flex-shrink-0 bg-primary">
                当前使用
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1">
            <span className="truncate">模型: {provider.model}</span>
            <span className="flex-shrink-0">温度: {provider.temperature}</span>
            {provider.proxyEnabled && (
              <span className="flex-shrink-0 text-blue-600">代理</span>
            )}
          </div>
        </div>
      </div>
      
      {/* 右侧按钮区域 */}
      <div className="flex items-center gap-2 justify-end w-full sm:w-auto">
        <Button
          size="sm"
          variant={isActive ? "default" : "outline"}
          onClick={onActivate}
          className="h-8 px-3 text-xs"
        >
          {isActive ? '使用中' : '使用'}
        </Button>
        <Button size="sm" variant="ghost" onClick={onEdit} className="h-8 w-8 p-0">
          <Edit className="h-3 w-3" />
        </Button>
        <Button size="sm" variant="ghost" onClick={onDuplicate} className="h-8 w-8 p-0">
          <Copy className="h-3 w-3" />
        </Button>
        <Button size="sm" variant="ghost" onClick={onDelete} className="h-8 w-8 p-0">
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}

export function AIProviderConfig() {
  const { t } = useTranslation()
  
  const {
    aiConfigManager,
    getActiveAIProvider,
    setActiveAIProvider,
    addAIProvider,
    updateAIProvider,
    deleteAIProvider,
    duplicateAIProvider,
    getAvailableAITemplates
  } = useConfigStore()

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingProvider, setEditingProvider] = useState<AIProviderConfig | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  const activeProvider = getActiveAIProvider()
  
  // 确保当前激活的配置存在，如果不存在则重置为第一个配置
  React.useEffect(() => {
    if (aiConfigManager.providers.length > 0) {
      const currentActive = aiConfigManager.providers.find(p => p.id === aiConfigManager.activeProviderId)
      if (!currentActive) {
        // 如果当前激活的配置不存在，设置为第一个配置
        setActiveAIProvider(aiConfigManager.providers[0].id)
      }
    }
  }, [aiConfigManager.providers, aiConfigManager.activeProviderId, setActiveAIProvider])

  const handleCreateProvider = (provider: AIProviderConfig) => {
    addAIProvider(provider)
  }

  const handleEditProvider = (provider: AIProviderConfig) => {
    setEditingProvider(provider)
    setIsEditDialogOpen(true)
  }

  const handleUpdateProvider = (provider: AIProviderConfig) => {
    updateAIProvider(provider.id, provider)
  }

  const handleDuplicateProvider = (provider: AIProviderConfig) => {
    const newName = `${provider.name} (副本)`
    duplicateAIProvider(provider.id, newName)
  }

  const handleDeleteProvider = (provider: AIProviderConfig) => {
    if (aiConfigManager.providers.length <= 1) {
      toast.error('至少需要保留一个AI服务商配置')
      return
    }
    
    if (confirm(`确定要删除"${provider.name}"吗？`)) {
      deleteAIProvider(provider.id)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">AI服务商配置</h3>
          <p className="text-sm text-muted-foreground">
            管理多个AI服务商配置，支持自由切换和自定义设置
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          添加配置
        </Button>
      </div>

      {/* 配置列表 */}
      <div className="space-y-2">
        {aiConfigManager.providers.map((provider) => (
          <AIProviderListItem
            key={provider.id}
            provider={provider}
            isActive={provider.id === aiConfigManager.activeProviderId}
            onActivate={() => setActiveAIProvider(provider.id)}
            onEdit={() => handleEditProvider(provider)}
            onDuplicate={() => handleDuplicateProvider(provider)}
            onDelete={() => handleDeleteProvider(provider)}
          />
        ))}
      </div>

      {/* 创建配置对话框 */}
      <AIProviderDialog
        mode="create"
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSave={handleCreateProvider}
      />

      {/* 编辑配置对话框 */}
      {editingProvider && (
        <AIProviderDialog
          mode="edit"
          provider={editingProvider}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onSave={handleUpdateProvider}
        />
      )}
    </div>
  )
}
