// Vercel兼容测试API
export default async function handler(request) {
  console.log('[VERCEL-TEST] 开始处理请求')
  
  try {
    // 方法1: 直接返回字符串 (Vercel可能自动包装)
    if (request.url.includes('method=1')) {
      console.log('[VERCEL-TEST] 使用方法1: 直接返回字符串')
      return 'Hello from method 1!'
    }
    
    // 方法2: 返回JSON字符串
    if (request.url.includes('method=2')) {
      console.log('[VERCEL-TEST] 使用方法2: JSON字符串')
      return JSON.stringify({
        message: 'Hello from method 2',
        timestamp: new Date().toISOString()
      })
    }
    
    // 方法3: 标准Response对象但简化头部
    if (request.url.includes('method=3')) {
      console.log('[VERCEL-TEST] 使用方法3: 简化Response')
      return new Response('Hello from method 3!', {
        status: 200,
        headers: {
          'Content-Type': 'text/plain'
        }
      })
    }
    
    // 方法4: 带CORS的Response
    if (request.url.includes('method=4')) {
      console.log('[VERCEL-TEST] 使用方法4: 带CORS')
      return new Response('Hello from method 4!', {
        status: 200,
        headers: {
          'Content-Type': 'text/plain',
          'Access-Control-Allow-Origin': '*'
        }
      })
    }
    
    // 默认方法: 最基础的Response
    console.log('[VERCEL-TEST] 使用默认方法: 基础Response')
    const response = new Response('Hello from Vercel Test!', {
      status: 200
    })
    
    console.log('[VERCEL-TEST] 响应创建完成')
    return response
    
  } catch (error) {
    console.error('[VERCEL-TEST] 错误:', error)
    return new Response('Error: ' + error.message, {
      status: 500
    })
  }
}
