// 简单的测试函数
export default async function handler(request) {
  console.log(`[TEST] 收到请求: ${request.method} ${request.url}`)
  
  return new Response(JSON.stringify({
    message: 'WebDAV代理服务器运行正常',
    method: request.method,
    url: request.url,
    timestamp: new Date().toISOString(),
    headers: Object.fromEntries(request.headers.entries())
  }, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  })
}
