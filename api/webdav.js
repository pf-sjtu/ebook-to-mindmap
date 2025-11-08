// WebDAV代理服务器 - Vercel官方格式
// 支持的WebDAV方法
const SUPPORTED_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PROPFIND', 'PROPPATCH', 'MKCOL', 'COPY', 'MOVE', 'LOCK', 'UNLOCK', 'OPTIONS']

async function getRawRequestBody(request) {
  try {
    if (request.body) {
      if (typeof request.body === 'string') {
        return Buffer.from(request.body, 'utf-8')
      }

      if (Buffer.isBuffer(request.body)) {
        return request.body
      }
      if (request.body instanceof Uint8Array) {
        return Buffer.from(request.body)
      }
      if (request.body instanceof ArrayBuffer) {
        return Buffer.from(request.body)
      }
      return Buffer.from(String(request.body), 'utf-8')
    }

    const chunks = []
    for await (const chunk of request) {
      if (!chunk) {
        continue
      }
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk, 'utf-8') : Buffer.from(chunk))
    }

    if (chunks.length === 0) {
      return null
    }

    return Buffer.concat(chunks)
  } catch (error) {
    console.error('[PROXY] 读取原始请求体失败:', error)
    return null
  }
}

/**
 * 处理WebDAV代理请求 - Vercel官方格式入口
 */
export default async function handler(request, response) {
  let url = request.url
  
  // 添加CORS头部 - 增强移动端兼容性
  const origin = request.headers.origin
  response.setHeader('Access-Control-Allow-Origin', origin || '*')
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PROPFIND, PROPPATCH, MKCOL, COPY, MOVE, LOCK, UNLOCK, OPTIONS, HEAD, PATCH')
  response.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Depth, Destination, Overwrite, Timeout, User-Agent, X-Requested-With, Accept, Origin, Cache-Control, X-File-Name')
  response.setHeader('Access-Control-Allow-Credentials', 'false')
  response.setHeader('Access-Control-Max-Age', '86400')
  response.setHeader('Vary', 'Origin')
  
  // 添加额外的移动端兼容头部
  response.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
  response.setHeader('Pragma', 'no-cache')
  response.setHeader('Expires', '0')
  
  console.log(`[PROXY] 请求来源: ${origin}`)
  console.log(`[PROXY] User-Agent: ${request.headers['user-agent']}`)
  console.log(`[PROXY] 请求方法: ${request.method}`)
  
  // 处理OPTIONS预检请求 - 增强移动端处理
  if (request.method === 'OPTIONS') {
    console.log(`[PROXY] 处理OPTIONS预检请求`)
    response.status(200)
      .header('Content-Length', '0')
      .send('')
    return
  }
  
  // 检查是否支持的方法
  if (!SUPPORTED_METHODS.includes(request.method || '')) {
    console.log(`[HANDLER] 不支持的方法: ${request.method}`)
    response.status(405)
      .json({
        error: '方法不被支持',
        method: request.method,
        supportedMethods: SUPPORTED_METHODS
      })
    return
  }
  
  try {
    // 获取请求信息
    const method = request.method
    
    console.log(`[PROXY] 收到请求: ${method} ${request.url}`)
    
    // 构建目标URL - 移除 /api/webdav 前缀，添加 /dav 前缀
    // 在Vercel环境中，request.url可能不是完整URL，需要手动构建
    let pathname = request.url
    let search = ''
    
    if (pathname && pathname.startsWith('http')) {
      // 完整URL，提取路径和查询参数
      const urlObj = new URL(pathname)
      pathname = urlObj.pathname
      search = urlObj.search
    } else {
      // 相对路径，需要手动分离路径和查询参数
      const urlParts = (pathname || '').split('?')
      pathname = urlParts[0] || '/'
      search = urlParts[1] ? `?${urlParts[1]}` : ''
    }
    
    console.log(`[PROXY] 原始路径: ${pathname}`)
    console.log(`[PROXY] 查询参数: ${search}`)
    const pathParts = pathname.split('/api/webdav/')
    console.log(`[PROXY] 路径分割:`, pathParts)
    let webdavPath = pathParts[1] || ''
    
    // 确保路径以 / 开头
    if (webdavPath && !webdavPath.startsWith('/')) {
      webdavPath = '/' + webdavPath
    }
    
    const targetUrl = `https://dav.jianguoyun.com/dav${webdavPath}${search}`
    
    console.log(`[PROXY] ${method} ${pathname} -> ${targetUrl}`)
    console.log(`[PROXY] webdavPath: "${webdavPath}"`)
    
    // 准备请求头
    const requestHeaders = {}
    if (request.headers?.entries) {
      for (const [key, value] of request.headers.entries()) {
        if (!['host', 'connection', 'content-length'].includes(key.toLowerCase())) {
          requestHeaders[key] = value
        }
      }
    } else {
      for (const key in request.headers) {
        if (!['host', 'connection', 'content-length'].includes(key.toLowerCase())) {
          requestHeaders[key] = request.headers[key]
        }
      }
    }

    console.log(`[PROXY] 请求头数量: ${Object.keys(requestHeaders).length}`)
    console.log(`[PROXY] 主要请求头:`, {
      authorization: requestHeaders.authorization ? '***已设置***' : '未设置',
      'user-agent': requestHeaders['user-agent'],
      'content-type': requestHeaders['content-type'],
      depth: requestHeaders.depth
    })

    // 读取请求体数据 - 正确处理PUT请求的body
    let requestBody = null
    if (method === 'PUT' || method === 'POST') {
      try {
        requestBody = await getRawRequestBody(request)
        if (requestBody) {
          console.log(`[PROXY] 原始请求体类型: ${Object.prototype.toString.call(request.body)}`)
          console.log(`[PROXY] 最终请求体长度: ${requestBody.length} bytes`)
          requestHeaders['content-length'] = String(requestBody.length)
        } else {
          console.log('[PROXY] 无请求体')
        }
      } catch (bodyError) {
        console.error(`[PROXY] 读取请求体失败:`, bodyError)
        console.error(`[PROXY] 错误详情:`, bodyError.message, bodyError.stack)
      }
    }
    
    // 发送请求到WebDAV服务器
    console.log(`[PROXY] 发送请求到: ${targetUrl}`)
    console.log(`[PROXY] 请求方法: ${method}`)
    console.log(`[PROXY] 请求头:`, JSON.stringify(requestHeaders, null, 2))
    console.log(`[PROXY] 请求体类型: ${requestBody?.constructor?.name || typeof requestBody}`)
    console.log(`[PROXY] 请求体长度: ${requestBody?.length || requestBody?.byteLength || 'unknown'}`)
    
    const fetchResponse = await fetch(targetUrl, {
      method: method,
      headers: requestHeaders,
      body: requestBody,
      redirect: 'manual'
    })
    
    console.log(`[PROXY] 收到响应: ${fetchResponse.status} ${fetchResponse.statusText}`)
    console.log(`[PROXY] 响应头:`, Object.fromEntries(fetchResponse.headers.entries()))
    
    // 读取响应体
    let responseData
    let isBinary = false
    try {
      const contentType = fetchResponse.headers.get('content-type') || ''
      
      if (contentType.includes('application/xml') || 
          contentType.includes('text/xml')) {
        // XML响应（WebDAV PROPFIND等）
        responseData = await fetchResponse.text()
        console.log(`[PROXY] XML响应体长度: ${responseData.length}`)
      } else if (contentType.includes('application/json')) {
        // JSON响应
        const jsonResponse = await fetchResponse.json()
        responseData = JSON.stringify(jsonResponse)
        console.log(`[PROXY] JSON响应体长度: ${responseData.length}`)
      } else if (contentType.includes('application/octet-stream') ||
                 contentType.includes('application/epub+zip') ||
                 contentType.includes('application/pdf') ||
                 contentType.includes('application/zip') ||
                 contentType.includes('application/x-mobipocket-ebook')) {
        // 二进制文件响应
        responseData = await fetchResponse.arrayBuffer()
        isBinary = true
        console.log(`[PROXY] 二进制响应体长度: ${responseData.byteLength} 字节`)
      } else {
        // 其他响应（默认为文本）
        responseData = await fetchResponse.text()
        console.log(`[PROXY] 文本响应体长度: ${responseData.length}`)
      }
    } catch (error) {
      console.error(`[PROXY] 读取响应体失败:`, error)
      responseData = `读取响应体失败: ${error.message}`
    }
    
    // 设置响应头
    Object.keys(fetchResponse.headers).forEach(key => {
      if (key.toLowerCase() !== 'content-encoding') {
        response.setHeader(key, fetchResponse.headers.get(key))
      }
    })
    
    // 返回响应
    response.status(fetchResponse.status)
    
    if (isBinary) {
      // 二进制数据直接发送
      response.send(Buffer.from(responseData))
      console.log(`[PROXY] 返回二进制响应，状态: ${fetchResponse.status} 大小: ${responseData.byteLength} 字节`)
    } else {
      // 文本数据发送
      response.send(responseData)
      console.log(`[PROXY] 返回文本响应，状态: ${fetchResponse.status}`)
    }
    
    console.log(`[PROXY] 响应头:`, {
      'content-type': fetchResponse.headers.get('content-type'),
      'content-length': fetchResponse.headers.get('content-length')
    })
    
  } catch (error) {
    console.error('[PROXY] 代理请求失败:', error)
    response.status(500).json({
      error: '代理服务器内部错误',
      message: error.message,
      url: request.url
    })
  }
}
