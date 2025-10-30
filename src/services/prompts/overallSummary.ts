// 全书总结相关的prompt模板

export const getOverallSummaryPrompt = (bookTitle: string, chapterInfo: string, connections: string, customPrompt?: string) => {
  const template = customPrompt || `书籍章节结构：
{{chapterInfo}}

章节关联分析：
{{connections}}

以上是《{{bookTitle}}》这本书的重点内容，请生成一个全面的总结报告，帮助读者快速掌握全书精髓。`
  
  return template
    .replace('{{chapterInfo}}', chapterInfo)
    .replace('{{connections}}', connections)
    .replace('{{bookTitle}}', bookTitle)
}