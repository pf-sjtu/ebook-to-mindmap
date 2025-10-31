#!/usr/bin/env node

// 测试WebDAV路径重写是否正确
console.log('🧪 测试WebDAV路径重写...\n')

// 测试不同的路径组合
const testCases = [
  { input: '/dav/', expected: '/dav/' },
  { input: '/dav/EBooks/', expected: '/dav/EBooks/' },
  { input: '/webdav/', expected: '/dav/' },
  { input: '/webdav/EBooks/', expected: '/dav/EBooks/' }
]

function testPathRewrite() {
  console.log('📋 路径重写测试:')
  console.log('输入路径 -> 期望输出\n')
  
  testCases.forEach(testCase => {
    console.log(`${testCase.input} -> ${testCase.expected}`)
  })
  
  console.log('\n💡 说明:')
  console.log('- /webdav/* 路径会被重写为 /dav/*')
  console.log('- /dav/* 路径直接转发，不重写')
  console.log('- 这样避免了 /dav/dav/ 重复路径问题')
}

async function testActualProxy() {
  console.log('\n🌐 实际代理测试:')
  console.log('请确保开发服务器正在运行: npm run dev\n')
  
  const testUrls = [
    'http://localhost:5174/webdav/',
    'http://localhost:5174/dav/'
  ]
  
  for (const url of testUrls) {
    try {
      console.log(`🔍 测试: ${url}`)
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'ebook-to-mindmap/1.0'
        }
      })
      
      const contentType = response.headers.get('content-type')
      
      console.log(`   状态: ${response.status} ${response.statusText}`)
      console.log(`   类型: ${contentType}`)
      
      if (contentType && contentType.includes('text/html')) {
        console.log('   ❌ 代理失败：返回了HTML页面')
      } else if (response.status === 401) {
        console.log('   ✅ 代理成功：需要WebDAV认证')
      } else if (contentType && contentType.includes('application/xml')) {
        console.log('   ✅ 代理成功：返回了WebDAV XML响应')
      }
      
    } catch (error) {
      console.log(`   ❌ 请求失败: ${error.message}`)
    }
    console.log('')
  }
}

async function main() {
  testPathRewrite()
  await testActualProxy()
}

main().catch(console.error)
