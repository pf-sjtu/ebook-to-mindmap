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
    let url = request.url
    
    // 在Vercel环境中，request.url可能只是路径，需要构造完整URL
    if (!url.startsWith('http')) {
      // 兼容不同的headers格式
      const host = request.headers?.get ? request.headers.get('host') : request.headers?.host || 'localhost'
      const protocol = request.headers?.get ? request.headers.get('x-forwarded-proto') : request.headers['x-forwarded-proto'] || 'https'
      url = `${protocol}://${host}${url}`
    }
    
    console.log(`[PROXY] 原始URL: ${request.url}, 完整URL: ${url}`)
    
    // 构建目标URL - 移除 /api/webdav 前缀，添加 /dav 前缀
    const urlObj = new URL(url)
    const pathParts = urlObj.pathname.split('/api/webdav/')
    const webdavPath = pathParts[1] || ''
    const targetUrl = `https://dav.jianguoyun.com/dav/${webdavPath}${urlObj.search}`
    
    console.log(`[PROXY] ${method} ${url} -> ${targetUrl}`)
    
    // 准备请求头
    const requestHeaders = {}
    
    // 兼容不同的headers格式
    if (request.headers?.entries) {
      // Headers对象格式
      for (const [key, value] of request.headers.entries()) {
        // 跳过一些不应该转发的头部
        if (!['host', 'connection', 'accept-encoding', 'accept-language'].includes(key.toLowerCase())) {
          requestHeaders[key] = value
        }
      }
    } else if (typeof request.headers === 'object') {
      // 普通对象格式
      for (const key in request.headers) {
        // 跳过一些不应该转发的头部
        if (!['host', 'connection', 'accept-encoding', 'accept-language'].includes(key.toLowerCase())) {
          requestHeaders[key] = request.headers[key]
        }
      }
    }
    
    // 获取请求体
    let body = null
    if (['POST', 'PUT', 'PROPPATCH', 'MKCOL'].includes(method)) {
      body = request.body
    }
    
    console.log(`[PROXY] 发送请求到: ${targetUrl}`)
    console.log(`[PROXY] 请求头数量: ${Object.keys(requestHeaders).length}`)
    
    // 发送请求到WebDAV服务器
    const response = await fetch(targetUrl, {
      method,
      headers: requestHeaders,
      body,
      redirect: 'manual'
    })
    
    console.log(`[PROXY] 收到响应: ${response.status} ${response.statusText}`)
    
    // 准备响应头
    const responseHeaders = { ...CORS_HEADERS }
    for (const [key, value] of response.headers.entries()) {
      // 跳过一些不应该转发的头部
      if (!['connection', 'transfer-encoding', 'content-encoding'].includes(key.toLowerCase())) {
        responseHeaders[key] = value
      }
    }
    
    // 获取响应体
    let responseBody = null
    const contentType = response.headers.get('content-type') || ''
    
    try {
      console.log(`[PROXY] Content-Type: ${contentType}`)
      
      // 对于WebDAV的XML响应，通常content-type可能是application/xml或text/xml
      // 但有些服务器可能返回其他格式或不设置content-type
      if (contentType.includes('application/xml') || 
          contentType.includes('text/xml') || 
          contentType.includes('text/html') ||
          contentType.includes('text/plain')) {
        // 对于文本内容，读取为文本
        responseBody = await response.text()
        console.log(`[PROXY] 文本响应体长度: ${responseBody.length} 字符`)
      } else if (contentType.includes('application/octet-stream')) {
        // 对于二进制内容，直接转发
        responseBody = response.body
        console.log(`[PROXY] 二进制响应体`)
      } else if (contentType === '' || contentType.includes('application/xml') || response.status === 207) {
        // 对于WebDAV Multi-Status响应或无content-type的响应，读取为文本
        responseBody = await response.text()
        console.log(`[PROXY] WebDAV响应或无Content-Type，长度: ${responseBody.length} 字符`)
      } else {
        // 其他情况，尝试读取为文本，如果失败则直接转发body
        try {
          responseBody = await response.text()
          console.log(`[PROXY] 默认文本处理，长度: ${responseBody.length} 字符`)
        } catch (textError) {
          console.log(`[PROXY] 文本读取失败，直接转发body`)
          responseBody = response.body
        }
      }
    } catch (error) {
      console.error(`[PROXY] 读取响应体失败:`, error)
      responseBody = response.body
    }
    
    // 返回响应
    console.log(`[PROXY] 返回响应: 状态=${response.status}, 响应体类型=${typeof responseBody}, 长度=${responseBody?.length || 'unknown'}`)
    console.log(`[PROXY] 响应头数量: ${Object.keys(responseHeaders).length}`)
    
    return new Response(responseBody, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders
    })
    
  } catch (error) {
    console.error('[PROXY] 代理请求失败:', error)
    
    // 返回错误响应
    return new Response(JSON.stringify({
      error: '代理请求失败',
      message: error.message || '未知错误',
      stack: error.stack
    }, null, 2), {
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
export default async function handler(request) {
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
    return handleOptions()
  }
  
  // 检查是否支持的方法
  if (!SUPPORTED_METHODS.includes(request.method || '')) {
    console.log(`[HANDLER] 不支持的方法: ${request.method}`)
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
  console.log('[HANDLER] 开始转发请求')
  return proxyRequest(request)
}
