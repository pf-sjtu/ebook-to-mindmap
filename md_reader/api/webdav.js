// WebDAV代理服务器 - Vercel Serverless Function
// 支持的WebDAV方法
const SUPPORTED_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PROPFIND', 'PROPPATCH', 'MKCOL', 'COPY', 'MOVE', 'LOCK', 'UNLOCK', 'OPTIONS']

// CORS头部
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PROPFIND, PROPPATCH, MKCOL, COPY, MOVE, LOCK, UNLOCK, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, Depth, Destination, Overwrite, Timeout, User-Agent',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Max-Age': '86400'
}

/**
 * 处理OPTIONS预检请求
 */
function handleOptions() {
  return new Response(null, {
    status: 200,
    headers: CORS_HEADERS
  })
}

/**
 * 转发请求到WebDAV服务器
 */
async function proxyRequest(request) {
  try {
    // 获取请求信息
    const method = request.method
    const url = request.url
    
    // 构建目标URL - 移除 /api/webdav 前缀，添加 /dav 前缀
    const urlObj = new URL(url)
    const pathParts = urlObj.pathname.split('/api/webdav/')
    const webdavPath = pathParts[1] || ''
    const targetUrl = `https://dav.jianguoyun.com/dav/${webdavPath}${urlObj.search}`
    
    console.log(`代理请求: ${method} ${url} -> ${targetUrl}`)
    
    // 获取请求头
    const requestHeaders = {}
    for (const [key, value] of request.headers.entries()) {
      // 跳过一些不应该转发的头部
      if (!['host', 'connection', 'accept-encoding', 'accept-language'].includes(key.toLowerCase())) {
        requestHeaders[key] = value
      }
    }
    
    // 获取请求体
    let body = null
    if (['POST', 'PUT', 'PROPPATCH', 'MKCOL'].includes(method)) {
      body = request.body
    }
    
    // 发送请求到WebDAV服务器
    const response = await fetch(targetUrl, {
      method,
      headers: requestHeaders,
      body,
      // 重要：不跟随重定向，让浏览器处理
      redirect: 'manual'
    })
    
    // 获取响应头
    const responseHeaders = {}
    for (const [key, value] of response.headers.entries()) {
      // 跳过一些不应该转发的头部
      if (!['connection', 'transfer-encoding', 'content-encoding'].includes(key.toLowerCase())) {
        responseHeaders[key] = value
      }
    }
    
    // 添加CORS头部
    Object.assign(responseHeaders, CORS_HEADERS)
    
    // 获取响应体
    let responseBody = null
    const contentType = response.headers.get('content-type') || ''
    
    // 对于二进制内容，直接转发
    if (contentType.includes('application/xml') || 
        contentType.includes('text/xml') || 
        contentType.includes('text/html') ||
        contentType.includes('application/octet-stream')) {
      responseBody = response.body
    } else {
      // 对于文本内容，可以读取并转发
      try {
        const text = await response.text()
        responseBody = text
      } catch (error) {
        console.error('读取响应体失败:', error)
        responseBody = response.body
      }
    }
    
    console.log(`代理响应: ${response.status} ${response.statusText} for ${targetUrl}`)
    
    // 返回响应
    return new Response(responseBody, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders
    })
    
  } catch (error) {
    console.error('代理请求失败:', error)
    
    // 返回错误响应
    return new Response(JSON.stringify({
      error: '代理请求失败',
      message: error.message || '未知错误'
    }), {
      status: 500,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'application/json'
      }
    })
  }
}

/**
 * 处理WebDAV代理请求 - Vercel Serverless Function入口
 */
async function handler(request) {
  // 处理OPTIONS请求
  if (request.method === 'OPTIONS') {
    return handleOptions()
  }
  
  // 检查是否支持的方法
  if (!SUPPORTED_METHODS.includes(request.method || '')) {
    return new Response(JSON.stringify({
      error: '方法不被支持',
      method: request.method,
      supportedMethods: SUPPORTED_METHODS
    }), {
      status: 405,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'application/json'
      }
    })
  }
  
  // 转发请求
  return proxyRequest(request)
}

// 导出处理器
export default handler
