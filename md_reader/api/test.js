// 简单的测试函数
export default function handler(request) {
  return new Response(JSON.stringify({
    message: 'WebDAV代理服务器运行正常',
    method: request.method,
    url: request.url,
    timestamp: new Date().toISOString()
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  })
}
