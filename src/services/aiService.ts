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
import { getLanguageInstruction, type SupportedLanguage } from './prompts/utils'
import type { PromptConfig } from '../stores/configStore'

// 检查是否在浏览器环境中
const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';

// 动态加载代理相关包的函数
async function getHttpsProxyAgent() {
  if (isBrowser) {
    return null; // 浏览器环境不支持代理
  }
  
  try {
    const httpsProxyAgentModule = await import('https-proxy-agent');
    return httpsProxyAgentModule.HttpsProxyAgent;
  } catch (error) {
    console.warn('无法加载 https-proxy-agent，代理功能将不可用:', error);
    return null;
  }
}

// 代理fetch函数 - 使用 https-proxy-agent
async function proxyFetch(url: string, options: RequestInit, proxyUrl?: string): Promise<Response> {
  if (!proxyUrl || isBrowser) {
    // 浏览器环境或未设置代理时，直接使用 fetch
    return fetch(url, options)
  }

  try {
    // 动态获取 HttpsProxyAgent
    const HttpsProxyAgent = await getHttpsProxyAgent();
    if (!HttpsProxyAgent) {
      console.warn('代理模块不可用，使用直接连接');
      return fetch(url, options);
    }
    
    // 使用 https-proxy-agent 创建代理 agent
    const agent = new HttpsProxyAgent(proxyUrl)
    
    // 为 Node.js 环境创建自定义 fetch
    const https = require('https')
    const { URL } = require('url')
    
    const parsedUrl = new URL(url)
    
    // 构建请求选项
    const requestOptions: any = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: {
        ...options.headers,
        'Host': parsedUrl.hostname,
        'User-Agent': 'ebook-to-mindmap/1.0'
      },
      agent: agent,
      timeout: 30000 // 30秒超时
    }
    
    // 如果有请求体，添加 Content-Length 和 body
    if (options.body) {
      const bodyString = typeof options.body === 'string' ? options.body : JSON.stringify(options.body)
      requestOptions.headers['Content-Length'] = Buffer.byteLength(bodyString)
    }
    
    return new Promise((resolve, reject) => {
      const req = https.request(requestOptions, (res: any) => {
        const chunks: Buffer[] = []
        
        res.on('data', (chunk: Buffer) => {
          chunks.push(chunk)
        })
        
        res.on('end', () => {
          const body = Buffer.concat(chunks).toString()
          
          // 创建 Response 对象
          const response = new Response(body, {
            status: res.statusCode,
            statusText: res.statusMessage,
            headers: res.headers
          })
          
          resolve(response)
        })
        
        res.on('error', (error: Error) => {
          reject(error)
        })
      })
      
      req.on('error', (error: Error) => {
        reject(new Error(`代理连接失败: ${error.message}`))
      })
      
      req.on('timeout', () => {
        req.destroy()
        reject(new Error('代理请求超时'))
      })
      
      // 发送请求体
      if (options.body) {
        const bodyString = typeof options.body === 'string' ? options.body : JSON.stringify(options.body)
        req.write(bodyString)
      }
      
      req.end()
    })
    
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`代理连接失败: ${error.message}`)
    }
    throw new Error('代理连接失败: 未知错误')
  }
}

interface Chapter {
  id: string
  title: string
  content: string
  summary?: string
}

interface AIConfig {
  provider: 'gemini' | 'openai' | 'ollama' | '302.ai'
  apiKey: string
  apiUrl?: string // 用于OpenAI兼容的API地址
  model?: string
  temperature?: number
  proxyUrl?: string // 代理服务器地址
  proxyEnabled?: boolean // 是否启用代理
}

interface AIServiceOptions {
  onTokenUsage?: (tokens: number) => void // Token使用量回调函数
  maxRetries?: number // 最大重试次数，默认3次
  baseRetryDelay?: number // 基础重试延迟时间（毫秒），默认60s
}

// 流量限制错误类型
interface RateLimitError extends Error {
  isRateLimit: boolean
  retryAfter?: number // 建议的重试等待时间（秒）
  status?: number
  code?: string
}

export class AIService {
  private config: AIConfig | (() => AIConfig)
  private promptConfig: PromptConfig | (() => PromptConfig)
  private genAI?: GoogleGenerativeAI
  private model: any
  private onTokenUsage?: (tokens: number) => void
  private maxRetries: number
  private baseRetryDelay: number

  constructor(config: AIConfig | (() => AIConfig), promptConfig?: PromptConfig | (() => PromptConfig), options?: AIServiceOptions) {
    this.config = config
    this.promptConfig = promptConfig || (() => ({
      chapterSummary: {
        fiction: '',
        nonFiction: ''
      },
      mindmap: {
        chapter: '',
        arrow: '',
        combined: ''
      },
      connectionAnalysis: '',
      overallSummary: ''
    }))
    this.onTokenUsage = options?.onTokenUsage
    this.maxRetries = options?.maxRetries || 3
    this.baseRetryDelay = options?.baseRetryDelay || 60000 // 默认60秒
    
    const currentConfig = typeof config === 'function' ? config() : config
    
    if (currentConfig.provider === 'gemini') {
      this.genAI = new GoogleGenerativeAI(currentConfig.apiKey)
      this.model = this.genAI.getGenerativeModel({ 
        model: currentConfig.model || 'gemini-1.5-flash'
      })
    } else if (currentConfig.provider === 'openai' || currentConfig.provider === '302.ai') {
      // OpenAI兼容的配置
      this.model = {
        apiUrl: currentConfig.apiUrl || (currentConfig.provider === '302.ai' ? 'https://api.302.ai/v1' : 'https://api.openai.com/v1'),
        apiKey: currentConfig.apiKey,
        model: currentConfig.model || 'gpt-3.5-turbo'
      }
    } else if (currentConfig.provider === 'ollama') {
      // Ollama配置
      this.model = {
        apiUrl: currentConfig.apiUrl || 'http://localhost:11434',
        apiKey: currentConfig.apiKey || '', // Ollama通常不需要API密钥
        model: currentConfig.model || 'llama2'
      }
    }
  }

  private getCurrentPromptConfig(): PromptConfig {
    return typeof this.promptConfig === 'function' ? this.promptConfig() : this.promptConfig
  }

  private getCurrentConfig(): AIConfig {
    return typeof this.config === 'function' ? this.config() : this.config
  }

  // 识别流量限制错误
  private identifyRateLimitError(error: any, status?: number, errorBody?: string): RateLimitError | null {
    // 检查HTTP状态码
    if (status === 429) {
      const rateLimitError: RateLimitError = new Error('API流量限制') as RateLimitError
      rateLimitError.isRateLimit = true
      rateLimitError.status = status
      
      // 尝试从响应体中提取重试时间
      if (errorBody) {
        try {
          const bodyData = JSON.parse(errorBody)
          rateLimitError.retryAfter = bodyData.retry_after || bodyData.retryAfter || 10
          rateLimitError.code = bodyData.code || 'rate_limit_exceeded'
        } catch {
          rateLimitError.retryAfter = 10
          rateLimitError.code = 'rate_limit_exceeded'
        }
      } else {
        rateLimitError.retryAfter = 10
        rateLimitError.code = 'rate_limit_exceeded'
      }
      
      return rateLimitError
    }
    
    // 检查错误消息中的流量限制关键词
    const errorMessage = String(error?.message || error || '')
    const rateLimitKeywords = [
      'token_quota_exceeded',
      'rate_limit_exceeded',
      'too many requests',
      'tokens per minute limit',
      'rate limit',
      'quota exceeded',
      'too many tokens'
    ]
    
    if (rateLimitKeywords.some(keyword => 
      errorMessage.toLowerCase().includes(keyword.toLowerCase())
    )) {
      const rateLimitError: RateLimitError = new Error(`API流量限制: ${errorMessage}`) as RateLimitError
      rateLimitError.isRateLimit = true
      rateLimitError.status = status || 429
      rateLimitError.retryAfter = 10 // 默认等待10秒
      rateLimitError.code = 'token_quota_exceeded'
      
      return rateLimitError
    }
    
    return null
  }

  // 等待指定时间
  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // 带重试的API请求包装器
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    context?: any
  ): Promise<T> {
    let lastError: any = null
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`[AI服务] ${operationName} - 尝试第 ${attempt} 次`)
        const result = await operation()
        
        if (attempt > 1) {
          console.log(`[AI服务] ${operationName} - 第 ${attempt} 次尝试成功`)
        }
        
        return result
      } catch (error: any) {
        lastError = error
        
        // 尝试识别流量限制错误
        const rateLimitError = this.identifyRateLimitError(
          error,
          error?.status,
          error?.body || error?.message
        )
        
        if (rateLimitError && attempt < this.maxRetries) {
          // 优先使用配置的baseRetryDelay，如果API返回了retryAfter则使用其中较大的值
          const retryAfterTime = (rateLimitError.retryAfter || 10) * 1000
          const actualWaitTime = Math.max(this.baseRetryDelay, retryAfterTime)
          
          console.warn(`[AI服务] ${operationName} - 检测到流量限制，等待 ${actualWaitTime/1000} 秒后重试`, {
            attempt,
            maxRetries: this.maxRetries,
            waitTime: actualWaitTime,
            errorCode: rateLimitError.code,
            errorStatus: rateLimitError.status,
            errorMessage: rateLimitError.message,
            context
          })
          
          await this.sleep(actualWaitTime)
          continue
        }
        
        // 如果不是流量限制错误或已达到最大重试次数，抛出错误
        if (rateLimitError) {
          console.error(`[AI服务] ${operationName} - 流量限制重试失败，已达到最大重试次数`, {
            attempt,
            maxRetries: this.maxRetries,
            finalError: rateLimitError.message,
            context
          })
        } else {
          console.error(`[AI服务] ${operationName} - 发生非流量限制错误`, {
            attempt,
            error: error?.message || error,
            context
          })
        }
        
        throw error
      }
    }
    
    // 理论上不会到达这里，但为了类型安全
    throw lastError
  }

  async summarizeChapter(title: string, content: string, bookType: 'fiction' | 'non-fiction' = 'non-fiction', outputLanguage: SupportedLanguage = 'en', customPrompt?: string): Promise<string> {
    try {
      const promptConfig = this.getCurrentPromptConfig()
      const customChapterPrompt = customPrompt || (bookType === 'fiction' ? promptConfig.chapterSummary.fiction : promptConfig.chapterSummary.nonFiction)
      
      let prompt = bookType === 'fiction'
        ? getFictionChapterSummaryPrompt(title, content, customChapterPrompt)
        : getNonFictionChapterSummaryPrompt(title, content, customChapterPrompt)

      // 如果有自定义提示词，则拼接到原始prompt后面
      if (customPrompt && customPrompt.trim()) {
        prompt += `\n\n补充要求：${customPrompt.trim()}`
      }

      const summary = await this.generateContent(prompt, outputLanguage)

      if (!summary || summary.trim().length === 0) {
        throw new Error('AI返回了空的总结')
      }

      return summary.trim()
    } catch (error) {
      throw new Error(`章节总结失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  async analyzeConnections(chapters: Chapter[], outputLanguage: SupportedLanguage = 'en'): Promise<string> {
    try {
      // 构建章节摘要信息
      const chapterSummaries = chapters.map((chapter) => 
        `${chapter.title}:\n${chapter.summary || '无总结'}`
      ).join('\n\n')

      const prompt = getChapterConnectionsAnalysisPrompt(chapterSummaries)

      const connections = await this.generateContent(prompt, outputLanguage)

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
    connections: string,
    outputLanguage: SupportedLanguage = 'en'
  ): Promise<string> {
    try {
      // 构建简化的章节信息
      const chapterInfo = chapters.map((chapter, index) => 
        `第${index + 1}章：${chapter.title}，内容：${chapter.summary || '无总结'}`
      ).join('\n')

      const prompt = getOverallSummaryPrompt(bookTitle, chapterInfo, connections)

      const summary = await this.generateContent(prompt, outputLanguage)

      if (!summary || summary.trim().length === 0) {
        throw new Error('AI返回了空的全书总结')
      }

      return summary.trim()
    } catch (error) {
      throw new Error(`全书总结生成失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  async generateChapterMindMap(content: string, outputLanguage: SupportedLanguage = 'en', customPrompt?: string): Promise<MindElixirData> {
    try {
      const promptConfig = this.getCurrentPromptConfig()
      const customMindmapPrompt = customPrompt || promptConfig.mindmap.chapter
      
      const basePrompt = getChapterMindMapPrompt(customMindmapPrompt)
      let prompt = basePrompt + `章节内容：\n${content}`

      // 如果有自定义提示词，则拼接到原始prompt后面
      if (customPrompt && customPrompt.trim()) {
        prompt += `\n\n补充要求：${customPrompt.trim()}`
      }

      const mindMapJson = await this.generateContent(prompt, outputLanguage)

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

  async generateMindMapArrows(combinedMindMapData: any, outputLanguage: SupportedLanguage = 'en'): Promise<any> {
    try {
      const basePrompt = getMindMapArrowPrompt()
      const prompt = basePrompt + `\n\n当前思维导图数据：\n${JSON.stringify(combinedMindMapData, null, 2)}`

      const arrowsJson = await this.generateContent(prompt, outputLanguage)

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

  async generateCombinedMindMap(bookTitle: string, chapters: Chapter[], customPrompt?: string): Promise<MindElixirData> {
    try {
      const basePrompt = getChapterMindMapPrompt()
      const chaptersContent = chapters.map(item=>item.content).join('\n\n ------------- \n\n')
      let prompt = `${basePrompt}
        请为整本书《${bookTitle}》生成一个完整的思维导图，将所有章节的内容整合在一起。
        章节内容：\n${chaptersContent}`

      // 如果有自定义提示词，则拼接到原始prompt后面
      if (customPrompt && customPrompt.trim()) {
        prompt += `\n\n补充要求：${customPrompt.trim()}`
      }

      const mindMapJson = await this.generateContent(prompt, 'en')

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
  private async generateContent(prompt: string, outputLanguage?: SupportedLanguage): Promise<string> {
    const config = this.getCurrentConfig()
    const language = outputLanguage || 'en'
    const systemPrompt = getLanguageInstruction(language)
    
    return this.executeWithRetry(
      async () => {
        if (config.provider === 'gemini') {
          // Gemini API 不直接支持系统提示，将系统提示合并到用户提示前面
          const finalPrompt = `${prompt}\n\n**${systemPrompt}**`
          
          // 如果启用代理，使用代理请求 Gemini API
          if (config.proxyEnabled && config.proxyUrl) {
            return await this.generateGeminiWithProxy(finalPrompt, config)
          } else {
            const result = await this.model.generateContent(finalPrompt, {
              generationConfig: {
                temperature: config.temperature || 0.7
              }
            })
            const response = await result.response
            
            // 统计token使用量（Gemini API返回使用情况）
            try {
              const usage = (result as any).response?.usageMetadata
              if (usage?.totalTokenCount) {
                this.recordTokenUsage(usage.totalTokenCount)
              }
            } catch (error) {
              // 如果无法获取token使用量，忽略错误
            }
            
            return response.text()
          }
        } else if (config.provider === 'openai' || config.provider === '302.ai') {
          const messages: Array<{role: 'system' | 'user', content: string}> = [
            {
              role: 'user',
              content: prompt + '\n\n' + systemPrompt
            }
          ]
          
          const response = await proxyFetch(`${this.model.apiUrl}/chat/completions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.model.apiKey}`
            },
            body: JSON.stringify({
              model: this.model.model,
              messages,
              temperature: config.temperature || 0.7
            })
          }, config.proxyEnabled ? config.proxyUrl : undefined)

          if (!response.ok) {
            const errorBody = await response.text()
            const error = new Error(`OpenAI API请求失败: ${response.status} ${response.statusText} - ${errorBody}`) as any
            error.status = response.status
            error.body = errorBody
            
            console.error('OpenAI API错误详情:', {
              status: response.status,
              statusText: response.statusText,
              body: errorBody,
              url: `${this.model.apiUrl}/chat/completions`,
              model: this.model.model,
              provider: config.provider,
              proxyEnabled: config.proxyEnabled,
              proxyUrl: config.proxyUrl
            })
            throw error
          }

          const data = await response.json()
          
          // 统计token使用量（OpenAI API返回使用情况）
          try {
            if (data.usage?.total_tokens) {
              this.recordTokenUsage(data.usage.total_tokens)
            }
          } catch (error) {
            // 如果无法获取token使用量，忽略错误
          }
          
          return data.choices[0]?.message?.content || ''
        } else if (config.provider === 'ollama') {
          // Ollama API 调用
          const messages: Array<{role: 'system' | 'user', content: string}> = [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: prompt
            }
          ]
          
          const requestHeaders: Record<string, string> = {
            'Content-Type': 'application/json'
          }
          
          // 如果提供了API密钥，则添加Authorization头
          if (this.model.apiKey) {
            requestHeaders['Authorization'] = `Bearer ${this.model.apiKey}`
          }
          
          const response = await proxyFetch(`${this.model.apiUrl}/api/chat`, {
            method: 'POST',
            headers: requestHeaders,
            body: JSON.stringify({
              model: this.model.model,
              messages,
              stream: false,
              options: {
                temperature: config.temperature || 0.7
              }
            })
          }, config.proxyEnabled ? config.proxyUrl : undefined)

          if (!response.ok) {
            const errorBody = await response.text()
            const error = new Error(`Ollama API请求失败: ${response.status} ${response.statusText} - ${errorBody}`) as any
            error.status = response.status
            error.body = errorBody
            
            console.error('Ollama API错误详情:', {
              status: response.status,
              statusText: response.statusText,
              body: errorBody,
              url: `${this.model.apiUrl}/api/chat`,
              model: this.model.model,
              provider: config.provider,
              proxyEnabled: config.proxyEnabled,
              proxyUrl: config.proxyUrl
            })
            throw error
          }

          const data = await response.json()
          return data.message?.content || ''
        }
        
        throw new Error(`不支持的AI提供商: ${config.provider}`)
      },
      '内容生成',
      {
        provider: config.provider,
        model: config.model,
        promptLength: prompt.length,
        outputLanguage: language,
        timestamp: new Date().toISOString()
      }
    )
  }

  // Gemini API 代理请求方法
  private async generateGeminiWithProxy(prompt: string, config: AIConfig): Promise<string> {
    // 浏览器环境不支持代理，回退到标准 Gemini API 调用
    if (isBrowser) {
      console.warn('浏览器环境不支持代理功能，使用直接连接');
      const result = await this.model.generateContent(prompt, {
        generationConfig: {
          temperature: config.temperature || 0.7
        }
      })
      const response = await result.response
      return response.text()
    }

    return this.executeWithRetry(
      async () => {
        // 动态获取 HttpsProxyAgent
        const HttpsProxyAgent = await getHttpsProxyAgent();
        if (!HttpsProxyAgent) {
          console.warn('代理模块不可用，使用直接连接');
          const result = await this.model.generateContent(prompt, {
            generationConfig: {
              temperature: config.temperature || 0.7
            }
          })
          const response = await result.response
          return response.text()
        }

        const https = require('https')
        const { URL } = require('url')
        
        // 构建请求 URL
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.model || 'gemini-1.5-flash'}:generateContent?key=${config.apiKey}`
        const parsedUrl = new URL(url)
        
        // 创建代理 agent
        const agent = new HttpsProxyAgent(config.proxyUrl!)
        
        // 构建请求体
        const postData = JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: config.temperature || 0.7
          }
        })
        
        // 构建请求选项
        const requestOptions: any = {
          hostname: parsedUrl.hostname,
          port: parsedUrl.port || 443,
          path: parsedUrl.pathname + parsedUrl.search,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData),
            'User-Agent': 'ebook-to-mindmap/1.0'
          },
          agent: agent,
          timeout: 30000
        }
        
        return new Promise((resolve, reject) => {
          const req = https.request(requestOptions, (res: any) => {
            const chunks: Buffer[] = []
            
            res.on('data', (chunk: Buffer) => {
              chunks.push(chunk)
            })
            
            res.on('end', () => {
              const body = Buffer.concat(chunks).toString()
              
              if (res.statusCode === 200) {
                try {
                  const response = JSON.parse(body)
                  const text = response.candidates?.[0]?.content?.parts?.[0]?.text || ''
                  resolve(text)
                } catch (parseError) {
                  console.error('Gemini API响应解析失败:', {
                    parseError: parseError.message,
                    responseBody: body.substring(0, 500) + (body.length > 500 ? '...' : ''),
                    statusCode: res.statusCode,
                    provider: config.provider
                  })
                  reject(new Error('Gemini API 响应解析失败'))
                }
              } else {
                const error = new Error(`Gemini API 请求失败: ${res.statusCode} ${res.statusMessage} - ${body}`) as any
                error.status = res.statusCode
                error.body = body
                
                console.error('Gemini API错误详情:', {
                  statusCode: res.statusCode,
                  statusMessage: res.statusMessage,
                  body: body,
                  url: `https://generativelanguage.googleapis.com/v1beta/models/${config.model || 'gemini-1.5-flash'}:generateContent`,
                  model: config.model || 'gemini-1.5-flash',
                  provider: config.provider,
                  proxyEnabled: config.proxyEnabled,
                  proxyUrl: config.proxyUrl
                })
                reject(error)
              }
            })
            
            res.on('error', (error: Error) => {
              reject(error)
            })
          })
          
          req.on('error', (error: Error) => {
            reject(new Error(`代理连接失败: ${error.message}`))
          })
          
          req.on('timeout', () => {
            req.destroy()
            reject(new Error('代理请求超时'))
          })
          
          req.write(postData)
          req.end()
        })
      },
      'Gemini代理请求',
      {
        provider: config.provider,
        model: config.model,
        promptLength: prompt.length,
        proxyUrl: config.proxyUrl,
        timestamp: new Date().toISOString()
      }
    )
  }

  // 辅助方法：检查API连接
  async testConnection(): Promise<boolean> {
    try {
      const text = await this.generateContent(getTestConnectionPrompt())
      
      // 记录原始响应用于调试
      console.log('AI连接测试原始响应:', text)
      
      // 清理响应文本，移除多余的空白字符和标点符号
      const cleanText = text.trim().toLowerCase().replace(/[^\w\s\u4e00-\u9fa5]/gi, '')
      
      // 多种成功响应的判断条件
      const successPatterns = [
        'ok',           // 英文 OK
        '连接成功',       // 中文连接成功
        '成功',          // 中文成功
        'success',      // 英文 success
        'connected',    // 英文 connected
        '正常',          // 中文正常
        '可用',          // 中文可用
        'ready',        // 英文 ready
        'working',      // 英文 working
        '测试成功',       // 中文测试成功
        '连接正常',       // 中文连接正常
      ]
      
      // 检查是否包含任何成功模式
      const isSuccess = successPatterns.some(pattern => cleanText.includes(pattern))
      
      // 记录测试结果
      console.log('AI连接测试结果:', {
        cleanText,
        isSuccess,
        matchedPattern: successPatterns.find(pattern => cleanText.includes(pattern))
      })
      
      return isSuccess
    } catch (error) {
      console.warn('AI连接测试失败:', error)
      return false
    }
  }

  // 测试代理连接
  async testProxyConnection(): Promise<{ success: boolean; message: string; details?: any }> {
    const config = this.getCurrentConfig()
    
    if (!config.proxyEnabled || !config.proxyUrl) {
      return {
        success: false,
        message: '代理未启用'
      }
    }
    
    try {
      // 测试基础代理连接
      const testResult = await this.testBasicProxyConnectivity(config.proxyUrl)
      
      if (testResult.success) {
        // 如果基础连接成功，测试 AI API 连接
        const apiTestResult = await this.testConnection()
        
        if (apiTestResult) {
          return {
            success: true,
            message: '代理连接成功，AI API 可用',
            details: testResult.details
          }
        } else {
          return {
            success: false,
            message: '代理连接成功，但 AI API 不可用',
            details: testResult.details
          }
        }
      } else {
        return testResult
      }
    } catch (error) {
      console.error('代理测试失败:', error)
      return {
        success: false,
        message: `代理测试失败: ${error instanceof Error ? error.message : '未知错误'}`
      }
    }
  }

  // 测试基础代理连接性
  private async testBasicProxyConnectivity(proxyUrl: string): Promise<{ success: boolean; message: string; details?: any }> {
    // 浏览器环境不支持代理测试
    if (isBrowser) {
      return {
        success: false,
        message: '浏览器环境不支持代理功能'
      }
    }

    try {
      // 动态获取 HttpsProxyAgent
      const HttpsProxyAgent = await getHttpsProxyAgent();
      if (!HttpsProxyAgent) {
        return {
          success: false,
          message: '代理模块不可用'
        }
      }

      const https = require('https')
      const { URL } = require('url')
      
      // 使用 httpbin.org 测试代理
      const testUrl = 'https://httpbin.org/ip'
      const parsedUrl = new URL(testUrl)
      
      const agent = new HttpsProxyAgent(proxyUrl)
      
      const requestOptions: any = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || 443,
        path: parsedUrl.pathname,
        method: 'GET',
        headers: {
          'User-Agent': 'ebook-to-mindmap/1.0'
        },
        agent: agent,
        timeout: 10000
      }
      
      return new Promise((resolve) => {
        const req = https.request(requestOptions, (res: any) => {
          const chunks: Buffer[] = []
          
          res.on('data', (chunk: Buffer) => {
            chunks.push(chunk)
          })
          
          res.on('end', () => {
            const body = Buffer.concat(chunks).toString()
            
            if (res.statusCode === 200) {
              try {
                const response = JSON.parse(body)
                resolve({
                  success: true,
                  message: '代理连接成功',
                  details: {
                    proxyIP: response.origin,
                    statusCode: res.statusCode
                  }
                })
              } catch (parseError) {
                resolve({
                  success: false,
                  message: '代理响应解析失败'
                })
              }
            } else {
              resolve({
                success: false,
                message: `代理服务器返回错误: ${res.statusCode}`,
                details: { body }
              })
            }
          })
        })
        
        req.on('error', (error: Error) => {
          resolve({
            success: false,
            message: `代理连接失败: ${error.message}`
          })
        })
        
        req.on('timeout', () => {
          req.destroy()
          resolve({
            success: false,
            message: '代理连接超时'
          })
        })
        
        req.end()
      })
      
    } catch (error) {
      return {
        success: false,
        message: `代理测试异常: ${error instanceof Error ? error.message : '未知错误'}`
      }
    }
  }

  // 记录token使用量的私有方法
  private recordTokenUsage(tokens: number): void {
    if (this.onTokenUsage && tokens > 0) {
      this.onTokenUsage(tokens)
    }
  }
}

// 保持向后兼容性
export class AiService extends AIService {
  constructor(apiKey: string) {
    super({ provider: 'gemini', apiKey })
  }
}