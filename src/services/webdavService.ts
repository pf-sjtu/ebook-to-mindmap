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
 * 获取代理后的URL
 * @param originalUrl 原始URL
 * @returns 代理后的URL
 */
function getProxiedUrl(originalUrl: string): string {
  // 在开发环境中，如果使用的是坚果云的URL，转换为代理URL
  if (import.meta.env.DEV && originalUrl.includes('dav.jianguoyun.com')) {
    const url = new URL(originalUrl)
    // 提取路径部分，去掉 /dav 前缀
    let pathname = url.pathname
    if (pathname.startsWith('/dav/')) {
      pathname = pathname.substring(4) // 去掉 '/dav'
    } else if (pathname === '/dav') {
      pathname = '/' // 根目录
    }
    // 如果路径为空，设为根路径
    if (pathname === '') {
      pathname = '/'
    }
    return `/webdav${pathname}`
  }
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

      // 获取代理后的URL
      const proxiedUrl = getProxiedUrl(config.serverUrl)
      console.log('初始化WebDAV客户端，原始URL:', config.serverUrl)
      console.log('初始化WebDAV客户端，代理URL:', proxiedUrl)

      // 创建WebDAV客户端，使用更严格的配置
      this.client = createClient(proxiedUrl, {
        username: config.username,
        password: config.password,
        // 添加额外的配置来确保使用代理
        headers: {
          'User-Agent': 'ebook-to-mindmap/1.0'
        }
      })

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
      // 确保路径格式正确
      let normalizedPath = path
      
      // 清理路径，移除 ../dav/ 前缀
      if (normalizedPath.startsWith('../dav/')) {
        normalizedPath = normalizedPath.replace('../dav/', '/')
      }
      
      if (!normalizedPath.startsWith('/')) {
        normalizedPath = '/' + normalizedPath
      }
      
      console.log('请求目录内容，路径:', normalizedPath)
      const contents = await this.client.getDirectoryContents(normalizedPath, { deep })
      
      // 转换文件信息格式
      const fileList: WebDAVFileInfo[] = (contents as any[]).map(item => {
        let filename = item.filename
        
        // 如果返回的是绝对URL，转换为相对路径
        if (filename.startsWith('http://localhost:5174/dav/')) {
          filename = filename.replace('http://localhost:5174/dav/', '/')
        } else if (filename.startsWith('https://dav.jianguoyun.com/dav/')) {
          filename = filename.replace('https://dav.jianguoyun.com/dav/', '/')
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
          console.log('内容长度:', binaryContent.length || binaryContent.byteLength)
          
          // 检查文件大小是否合理（EPUB 文件应该至少几KB）
          const contentLength = binaryContent.length || binaryContent.byteLength
          if (contentLength < 1024) {
            console.warn('⚠️ 文件大小异常小（', contentLength, '字节），可能是代理问题')
            
            // 在开发环境下，如果文件太小，尝试使用fetch通过代理下载
            if (import.meta.env.DEV && this.config?.serverUrl.includes('dav.jianguoyun.com')) {
              console.log('尝试通过Vite代理直接下载...')
              return await this.downloadViaProxy(normalizedPath)
            }
          }
          
          // 转换为 ArrayBuffer
          let arrayBuffer: ArrayBuffer
          if (binaryContent instanceof ArrayBuffer) {
            arrayBuffer = binaryContent
          } else if (binaryContent instanceof Uint8Array) {
            arrayBuffer = binaryContent.buffer.slice(binaryContent.byteOffset, binaryContent.byteOffset + binaryContent.byteLength)
          } else if (typeof binaryContent === 'string') {
            arrayBuffer = this.base64ToArrayBuffer(binaryContent)
          } else {
            // 如果是 Buffer（Node.js 环境），直接转换
            arrayBuffer = binaryContent instanceof Buffer ? binaryContent.buffer : new Uint8Array(binaryContent).buffer
          }
          
          return { success: true, data: arrayBuffer }
          
        } catch (webdavError) {
          console.error('WebDAV客户端下载失败:', webdavError)
          
          // 在开发环境下尝试通过代理下载
          if (import.meta.env.DEV && this.config?.serverUrl.includes('dav.jianguoyun.com')) {
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
   * 通过Vite代理下载文件
   * @param filePath 文件路径
   */
  private async downloadViaProxy(filePath: string): Promise<WebDAVOperationResult<ArrayBuffer>> {
    if (!this.config) {
      return { success: false, error: 'WebDAV配置未找到' }
    }

    try {
      console.log('通过Vite代理下载文件:', filePath)
      
      // 构建代理URL，使用 /webdav 路径
      const proxyUrl = `/webdav${filePath}`
      console.log('代理URL:', proxyUrl)
      
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
      
      // 获取文件数据
      const arrayBuffer = await response.arrayBuffer()
      console.log('代理下载成功，大小:', arrayBuffer.byteLength, '字节')
      
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
      console.log('直接下载大小:', binaryContent.length || binaryContent.byteLength)
      
      // 转换为 ArrayBuffer
      let arrayBuffer: ArrayBuffer
      if (binaryContent instanceof ArrayBuffer) {
        arrayBuffer = binaryContent
      } else if (binaryContent instanceof Uint8Array) {
        arrayBuffer = binaryContent.buffer.slice(binaryContent.byteOffset, binaryContent.byteOffset + binaryContent.byteLength)
      } else if (typeof binaryContent === 'string') {
        arrayBuffer = this.base64ToArrayBuffer(binaryContent)
      } else {
        arrayBuffer = binaryContent instanceof Buffer ? binaryContent.buffer : new Uint8Array(binaryContent).buffer
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
      
      const result = await this.client.putFileContents(filePath, data, { overwrite })
      
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
      const exists = await this.client.exists(path)
      return { success: true, data: exists }
    } catch (error) {
      return {
        success: false,
        error: `检查路径失败: ${error instanceof Error ? error.message : '未知错误'}`
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
        filename: stat.filename,
        basename: stat.basename,
        lastmod: stat.lastmod,
        size: stat.size || 0,
        type: stat.type,
        etag: stat.etag,
        mime: stat.mime
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

      console.log('文件内容获取成功，类型:', typeof contentResult.data, '长度:', contentResult.data.byteLength || contentResult.data.length)
      
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
      if (import.meta.env.DEV && this.config.serverUrl.includes('dav.jianguoyun.com')) {
        // 将原始链接转换为代理链接
        const url = new URL(originalLink)
        return `/webdav${url.pathname}`
      }
      
      return originalLink
    } catch (error) {
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
