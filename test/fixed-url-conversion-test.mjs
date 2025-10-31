#!/usr/bin/env node

// 测试修复后的URL转换逻辑
console.log('🧪 测试修复后的WebDAV URL转换...\n')

// 模拟修复后的getProxiedUrl函数
function getProxiedUrl(originalUrl) {
  // 模拟开发环境
  const isDev = true
  
  if (isDev) {
    // 如果是坚果云的URL，转换为代理URL
    if (originalUrl.includes('dav.jianguoyun.com')) {
      const url = new URL(originalUrl)
      // 提取路径部分，去掉 /dav 前缀
      let pathname = url.pathname
      if (pathname.startsWith('/dav/')) {
        pathname = pathname.substring(4) // 去掉 '/dav'
      } else if (pathname === '/dav') {
        pathname = '/' // 根目录
      }
      // 如果路径为空，设为根路径
      if (pathname === '') {
        pathname = '/'
      }
      return `/webdav${pathname}`
    }
  }
  return originalUrl
}

// 测试用例
const testCases = [
  {
    input: 'https://dav.jianguoyun.com/dav/',
    expected: '/webdav/',
    description: '根目录转换'
  },
  {
    input: 'https://dav.jianguoyun.com/dav/EBooks/',
    expected: '/webdav/EBooks/',
    description: '子目录转换'
  },
  {
    input: 'https://dav.jianguoyun.com/dav/EBooks/test.epub',
    expected: '/webdav/EBooks/test.epub',
    description: '文件路径转换'
  }
]

console.log('📋 URL转换测试:')
console.log('输入 URL -> 输出 URL (期望) ✅/❌\n')

let passCount = 0
testCases.forEach(testCase => {
  const result = getProxiedUrl(testCase.input)
  const passed = result === testCase.expected
  if (passed) passCount++
  
  console.log(`${testCase.description}:`)
  console.log(`  ${testCase.input}`)
  console.log(`  -> ${result} (${testCase.expected}) ${passed ? '✅' : '❌'}\n`)
})

console.log(`📊 测试结果: ${passCount}/${testCases.length} 通过`)

if (passCount === testCases.length) {
  console.log('✅ URL转换逻辑修复成功')
  console.log('\n💡 修复说明:')
  console.log('- 使用 substring(4) 精确去掉 /dav 前缀')
  console.log('- 避免了 replace() 可能导致的重复替换问题')
  console.log('- 正确处理根目录和子目录情况')
} else {
  console.log('❌ URL转换逻辑仍有问题')
}

console.log('\n🔄 完整流程示例:')
console.log('1. 原始URL: https://dav.jianguoyun.com/dav/')
console.log('2. 转换后: /webdav/')
console.log('3. WebDAV客户端请求根目录: /webdav/')
console.log('4. Vite代理重写: /webdav/ -> /dav/')
console.log('5. 最终发送到服务器: /dav/')
