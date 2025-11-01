// 章节关联分析相关的prompt模板
import { getConnectionAnalysisPrompt } from './config/promptLoader'

export const getChapterConnectionsAnalysisPrompt = (chapterSummaries: string, customPrompt?: string) => {
  // 从YAML配置加载默认模板
  const defaultTemplate = getConnectionAnalysisPrompt('v1')
  const template = customPrompt || defaultTemplate
  
  return template.replace('{{chapterSummaries}}', chapterSummaries)
}