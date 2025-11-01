// 思维导图相关的prompt模板
import { getMindmapPrompt } from './config/promptLoader'

export const getChapterMindMapPrompt = (customPrompt?: string) => {
  // 从YAML配置加载默认模板
  const defaultTemplate = getMindmapPrompt('v1', 'chapter')
  return customPrompt || defaultTemplate
}

export const getMindMapArrowPrompt = (customPrompt?: string) => {
  // 从YAML配置加载默认模板
  const defaultTemplate = getMindmapPrompt('v1', 'arrow')
  return customPrompt || defaultTemplate
}