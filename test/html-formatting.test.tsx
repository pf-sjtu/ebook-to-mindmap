import React from 'react'
import { render, screen } from '@testing-library/react'
import { MarkdownCard } from '../src/components/MarkdownCard'
import { ViewContentDialog } from '../src/components/ViewContentDialog'

// 测试HTML格式支持
describe('HTML Formatting Support', () => {
  const testContent = `
# 测试标题

这是一个包含<u>下划线文本</u>的段落。

这里有一些<ins>插入的文本</ins>和<del>删除的文本</u>。

还有<mark>标记的文本</mark>和上标X<sup>2</sup>、下标H<sub>2</sub>O。

<small>这是小号文本</small>和<s>删除线文本</s>。

**粗体文本**和*斜体文本*。
  `

  test('MarkdownCard renders underline tags correctly', () => {
    render(
      <MarkdownCard
        id="test-chapter"
        title="测试章节"
        content="原始内容"
        markdownContent={testContent}
        index={0}
        showClearCache={false}
        showViewContent={false}
        showCopyButton={false}
        showReadButton={false}
      />
    )

    // 检查下划线文本是否被正确渲染
    const underlineElement = document.querySelector('u')
    expect(underlineElement).toBeInTheDocument()
    expect(underlineElement).toHaveStyle('text-decoration: underline')
  })

  test('ViewContentDialog renders markdown content with formatting', () => {
    render(
      <ViewContentDialog
        title="测试内容"
        content={testContent}
        chapterIndex={0}
        contentType="markdown"
      />
    )

    // 检查是否正确渲染了Markdown内容
    expect(screen.getByText('测试标题')).toBeInTheDocument()
  })

  test('ViewContentDialog renders HTML content with formatting', () => {
    const htmlContent = `
      <p>包含<u>下划线</u>的HTML内容</p>
      <p>包含<ins>插入文本</ins>和<del>删除文本</del></p>
      <p>包含<mark>标记文本</mark>和<sup>上标</sup></p>
    `

    render(
      <ViewContentDialog
        title="HTML测试"
        content={htmlContent}
        chapterIndex={0}
        contentType="html"
      />
    )

    // 检查HTML内容是否被正确渲染
    const underlineElement = document.querySelector('u')
    expect(underlineElement).toBeInTheDocument()
  })
})

// 样式测试
describe('CSS Styles for HTML Tags', () => {
  test('prose classes include underline styling', () => {
    const style = getComputedStyle(document.body)
    
    // 检查全局样式是否包含下划线支持
    const proseStyles = document.styleSheets[0]?.cssRules || []
    let hasUnderlineStyle = false
    
    for (let rule of proseStyles) {
      if (rule instanceof CSSStyleRule && rule.selectorText?.includes('.prose u')) {
        hasUnderlineStyle = true
        break
      }
    }
    
    expect(hasUnderlineStyle).toBe(true)
  })
})
