#!/usr/bin/env node

// 测试Vite代理是否正确配置
console.log('🧪 测试Vite代理配置...\n')

// 测试URL
const testUrls = [
  'http://localhost:5174/dav/',
  'http://localhost:5174/webdav/',
  'http://localhost:5174/dav/EBooks/',
  'http://localhost:5174/webdav/EBooks/'
]

async function testProxy(url) {
  try {
    console.log(`🔍 测试: ${url}`)
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'ebook-to-mindmap/1.0'
      }
    })
    
    const contentType = response.headers.get('content-type')
    const contentLength = response.headers.get('content-length')
    
    console.log(`   状态: ${response.status} ${response.statusText}`)
    console.log(`   类型: ${contentType}`)
    console.log(`   长度: ${contentLength}`)
    
    // 检查是否是HTML响应（表示代理失败，返回了React应用）
    if (contentType && contentType.includes('text/html')) {
      console.log('   ❌ 代理失败：返回了HTML页面（React应用）')
      return false
    }
    
    // 检查是否是WebDAV响应（XML或JSON）
    if (contentType && (contentType.includes('application/xml') || contentType.includes('text/xml') || contentType.includes('application/json'))) {
      console.log('   ✅ 代理成功：返回了WebDAV响应')
      return true
    }
    
    // 如果是401未授权，说明代理工作但需要认证
    if (response.status === 401) {
      console.log('   ✅ 代理成功：需要WebDAV认证')
      return true
    }
    
    console.log('   ⚠️  未知响应类型')
    return false
    
  } catch (error) {
    console.log(`   ❌ 请求失败: ${error.message}`)
    return false
  }
}

async function runTests() {
  console.log('请确保开发服务器正在运行: npm run dev\n')
  
  let successCount = 0
  
  for (const url of testUrls) {
    const success = await testProxy(url)
    if (success) successCount++
    console.log('')
  }
  
  console.log(`📊 测试结果: ${successCount}/${testUrls.length} 个URL代理正常`)
  
  if (successCount > 0) {
    console.log('✅ Vite代理配置正确，可以正常访问WebDAV服务器')
  } else {
    console.log('❌ Vite代理配置有问题，所有请求都返回了React应用')
    console.log('💡 请检查:')
    console.log('   1. 开发服务器是否重启')
    console.log('   2. vite.config.ts中的代理配置')
    console.log('   3. 是否有其他路由拦截了/dav路径')
  }
}

runTests().catch(console.error)
