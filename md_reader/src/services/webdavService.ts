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
  useProxy?: boolean // 是否使用代理（默认false）
}

/**
 * 获取代理后的URL
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
      
      // 检测移动端浏览器
      const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      console.log('移动端浏览器检测:', isMobile)
      
      // 根据环境和浏览器类型配置请求头
      if (!isVercel && !config.useProxy) {
        // 直连模式的请求头
        clientConfig.headers = {
          'User-Agent': 'md-reader/1.0'
        }
        
        if (isMobile) {
          clientConfig.headers['X-Requested-With'] = 'XMLHttpRequest'
          clientConfig.headers['Accept'] = '*/*'
        }
      } else if (isVercel) {
        // Vercel代理模式下，为WebDAV客户端添加特殊配置
        clientConfig.headers = {
          'User-Agent': 'md-reader/1.0',
          'Accept': 'application/xml, text/xml, */*'
        }
        
        if (isMobile) {
          clientConfig.headers['X-Requested-With'] = 'XMLHttpRequest'
          clientConfig.headers['Cache-Control'] = 'no-cache'
        }
      }
      
      console.log('WebDAV客户端配置:', {
        url: processedUrl,
        hasHeaders: !!clientConfig.headers,
        headerKeys: clientConfig.headers ? Object.keys(clientConfig.headers) : [],
        isMobile: isMobile
      })
      
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
      // 检测移动端环境
      const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      const isVercel = typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')
      
      console.log('测试WebDAV连接...', {
        isMobile: isMobile,
        isVercel: isVercel,
        userAgent: navigator.userAgent
      })
      
      // 尝试获取根目录内容来测试连接
      const result = await this.getDirectoryContents('/', false)
      if (result.success) {
        console.log('WebDAV连接测试成功')
        return { success: true, data: true }
      } else {
        // 增强错误处理，特别是403错误
        let errorMessage = result.error || '连接测试失败'
        
        if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
          errorMessage = '访问被拒绝，可能是权限问题或移动端兼容性问题'
        } else if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
          errorMessage = '认证失败，请检查用户名和密码'
        } else if (errorMessage.includes('404') || errorMessage.includes('Not Found')) {
          errorMessage = '服务器地址不正确'
        } else if (errorMessage.includes('405') || errorMessage.includes('Method Not Allowed')) {
          errorMessage = '请求方法不被支持，可能是代理配置问题'
        } else if (errorMessage.includes('invalid response')) {
          errorMessage = '响应格式无效，可能是代理服务器问题'
        }
        
        return { success: false, error: errorMessage }
      }
    } catch (error) {
      console.error('WebDAV连接测试失败:', error)
      let errorMessage = '连接失败'
      
      if (error instanceof Error) {
        if (error.message.includes('403') || error.message.includes('Forbidden')) {
          errorMessage = '访问被拒绝，可能是权限问题或移动端兼容性问题'
        } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
          errorMessage = '认证失败，请检查用户名和密码'
        } else if (error.message.includes('404') || error.message.includes('Not Found')) {
          errorMessage = '服务器地址不正确'
        } else {
          errorMessage = `连接失败: ${error.message}`
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
  async getDirectoryContents(path: string = '/', deep: boolean = false): Promise<WebDAVOperationResult<WebDAVFileInfo[]>> {
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
      const fileInfos: WebDAVFileInfo[] = (contents as any[]).map(item => {
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
   * 获取支持的文件类型（md、txt等）
   * @param path 目录路径
   */
  async getSupportedFiles(path: string = '/'): Promise<WebDAVOperationResult<WebDAVFileInfo[]>> {
    const result = await this.getDirectoryContents(path, true)
    
    if (!result.success || !result.data) {
      return result
    }

    // 过滤出支持的文件类型
    const supportedExtensions = ['.md', '.markdown', '.txt']
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
    format: 'text' | 'binary' = 'text'
  ): Promise<WebDAVOperationResult<string | ArrayBuffer>> {
    if (!this.client) {
      return { success: false, error: 'WebDAV客户端未初始化' }
    }

    try {
      console.log('获取文件内容:', filePath, '格式:', format)
      
      // 检测是否在Vercel环境中
      const isVercel = typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')
      
      // 标准化文件路径
      let normalizedPath = filePath
      if (normalizedPath.startsWith('../dav/')) {
        normalizedPath = normalizedPath.replace('../dav/', '/')
      }
      if (!normalizedPath.startsWith('/')) {
        normalizedPath = '/' + normalizedPath
      }
      
      // 如果使用代理（Vite开发代理或Vercel Serverless Function）且是坚果云，直接通过代理下载
      if ((this.config?.useProxy || isVercel) && this.config?.serverUrl.includes('dav.jianguoyun.com')) {
        console.log('使用代理模式下载文件:', filePath)
        // 传入原始路径，让 downloadViaProxy 处理路径标准化
        return await this.downloadViaProxy(filePath, format)
      }
      
      if (format === 'text') {
        const content = await this.client.getFileContents(normalizedPath, { format: 'text' }) as string
        return { success: true, data: content }
      } else {
        console.log('使用 WebDAV 客户端下载二进制文件...')
        
        try {
          const binaryContent = await this.client.getFileContents(normalizedPath, { format: 'binary' })
          console.log('WebDAV客户端返回的内容类型:', typeof binaryContent, binaryContent.constructor.name)
          console.log('内容长度:', (binaryContent as any).length || (binaryContent as any).byteLength)
          
          // 转换为 ArrayBuffer
          let arrayBuffer: ArrayBuffer
          if (binaryContent instanceof ArrayBuffer) {
            arrayBuffer = binaryContent
          } else if (binaryContent instanceof Uint8Array) {
            arrayBuffer = binaryContent.buffer.slice(binaryContent.byteOffset, binaryContent.byteOffset + binaryContent.byteLength) as ArrayBuffer
          } else if (typeof binaryContent === 'string') {
            arrayBuffer = this.base64ToArrayBuffer(binaryContent)
          } else {
            // 如果是 Buffer（Node.js 环境），直接转换
            arrayBuffer = (binaryContent as any) instanceof Buffer ? (binaryContent as any).buffer : new Uint8Array(binaryContent as any).buffer
          }
          
          return { success: true, data: arrayBuffer }
          
        } catch (error) {
          console.error('WebDAV客户端下载失败:', error)
          throw error
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
      
      // 获取文件内容 - 使用文本格式
      const contentResult = await this.getFileContents(normalizedPath, 'text')
      if (!contentResult.success || !contentResult.data) {
        console.error('获取文件内容失败:', contentResult.error)
        return {
          success: false,
          error: contentResult.error || '获取文件内容失败'
        }
      }

      console.log('文件内容获取成功，长度:', (contentResult.data as string).length)
      
      // 使用提供的文件名或从路径中提取
      const finalFileName = fileName || normalizedPath.split('/').pop() || 'downloaded_file.md'
      
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
   * 通过Vite代理下载文件
   * @param filePath 文件路径
   * @param format 返回格式
   */
  private async downloadViaProxy(filePath: string, format: 'text' | 'binary' = 'text'): Promise<WebDAVOperationResult<string | ArrayBuffer>> {
    if (!this.config) {
      return { success: false, error: 'WebDAV配置未找到' }
    }

    try {
      console.log('通过代理下载文件:', filePath, '格式:', format)
      
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
      console.log('代理URL:', proxyUrl)
      
      // 使用fetch下载
      const response = await fetch(proxyUrl, {
        method: 'GET',
        headers: {
          'Authorization': 'Basic ' + btoa(`${this.config.username}:${this.config.password}`),
          'User-Agent': 'md-reader/1.0'
        }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      console.log('代理下载响应状态:', response.status, response.statusText)
      console.log('Content-Length:', response.headers.get('content-length'))
      
      // 根据格式返回数据
      if (format === 'text') {
        const textContent = await response.text()
        console.log('代理下载成功，文本长度:', textContent.length, '字符')
        return { success: true, data: textContent }
      } else {
        const arrayBuffer = await response.arrayBuffer()
        console.log('代理下载成功，大小:', arrayBuffer.byteLength, '字节')
        return { success: true, data: arrayBuffer }
      }
      
    } catch (error) {
      console.error('代理下载失败:', error)
      return {
        success: false,
        error: `代理下载失败: ${error instanceof Error ? error.message : '未知错误'}`
      }
    }
  }

  /**
   * Base64 字符串转 ArrayBuffer
   * @param base64 Base64 编码的字符串
   * @private
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
      case 'md':
      case 'markdown':
        return 'text/markdown'
      case 'txt':
        return 'text/plain'
      case 'json':
        return 'application/json'
      case 'pdf':
        return 'application/pdf'
      case 'epub':
        return 'application/epub+zip'
      default:
        return 'application/octet-stream'
    }
  }

  /**
   * 上传文件到WebDAV
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
      console.log('上传文件到WebDAV:', filePath)
      
      // 检测是否在Vercel环境中
      const isVercel = typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')
      
      // 标准化路径
      let normalizedPath = filePath
      if (normalizedPath.startsWith('../dav/')) {
        normalizedPath = normalizedPath.replace('../dav/', '/')
      }
      if (!normalizedPath.startsWith('/')) {
        normalizedPath = '/' + normalizedPath
      }
      
      // 如果使用代理（Vite开发代理或Vercel Serverless Function）且是坚果云，需要特殊处理
      if ((this.config?.useProxy || isVercel) && this.config?.serverUrl.includes('dav.jianguoyun.com')) {
        // 代理模式下需要直接上传到原始服务器
        console.log('代理模式下上传到原始服务器:', filePath)
        // 传入原始路径，让 uploadViaProxy 处理路径标准化
        return await this.uploadViaProxy(filePath, data)
      }
      
      const result = await this.client.putFileContents(normalizedPath, data as any, { overwrite })
      
      console.log('WebDAV上传成功:', result)
      return { success: true, data: result }
    } catch (error) {
      console.error('WebDAV上传失败:', error)
      return {
        success: false,
        error: `上传文件失败: ${error instanceof Error ? error.message : '未知错误'}`
      }
    }
  }

  /**
   * 通过代理上传文件
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
      
      // 使用fetch上传
      const response = await fetch(proxyUrl, {
        method: 'PUT',
        headers: {
          'Authorization': 'Basic ' + btoa(`${this.config.username}:${this.config.password}`),
          'User-Agent': 'md-reader/1.0',
          'Content-Type': 'text/markdown'
        },
        body
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      console.log('代理上传成功:', response.status, response.statusText)
      return { success: true, data: true }
      
    } catch (error) {
      console.error('代理上传失败:', error)
      return {
        success: false,
        error: `代理上传失败: ${error instanceof Error ? error.message : '未知错误'}`
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
   * 检查文件是否存在
   * @param filePath 文件路径
   */
  async exists(filePath: string): Promise<boolean> {
    if (!this.client) {
      return false
    }

    try {
      return await this.client.exists(filePath)
    } catch (error) {
      console.error('检查文件存在性失败:', error)
      return false
    }
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    this.client = null
    this.config = null
  }

  /**
   * 检查是否已初始化
   */
  isInitialized(): boolean {
    return this.client !== null
  }
}

// 创建单例实例
export const webdavService = new WebDAVService()
