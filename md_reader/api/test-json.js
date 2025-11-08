// JSON响应测试
export default async function handler() {
  console.log('[TEST-JSON] 开始处理请求')
  
  const data = {
    message: 'Hello from JSON API',
    timestamp: new Date().toISOString(),
    success: true
  }
  
  console.log('[TEST-JSON] 准备返回JSON:', data)
  
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  })
}
