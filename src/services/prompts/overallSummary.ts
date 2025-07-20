// 全书总结相关的prompt模板

export const getOverallSummaryPrompt = (bookTitle: string, chapterInfo: string, connections: string) => `请为《${bookTitle}》这本书生成一个全面的总结报告，帮助读者快速掌握全书精髓：

书籍章节结构：
${chapterInfo}

章节关联分析：
${connections}`