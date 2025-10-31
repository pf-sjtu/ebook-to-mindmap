// WebDAV代理测试脚本
// 用于验证Vite代理配置是否正确工作

const testWebDAVProxy = async () => {
  try {
    console.log('测试WebDAV代理配置...')
    
    // 测试代理URL
    const proxyUrl = 'http://localhost:5174/webdav/'
    
    // 发送OPTIONS请求测试CORS
    const response = await fetch(proxyUrl, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:5174',
        'Access-Control-Request-Method': 'PROPFIND',
        'Access-Control-Request-Headers': 'Authorization'
      }
    })
    
    console.log('代理响应状态:', response.status)
    console.log('CORS头:', response.headers.get('Access-Control-Allow-Origin'))
    console.log('允许的方法:', response.headers.get('Access-Control-Allow-Methods'))
    
    if (response.ok) {
      console.log('✅ 代理配置工作正常')
    } else {
      console.log('❌ 代理配置有问题')
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message)
  }
}

testWebDAVProxy()
