// WebDAV代理服务器 - Vercel官方格式
// 支持的WebDAV方法
const SUPPORTED_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PROPFIND', 'PROPPATCH', 'MKCOL', 'COPY', 'MOVE', 'LOCK', 'UNLOCK', 'OPTIONS']

/**
 * 处理WebDAV代理请求 - Vercel官方格式入口
 */
export default async function handler(request, response) {
  let url = request.url
  
  // 在Vercel环境中，request.url可能只是路径，需要构造完整URL
  if (!url.startsWith('http')) {
    // 兼容不同的headers格式
    const host = request.headers?.get ? request.headers.get('host') : request.headers?.host || 'localhost'
    const protocol = request.headers?.get ? request.headers.get('x-forwarded-proto') : request.headers['x-forwarded-proto'] || 'https'
    url = `${protocol}://${host}${url}`
  }
  
  console.log(`[HANDLER] 收到请求: ${request.method} ${url}`)
  
  // 处理OPTIONS请求 - 增强移动端兼容性
  if (request.method === 'OPTIONS') {
    console.log('[HANDLER] 处理OPTIONS请求')
    const origin = request.headers?.get ? request.headers.get('origin') : request.headers?.origin || '*'
    
    response.status(200)
      .setHeader('Access-Control-Allow-Origin', origin || '*')
      .setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PROPFIND, PROPPATCH, MKCOL, COPY, MOVE, LOCK, UNLOCK, OPTIONS, HEAD, PATCH')
      .setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Depth, Destination, Overwrite, Timeout, User-Agent, X-Requested-With, Accept, Origin, Cache-Control, X-File-Name')
      .setHeader('Access-Control-Allow-Credentials', 'false')
      .setHeader('Access-Control-Max-Age', '86400')
      .setHeader('Vary', 'Origin')
      .setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
      .setHeader('Pragma', 'no-cache')
      .setHeader('Expires', '0')
      .header('Content-Length', '0')
      .send('')
    return
  }
  
  // 添加CORS头部 - 增强移动端兼容性
  const origin = request.headers?.get ? request.headers.get('origin') : request.headers?.origin
  response.setHeader('Access-Control-Allow-Origin', origin || '*')
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PROPFIND, PROPPATCH, MKCOL, COPY, MOVE, LOCK, UNLOCK, OPTIONS, HEAD, PATCH')
  response.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Depth, Destination, Overwrite, Timeout, User-Agent, X-Requested-With, Accept, Origin, Cache-Control, X-File-Name')
  response.setHeader('Access-Control-Allow-Credentials', 'false')
  response.setHeader('Access-Control-Max-Age', '86400')
  response.setHeader('Vary', 'Origin')
  response.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
  response.setHeader('Pragma', 'no-cache')
  response.setHeader('Expires', '0')
  
  console.log(`[PROXY] 请求来源: ${origin}`)
  console.log(`[PROXY] User-Agent: ${request.headers?.get ? request.headers.get('user-agent') : request.headers?.['user-agent']}`)
  console.log(`[PROXY] 请求方法: ${request.method}`)
  
  // 检查是否支持的方法
  if (!SUPPORTED_METHODS.includes(request.method || '')) {
    console.log(`[HANDLER] 不支持的方法: ${request.method}`)
    response.status(405)
      .setHeader('Access-Control-Allow-Origin', '*')
      .setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PROPFIND, PROPPATCH, MKCOL, COPY, MOVE, LOCK, UNLOCK, OPTIONS')
      .setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Depth, Destination, Overwrite, Timeout, User-Agent')
      .setHeader('Access-Control-Allow-Credentials', 'true')
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
    
    console.log(`[PROXY] 原始URL: ${request.url}, 完整URL: ${url}`)
    
    // 构建目标URL - 移除 /api/webdav 前缀，添加 /dav 前缀
    const urlObj = new URL(url)
    console.log(`[PROXY] 原始路径: ${urlObj.pathname}`)
    const pathParts = urlObj.pathname.split('/api/webdav/')
    console.log(`[PROXY] 路径分割:`, pathParts)
    let webdavPath = pathParts[1] || ''
    
    // 确保路径以 / 开头
    if (webdavPath && !webdavPath.startsWith('/')) {
      webdavPath = '/' + webdavPath
    }
    
    const targetUrl = `https://dav.jianguoyun.com/dav${webdavPath}${urlObj.search}`
    
    console.log(`[PROXY] ${method} ${url} -> ${targetUrl}`)
    console.log(`[PROXY] webdavPath: "${webdavPath}"`)
    
    // 准备请求头
    const requestHeaders = {}
    if (request.headers?.entries) {
      for (const [key, value] of request.headers.entries()) {
        if (!['host', 'connection'].includes(key.toLowerCase())) {
          requestHeaders[key] = value
        }
      }
    } else {
      for (const key in request.headers) {
        if (!['host', 'connection'].includes(key.toLowerCase())) {
          requestHeaders[key] = request.headers[key]
        }
      }
    }
    
    console.log(`[PROXY] 请求头数量: ${Object.keys(requestHeaders).length}`)
    
    // 发送请求到WebDAV服务器
    const fetchResponse = await fetch(targetUrl, {
      method: method,
      headers: requestHeaders,
      body: request.body,
      redirect: 'manual'
    })
    
    console.log(`[PROXY] 收到响应: ${fetchResponse.status} ${fetchResponse.statusText}`)
    
    // 读取响应体 - 根据Content-Type区分处理
    let responseData
    const contentType = fetchResponse.headers.get('content-type') || ''
    
    try {
      if (contentType.includes('application/xml') || contentType.includes('text/xml')) {
        // XML响应 - WebDAV常用
        responseData = await fetchResponse.text()
        console.log(`[PROXY] XML响应体长度: ${responseData.length}`)
      } else if (contentType.includes('application/json')) {
        // JSON响应
        responseData = await fetchResponse.json()
        console.log(`[PROXY] JSON响应解析成功`)
      } else if (contentType.includes('application/octet-stream') || 
                 contentType.includes('application/epub+zip') ||
                 contentType.includes('application/pdf') ||
                 contentType.includes('application/zip')) {
        // 二进制文件响应
        responseData = await fetchResponse.arrayBuffer()
        console.log(`[PROXY] 二进制响应体长度: ${responseData.byteLength}`)
      } else {
        // 其他响应
        responseData = await fetchResponse.text()
        console.log(`[PROXY] 文本响应体长度: ${responseData.length}`)
      }
    } catch (error) {
      console.error('[PROXY] 读取响应体失败:', error)
      responseData = ''
    }
    
    // 设置响应头 - 增强移动端兼容性
    response.status(fetchResponse.status)
      .setHeader('Access-Control-Allow-Origin', origin || '*')
      .setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PROPFIND, PROPPATCH, MKCOL, COPY, MOVE, LOCK, UNLOCK, OPTIONS, HEAD, PATCH')
      .setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Depth, Destination, Overwrite, Timeout, User-Agent, X-Requested-With, Accept, Origin, Cache-Control, X-File-Name')
      .setHeader('Access-Control-Allow-Credentials', 'false')
      .setHeader('Access-Control-Max-Age', '86400')
      .setHeader('Vary', 'Origin')
      .setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
      .setHeader('Pragma', 'no-cache')
      .setHeader('Expires', '0')
    
    // 添加Content-Type和其他响应头
    if (contentType) {
      response.setHeader('Content-Type', contentType)
    }
    
    // 添加其他响应头（跳过一些可能有问题的）
    if (fetchResponse.headers?.entries) {
      for (const [key, value] of fetchResponse.headers.entries()) {
        if (!['connection', 'transfer-encoding', 'content-encoding', 'access-control-allow-origin', 'access-control-allow-methods', 'access-control-allow-headers', 'access-control-allow-credentials'].includes(key.toLowerCase())) {
          response.setHeader(key, value)
        }
      }
    }
    
    // 发送响应数据
    if (responseData instanceof ArrayBuffer) {
      // 二进制数据
      response.send(Buffer.from(responseData))
    } else if (typeof responseData === 'object') {
      // JSON数据
      response.json(responseData)
    } else {
      // 文本数据
      response.send(responseData)
    }
    console.log(`[PROXY] 返回响应，状态: ${fetchResponse.status}`)
    
  } catch (error) {
    console.error('[PROXY] 代理请求失败:', error)
    
    // 返回错误响应 - 增强移动端兼容性
    response.status(500)
      .setHeader('Access-Control-Allow-Origin', origin || '*')
      .setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PROPFIND, PROPPATCH, MKCOL, COPY, MOVE, LOCK, UNLOCK, OPTIONS, HEAD, PATCH')
      .setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Depth, Destination, Overwrite, Timeout, User-Agent, X-Requested-With, Accept, Origin, Cache-Control, X-File-Name')
      .setHeader('Access-Control-Allow-Credentials', 'false')
      .setHeader('Access-Control-Max-Age', '86400')
      .setHeader('Vary', 'Origin')
      .setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
      .setHeader('Pragma', 'no-cache')
      .setHeader('Expires', '0')
      .json({
        error: '代理请求失败',
        message: error.message || '未知错误',
        stack: error.stack
      })
  }
}
