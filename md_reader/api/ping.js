// Vercel官方推荐的ping API格式
export default async function handler(request, response) {
  console.log('[PING] 收到请求')
  
  const data = {
    message: 'pong',
    timestamp: new Date().toISOString(),
    method: request.method,
    url: request.url,
    success: true
  }
  
  // 使用官方推荐的response.json()方法
  response.status(200).json(data)
}
