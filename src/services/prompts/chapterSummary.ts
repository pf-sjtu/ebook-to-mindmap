// 章节总结相关的prompt模板
import { usePromptConfig } from '../../stores/configStore'
import { getChapterSummaryPrompt } from './config/promptLoader'

export const getFictionChapterSummaryPrompt = (title: string, content: string, customPrompt?: string) => {
  // 从YAML配置加载默认模板
  const defaultTemplate = getChapterSummaryPrompt('v1', 'fiction')
  const template = customPrompt || defaultTemplate
  
  return template
    .replace('{{title}}', title)
    .replace('{{content}}', content)
}

export const getNonFictionChapterSummaryPrompt = (title: string, content: string, customPrompt?: string) => {
  // 从YAML配置加载默认模板
  const defaultTemplate = getChapterSummaryPrompt('v1', 'nonFiction')
  const template = customPrompt || defaultTemplate
  
  return template
    .replace('{{title}}', title)
    .replace('{{content}}', content)
}