import { GoogleGenerativeAI } from '@google/generative-ai'
import {
  getFictionChapterSummaryPrompt,
  getNonFictionChapterSummaryPrompt,
  getChapterConnectionsAnalysisPrompt,
  getOverallSummaryPrompt,
  getTestConnectionPrompt,
  getChapterMindMapPrompt,
  getMindMapArrowPrompt,
} from './prompts'
import type { MindElixirData } from 'mind-elixir'

interface Chapter {
  id: string
  title: string
  content: string
  summary?: string
}

interface AIConfig {
  provider: 'gemini' | 'openai'
  apiKey: string
  apiUrl?: string // 用于OpenAI兼容的API地址
  model?: string
}

export class AIService {
  private config: AIConfig
  private genAI?: GoogleGenerativeAI
  private model: any

  constructor(config: AIConfig) {
    this.config = config
    
    if (config.provider === 'gemini') {
      this.genAI = new GoogleGenerativeAI(config.apiKey)
      this.model = this.genAI.getGenerativeModel({ model: config.model || 'gemini-1.5-flash' })
    } else if (config.provider === 'openai') {
      // OpenAI兼容的配置
      this.model = {
        apiUrl: config.apiUrl || 'https://api.openai.com/v1',
        apiKey: config.apiKey,
        model: config.model || 'gpt-3.5-turbo'
      }
    }
  }

  async summarizeChapter(title: string, content: string, bookType: 'fiction' | 'non-fiction' = 'non-fiction'): Promise<string> {
    try {
      const prompt = bookType === 'fiction' 
        ? getFictionChapterSummaryPrompt(title, content)
        : getNonFictionChapterSummaryPrompt(title, content)

      const summary = await this.generateContent(prompt)

      if (!summary || summary.trim().length === 0) {
        throw new Error('AI返回了空的总结')
      }

      return summary.trim()
    } catch (error) {
      throw new Error(`章节总结失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  async analyzeConnections(chapters: Chapter[]): Promise<string> {
    try {
      // 构建章节摘要信息
      const chapterSummaries = chapters.map((chapter) => 
        `${chapter.title}:\n${chapter.summary || '无总结'}`
      ).join('\n\n')

      const prompt = getChapterConnectionsAnalysisPrompt(chapterSummaries)

      const connections = await this.generateContent(prompt)

      if (!connections || connections.trim().length === 0) {
        throw new Error('AI返回了空的关联分析')
      }

      return connections.trim()
    } catch (error) {
      throw new Error(`章节关联分析失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  async generateOverallSummary(
    bookTitle: string, 
    chapters: Chapter[], 
    connections: string
  ): Promise<string> {
    try {
      // 构建简化的章节信息
      const chapterInfo = chapters.map((chapter, index) => 
        `第${index + 1}章：${chapter.title}，内容：${chapter.content}`
      ).join('\n')

      const prompt = getOverallSummaryPrompt(bookTitle, chapterInfo, connections)

      const summary = await this.generateContent(prompt)

      if (!summary || summary.trim().length === 0) {
        throw new Error('AI返回了空的全书总结')
      }

      return summary.trim()
    } catch (error) {
      throw new Error(`全书总结生成失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  async generateChapterMindMap(title: string, content: string): Promise<MindElixirData> {
    try {
      const prompt = getChapterMindMapPrompt() + `章节内容：\n${content}`

      const mindMapJson = await this.generateContent(prompt)

      if (!mindMapJson || mindMapJson.trim().length === 0) {
        throw new Error('AI返回了空的思维导图数据')
      }
      
      // 尝试解析JSON
      try {
        return JSON.parse(mindMapJson.trim())
      } catch (parseError) {
        // 尝试从代码块中提取JSON
        const jsonMatch = mindMapJson.match(/```(?:json)?\s*([\s\S]*?)```/)
        if (jsonMatch && jsonMatch[1]) {
          try {
            return JSON.parse(jsonMatch[1].trim())
          } catch (extractError) {
            throw new Error('AI返回的思维导图数据格式不正确')
          }
        }
        throw new Error('AI返回的思维导图数据格式不正确')
      }
    } catch (error) {
      throw new Error(`章节思维导图生成失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  async generateMindMapArrows(combinedMindMapData: any): Promise<any> {
    try {
      const prompt = getMindMapArrowPrompt() + `\n\n当前思维导图数据：\n${JSON.stringify(combinedMindMapData, null, 2)}`

      const arrowsJson = await this.generateContent(prompt)

      if (!arrowsJson || arrowsJson.trim().length === 0) {
        throw new Error('AI返回了空的箭头数据')
      }

      // 尝试解析JSON
      try {
        return JSON.parse(arrowsJson.trim())
      } catch (parseError) {
        // 尝试从代码块中提取JSON
        const jsonMatch = arrowsJson.match(/```(?:json)?\s*([\s\S]*?)```/)
        if (jsonMatch && jsonMatch[1]) {
          try {
            return JSON.parse(jsonMatch[1].trim())
          } catch (extractError) {
            throw new Error('AI返回的箭头数据格式不正确')
          }
        }
        throw new Error('AI返回的箭头数据格式不正确')
      }
    } catch (error) {
      throw new Error(`思维导图箭头生成失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  async generateCombinedMindMap(bookTitle: string, chapters: Chapter[]): Promise<MindElixirData> {
    try {
      const prompt = getChapterMindMapPrompt()
      const chaptersContent = chapters.map(item=>item.content).join('\n\n ------------- \n\n')
      const mindMapJson = await this.generateContent(
        `${prompt}
        请为整本书《${bookTitle}》生成一个完整的思维导图，将所有章节的内容整合在一起。
        章节内容：\n${chaptersContent}`
      )

      if (!mindMapJson || mindMapJson.trim().length === 0) {
        throw new Error('AI返回了空的思维导图数据')
      }
      
      // 尝试解析JSON
      try {
        return JSON.parse(mindMapJson.trim())
      } catch (parseError) {
        // 尝试从代码块中提取JSON
        const jsonMatch = mindMapJson.match(/```(?:json)?\s*([\s\S]*?)```/)
        if (jsonMatch && jsonMatch[1]) {
          try {
            return JSON.parse(jsonMatch[1].trim())
          } catch (extractError) {
            throw new Error('AI返回的思维导图数据格式不正确')
          }
        }
        throw new Error('AI返回的思维导图数据格式不正确')
      }
    } catch (error) {
      throw new Error(`整书思维导图生成失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  // 统一的内容生成方法
  private async generateContent(prompt: string): Promise<string> {
    if (this.config.provider === 'gemini') {
      const result = await this.model.generateContent(prompt)
      const response = await result.response
      return response.text()
    } else if (this.config.provider === 'openai') {
      const response = await fetch(`${this.model.apiUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.model.apiKey}`
        },
        body: JSON.stringify({
          model: this.model.model,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7
        })
      })

      if (!response.ok) {
        throw new Error(`OpenAI API请求失败: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      return data.choices[0]?.message?.content || ''
    }
    
    throw new Error('不支持的AI提供商')
  }

  // 辅助方法：检查API连接
  async testConnection(): Promise<boolean> {
    try {
      const text = await this.generateContent(getTestConnectionPrompt())
      return text.includes('连接成功') || text.includes('成功')
    } catch (error) {
      return false
    }
  }
}

// 保持向后兼容性
export class GeminiService extends AIService {
  constructor(apiKey: string) {
    super({ provider: 'gemini', apiKey })
  }
}