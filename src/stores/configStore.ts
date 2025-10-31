import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SupportedLanguage } from '../services/prompts/utils'
import { DEFAULT_PROMPT_CONFIG, DEFAULT_PROMPT_CONFIG_V2 } from '../services/prompts/templates'

// 提示词配置接口
export interface PromptConfig {
  chapterSummary: {
    fiction: string
    nonFiction: string
  }
  mindmap: {
    chapter: string
    arrow: string
    combined: string
  }
  connectionAnalysis: string
  overallSummary: string
}

// 提示词版本配置接口
interface PromptVersionConfig {
  v1: PromptConfig
  v2: PromptConfig
}

// 单个AI服务商配置接口
interface AIProviderConfig {
  id: string // 唯一标识
  name: string // 显示名称
  provider: 'gemini' | 'openai' | 'ollama' | '302.ai' | 'custom' // 服务商类型
  apiKey: string
  apiUrl: string
  model: string
  temperature: number
  proxyUrl?: string // 代理服务器地址
  proxyEnabled?: boolean // 是否启用代理
  customFields?: Record<string, any> // 自定义字段，用于不同服务商的特殊配置
  isCustom: boolean // 是否为自定义配置
  isDefault?: boolean // 是否为默认配置
  createdAt: string // 创建时间
  updatedAt: string // 更新时间
}

// AI配置管理接口
interface AIConfigManager {
  providers: AIProviderConfig[] // 所有AI服务商配置
  activeProviderId: string // 当前激活的服务商ID
  
  // 管理服务商配置
  addProvider: (config: Omit<AIProviderConfig, 'id' | 'createdAt' | 'updatedAt'>) => string
  updateProvider: (id: string, config: Partial<AIProviderConfig>) => void
  deleteProvider: (id: string) => void
  duplicateProvider: (id: string, newName: string) => string
  setActiveProvider: (id: string) => void
  
  // 获取当前配置
  getActiveProvider: () => AIProviderConfig | undefined
  getProviderById: (id: string) => AIProviderConfig | undefined
  
  // 模板管理
  createFromTemplate: (template: 'gemini' | 'openai' | 'ollama' | '302.ai', name: string) => string
  getAvailableTemplates: () => Array<{ id: string; name: string; description: string }>
}

// 兼容性接口（保持向后兼容）
interface AIConfig {
  provider: 'gemini' | 'openai' | 'ollama' | '302.ai'
  apiKey: string
  apiUrl: string
  model: string
  temperature: number
  proxyUrl?: string // 代理服务器地址
  proxyEnabled?: boolean // 是否启用代理
}

// 处理选项接口
interface ProcessingOptions {
  processingMode: 'summary' | 'mindmap' | 'combined-mindmap'
  bookType: 'fiction' | 'non-fiction'
  useSmartDetection: boolean
  skipNonEssentialChapters: boolean
  maxSubChapterDepth: number
  outputLanguage: SupportedLanguage
  chapterNamingMode: 'auto' | 'numbered' // 章节命名模式：auto-自动识别，numbered-第x章格式
  enableNotification: boolean // 是否启用任务完成通知
  chapterDetectionMode: 'normal' | 'smart' | 'epub-toc' // 章节识别模式：normal-普通模式，smart-智能检测，epub-toc-epub目录模式
  epubTocDepth: number // epub目录深度，只在使用epub-toc模式时有效
}

// WebDAV配置接口
interface WebDAVConfig {
  enabled: boolean // 是否启用WebDAV
  serverUrl: string // WebDAV服务器地址
  username: string // 用户名
  password: string // 密码
  appName: string // 应用名称
  autoSync: boolean // 是否自动同步
  syncPath: string // 同步路径（默认为/fastReader）
  lastSyncTime: string | null // 最后同步时间
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error' // 连接状态
}

// 配置store状态接口
interface ConfigState {
  // AI配置管理
  aiConfigManager: AIConfigManager
  
  // 向后兼容的AI配置（从当前激活的服务商获取）
  aiConfig: AIConfig
  setAiProvider: (provider: 'gemini' | 'openai' | 'ollama' | '302.ai') => void
  setApiKey: (apiKey: string) => void
  setApiUrl: (apiUrl: string) => void
  setModel: (model: string) => void
  setTemperature: (temperature: number) => void
  setProxyUrl: (proxyUrl: string) => void
  setProxyEnabled: (enabled: boolean) => void
  
  // 新的AI服务商管理方法
  addAIProvider: (config: Omit<AIProviderConfig, 'id' | 'createdAt' | 'updatedAt'>) => string
  updateAIProvider: (id: string, config: Partial<AIProviderConfig>) => void
  deleteAIProvider: (id: string) => void
  duplicateAIProvider: (id: string, newName: string) => string
  setActiveAIProvider: (id: string) => void
  getActiveAIProvider: () => AIProviderConfig | undefined
  getAIProviderById: (id: string) => AIProviderConfig | undefined
  createAIProviderFromTemplate: (template: 'gemini' | 'openai' | 'ollama' | '302.ai', name: string) => string
  getAvailableAITemplates: () => Array<{ id: string; name: string; description: string }>
  
  // AI配置管理器方法（直接访问）
  addProvider: (config: Omit<AIProviderConfig, 'id' | 'createdAt' | 'updatedAt'>) => string
  updateProvider: (id: string, config: Partial<AIProviderConfig>) => void
  deleteProvider: (id: string) => void
  duplicateProvider: (id: string, newName: string) => string
  setActiveProvider: (id: string) => void
  getProviderById: (id: string) => AIProviderConfig | undefined
  
  // Token使用量追踪
  tokenUsage: number
  addTokenUsage: (tokens: number) => void
  resetTokenUsage: () => void
  
  // 处理选项
  processingOptions: ProcessingOptions
  setProcessingMode: (mode: 'summary' | 'mindmap' | 'combined-mindmap') => void
  setBookType: (type: 'fiction' | 'non-fiction') => void
  setUseSmartDetection: (enabled: boolean) => void
  setSkipNonEssentialChapters: (enabled: boolean) => void
  setMaxSubChapterDepth: (depth: number) => void
  setOutputLanguage: (language: SupportedLanguage) => void
  setChapterNamingMode: (mode: 'auto' | 'numbered') => void
  setEnableNotification: (enabled: boolean) => void
  setChapterDetectionMode: (mode: 'normal' | 'smart' | 'epub-toc') => void
  setEpubTocDepth: (depth: number) => void
  
  // WebDAV配置
  webdavConfig: WebDAVConfig
  setWebDAVEnabled: (enabled: boolean) => void
  setWebDAVServerUrl: (serverUrl: string) => void
  setWebDAVUsername: (username: string) => void
  setWebDAVPassword: (password: string) => void
  setWebDAVAppName: (appName: string) => void
  setWebDAVAutoSync: (autoSync: boolean) => void
  setWebDAVSyncPath: (syncPath: string) => void
  setWebDAVConnectionStatus: (status: 'disconnected' | 'connecting' | 'connected' | 'error') => void
  updateWebDAVLastSyncTime: () => void
  resetWebDAVConfig: () => void
  
  // 提示词配置
  promptConfig: PromptConfig
  promptVersionConfig: PromptVersionConfig
  currentPromptVersion: 'v1' | 'v2'
  setCurrentPromptVersion: (version: 'v1' | 'v2') => void
  setChapterSummaryPrompt: (bookType: 'fiction' | 'non-fiction', prompt: string) => void
  setMindmapPrompt: (mindmapType: 'chapter' | 'arrow' | 'combined', prompt: string) => void
  setConnectionAnalysisPrompt: (prompt: string) => void
  setOverallSummaryPrompt: (prompt: string) => void
  resetPromptsToDefault: () => void
  resetPromptsToDefaultForVersion: (version: 'v1' | 'v2') => void
}

// AI服务商模板配置
const aiProviderTemplates = {
  gemini: {
    name: 'Google Gemini',
    provider: 'gemini' as const,
    apiUrl: 'https://generativelanguage.googleapis.com/v1beta',
    model: 'gemini-1.5-flash',
    temperature: 0.7,
    proxyUrl: '',
    proxyEnabled: false,
    isCustom: false,
    description: 'Google的生成式AI服务，支持多模态输入'
  },
  openai: {
    name: 'OpenAI GPT',
    provider: 'openai' as const,
    apiUrl: 'https://api.openai.com/v1',
    model: 'gpt-3.5-turbo',
    temperature: 0.7,
    proxyUrl: '',
    proxyEnabled: false,
    isCustom: false,
    description: 'OpenAI的GPT系列模型'
  },
  ollama: {
    name: 'Ollama Local',
    provider: 'ollama' as const,
    apiUrl: 'http://localhost:11434/v1',
    model: 'llama2',
    temperature: 0.7,
    proxyUrl: '',
    proxyEnabled: false,
    isCustom: false,
    description: '本地部署的Ollama服务'
  },
  '302.ai': {
    name: '302.AI',
    provider: '302.ai' as const,
    apiUrl: 'https://api.302.ai/v1',
    model: 'gpt-3.5-turbo',
    temperature: 0.7,
    proxyUrl: '',
    proxyEnabled: false,
    isCustom: false,
    description: '302.AI提供的OpenAI兼容接口'
  }
}

// 默认配置
const defaultAIConfig: AIConfig = {
  provider: 'gemini',
  apiKey: '',
  apiUrl: 'https://api.openai.com/v1',
  model: 'gemini-1.5-flash',
  temperature: 0.7,
  proxyUrl: '',
  proxyEnabled: false
}

// 默认AI配置管理器
const createDefaultAIConfigManager = (): AIConfigManager => {
  const defaultProvider: AIProviderConfig = {
    id: 'default-gemini',
    name: 'Google Gemini',
    provider: 'gemini',
    apiKey: '',
    apiUrl: 'https://generativelanguage.googleapis.com/v1beta',
    model: 'gemini-1.5-flash',
    temperature: 0.7,
    proxyUrl: '',
    proxyEnabled: false,
    isCustom: false,
    isDefault: true, // 添加默认标识字段
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
  
  return {
    providers: [defaultProvider],
    activeProviderId: defaultProvider.id,
    
    addProvider: (config) => {
      const id = `provider-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      return id
    },
    
    updateProvider: (id, config) => {
      // 这个方法会在store中被重写
    },
    
    deleteProvider: (id) => {
      // 这个方法会在store中被重写
    },
    
    duplicateProvider: (id, newName) => {
      return `provider-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    },
    
    setActiveProvider: (id) => {
      // 这个方法会在store中被重写
    },
    
    getActiveProvider: () => {
      return defaultProvider
    },
    
    getProviderById: (id) => {
      return id === defaultProvider.id ? defaultProvider : undefined
    },
    
    createFromTemplate: (template, name) => {
      return `provider-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    },
    
    getAvailableTemplates: () => {
      return Object.entries(aiProviderTemplates).map(([id, template]) => ({
        id,
        name: template.name,
        description: template.description
      }))
    }
  }
}

const defaultProcessingOptions: ProcessingOptions = {
  processingMode: 'mindmap',
  bookType: 'non-fiction',
  useSmartDetection: false,
  skipNonEssentialChapters: true,
  maxSubChapterDepth: 0,
  outputLanguage: 'en',
  chapterNamingMode: 'auto',
  enableNotification: true,
  chapterDetectionMode: 'normal',
  epubTocDepth: 1
}

const defaultWebDAVConfig: WebDAVConfig = {
  enabled: false,
  serverUrl: 'https://dav.jianguoyun.com/dav/',
  username: '',
  password: '',
  appName: 'fastReader_by_PF',
  autoSync: false,
  syncPath: '/fastReader',
  lastSyncTime: null,
  connectionStatus: 'disconnected'
}

const defaultPromptConfig: PromptConfig = DEFAULT_PROMPT_CONFIG
const defaultPromptVersionConfig: PromptVersionConfig = {
  v1: DEFAULT_PROMPT_CONFIG,
  v2: DEFAULT_PROMPT_CONFIG_V2
}

// 计算aiConfig的辅助函数
const computeAIConfig = (aiConfigManager: AIConfigManager): AIConfig => {
  const activeProvider = aiConfigManager.providers.find(p => 
    p.id === aiConfigManager.activeProviderId
  )
  if (!activeProvider) {
    return defaultAIConfig
  }
  
  return {
    provider: activeProvider.provider as 'gemini' | 'openai' | 'ollama' | '302.ai',
    apiKey: activeProvider.apiKey,
    apiUrl: activeProvider.apiUrl,
    model: activeProvider.model,
    temperature: activeProvider.temperature,
    proxyUrl: activeProvider.proxyUrl || '',
    proxyEnabled: activeProvider.proxyEnabled || false
  }
}

export const useConfigStore = create<ConfigState>()(
  persist(
    (set, get) => {
      // 初始化aiConfigManager
      const initialAIConfigManager = {
        ...createDefaultAIConfigManager(),
        
        // 重写方法以支持状态管理
        addProvider: (config) => {
          const id = `provider-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          const newProvider: AIProviderConfig = {
            ...config,
            id,
            isDefault: false, // 确保新配置不是默认配置
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
          
          set((prevState) => {
            const newAIConfigManager = {
              ...prevState.aiConfigManager,
              providers: [...prevState.aiConfigManager.providers, newProvider]
            }
            return {
              aiConfigManager: newAIConfigManager,
              aiConfig: computeAIConfig(newAIConfigManager)
            }
          })
          
          return id
        },
        
        updateProvider: (id, config) => {
          set((prevState) => {
            const newAIConfigManager = {
              ...prevState.aiConfigManager,
              providers: prevState.aiConfigManager.providers.map(p => 
                p.id === id ? { ...p, ...config, updatedAt: new Date().toISOString() } : p
              )
            }
            return {
              aiConfigManager: newAIConfigManager,
              aiConfig: computeAIConfig(newAIConfigManager)
            }
          })
        },
        
        deleteProvider: (id) => {
          set((prevState) => {
            const newProviders = prevState.aiConfigManager.providers.filter(p => p.id !== id)
            const newActiveId = prevState.aiConfigManager.activeProviderId === id 
              ? (newProviders.length > 0 ? newProviders[0].id : null)
              : prevState.aiConfigManager.activeProviderId
            
            const newAIConfigManager = {
              ...prevState.aiConfigManager,
              providers: newProviders,
              activeProviderId: newActiveId
            }
            return {
              aiConfigManager: newAIConfigManager,
              aiConfig: computeAIConfig(newAIConfigManager)
            }
          })
        },
        
        setActiveProvider: (id) => {
          set((prevState) => {
            const newAIConfigManager = {
              ...prevState.aiConfigManager,
              activeProviderId: id
            }
            return {
              aiConfigManager: newAIConfigManager,
              aiConfig: computeAIConfig(newAIConfigManager)
            }
          })
        },
        getActiveProvider: () => {
          const state = get()
          return state.aiConfigManager.providers.find(p => p.id === state.aiConfigManager.activeProviderId)
        },
        
        getProviderById: (id) => {
          const state = get()
          return state.aiConfigManager.providers.find(p => p.id === id)
        }
      }

      return {
        // AI配置管理
        aiConfigManager: initialAIConfigManager,
        
        // 向后兼容的AI配置（从当前激活的服务商获取）
        aiConfig: computeAIConfig(initialAIConfigManager),
        
        // Token使用量追踪
        tokenUsage: 0,
        addTokenUsage: (tokens) => set((state) => ({
          tokenUsage: state.tokenUsage + tokens
        })),
        resetTokenUsage: () => set(() => ({
          tokenUsage: 0
        })),
      
        // 向后兼容的设置方法（更新当前激活的提供商）
        setAiProvider: (provider) => {
          const state = get()
          const activeProvider = state.aiConfigManager.getActiveProvider()
          if (activeProvider) {
            state.updateAIProvider(activeProvider.id, { provider })
          }
        },
        setApiKey: (apiKey) => {
          const state = get()
          const activeProvider = state.aiConfigManager.getActiveProvider()
          if (activeProvider) {
            state.updateAIProvider(activeProvider.id, { apiKey })
          }
        },
        setApiUrl: (apiUrl) => {
          const state = get()
          const activeProvider = state.aiConfigManager.getActiveProvider()
          if (activeProvider) {
            state.updateAIProvider(activeProvider.id, { apiUrl })
          }
        },
        setModel: (model) => {
          const state = get()
          const activeProvider = state.aiConfigManager.getActiveProvider()
          if (activeProvider) {
            state.updateAIProvider(activeProvider.id, { model })
          }
        },
        setTemperature: (temperature) => {
          const state = get()
          const activeProvider = state.aiConfigManager.getActiveProvider()
          if (activeProvider) {
            state.updateAIProvider(activeProvider.id, { temperature })
          }
        },
        setProxyUrl: (proxyUrl) => {
          const state = get()
          const activeProvider = state.aiConfigManager.getActiveProvider()
          if (activeProvider) {
            state.updateAIProvider(activeProvider.id, { proxyUrl })
          }
        },
        setProxyEnabled: (proxyEnabled) => {
          const state = get()
          const activeProvider = state.aiConfigManager.getActiveProvider()
          if (activeProvider) {
            state.updateAIProvider(activeProvider.id, { proxyEnabled })
          }
        },
        
        // 新的AI服务商管理方法
        addAIProvider: (config) => {
          const id = `provider-${Date.now()}`
          const newProvider: AIProviderConfig = {
            ...config,
            id,
            createdAt: Date.now(),
            updatedAt: Date.now()
          }
          
          set((state) => {
            const newAIConfigManager = {
              ...state.aiConfigManager,
              providers: [...state.aiConfigManager.providers, newProvider]
            }
            return {
              aiConfigManager: newAIConfigManager,
              aiConfig: computeAIConfig(newAIConfigManager)
            }
          })
          
          return id
        },
        
        updateAIProvider: (id, config) => {
          set((state) => {
            const newAIConfigManager = {
              ...state.aiConfigManager,
              providers: state.aiConfigManager.providers.map(p => 
                p.id === id ? { ...p, ...config, updatedAt: Date.now() } : p
              )
            }
            return {
              aiConfigManager: newAIConfigManager,
              aiConfig: computeAIConfig(newAIConfigManager)
            }
          })
        },
        
        deleteAIProvider: (id) => {
          set((state) => {
            const newProviders = state.aiConfigManager.providers.filter(p => p.id !== id)
            const newActiveId = state.aiConfigManager.activeProviderId === id 
              ? (newProviders.length > 0 ? newProviders[0].id : null)
              : state.aiConfigManager.activeProviderId
            
            const newAIConfigManager = {
              ...state.aiConfigManager,
              providers: newProviders,
              activeProviderId: newActiveId
            }
            return {
              aiConfigManager: newAIConfigManager,
              aiConfig: computeAIConfig(newAIConfigManager)
            }
          })
        },
        
        duplicateAIProvider: (id, newName) => {
          const state = get()
          const original = state.getProviderById(id)
          if (!original) return ''
          
          const newId = `provider-${Date.now()}`
          const duplicated: AIProviderConfig = {
            ...original,
            id: newId,
            name: newName,
            isActive: false,
            isDefault: false, // 确保复制的配置不是默认配置
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
          
          set((prevState) => {
            const newAIConfigManager = {
              ...prevState.aiConfigManager,
              providers: [...prevState.aiConfigManager.providers, duplicated]
            }
            return {
              aiConfigManager: newAIConfigManager,
              aiConfig: computeAIConfig(newAIConfigManager)
            }
          })
          
          return newId
        },
        
        setActiveAIProvider: (id) => {
          set((state) => {
            const newAIConfigManager = {
              ...state.aiConfigManager,
              activeProviderId: id
            }
            return {
              aiConfigManager: newAIConfigManager,
              aiConfig: computeAIConfig(newAIConfigManager)
            }
          })
        },
        
        getActiveAIProvider: () => {
          const state = get()
          return state.aiConfigManager.providers.find(p => p.id === state.aiConfigManager.activeProviderId)
        },
        
        getAIProviderById: (id) => {
          const state = get()
          return state.aiConfigManager.providers.find(p => p.id === id)
        },
        
        createAIProviderFromTemplate: (template, name) => {
          const templateConfig = aiProviderTemplates[template]
          if (!templateConfig) return ''
          
          const newProvider: AIProviderConfig = {
            ...templateConfig,
            id: `provider-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name,
            isDefault: false, // 确保从模板创建的配置不是默认配置
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
          
          set((prevState) => {
            const newAIConfigManager = {
              ...prevState.aiConfigManager,
              providers: [...prevState.aiConfigManager.providers, newProvider]
            }
            return {
              aiConfigManager: newAIConfigManager,
              aiConfig: computeAIConfig(newAIConfigManager)
            }
          })
          
          return newProvider.id
        },
        
        getAvailableAITemplates: () => {
          return Object.entries(aiProviderTemplates).map(([id, template]) => ({
            id,
            name: template.name,
            description: template.description
          }))
        },
        
        // AI配置管理器方法（直接访问）
        addProvider: (config) => {
          const state = get()
          return state.addAIProvider(config)
        },
        
        updateProvider: (id, config) => {
          const state = get()
          state.updateAIProvider(id, config)
        },
        
        deleteProvider: (id) => {
          const state = get()
          state.deleteAIProvider(id)
        },
        
        duplicateProvider: (id, newName) => {
          const state = get()
          return state.duplicateAIProvider(id, newName)
        },
        
        setActiveProvider: (id) => {
          const state = get()
          state.setActiveAIProvider(id)
        },
        
        getProviderById: (id) => {
          const state = get()
          return state.getAIProviderById(id)
        },
        
        // 处理选项
        processingOptions: defaultProcessingOptions,
        setProcessingMode: (processingMode) => set((state) => ({
          processingOptions: { ...state.processingOptions, processingMode }
        })),
        setBookType: (bookType) => set((state) => ({
          processingOptions: { ...state.processingOptions, bookType }
        })),
        setUseSmartDetection: (useSmartDetection) => set((state) => ({
          processingOptions: { ...state.processingOptions, useSmartDetection }
        })),
        setSkipNonEssentialChapters: (skipNonEssentialChapters) => set((state) => ({
          processingOptions: { ...state.processingOptions, skipNonEssentialChapters }
        })),
        setMaxSubChapterDepth: (maxSubChapterDepth) => set((state) => ({
          processingOptions: { ...state.processingOptions, maxSubChapterDepth }
        })),
        setOutputLanguage: (outputLanguage) => set((state) => ({
          processingOptions: { ...state.processingOptions, outputLanguage }
        })),
        setChapterNamingMode: (chapterNamingMode) => set((state) => ({
          processingOptions: { ...state.processingOptions, chapterNamingMode }
        })),
        setEnableNotification: (enableNotification) => set((state) => ({
          processingOptions: { ...state.processingOptions, enableNotification }
        })),
        setChapterDetectionMode: (chapterDetectionMode) => set((state) => ({
          processingOptions: { ...state.processingOptions, chapterDetectionMode }
        })),
        setEpubTocDepth: (epubTocDepth) => set((state) => ({
          processingOptions: { ...state.processingOptions, epubTocDepth }
        })),
        
        // WebDAV配置
        webdavConfig: defaultWebDAVConfig,
        setWebDAVEnabled: (enabled) => set((state) => ({
          webdavConfig: { ...state.webdavConfig, enabled }
        })),
        setWebDAVServerUrl: (serverUrl) => set((state) => ({
          webdavConfig: { ...state.webdavConfig, serverUrl }
        })),
        setWebDAVUsername: (username) => set((state) => ({
          webdavConfig: { ...state.webdavConfig, username }
        })),
        setWebDAVPassword: (password) => set((state) => ({
          webdavConfig: { ...state.webdavConfig, password }
        })),
        setWebDAVAppName: (appName) => set((state) => ({
          webdavConfig: { ...state.webdavConfig, appName }
        })),
        setWebDAVAutoSync: (autoSync) => set((state) => ({
          webdavConfig: { ...state.webdavConfig, autoSync }
        })),
        setWebDAVSyncPath: (syncPath) => set((state) => ({
          webdavConfig: { ...state.webdavConfig, syncPath }
        })),
        setWebDAVConnectionStatus: (connectionStatus) => set((state) => ({
          webdavConfig: { ...state.webdavConfig, connectionStatus }
        })),
        updateWebDAVLastSyncTime: () => set((state) => ({
          webdavConfig: { 
            ...state.webdavConfig, 
            lastSyncTime: new Date().toISOString()
          }
        })),
        resetWebDAVConfig: () => set((state) => ({
          webdavConfig: defaultWebDAVConfig
        })),
        
        // 提示词配置
        promptConfig: defaultPromptConfig,
        promptVersionConfig: defaultPromptVersionConfig,
        currentPromptVersion: 'v1',
        setCurrentPromptVersion: (version) => set((state) => {
          const newPromptConfig = state.promptVersionConfig[version]
          return {
            currentPromptVersion: version,
            promptConfig: newPromptConfig
          }
        }),
        setChapterSummaryPrompt: (bookType, prompt) => set((state) => {
          const updatedConfig = {
            ...state.promptConfig,
            chapterSummary: {
              ...state.promptConfig.chapterSummary,
              [bookType]: prompt
            }
          }
          const updatedVersionConfig = {
            ...state.promptVersionConfig,
            [state.currentPromptVersion]: updatedConfig
          }
          return {
            promptConfig: updatedConfig,
            promptVersionConfig: updatedVersionConfig
          }
        }),
        setMindmapPrompt: (mindmapType, prompt) => set((state) => {
          const updatedConfig = {
            ...state.promptConfig,
            mindmap: {
              ...state.promptConfig.mindmap,
              [mindmapType]: prompt
            }
          }
          const updatedVersionConfig = {
            ...state.promptVersionConfig,
            [state.currentPromptVersion]: updatedConfig
          }
          return {
            promptConfig: updatedConfig,
            promptVersionConfig: updatedVersionConfig
          }
        }),
        setConnectionAnalysisPrompt: (prompt) => set((state) => {
          const updatedConfig = {
            ...state.promptConfig,
            connectionAnalysis: prompt
          }
          const updatedVersionConfig = {
            ...state.promptVersionConfig,
            [state.currentPromptVersion]: updatedConfig
          }
          return {
            promptConfig: updatedConfig,
            promptVersionConfig: updatedVersionConfig
          }
        }),
        setOverallSummaryPrompt: (prompt) => set((state) => {
          const updatedConfig = {
            ...state.promptConfig,
            overallSummary: prompt
          }
          const updatedVersionConfig = {
            ...state.promptVersionConfig,
            [state.currentPromptVersion]: updatedConfig
          }
          return {
            promptConfig: updatedConfig,
            promptVersionConfig: updatedVersionConfig
          }
        }),
        resetPromptsToDefault: () => set((state) => ({
          promptConfig: state.currentPromptVersion === 'v1' ? DEFAULT_PROMPT_CONFIG : DEFAULT_PROMPT_CONFIG_V2,
          promptVersionConfig: {
            ...state.promptVersionConfig,
            [state.currentPromptVersion]: state.currentPromptVersion === 'v1' ? DEFAULT_PROMPT_CONFIG : DEFAULT_PROMPT_CONFIG_V2
          }
        })),
        resetPromptsToDefaultForVersion: (version) => set((state) => {
          const defaultConfig = version === 'v1' ? DEFAULT_PROMPT_CONFIG : DEFAULT_PROMPT_CONFIG_V2
          const updatedVersionConfig = {
            ...state.promptVersionConfig,
            [version]: defaultConfig
          }
          const newPromptConfig = state.currentPromptVersion === version ? defaultConfig : state.promptConfig
          
          return {
            promptConfig: newPromptConfig,
            promptVersionConfig: updatedVersionConfig
          }
        })
      }
    },
    {
      name: 'ebook-mindmap-config', // localStorage中的键名
      partialize: (state) => ({
        aiConfigManager: state.aiConfigManager,
        aiConfig: state.aiConfig,
        tokenUsage: state.tokenUsage,
        processingOptions: state.processingOptions,
        webdavConfig: state.webdavConfig,
        promptConfig: state.promptConfig,
        promptVersionConfig: state.promptVersionConfig,
        currentPromptVersion: state.currentPromptVersion
      })
    }
  )
)

// 导出便捷的选择器
export const useAIConfig = () => useConfigStore((state) => state.aiConfig)
export const useTokenUsage = () => useConfigStore((state) => state.tokenUsage)
export const useProcessingOptions = () => useConfigStore((state) => state.processingOptions)
export const useWebDAVConfig = () => useConfigStore((state) => state.webdavConfig)
export const usePromptConfig = () => useConfigStore((state) => state.promptConfig)
export const usePromptVersionConfig = () => useConfigStore((state) => state.promptVersionConfig)
export const useCurrentPromptVersion = () => useConfigStore((state) => state.currentPromptVersion)