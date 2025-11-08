// Vercel官方推荐的JSON API格式
export default async function handler(request, response) {
  console.log('[JSON-OFFICIAL] 收到请求')
  
  const data = {
    message: 'Hello from Official JSON API',
    timestamp: new Date().toISOString(),
    success: true
  }
  
  // 使用官方推荐的response.json()方法
  response.status(200).json(data)
}
