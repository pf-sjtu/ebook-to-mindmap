// 最简单的测试API - 修复响应问题
export default async function handler() {
  console.log('[HELLO] Function被调用')
  
  try {
    // 使用最简单的响应方式
    const response = new Response('Hello World!', {
      status: 200,
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    })
    
    console.log('[HELLO] 响应已创建，状态:', response.status)
    return response
    
  } catch (error) {
    console.error('[HELLO] 创建响应时出错:', error)
    return new Response('Error: ' + error.message, {
      status: 500,
      headers: {
        'Content-Type': 'text/plain',
        'Access-Control-Allow-Origin': '*'
      }
    })
  }
}
