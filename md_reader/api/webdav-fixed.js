// 修复版本的WebDAV代理服务器 - 解决响应问题
export default async function handler(request) {
  console.log(`[FIXED] 收到请求: ${request.method} ${request.url}`)
  
  // 处理OPTIONS请求
  if (request.method === 'OPTIONS') {
    console.log('[FIXED] 处理OPTIONS请求')
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PROPFIND, PROPPATCH, MKCOL, COPY, MOVE, LOCK, UNLOCK, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type, Depth, Destination, Overwrite, Timeout, User-Agent',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400'
      }
    })
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
    
    // 准备请求头 - 简化处理
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
    const response = await fetch(targetUrl, {
      method: request.method,
      headers: requestHeaders,
      body: request.body,
      redirect: 'manual'
    })
    
    console.log(`[FIXED] 收到响应: ${response.status} ${response.statusText}`)
    
    // 读取响应体 - 使用最简单的方式
    let responseText = ''
    try {
      responseText = await response.text()
      console.log(`[FIXED] 响应体长度: ${responseText.length}`)
    } catch (error) {
      console.error(`[FIXED] 读取响应体失败:`, error)
      responseText = `读取响应体失败: ${error.message}`
    }
    
    // 构建响应头 - 确保包含必要的CORS头部
    const responseHeaders = {
      'Content-Type': response.headers.get('content-type') || 'application/xml; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PROPFIND, PROPPATCH, MKCOL, COPY, MOVE, LOCK, UNLOCK, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type, Depth, Destination, Overwrite, Timeout, User-Agent',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400'
    }
    
    // 添加其他响应头（跳过一些可能有问题的）
    if (response.headers?.entries) {
      for (const [key, value] of response.headers.entries()) {
        if (!['connection', 'transfer-encoding', 'content-encoding'].includes(key.toLowerCase())) {
          responseHeaders[key] = value
        }
      }
    }
    
    console.log(`[FIXED] 返回响应，状态: ${response.status}`)
    
    // 返回响应 - 使用最简单的方式
    return new Response(responseText, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders
    })
    
  } catch (error) {
    console.error('[FIXED] 代理请求失败:', error)
    
    // 返回错误响应
    return new Response(JSON.stringify({
      error: '代理请求失败',
      message: error.message || '未知错误',
      stack: error.stack
    }, null, 2), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  }
}
