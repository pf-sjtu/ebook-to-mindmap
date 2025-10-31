#!/usr/bin/env node

// 测试WebDAV代理连接
console.log('🧪 测试WebDAV代理连接...\n')

async function testProxyConnection() {
  try {
    console.log('🔍 测试 /webdav/ 代理路径')
    
    const response = await fetch('http://localhost:5174/webdav/', {
      method: 'GET',
      headers: {
        'User-Agent': 'ebook-to-mindmap/1.0'
      }
    })
    
    console.log(`   状态: ${response.status} ${response.statusText}`)
    console.log(`   Content-Type: ${response.headers.get('content-type')}`)
    console.log(`   Content-Length: ${response.headers.get('content-length')}`)
    
    if (response.status === 401) {
      console.log('   ✅ 代理成功：服务器要求认证（这是正常的）')
      return true
    } else if (response.status === 404) {
      console.log('   ❌ 代理失败：404 Not Found')
      console.log('   💡 可能的原因：')
      console.log('      1. 开发服务器未重启')
      console.log('      2. Vite代理配置有问题')
      console.log('      3. 路径重写规则不正确')
      return false
    } else if (response.headers.get('content-type')?.includes('text/html')) {
      console.log('   ❌ 代理失败：返回了HTML页面（React应用）')
      return false
    } else {
      console.log('   ⚠️  未知响应')
      return false
    }
    
  } catch (error) {
    console.log(`   ❌ 请求失败: ${error.message}`)
    console.log('   💡 请确保开发服务器正在运行: npm run dev')
    return false
  }
}

async function main() {
  console.log('请确保开发服务器正在运行: npm run dev\n')
  
  const success = await testProxyConnection()
  
  if (success) {
    console.log('\n✅ WebDAV代理配置正确，可以正常连接服务器')
    console.log('现在可以在应用中测试WebDAV连接了')
  } else {
    console.log('\n❌ WebDAV代理配置有问题')
    console.log('请检查 vite.config.ts 中的代理配置')
  }
}

main().catch(console.error)
