// Vercel官方推荐的API格式
export default async function handler(request, response) {
  console.log('[HELLO-OFFICIAL] 收到请求')
  
  // 使用官方推荐的response.send()方法
  response.status(200).send('Hello from Official Vercel API!')
}
