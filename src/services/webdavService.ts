import { createClient, WebDAVClient } from 'webdav'
import type { WebDAVConfig } from '../stores/configStore'

// WebDAV文件信息接口
export interface WebDAVFileInfo {
  filename: string
  basename: string
  lastmod: string
  size: number
  type: 'file' | 'directory'
  etag?: string
  mime?: string
}

// WebDAV操作结果接口
export interface WebDAVOperationResult<T = any> {
  success: boolean
  data?: T
  error?: string
}

// WebDAV上传进度回调
export type UploadProgressCallback = (progress: number) => void

/**
 * 获取处理后的URL - 支持Vercel部署
 * @param originalUrl 原始URL
 * @param useProxy 是否使用代理
 * @returns 处理后的URL
 */
function getProcessedUrl(originalUrl: string, useProxy: boolean = false): string {
  // 检测是否在Vercel环境中
  const isVercel = typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')
  const isDev = (import.meta as any).env.DEV
  
  // Vercel环境使用Serverless Function代理
  if (isVercel && originalUrl.includes('dav.jianguoyun.com')) {
    console.log('[getProcessedUrl] Vercel环境，使用代理:', originalUrl)
    // 始终返回代理基础URL，让WebDAV库在此基础上构建路径
    return '/api/webdav'
  }
  
  // 开发环境自动使用Vite代理（避免CORS问题）
  if (isDev && originalUrl.includes('dav.jianguoyun.com')) {
    console.log('[getProcessedUrl] 开发环境，使用Vite代理:', originalUrl)
    return '/webdav'
  }
  
  // 其他情况返回原始URL
  console.log('[getProcessedUrl] 直连模式:', originalUrl)
  return originalUrl
}

// WebDAV客户端封装类
export class WebDAVService {
  private client: WebDAVClient | null = null
  private config: WebDAVConfig | null = null

  /**
   * 初始化WebDAV客户端
   * @param config WebDAV配置
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

      // 获取处理后的URL（根据环境自动选择代理模式）
      const processedUrl = getProcessedUrl(config.serverUrl, config.useProxy || false)
      const isVercel = typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')
      const isDev = (import.meta as any).env.DEV
      const proxyMode = isVercel ? 'Vercel Serverless Function' : (config.useProxy || isDev ? 'Vite开发代理' : '直连')
      console.log('初始化WebDAV客户端，原始URL:', config.serverUrl)
      console.log('初始化WebDAV客户端，处理后URL:', processedUrl)
      console.log('代理模式:', proxyMode)

      // 创建WebDAV客户端
      const clientConfig: any = {
        username: config.username,
        password: config.password
      }
      
      // 只有在非代理模式下才添加User-Agent头部
      if (!isVercel && !config.useProxy) {
        clientConfig.headers = {
          'User-Agent': 'ebook-to-mindmap/1.0'
        }
      }
      
      this.client = createClient(processedUrl, clientConfig)

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
      // 尝试获取根目录内容来测试连接
      await this.client.getDirectoryContents('/')
      return { success: true, data: true }
    } catch (error) {
      let errorMessage = '连接失败'
      
      if (error instanceof Error) {
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
          errorMessage = '认证失败，请检查用户名和密码'
        } else if (error.message.includes('404') || error.message.includes('Not Found')) {
          errorMessage = '服务器地址不正确'
        } else if (error.message.includes('ENOTFOUND') || error.message.includes('Network')) {
          errorMessage = '网络连接失败，请检查服务器地址'
        } else {
          errorMessage = error.message
        }
      }
      
      return { success: false, error: errorMessage }
    }
  }

  /**
   * 获取目录内容
   * @param path 目录路径
   * @param deep 是否递归获取子目录
   */
  async getDirectoryContents(
    path: string = '/', 
    deep: boolean = false
  ): Promise<WebDAVOperationResult<WebDAVFileInfo[]>> {
    if (!this.client) {
      return { success: false, error: 'WebDAV客户端未初始化' }
    }

    try {
      console.log('请求目录内容，路径:', path)
      console.log('当前WebDAV客户端配置:', {
        baseURL: this.config?.serverUrl,
        processedURL: getProcessedUrl(this.config?.serverUrl || '', this.config?.useProxy || false)
      })
      
      // 标准化路径
      let normalizedPath = path
      if (normalizedPath.startsWith('../dav/')) {
        normalizedPath = normalizedPath.replace('../dav/', '/')
      }
      if (!normalizedPath.startsWith('/')) {
        normalizedPath = '/' + normalizedPath
      }
      
      console.log('标准化后路径:', normalizedPath)
      console.log('即将发送WebDAV请求到基础URL:', getProcessedUrl(this.config?.serverUrl || '', this.config?.useProxy || false))
      
      const contents = await this.client.getDirectoryContents(normalizedPath, { deep })
      
      // 转换文件信息格式
      const fileList: WebDAVFileInfo[] = (contents as any[]).map(item => {
        // 检测是否在Vercel环境中
        const isVercel = typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')
        
        // 重写filename路径，确保使用代理URL
        let filename = item.filename
        console.log('[getDirectoryContents] 原始filename:', filename)
        
        if (isVercel) {
          // 处理各种可能的URL格式
          if (filename.includes('dav.jianguoyun.com')) {
            console.log('[getDirectoryContents] 重写URL:', filename)
            // 提取相对路径并重写为代理路径
            const url = new URL(filename)
            let pathname = url.pathname
            if (pathname.startsWith('/dav/')) {
              pathname = pathname.substring(4) // 去掉 '/dav'
            }
            filename = `/api/webdav${pathname}`
            console.log('[getDirectoryContents] 重写后:', filename)
          } else if (filename.startsWith('/../dav/') || filename.includes('/../dav/')) {
            console.log('[getDirectoryContents] 重写相对路径:', filename)
            // 使用正则表达式匹配并替换
            filename = filename.replace(/\/\.\.\/\.\.\/dav\//, '/api/webdav/')
            console.log('[getDirectoryContents] 重写后:', filename)
          } else if (filename.startsWith('/dav/')) {
            console.log('[getDirectoryContents] 重写绝对路径:', filename)
            filename = filename.replace('/dav/', '/api/webdav/')
            console.log('[getDirectoryContents] 重写后:', filename)
          }
        } else {
          // 开发环境的路径处理
          if (filename.startsWith('http://localhost:5174/dav/')) {
            filename = filename.replace('http://localhost:5174/dav/', '/')
          } else if (filename.startsWith('https://dav.jianguoyun.com/dav/')) {
            filename = filename.replace('https://dav.jianguoyun.com/dav/', '/')
          }
        }
        
        return {
          filename: filename,
          basename: item.basename,
          lastmod: item.lastmod,
          size: item.size || 0,
          type: item.type,
          etag: item.etag,
          mime: item.mime
        }
      })

      console.log('返回文件列表:', fileList.map(f => ({ name: f.basename, filename: f.filename })))
      return { success: true, data: fileList }
    } catch (error) {
      console.error('获取目录内容失败:', error)
      return {
        success: false,
        error: `获取目录内容失败: ${error instanceof Error ? error.message : '未知错误'}`
      }
    }
  }

  /**
   * 获取支持的文件类型（epub、pdf等）
   * @param path 目录路径
   */
  async getSupportedFiles(path: string = '/'): Promise<WebDAVOperationResult<WebDAVFileInfo[]>> {
    const result = await this.getDirectoryContents(path, true)
    
    if (!result.success || !result.data) {
      return result
    }

    // 过滤出支持的文件类型
    const supportedExtensions = ['.epub', '.pdf', '.txt', '.md']
    const supportedFiles = result.data.filter(file => 
      file.type === 'file' && 
      supportedExtensions.some(ext => file.basename.toLowerCase().endsWith(ext))
    )

    return { success: true, data: supportedFiles }
  }

  /**
   * 获取文件内容
   * @param filePath 文件路径
   * @param format 返回格式
   */
  async getFileContents(
    filePath: string, 
    format: 'text' | 'binary' = 'binary'
  ): Promise<WebDAVOperationResult<string | ArrayBuffer>> {
    if (!this.client) {
      return { success: false, error: 'WebDAV客户端未初始化' }
    }

    try {
      console.log('获取文件内容:', filePath, '格式:', format)
      
      // 检测是否在Vercel环境中
      const isVercel = typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')
      
      if (isVercel) {
        // Vercel环境使用代理下载
        console.log('🌐 Vercel环境，使用代理下载文件')
        return await this.downloadViaProxy(filePath)
      }
      
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
        console.log('使用 WebDAV 客户端下载二进制文件...')
        
        try {
          const binaryContent = await this.client.getFileContents(normalizedPath, { format: 'binary' })
          console.log('WebDAV客户端返回的内容类型:', typeof binaryContent, binaryContent.constructor.name)
          
          // 检查文件大小是否合理（EPUB 文件应该至少几KB）
          let contentLength = 0
          if (binaryContent instanceof ArrayBuffer) {
            contentLength = binaryContent.byteLength
          } else if (binaryContent instanceof Uint8Array) {
            contentLength = binaryContent.length
          } else if (typeof binaryContent === 'string') {
            contentLength = new TextEncoder().encode(binaryContent).length
          } else {
            contentLength = (binaryContent as any).length || (binaryContent as any).byteLength || 0
          }
          
          console.log('内容长度:', contentLength)
          if (contentLength < 1024) {
            console.warn('⚠️ 文件大小异常小（', contentLength, '字节），可能是代理问题')
            
            // 在开发环境下，如果文件太小，尝试使用fetch通过代理下载
            if ((import.meta as any).env.DEV && this.config?.serverUrl.includes('dav.jianguoyun.com')) {
              console.log('尝试通过Vite代理直接下载...')
              return await this.downloadViaProxy(normalizedPath)
            }
          }
          
          // 转换为 ArrayBuffer
          let arrayBuffer: ArrayBuffer
          if (binaryContent instanceof ArrayBuffer) {
            arrayBuffer = binaryContent
          } else if (binaryContent instanceof Uint8Array) {
            arrayBuffer = binaryContent.buffer.slice(binaryContent.byteOffset, binaryContent.byteOffset + binaryContent.byteLength) as ArrayBuffer
          } else if (typeof binaryContent === 'string') {
            arrayBuffer = this.base64ToArrayBuffer(binaryContent)
          } else {
            // 如果是 Buffer（Node.js 环境）或其他类型，转换为Uint8Array再获取buffer
            const uint8Array = binaryContent instanceof Buffer ? 
              new Uint8Array(binaryContent) : 
              new Uint8Array(binaryContent as unknown as ArrayBuffer | ArrayBufferView)
            arrayBuffer = uint8Array.buffer.slice(uint8Array.byteOffset, uint8Array.byteOffset + uint8Array.byteLength) as ArrayBuffer
          }
          
          return { success: true, data: arrayBuffer }
          
        } catch (webdavError) {
          console.error('WebDAV客户端下载失败:', webdavError)
          
          // 在开发环境下尝试通过代理下载
          if ((import.meta as any).env.DEV && this.config?.serverUrl.includes('dav.jianguoyun.com')) {
            console.log('尝试通过Vite代理下载...')
            return await this.downloadViaProxy(normalizedPath)
          }
          
          throw webdavError
        }
      }
    } catch (error) {
      console.error('获取文件内容失败:', error)
      return {
        success: false,
        error: `下载文件失败: ${error instanceof Error ? error.message : '未知错误'}`
      }
    }
  }

  /**
   * 通过代理下载文件 - 支持Vercel和Vite环境
   * @param filePath 文件路径
   */
  private async downloadViaProxy(filePath: string): Promise<WebDAVOperationResult<ArrayBuffer>> {
    if (!this.config) {
      return { success: false, error: 'WebDAV配置未找到' }
    }

    try {
      console.log('通过代理下载文件:', filePath)
      
      // 检测是否在Vercel环境中
      const isVercel = typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')
      
      // 标准化路径 - 移除各种可能的前缀
      let normalizedPath = filePath
      console.log('原始路径:', normalizedPath)
      
      // 处理各种可能的前缀
      if (normalizedPath.startsWith('/api/webdav/')) {
        normalizedPath = normalizedPath.substring(11) // 移除 '/api/webdav/' (11个字符)
        console.log('移除 /api/webdav/ 后:', normalizedPath)
      } else if (normalizedPath.startsWith('/webdav/')) {
        normalizedPath = normalizedPath.substring(7) // 移除 '/webdav/' (7个字符)
        console.log('移除 /webdav/ 后:', normalizedPath)
      } else if (normalizedPath.startsWith('/../dav/')) {
        normalizedPath = normalizedPath.substring(8) // 移除 '/../dav/' (8个字符)
        console.log('移除 /../dav/ 后:', normalizedPath)
      } else if (normalizedPath.startsWith('../dav/')) {
        normalizedPath = normalizedPath.substring(7) // 移除 '../dav/' (7个字符)
        console.log('移除 ../dav/ 后:', normalizedPath)
      }
      
      // 确保路径以 / 开头
      if (!normalizedPath.startsWith('/')) {
        normalizedPath = '/' + normalizedPath
        console.log('添加 / 前缀后:', normalizedPath)
      }
      
      console.log('最终标准化路径:', normalizedPath)
      
      // 对路径进行 URL 编码，但保留 / 分隔符
      const encodedPath = normalizedPath.split('/').map(segment => 
        segment ? encodeURIComponent(segment) : ''
      ).join('/')
      
      // 构建代理URL，根据环境选择不同的代理路径
      const proxyUrl = isVercel ? `/api/webdav${encodedPath}` : `/webdav${encodedPath}`
      console.log('代理下载URL:', proxyUrl)
      
      // 使用fetch下载
      const response = await fetch(proxyUrl, {
        method: 'GET',
        headers: {
          'Authorization': 'Basic ' + btoa(`${this.config.username}:${this.config.password}`),
          'User-Agent': 'ebook-to-mindmap/1.0'
        }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      console.log('代理下载响应状态:', response.status, response.statusText)
      console.log('Content-Length:', response.headers.get('content-length'))
      console.log('Content-Type:', response.headers.get('content-type'))
      
      // 获取文件数据 - 确保正确处理二进制数据
      let arrayBuffer: ArrayBuffer
      const contentType = response.headers.get('content-type')
      
      console.log('开始处理响应数据...')
      
      if (contentType?.includes('application/octet-stream') || 
          contentType?.includes('application/epub+zip') ||
          contentType?.includes('application/pdf') ||
          contentType?.includes('application/zip')) {
        // 二进制文件，直接获取ArrayBuffer
        arrayBuffer = await response.arrayBuffer()
        console.log('二进制文件下载成功，大小:', arrayBuffer.byteLength, '字节')
        
        // 验证ArrayBuffer完整性
        if (arrayBuffer.byteLength === 0) {
          throw new Error('下载的文件为空')
        }
        
        // 检查EPUB文件头
        if (contentType?.includes('epub') || arrayBuffer.byteLength > 1000) {
          const header = new Uint8Array(arrayBuffer.slice(0, 4))
          const headerStr = String.fromCharCode(...header)
          console.log('文件头标识:', headerStr, '字节:', Array.from(header))
          
          // EPUB文件应该是ZIP格式，以PK开头
          if (headerStr !== 'PK') {
            console.warn('⚠️ 警告：EPUB文件头不是PK开头，可能损坏')
          }
        }
        
      } else {
        // 其他类型，先获取文本再转换
        const text = await response.text()
        arrayBuffer = new TextEncoder().encode(text).buffer
        console.log('文本文件转换成功，大小:', arrayBuffer.byteLength, '字节')
      }
      
      console.log('代理下载完成，最终大小:', arrayBuffer.byteLength, '字节')
      
      return { success: true, data: arrayBuffer }
      
    } catch (error) {
      console.error('代理下载失败:', error)
      return {
        success: false,
        error: `代理下载失败: ${error instanceof Error ? error.message : '未知错误'}`
      }
    }
  }

  /**
   * 直接下载（已弃用，仅在特殊情况下使用）
   * @param filePath 文件路径
   * @deprecated 由于CORS限制，建议使用代理下载
   */
  private async directDownload(filePath: string): Promise<WebDAVOperationResult<ArrayBuffer>> {
    console.warn('⚠️ 使用已弃用的直接下载方法，可能存在CORS问题')
    
    if (!this.config) {
      return { success: false, error: 'WebDAV配置未找到' }
    }

    try {
      console.log('创建直接 WebDAV 客户端连接...')
      
      // 创建直接连接的客户端（不使用代理）
      const directClient = createClient(this.config.serverUrl, {
        username: this.config.username,
        password: this.config.password
      })
      
      console.log('使用直接客户端下载文件:', filePath)
      const binaryContent = await directClient.getFileContents(filePath, { format: 'binary' })
      
      console.log('直接下载成功，内容类型:', typeof binaryContent, binaryContent.constructor.name)
      console.log('直接下载大小:', 
        (binaryContent as ArrayBuffer).byteLength || (binaryContent as Uint8Array).length || (binaryContent as string).length || 0)
      
      // 转换为 ArrayBuffer
      let arrayBuffer: ArrayBuffer
      if (binaryContent instanceof ArrayBuffer) {
        arrayBuffer = binaryContent
      } else if (binaryContent instanceof Uint8Array) {
        arrayBuffer = binaryContent.buffer.slice(binaryContent.byteOffset, binaryContent.byteOffset + binaryContent.byteLength) as ArrayBuffer
      } else if (typeof binaryContent === 'string') {
        arrayBuffer = this.base64ToArrayBuffer(binaryContent)
      } else {
        // 处理Buffer或其他类型
        const uint8Array = binaryContent instanceof Buffer ? 
          new Uint8Array(binaryContent) : 
          new Uint8Array(binaryContent as ArrayBuffer | ArrayBufferView)
        arrayBuffer = uint8Array.buffer.slice(uint8Array.byteOffset, uint8Array.byteOffset + uint8Array.byteLength) as ArrayBuffer
      }
      
      return { success: true, data: arrayBuffer }
      
    } catch (error) {
      console.error('直接下载失败:', error)
      return {
        success: false,
        error: `直接下载失败: ${error instanceof Error ? error.message : '未知错误'}
        
提示：在开发环境下建议使用Vite代理避免CORS问题。`
      }
    }
  }

  /**
   * 上传文件
   * @param filePath 目标文件路径
   * @param data 文件数据
   * @param overwrite 是否覆盖现有文件
   */
  async putFileContents(
    filePath: string,
    data: string | ArrayBuffer | Blob,
    overwrite: boolean = true
  ): Promise<WebDAVOperationResult<boolean>> {
    if (!this.client) {
      return { success: false, error: 'WebDAV客户端未初始化' }
    }

    try {
      console.log('🔄 WebDAV上传文件:')
      console.log('   文件路径:', filePath)
      console.log('   数据类型:', typeof data)
      console.log('   数据大小:', typeof data === 'string' ? data.length : 'unknown')
      console.log('   覆盖模式:', overwrite)
      
      // 检测是否在Vercel环境中
      const isVercel = typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')
      
      if (isVercel) {
        // Vercel环境使用代理上传
        console.log('🌐 Vercel环境，使用代理上传')
        return await this.uploadViaProxy(filePath, data)
      }
      
      // 确保目录存在
      const dirPath = filePath.substring(0, filePath.lastIndexOf('/'))
      if (dirPath && dirPath !== '/') {
        console.log('📁 检查目录是否存在:', dirPath)
        const dirExists = await this.client.exists(dirPath)
        if (!dirExists) {
          console.log('📁 创建目录:', dirPath)
          await this.client.createDirectory(dirPath)
        }
      }
      
      const result = await this.client.putFileContents(filePath, data as any, { overwrite })
      
      console.log('✅ WebDAV上传成功:', result)
      return { success: true, data: result }
    } catch (error) {
      console.error('❌ WebDAV上传失败:', error)
      return {
        success: false,
        error: `上传文件失败: ${error instanceof Error ? error.message : '未知错误'}`
      }
    }
  }

  /**
   * 上传文件（putFileContents的别名方法）
   * @param filePath 文件路径
   * @param data 文件内容
   * @param overwrite 是否覆盖现有文件
   */
  async uploadFile(
    filePath: string,
    data: string | ArrayBuffer | Blob,
    overwrite: boolean = true
  ): Promise<WebDAVOperationResult<boolean>> {
    return this.putFileContents(filePath, data, overwrite)
  }

  /**
   * 创建目录
   * @param path 目录路径
   */
  async createDirectory(path: string): Promise<WebDAVOperationResult<boolean>> {
    if (!this.client) {
      return { success: false, error: 'WebDAV客户端未初始化' }
    }

    try {
      await this.client.createDirectory(path)
      return { success: true, data: true }
    } catch (error) {
      return {
        success: false,
        error: `创建目录失败: ${error instanceof Error ? error.message : '未知错误'}`
      }
    }
  }

  /**
   * 删除文件
   * @param filePath 文件路径
   */
  async deleteFile(filePath: string): Promise<WebDAVOperationResult<boolean>> {
    if (!this.client) {
      return { success: false, error: 'WebDAV客户端未初始化' }
    }

    try {
      await this.client.deleteFile(filePath)
      return { success: true, data: true }
    } catch (error) {
      return {
        success: false,
        error: `删除文件失败: ${error instanceof Error ? error.message : '未知错误'}`
      }
    }
  }

  /**
   * 删除目录
   * @param dirPath 目录路径
   */
  async deleteDirectory(dirPath: string): Promise<WebDAVOperationResult<boolean>> {
    if (!this.client) {
      return { success: false, error: 'WebDAV客户端未初始化' }
    }

    try {
      // WebDAV库中使用deleteFile方法删除目录
      await this.client.deleteFile(dirPath)
      return { success: true, data: true }
    } catch (error) {
      return {
        success: false,
        error: `删除目录失败: ${error instanceof Error ? error.message : '未知错误'}`
      }
    }
  }

  /**
   * 检查文件或目录是否存在
   * @param path 路径
   */
  async exists(path: string): Promise<WebDAVOperationResult<boolean>> {
    if (!this.client) {
      return { success: false, error: 'WebDAV客户端未初始化' }
    }

    try {
      // 标准化路径
      let normalizedPath = path
      
      // 清理路径，移除 ../dav/ 前缀
      if (normalizedPath.startsWith('../dav/')) {
        normalizedPath = normalizedPath.replace('../dav/', '/')
      }
      
      if (!normalizedPath.startsWith('/')) {
        normalizedPath = '/' + normalizedPath
      }
      
      // 在开发环境中，如果使用代理，直接通过 HTTP 检查
      if ((import.meta as any).env.DEV && this.config?.serverUrl.includes('dav.jianguoyun.com')) {
        return await this.checkExistsViaProxy(normalizedPath)
      }
      
      const exists = await this.client.exists(normalizedPath)
      return { success: true, data: exists }
    } catch (error) {
      // 对于 404 错误，返回 false 而不是错误
      if (error instanceof Error && error.message.includes('404')) {
        return { success: true, data: false }
      }
      console.error('检查路径失败:', error)
      return {
        success: false,
        error: `检查路径失败: ${error instanceof Error ? error.message : '未知错误'}`
      }
    }
  }

  /**
   * 通过代理检查文件是否存在
   * @param path 文件路径
   */
  private async checkExistsViaProxy(path: string): Promise<WebDAVOperationResult<boolean>> {
    if (!this.config) {
      return { success: false, error: 'WebDAV配置未找到' }
    }

    try {
      // 对路径进行 URL 编码，但保留 / 分隔符
      const encodedPath = path.split('/').map(segment => 
        segment ? encodeURIComponent(segment) : ''
      ).join('/')
      
      // 构建代理URL
      const proxyUrl = `/webdav${encodedPath}`
      
      // 使用 HEAD 请求检查文件是否存在
      const response = await fetch(proxyUrl, {
        method: 'HEAD',
        headers: {
          'Authorization': 'Basic ' + btoa(`${this.config.username}:${this.config.password}`),
          'User-Agent': 'ebook-to-mindmap/1.0'
        }
      })
      
      if (response.status === 200 || response.status === 204) {
        return { success: true, data: true }
      } else if (response.status === 404) {
        // 404 是预期的，不需要输出错误日志
        return { success: true, data: false }
      } else if (response.status === 403) {
        // 403 权限错误，可能目录不存在或无权限访问
        console.warn(`⚠️ WebDAV 权限错误 (403): ${encodedPath}，可能目录不存在或无访问权限`)
        return { success: true, data: false } // 假设不存在，让后续创建操作处理
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
    } catch (error) {
      // 对于网络错误和权限错误，返回 false 而不是抛出异常
      if (error instanceof Error && (
        error.message.includes('404') || 
        error.message.includes('Not Found') ||
        error.message.includes('403') ||
        error.message.includes('Forbidden')
      )) {
        console.warn(`⚠️ WebDAV 访问问题: ${error.message}`)
        return { success: true, data: false }
      }
      console.error('代理检查失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * 简化的文件存在检查方法
   * @param filePath 文件路径
   * @returns 文件是否存在
   */
  async fileExists(filePath: string): Promise<boolean> {
    const result = await this.exists(filePath)
    return result.success ? (result.data || false) : false
  }

  /**
   * 获取文件或目录信息
   * @param path 路径
   */
  async getStat(path: string): Promise<WebDAVOperationResult<WebDAVFileInfo>> {
    if (!this.client) {
      return { success: false, error: 'WebDAV客户端未初始化' }
    }

    try {
      const stat = await this.client.stat(path)
      
      const fileInfo: WebDAVFileInfo = {
        filename: (stat as any).filename || path,
        basename: (stat as any).basename || path.split('/').pop() || '',
        lastmod: (stat as any).lastmod || new Date().toISOString(),
        size: (stat as any).size || 0,
        type: (stat as any).type || 'file',
        etag: (stat as any).etag || '',
        mime: (stat as any).mime || ''
      }

      return { success: true, data: fileInfo }
    } catch (error) {
      return {
        success: false,
        error: `获取文件信息失败: ${error instanceof Error ? error.message : '未知错误'}`
      }
    }
  }

  /**
   * 确保同步目录存在
   */
  async ensureSyncDirectory(): Promise<WebDAVOperationResult<boolean>> {
    if (!this.config) {
      return { success: false, error: 'WebDAV配置未设置' }
    }

    const syncPath = this.config.syncPath || '/fastReader'
    
    // 检查目录是否存在
    const existsResult = await this.exists(syncPath)
    if (!existsResult.success) {
      return existsResult
    }

    if (!existsResult.data) {
      // 创建目录
      return await this.createDirectory(syncPath)
    }

    return { success: true, data: true }
  }

  /**
   * 同步文件到WebDAV
   * @param localFiles 本地文件列表
   * @param onProgress 进度回调
   */
  async syncFiles(
    localFiles: Array<{ name: string, content: string | ArrayBuffer, path: string }>,
    onProgress?: UploadProgressCallback
  ): Promise<WebDAVOperationResult<boolean>> {
    if (!this.client || !this.config) {
      return { success: false, error: 'WebDAV客户端未初始化' }
    }

    try {
      // 确保同步目录存在
      const ensureDirResult = await this.ensureSyncDirectory()
      if (!ensureDirResult.success) {
        return ensureDirResult
      }

      const syncPath = this.config.syncPath || '/fastReader'
      let successCount = 0

      for (let i = 0; i < localFiles.length; i++) {
        const file = localFiles[i]
        const remotePath = `${syncPath}/${file.path || file.name}`

        const uploadResult = await this.putFileContents(remotePath, file.content, true)
        if (uploadResult.success) {
          successCount++
        }

        // 调用进度回调
        if (onProgress) {
          onProgress((i + 1) / localFiles.length)
        }
      }

      if (successCount === localFiles.length) {
        return { success: true, data: true }
      } else {
        return {
          success: false,
          error: `部分文件上传失败 (${successCount}/${localFiles.length})`
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `同步文件失败: ${error instanceof Error ? error.message : '未知错误'}`
      }
    }
  }

  /**
   * 下载文件并转换为File对象
   * @param filePath 文件路径
   * @param fileName 文件名（可选，用于避免特殊字符问题）
   */
  async downloadFileAsFile(filePath: string, fileName?: string): Promise<WebDAVOperationResult<File>> {
    if (!this.client) {
      return { success: false, error: 'WebDAV客户端未初始化' }
    }

    try {
      console.log('开始下载文件:', filePath, fileName)
      
      // 标准化文件路径
      let normalizedPath = filePath
      if (normalizedPath.startsWith('../dav/')) {
        normalizedPath = normalizedPath.replace('../dav/', '/')
      }
      if (!normalizedPath.startsWith('/')) {
        normalizedPath = '/' + normalizedPath
      }
      
      // 获取文件内容
      const contentResult = await this.getFileContents(normalizedPath, 'binary')
      if (!contentResult.success || !contentResult.data) {
        console.error('获取文件内容失败:', contentResult.error)
        return {
          success: false,
          error: contentResult.error || '获取文件内容失败'
        }
      }

      console.log('文件内容获取成功，类型:', typeof contentResult.data, '长度:', 
        (contentResult.data as ArrayBuffer).byteLength || (contentResult.data as string).length || 'unknown')
      
      // 使用提供的文件名或从路径中提取
      const finalFileName = fileName || normalizedPath.split('/').pop() || 'downloaded_file'
      
      // 创建File对象
      const file = new File([contentResult.data], finalFileName, {
        type: this.getMimeType(finalFileName)
      })

      console.log('File对象创建成功:', file.name, '大小:', file.size, '类型:', file.type)
      
      return { success: true, data: file }
    } catch (error) {
      console.error('下载文件异常:', error)
      return {
        success: false,
        error: `下载文件失败: ${error instanceof Error ? error.message : '未知错误'}`
      }
    }
  }

  /**
   * Base64 字符串转 ArrayBuffer
   * @param base64 Base64 编码的字符串
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    return bytes.buffer
  }

  /**
   * 获取文件MIME类型
   * @param fileName 文件名
   */
  private getMimeType(fileName: string): string {
    const extension = fileName.toLowerCase().split('.').pop()
    switch (extension) {
      case 'pdf':
        return 'application/pdf'
      case 'epub':
        return 'application/epub+zip'
      case 'txt':
        return 'text/plain'
      case 'md':
        return 'text/markdown'
      default:
        return 'application/octet-stream'
    }
  }

  /**
   * 获取文件下载链接
   * @param filePath 文件路径
   */
  getFileDownloadLink(filePath: string): string {
    if (!this.client || !this.config) {
      return ''
    }

    try {
      const originalLink = this.client.getFileDownloadLink(filePath)
      
      // 在开发环境中，如果使用了代理，需要转换链接
      if ((import.meta as any).env.DEV && this.config.serverUrl.includes('dav.jianguoyun.com')) {
        // 将原始链接转换为代理链接
        const url = new URL(originalLink)
        return `/webdav${url.pathname}`
      }
      
      return originalLink
    } catch (_error) {
      return ''
    }
  }

  /**
   * 获取配置信息
   */
  getConfig(): WebDAVConfig | null {
    return this.config
  }

  /**
   * 检查是否已初始化
   */
  isInitialized(): boolean {
    return this.client !== null && this.config !== null
  }

  /**
   * 通过代理上传文件 - 支持Vercel和Vite环境
   * @param filePath 文件路径
   * @param data 文件数据
   */
  private async uploadViaProxy(
    filePath: string,
    data: string | ArrayBuffer | Blob
  ): Promise<WebDAVOperationResult<boolean>> {
    if (!this.config) {
      return { success: false, error: 'WebDAV配置未找到' }
    }

    try {
      console.log('通过代理上传文件:', filePath)
      
      // 检测是否在Vercel环境中
      const isVercel = typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')
      
      // 标准化路径 - 移除各种可能的前缀
      let normalizedPath = filePath
      console.log('原始路径:', normalizedPath)
      
      // 处理各种可能的前缀
      if (normalizedPath.startsWith('/api/webdav/')) {
        normalizedPath = normalizedPath.substring(11) // 移除 '/api/webdav/' (11个字符)
        console.log('移除 /api/webdav/ 后:', normalizedPath)
      } else if (normalizedPath.startsWith('/webdav/')) {
        normalizedPath = normalizedPath.substring(7) // 移除 '/webdav/' (7个字符)
        console.log('移除 /webdav/ 后:', normalizedPath)
      } else if (normalizedPath.startsWith('/../dav/')) {
        normalizedPath = normalizedPath.substring(8) // 移除 '/../dav/' (8个字符)
        console.log('移除 /../dav/ 后:', normalizedPath)
      } else if (normalizedPath.startsWith('../dav/')) {
        normalizedPath = normalizedPath.substring(7) // 移除 '../dav/' (7个字符)
        console.log('移除 ../dav/ 后:', normalizedPath)
      }
      
      // 确保路径以 / 开头
      if (!normalizedPath.startsWith('/')) {
        normalizedPath = '/' + normalizedPath
        console.log('添加 / 前缀后:', normalizedPath)
      }
      
      console.log('最终标准化路径:', normalizedPath)
      
      // 对路径进行 URL 编码，但保留 / 分隔符
      const encodedPath = normalizedPath.split('/').map(segment => 
        segment ? encodeURIComponent(segment) : ''
      ).join('/')
      
      // 构建代理URL，根据环境选择不同的代理路径
      const proxyUrl = isVercel ? `/api/webdav${encodedPath}` : `/webdav${encodedPath}`
      console.log('代理上传URL:', proxyUrl)
      
      // 准备上传数据
      let body: BodyInit
      if (typeof data === 'string') {
        body = data
      } else if (data instanceof ArrayBuffer) {
        body = new Blob([data])
      } else {
        body = data
      }
      
      // 发送PUT请求
      const response = await fetch(proxyUrl, {
        method: 'PUT',
        headers: {
          'Authorization': 'Basic ' + btoa(`${this.config.username}:${this.config.password}`),
          'User-Agent': 'ebook-to-mindmap/1.0',
          'Content-Type': 'text/markdown'
        },
        body
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('代理上传失败:', response.status, response.statusText, errorText)
        return {
          success: false,
          error: `上传失败 (${response.status}): ${response.statusText} - ${errorText}`
        }
      }
      
      console.log('✅ 代理上传成功')
      return { success: true, data: true }
    } catch (error) {
      console.error('代理上传异常:', error)
      return {
        success: false,
        error: `上传异常: ${error instanceof Error ? error.message : '未知错误'}`
      }
    }
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    this.client = null
    this.config = null
  }
}

// 创建单例实例
export const webdavService = new WebDAVService()

// 导出类型和工具函数
export type { WebDAVConfig } from '../stores/configStore'
