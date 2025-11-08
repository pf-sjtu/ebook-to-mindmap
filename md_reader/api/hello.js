// 最简单的测试API
export default async function handler() {
  console.log('[HELLO] Function被调用')
  
  return new Response('Hello World!', {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
      'Access-Control-Allow-Origin': '*'
    }
  })
}
