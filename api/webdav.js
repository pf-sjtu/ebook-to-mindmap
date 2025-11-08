// WebDAV代理服务器 - Vercel官方格式
// 支持的WebDAV方法
const SUPPORTED_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PROPFIND', 'PROPPATCH', 'MKCOL', 'COPY', 'MOVE', 'LOCK', 'UNLOCK', 'OPTIONS']

/**
 * 处理WebDAV代理请求 - Vercel官方格式入口
 */
export default async function handler(request, response) {
  let url = request.url
  
  // 添加CORS头部
  response.setHeader('Access-Control-Allow-Origin', '*')
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PROPFIND, PROPPATCH, MKCOL, COPY, MOVE, LOCK, UNLOCK, OPTIONS')
  response.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Depth, Destination, Overwrite, Timeout, User-Agent')
  response.setHeader('Access-Control-Allow-Credentials', 'true')
  response.setHeader('Access-Control-Max-Age', '86400')
  
  // 处理OPTIONS预检请求
  if (request.method === 'OPTIONS') {
    response.status(200)
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
    let requestHeaders = {}
    
    // 转发头部，但过滤掉一些可能导致问题的头部
    if (method === 'PROPFIND' || method === 'PROPPATCH') {
      // WebDAV方法需要保留所有头部
      for (const key in request.headers) {
        if (!['host', 'connection'].includes(key.toLowerCase())) {
          requestHeaders[key] = request.headers[key]
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
    Object.keys(fetchResponse.headers).forEach(key => {
      if (key.toLowerCase() !== 'content-encoding') {
        response.setHeader(key, fetchResponse.headers.get(key))
      }
    })
    
    // 返回响应
    response.status(fetchResponse.status)
    response.send(responseText)
    
    console.log(`[PROXY] 返回响应，状态: ${fetchResponse.status}`)
    
  } catch (error) {
    console.error('[PROXY] 代理请求失败:', error)
    response.status(500).json({
      error: '代理服务器内部错误',
      message: error.message,
      url: request.url
    })
  }
}
