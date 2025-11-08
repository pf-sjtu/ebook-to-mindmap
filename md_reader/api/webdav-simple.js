// 简化的WebDAV代理服务器 - 用于调试响应问题
export default async function handler(request) {
  console.log(`[SIMPLE] 收到请求: ${request.method} ${request.url}`)
  
  // 处理OPTIONS请求
  if (request.method === 'OPTIONS') {
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
    
    console.log(`[SIMPLE] 转发到: ${targetUrl}`)
    
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
    
    // 发送请求
    const response = await fetch(targetUrl, {
      method: request.method,
      headers: requestHeaders,
      body: request.body,
      redirect: 'manual'
    })
    
    console.log(`[SIMPLE] 收到响应: ${response.status}`)
    
    // 读取响应体
    const responseText = await response.text()
    console.log(`[SIMPLE] 响应体长度: ${responseText.length}`)
    
    // 返回响应
    return new Response(responseText, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        'Content-Type': response.headers.get('content-type') || 'application/xml; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PROPFIND, PROPPATCH, MKCOL, COPY, MOVE, LOCK, UNLOCK, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type, Depth, Destination, Overwrite, Timeout, User-Agent',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400'
      }
    })
    
  } catch (error) {
    console.error('[SIMPLE] 错误:', error)
    return new Response(JSON.stringify({
      error: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  }
}
