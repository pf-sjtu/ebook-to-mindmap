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
    let requestHeaders = {}
    
    // 转发头部，但过滤掉一些可能导致问题的头部
    for (const key in request.headers) {
      if (!['host', 'connection'].includes(key.toLowerCase())) {
        requestHeaders[key] = request.headers[key]
      }
    }
    
    console.log(`[PROXY] 请求头数量: ${Object.keys(requestHeaders).length}`)
    console.log(`[PROXY] 主要请求头:`, {
      authorization: requestHeaders.authorization ? '***已设置***' : '未设置',
      'user-agent': requestHeaders['user-agent'],
      'content-type': requestHeaders['content-type'],
      depth: requestHeaders.depth
    })
    
    // 发送请求到WebDAV服务器
    console.log(`[PROXY] 发送请求到: ${targetUrl}`)
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
      if (fetchResponse.headers.get('content-type')?.includes('application/xml') || 
          fetchResponse.headers.get('content-type')?.includes('text/xml')) {
        // XML响应（WebDAV PROPFIND等）
        responseText = await fetchResponse.text()
        console.log(`[PROXY] XML响应体长度: ${responseText.length}`)
      } else if (fetchResponse.headers.get('content-type')?.includes('application/json')) {
        // JSON响应
        const jsonResponse = await fetchResponse.json()
        responseText = JSON.stringify(jsonResponse)
        console.log(`[PROXY] JSON响应体长度: ${responseText.length}`)
      } else {
        // 其他响应
        responseText = await fetchResponse.text()
        console.log(`[PROXY] 文本响应体长度: ${responseText.length}`)
      }
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
    
    console.log(`[PROXY] 返回响应，状态: ${fetchResponse.status} ${fetchResponse.statusText}`)
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
