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
  
  // 处理OPTIONS请求
  if (request.method === 'OPTIONS') {
    console.log('[HANDLER] 处理OPTIONS请求')
    response.status(200)
      .setHeader('Access-Control-Allow-Origin', '*')
      .setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PROPFIND, PROPPATCH, MKCOL, COPY, MOVE, LOCK, UNLOCK, OPTIONS')
      .setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Depth, Destination, Overwrite, Timeout, User-Agent')
      .setHeader('Access-Control-Allow-Credentials', 'true')
      .setHeader('Access-Control-Max-Age', '86400')
      .send('')
    return
  }
  
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
    const pathParts = urlObj.pathname.split('/api/webdav/')
    const webdavPath = pathParts[1] || ''
    const targetUrl = `https://dav.jianguoyun.com/dav/${webdavPath}${urlObj.search}`
    
    console.log(`[PROXY] ${method} ${url} -> ${targetUrl}`)
    
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
    
    // 读取响应体
    let responseText = ''
    try {
      responseText = await fetchResponse.text()
      console.log(`[PROXY] 响应体长度: ${responseText.length}`)
    } catch (error) {
      console.error(`[PROXY] 读取响应体失败:`, error)
      responseText = `读取响应体失败: ${error.message}`
    }
    
    // 设置响应头
    const contentType = fetchResponse.headers.get('content-type') || 'application/xml; charset=utf-8'
    response.status(fetchResponse.status)
      .setHeader('Content-Type', contentType)
      .setHeader('Access-Control-Allow-Origin', '*')
      .setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PROPFIND, PROPPATCH, MKCOL, COPY, MOVE, LOCK, UNLOCK, OPTIONS')
      .setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Depth, Destination, Overwrite, Timeout, User-Agent')
      .setHeader('Access-Control-Allow-Credentials', 'true')
    
    // 添加其他响应头（跳过一些可能有问题的）
    if (fetchResponse.headers?.entries) {
      for (const [key, value] of fetchResponse.headers.entries()) {
        if (!['connection', 'transfer-encoding', 'content-encoding'].includes(key.toLowerCase())) {
          response.setHeader(key, value)
        }
      }
    }
    
    console.log(`[PROXY] 返回响应，状态: ${fetchResponse.status}`)
    
    // 发送响应
    response.send(responseText)
    
  } catch (error) {
    console.error('[PROXY] 代理请求失败:', error)
    
    // 返回错误响应
    response.status(500)
      .setHeader('Access-Control-Allow-Origin', '*')
      .setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PROPFIND, PROPPATCH, MKCOL, COPY, MOVE, LOCK, UNLOCK, OPTIONS')
      .setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Depth, Destination, Overwrite, Timeout, User-Agent')
      .setHeader('Access-Control-Allow-Credentials', 'true')
      .json({
        error: '代理请求失败',
        message: error.message || '未知错误',
        stack: error.stack
      })
  }
}
