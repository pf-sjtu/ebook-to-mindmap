// Prompt模板统一导出文件

export {
  getFictionChapterSummaryPrompt,
  getNonFictionChapterSummaryPrompt
} from './chapterSummary'

export {
  getChapterConnectionsAnalysisPrompt
} from './connectionAnalysis'

export {
  getOverallSummaryPrompt
} from './overallSummary'

// 测试连接的prompt
export const getTestConnectionPrompt = () => '这是一个连接测试。请简单回复"OK"，不要添加任何其他文字、标点符号或格式。'

export {
  getChapterMindMapPrompt,
  getMindMapArrowPrompt
} from './mindmap'