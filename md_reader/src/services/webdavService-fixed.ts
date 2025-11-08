import { createClient, WebDAVClient } from 'webdav'

// WebDAV操作结果接口
export interface WebDAVOperationResult<T> {
  success: boolean
  data?: T
  error?: string
}

// WebDAV文件信息接口
export interface WebDAVFileInfo {
  filename: string
  basename: string
  lastmod: Date
  size: number
  type: 'file' | 'directory'
  etag?: string
}

// WebDAV配置接口
export interface WebDAVConfig {
  enabled: boolean
  serverUrl: string
  username: string
  password: string
  appName: string
  autoSync: boolean
  syncPath: string
  lastSyncTime: string | null
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error'
  useProxy?: boolean
}

/**
 * 获取代理后的URL
 */
function getProcessedUrl(originalUrl: string, useProxy: boolean = false): string {
  const isVercel = typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')
  const isDev = (import.meta as any).env.DEV
  
  if (isVercel && originalUrl.includes('dav.jianguoyun.com')) {
    console.log('[getProcessedUrl] Vercel环境，使用代理:', originalUrl)
    return '/api/webdav'
  }
  
  if (isDev && originalUrl.includes('dav.jianguoyun.com')) {
    console.log('[getProcessedUrl] 开发环境，使用Vite代理:', originalUrl)
    return '/webdav'
  }
  
  console.log('[getProcessedUrl] 直连模式:', originalUrl)
  return originalUrl
}

// WebDAV客户端封装类
export class WebDAVService {
  private client: WebDAVClient | null = null
  private config: WebDAVConfig | null = null
  private baseURL: string = ''

  /**
   * 初始化WebDAV客户端
   */
  async initialize(config: WebDAVConfig): Promise<WebDAVOperationResult<boolean>> {
    try {
      this.config = config
      
      if (!config.serverUrl || !config.username || !config.password) {
        return {
          success: false,
          error: 'WebDAV配置不完整，需要服务器地址、用户名和密码'
        }
      }

      // 获取处理后的URL
      this.baseURL = getProcessedUrl(config.serverUrl, config.useProxy || false)
      const isVercel = typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')
      const isDev = (import.meta as any).env.DEV
      const proxyMode = isVercel ? 'Vercel Serverless Function' : (config.useProxy || isDev ? 'Vite开发代理' : '直连')
      
      console.log('初始化WebDAV客户端:')
      console.log('- 原始URL:', config.serverUrl)
      console.log('- 处理后URL:', this.baseURL)
      console.log('- 代理模式:', proxyMode)

      // 创建WebDAV客户端
      const clientConfig: any = {
        username: config.username,
        password: config.password
      }
      
      if (!isVercel && !config.useProxy) {
        clientConfig.headers = {
          'User-Agent': 'md-reader/1.0'
        }
      }
      
      this.client = createClient(this.baseURL, clientConfig)

      // 测试连接
      const testResult = await this.testConnection()
      if (!testResult.success) {
        this.client = null
        return testResult
      }

      return { success: true, data: true }
    } catch (error) {
      return {
        success: false,
        error: `WebDAV客户端初始化失败: ${error instanceof Error ? error.message : '未知错误'}`
      }
    }
  }

  /**
   * 测试WebDAV连接
   */
  async testConnection(): Promise<WebDAVOperationResult<boolean>> {
    if (!this.client) {
      return { success: false, error: 'WebDAV客户端未初始化' }
    }

    try {
      console.log('测试WebDAV连接...')
      const result = await this.getDirectoryContents('/', false)
      if (result.success) {
        console.log('WebDAV连接测试成功')
        return { success: true, data: true }
      } else {
        return { success: false, error: result.error || '连接测试失败' }
      }
    } catch (error) {
      console.error('WebDAV连接测试失败:', error)
      return {
        success: false,
        error: `连接测试失败: ${error instanceof Error ? error.message : '未知错误'}`
      }
    }
  }

  /**
   * 获取目录内容 - 使用直接fetch确保正确的URL
   */
  async getDirectoryContents(path: string = '/', deep: boolean = false): Promise<WebDAVOperationResult<WebDAVFileInfo[]>> {
    if (!this.client) {
      return { success: false, error: 'WebDAV客户端未初始化' }
    }

    try {
      console.log('请求目录内容，路径:', path)
      
      // 标准化路径
      let normalizedPath = path
      console.log('[getDirectoryContents] 原始路径:', path)
      
      // 处理各种可能的路径格式
      if (normalizedPath.startsWith('../dav/')) {
        normalizedPath = normalizedPath.replace('../dav/', '/')
        console.log('[getDirectoryContents] 处理../dav/路径:', normalizedPath)
      } else if (normalizedPath.startsWith('../../dav/')) {
        normalizedPath = normalizedPath.replace('../../dav/', '/')
        console.log('[getDirectoryContents] 处理../../dav/路径:', normalizedPath)
      } else if (normalizedPath.startsWith('/dav/')) {
        normalizedPath = normalizedPath.replace('/dav/', '/')
        console.log('[getDirectoryContents] 处理/dav/路径:', normalizedPath)
      }
      
      if (!normalizedPath.startsWith('/')) {
        normalizedPath = '/' + normalizedPath
      }
      
      console.log('[getDirectoryContents] 最终路径:', normalizedPath)
      
      // 使用WebDAV客户端获取内容
      const contents = await this.client.getDirectoryContents(normalizedPath, { deep })
      
      console.log('[getDirectoryContents] WebDAV库请求完成')
      console.log('- 请求路径:', normalizedPath)
      console.log('- 基础URL:', this.baseURL)
      console.log('- 响应项目数量:', (contents as any[]).length)
      
      // 转换文件信息格式
      const fileInfos: WebDAVFileInfo[] = (contents as any[]).map(item => {
        // 检测是否在Vercel环境中
        const isVercel = typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')
        
        // 重写filename路径，确保使用代理URL
        let filename = item.filename
        if (isVercel && filename.includes('dav.jianguoyun.com')) {
          console.log('[getDirectoryContents] 重写URL:', filename)
          const url = new URL(filename)
          let pathname = url.pathname
          if (pathname.startsWith('/dav/')) {
            pathname = pathname.substring(4)
          }
          filename = `/api/webdav${pathname}`
          console.log('[getDirectoryContents] 重写后:', filename)
        }
        
        return {
          filename: filename,
          basename: item.basename,
          lastmod: new Date(item.lastmod),
          size: item.size,
          type: item.type,
          etag: item.etag
        }
      })

      console.log('返回文件列表:', fileInfos)
      return { success: true, data: fileInfos }
    } catch (error) {
      console.error('获取目录内容失败:', error)
      return {
        success: false,
        error: `获取目录内容失败: ${error instanceof Error ? error.message : '未知错误'}`
      }
    }
  }

  /**
   * 获取支持的文件类型
   */
  async getSupportedFiles(path: string = '/'): Promise<WebDAVOperationResult<WebDAVFileInfo[]>> {
    const result = await this.getDirectoryContents(path, true)
    
    if (!result.success || !result.data) {
      return result
    }

    const supportedExtensions = ['.md', '.markdown', '.txt']
    const supportedFiles = result.data.filter(file => 
      file.type === 'file' && 
      supportedExtensions.some(ext => file.basename.toLowerCase().endsWith(ext))
    )

    return { success: true, data: supportedFiles }
  }

  /**
   * 获取文件内容
   */
  async getFileContents(
    filePath: string, 
    format: 'text' | 'binary' = 'text'
  ): Promise<WebDAVOperationResult<string | ArrayBuffer>> {
    if (!this.client) {
      return { success: false, error: 'WebDAV客户端未初始化' }
    }

    try {
      console.log('获取文件内容:', filePath, '格式:', format)
      
      const isVercel = typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')
      
      // 标准化文件路径
      let normalizedPath = filePath
      if (normalizedPath.startsWith('../dav/')) {
        normalizedPath = normalizedPath.replace('../dav/', '/')
      }
      if (!normalizedPath.startsWith('/')) {
        normalizedPath = '/' + normalizedPath
      }
      
      if (format === 'text') {
        const content = await this.client.getFileContents(normalizedPath, { format: 'text' }) as string
        return { success: true, data: content }
      } else {
        const content = await this.client.getFileContents(normalizedPath, { format: 'binary' }) as ArrayBuffer
        return { success: true, data: content }
      }
    } catch (error) {
      console.error('获取文件内容失败:', error)
      return {
        success: false,
        error: `获取文件内容失败: ${error instanceof Error ? error.message : '未知错误'}`
      }
    }
  }
}
