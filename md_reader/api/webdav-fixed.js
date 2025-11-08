// 修复版本的WebDAV代理服务器 - 使用Vercel官方格式
export default async function handler(request, response) {
  console.log(`[FIXED] 收到请求: ${request.method} ${request.url}`)
  
  // 处理OPTIONS请求
  if (request.method === 'OPTIONS') {
    console.log('[FIXED] 处理OPTIONS请求')
    response.status(200)
      .setHeader('Access-Control-Allow-Origin', '*')
      .setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PROPFIND, PROPPATCH, MKCOL, COPY, MOVE, LOCK, UNLOCK, OPTIONS')
      .setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Depth, Destination, Overwrite, Timeout, User-Agent')
      .setHeader('Access-Control-Allow-Credentials', 'true')
      .setHeader('Access-Control-Max-Age', '86400')
      .send('')
    return
  }
  
  try {
    // 构建目标URL
    let url = request.url
    if (!url.startsWith('http')) {
      const host = request.headers?.get ? request.headers.get('host') : request.headers?.host || 'localhost'
      const protocol = request.headers?.get ? request.headers.get('x-forwarded-proto') : request.headers['x-forwarded-proto'] || 'https'
      url = `${protocol}://${host}${url}`
    }
    
    const urlObj = new URL(url)
    const pathParts = urlObj.pathname.split('/api/webdav/')
    const webdavPath = pathParts[1] || ''
    const targetUrl = `https://dav.jianguoyun.com/dav/${webdavPath}${urlObj.search}`
    
    console.log(`[FIXED] 转发到: ${targetUrl}`)
    
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
    
    console.log(`[FIXED] 请求头数量: ${Object.keys(requestHeaders).length}`)
    
    // 发送请求
    const fetchResponse = await fetch(targetUrl, {
      method: request.method,
      headers: requestHeaders,
      body: request.body,
      redirect: 'manual'
    })
    
    console.log(`[FIXED] 收到响应: ${fetchResponse.status} ${fetchResponse.statusText}`)
    
    // 读取响应体
    let responseText = ''
    try {
      responseText = await fetchResponse.text()
      console.log(`[FIXED] 响应体长度: ${responseText.length}`)
    } catch (error) {
      console.error(`[FIXED] 读取响应体失败:`, error)
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
    
    // 添加其他响应头
    if (fetchResponse.headers?.entries) {
      for (const [key, value] of fetchResponse.headers.entries()) {
        if (!['connection', 'transfer-encoding', 'content-encoding'].includes(key.toLowerCase())) {
          response.setHeader(key, value)
        }
      }
    }
    
    console.log(`[FIXED] 返回响应，状态: ${fetchResponse.status}`)
    
    // 发送响应
    response.send(responseText)
    
  } catch (error) {
    console.error('[FIXED] 代理请求失败:', error)
    
    // 返回错误响应
    response.status(500)
      .json({
        error: '代理请求失败',
        message: error.message || '未知错误',
        stack: error.stack
      })
  }
}
