import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SupportedLanguage } from '../services/prompts/utils'

// AI配置接口
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

// 配置store状态接口
interface ConfigState {
  // AI配置
  aiConfig: AIConfig
  setAiProvider: (provider: 'gemini' | 'openai' | 'ollama' | '302.ai') => void
  setApiKey: (apiKey: string) => void
  setApiUrl: (apiUrl: string) => void
  setModel: (model: string) => void
  setTemperature: (temperature: number) => void
  setProxyUrl: (proxyUrl: string) => void
  setProxyEnabled: (enabled: boolean) => void
  
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

// 创建配置store
export const useConfigStore = create<ConfigState>()(
  persist(
    (set) => ({
      // AI配置
      aiConfig: defaultAIConfig,
      setAiProvider: (provider) => set((state) => ({
        aiConfig: { ...state.aiConfig, provider }
      })),
      setApiKey: (apiKey) => set((state) => ({
        aiConfig: { ...state.aiConfig, apiKey }
      })),
      setApiUrl: (apiUrl) => set((state) => ({
        aiConfig: { ...state.aiConfig, apiUrl }
      })),
      setModel: (model) => set((state) => ({
        aiConfig: { ...state.aiConfig, model }
      })),
      setTemperature: (temperature) => set((state) => ({
        aiConfig: { ...state.aiConfig, temperature }
      })),
      setProxyUrl: (proxyUrl) => set((state) => ({
        aiConfig: { ...state.aiConfig, proxyUrl }
      })),
      setProxyEnabled: (proxyEnabled) => set((state) => ({
        aiConfig: { ...state.aiConfig, proxyEnabled }
      })),
      
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
      }))
    }),
    {
      name: 'ebook-mindmap-config', // localStorage中的键名
      partialize: (state) => ({
        aiConfig: state.aiConfig,
        processingOptions: state.processingOptions
      })
    }
  )
)

// 导出便捷的选择器
export const useAIConfig = () => useConfigStore((state) => state.aiConfig)
export const useProcessingOptions = () => useConfigStore((state) => state.processingOptions)