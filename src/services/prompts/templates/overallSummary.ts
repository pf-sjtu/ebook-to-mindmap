// 全书总结提示词模板

export const OVERALL_SUMMARY_TEMPLATES = {
  standard: {
    name: '标准全书总结',
    template: `书籍章节结构：
{{chapterInfo}}

章节关联分析：
{{connections}}

以上是《{{bookTitle}}》这本书的重点内容，请生成一个全面的总结报告，帮助读者快速掌握全书精髓。`
  }
} as const
