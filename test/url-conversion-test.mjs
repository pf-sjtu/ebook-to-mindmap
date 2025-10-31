#!/usr/bin/env node

// 测试URL转换逻辑
console.log('🧪 测试WebDAV URL转换...\n')

// 模拟getProxiedUrl函数
function getProxiedUrl(originalUrl) {
  // 模拟开发环境
  const isDev = true
  
  if (isDev) {
    // 如果是坚果云的URL，转换为代理URL
    if (originalUrl.includes('dav.jianguoyun.com')) {
      const url = new URL(originalUrl)
      // 提取路径部分，去掉 /dav 前缀，然后添加 /webdav 前缀
      let pathname = url.pathname
      if (pathname.startsWith('/dav')) {
        pathname = pathname.replace('/dav', '')
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
  console.log('✅ URL转换逻辑正确')
} else {
  console.log('❌ URL转换逻辑有问题')
}

// 测试代理路径重写
console.log('\n🔄 Vite代理重写规则:')
console.log('/webdav/ -> /dav/')
console.log('/webdav/EBooks/ -> /dav/EBooks/')
console.log('/dav/ -> /dav/ (直接转发)')

console.log('\n💡 完整流程:')
console.log('1. WebDAV客户端使用: /webdav/')
console.log('2. 请求根目录时发送到: /webdav/')
console.log('3. Vite代理重写为: /dav/')
console.log('4. 最终发送到服务器: /dav/')
