// Prompt配置加载器 - 浏览器兼容版本
import { parse as parseYaml } from 'yaml'

// Prompt配置类型定义
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
  system: {
    testConnection: string
  }
}

// 缓存已加载的配置
const configCache = new Map<string, PromptConfig>()

// 导入YAML配置文件
import v1PromptsYaml from './v1-prompts.yaml?raw'
import v2PromptsYaml from './v2-prompts.yaml?raw'

/**
 * 加载指定版本的prompt配置
 * @param version prompt版本 ('v1' | 'v2')
 * @returns PromptConfig
 */
export const loadPromptConfig = (version: 'v1' | 'v2'): PromptConfig => {
  const cacheKey = version
  
  // 如果已缓存，直接返回
  if (configCache.has(cacheKey)) {
    return configCache.get(cacheKey)!
  }

  try {
    // 根据版本选择对应的YAML内容
    const yamlContent = version === 'v1' ? v1PromptsYaml : v2PromptsYaml
    
    // 解析YAML内容
    const config = parseYaml(yamlContent) as PromptConfig
    
    // 缓存配置
    configCache.set(cacheKey, config)
    
    return config
  } catch (error) {
    console.error(`加载${version}版本prompt配置失败:`, error)
    throw new Error(`无法加载${version}版本的prompt配置`)
  }
}

/**
 * 获取指定版本的章节总结prompt
 * @param version prompt版本
 * @param bookType 书籍类型 ('fiction' | 'nonFiction')
 * @returns prompt字符串
 */
export const getChapterSummaryPrompt = (
  version: 'v1' | 'v2',
  bookType: 'fiction' | 'nonFiction'
): string => {
  const config = loadPromptConfig(version)
  return config.chapterSummary[bookType]
}

/**
 * 获取指定版本的思维导图prompt
 * @param version prompt版本
 * @param mindmapType 思维导图类型 ('chapter' | 'arrow' | 'combined')
 * @returns prompt字符串
 */
export const getMindmapPrompt = (
  version: 'v1' | 'v2',
  mindmapType: 'chapter' | 'arrow' | 'combined'
): string => {
  const config = loadPromptConfig(version)
  return config.mindmap[mindmapType]
}

/**
 * 获取指定版本的章节关联分析prompt
 * @param version prompt版本
 * @returns prompt字符串
 */
export const getConnectionAnalysisPrompt = (version: 'v1' | 'v2'): string => {
  const config = loadPromptConfig(version)
  return config.connectionAnalysis
}

/**
 * 获取指定版本的全书总结prompt
 * @param version prompt版本
 * @returns prompt字符串
 */
export const getOverallSummaryPrompt = (version: 'v1' | 'v2'): string => {
  const config = loadPromptConfig(version)
  return config.overallSummary
}

/**
 * 获取系统prompt
 * @param promptType prompt类型 ('testConnection')
 * @returns prompt字符串
 */
export const getSystemPrompt = (promptType: 'testConnection'): string => {
  // 默认使用v1配置，系统prompt在两个版本中是相同的
  const config = loadPromptConfig('v1')
  return config.system[promptType]
}

/**
 * 清除配置缓存（用于开发时热重载）
 */
export const clearConfigCache = (): void => {
  configCache.clear()
}
