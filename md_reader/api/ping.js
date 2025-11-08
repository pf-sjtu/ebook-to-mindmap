// 简单的ping测试API
export default async function handler(request) {
  console.log('[PING] 收到请求')
  
  return new Response(JSON.stringify({
    message: 'pong',
    timestamp: new Date().toISOString(),
    method: request.method,
    url: request.url,
    success: true
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  })
}
