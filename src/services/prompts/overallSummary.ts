// 全书总结相关的prompt模板
import { getOverallSummaryPrompt } from './config/promptLoader'

export const getOverallSummaryPrompt = (bookTitle: string, chapterInfo: string, connections: string, customPrompt?: string) => {
  // 从YAML配置加载默认模板
  const defaultTemplate = getOverallSummaryPrompt('v1')
  const template = customPrompt || defaultTemplate
  
  return template
    .replace('{{chapterInfo}}', chapterInfo)
    .replace('{{connections}}', connections)
    .replace('{{bookTitle}}', bookTitle)
}