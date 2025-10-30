// 提示词模板索引
import { CHAPTER_SUMMARY_TEMPLATES } from './chapterSummary'
import { MINDMAP_TEMPLATES } from './mindmap'
import { CONNECTION_ANALYSIS_TEMPLATES } from './connectionAnalysis'
import { OVERALL_SUMMARY_TEMPLATES } from './overallSummary'
import { 
  CHAPTER_SUMMARY_TEMPLATES_V2, 
  MINDMAP_TEMPLATES_V2, 
  CONNECTION_ANALYSIS_TEMPLATES_V2, 
  OVERALL_SUMMARY_TEMPLATES_V2,
  DEFAULT_PROMPT_CONFIG_V2 
} from './v2'

export {
  CHAPTER_SUMMARY_TEMPLATES,
  MINDMAP_TEMPLATES,
  CONNECTION_ANALYSIS_TEMPLATES,
  OVERALL_SUMMARY_TEMPLATES,
  CHAPTER_SUMMARY_TEMPLATES_V2,
  MINDMAP_TEMPLATES_V2,
  CONNECTION_ANALYSIS_TEMPLATES_V2,
  OVERALL_SUMMARY_TEMPLATES_V2,
  DEFAULT_PROMPT_CONFIG_V2
}

// 默认提示词配置
export const DEFAULT_PROMPT_CONFIG = {
  chapterSummary: {
    fiction: CHAPTER_SUMMARY_TEMPLATES.fiction.template,
    nonFiction: CHAPTER_SUMMARY_TEMPLATES.nonFiction.template
  },
  mindmap: {
    chapter: MINDMAP_TEMPLATES.chapter.template,
    arrow: MINDMAP_TEMPLATES.arrow.template,
    combined: MINDMAP_TEMPLATES.combined.template
  },
  connectionAnalysis: CONNECTION_ANALYSIS_TEMPLATES.standard.template,
  overallSummary: OVERALL_SUMMARY_TEMPLATES.standard.template
} as const

// 提示词类型定义
export type PromptType = 'chapterSummary' | 'mindmap' | 'connectionAnalysis' | 'overallSummary'
export type BookType = 'fiction' | 'non-fiction'
export type MindmapType = 'chapter' | 'arrow' | 'combined'
export type PromptVersion = 'v1' | 'v2'
