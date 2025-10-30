// 第二版提示词模板索引
import { CHAPTER_SUMMARY_TEMPLATES_V2 } from './chapterSummary'
import { MINDMAP_TEMPLATES_V2 } from './mindmap'
import { CONNECTION_ANALYSIS_TEMPLATES_V2 } from './connectionAnalysis'
import { OVERALL_SUMMARY_TEMPLATES_V2 } from './overallSummary'

export {
  CHAPTER_SUMMARY_TEMPLATES_V2,
  MINDMAP_TEMPLATES_V2,
  CONNECTION_ANALYSIS_TEMPLATES_V2,
  OVERALL_SUMMARY_TEMPLATES_V2
}

// 第二版默认提示词配置
export const DEFAULT_PROMPT_CONFIG_V2 = {
  chapterSummary: {
    fiction: CHAPTER_SUMMARY_TEMPLATES_V2.fiction.template,
    nonFiction: CHAPTER_SUMMARY_TEMPLATES_V2.nonFiction.template
  },
  mindmap: {
    chapter: MINDMAP_TEMPLATES_V2.chapter.template,
    arrow: MINDMAP_TEMPLATES_V2.arrow.template,
    combined: MINDMAP_TEMPLATES_V2.combined.template
  },
  connectionAnalysis: CONNECTION_ANALYSIS_TEMPLATES_V2.standard.template,
  overallSummary: OVERALL_SUMMARY_TEMPLATES_V2.standard.template
} as const
