// 章节总结相关的prompt模板

export const getFictionChapterSummaryPrompt = (title: string, content: string) => {
  const userPrompt = `请为以下章节内容生成一个详细总结：

章节标题：${title}

章节内容：
${content}

请用自然流畅的语言总结本章内容，包括主要情节发展、重要人物表现、关键观点或转折，以及本章在整个故事中的作用和意义。总结应该详细但简洁，大约200-300字。

注意：如果内容是致谢、目录、前言、序言等无实质故事内容的页面，请直接回复"无需总结"。`
  
  return userPrompt
}

export const getNonFictionChapterSummaryPrompt = (title: string, content: string) => {
  const userPrompt = `请为以下社科类书籍章节内容生成一个详细总结：

章节标题：${title}

章节内容：
${content}

请用自然流畅的语言总结本章内容，包括：

- 主要观点、关键概念
- 重要的数据、案例或研究发现
- 保留几句有洞见的观点原文
- 给出指导实际生活的建议或应用

注意：如果内容是致谢、目录、前言、序言、参考文献等无实质学术内容的页面，请直接回复"无需总结"。`
  
  return userPrompt
}