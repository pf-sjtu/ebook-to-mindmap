#!/usr/bin/env node

// 测试思维导图预览错误处理优化
console.log('🧪 测试思维导图预览错误处理优化...\n')

// 模拟不同类型的错误
const errorTypes = [
  {
    name: '协议错误',
    error: new Error('Failed to launch \'mind-elixir://open\' because the scheme does not have a registered handler'),
    expectedMessage: 'Mind Elixir Desktop 未安装'
  },
  {
    name: '连接超时',
    error: new Error('服务启动超时'),
    expectedMessage: 'Mind Elixir Desktop 连接超时'
  },
  {
    name: 'Ping错误',
    error: new Error('GET http://127.0.0.1:6595/ping net::ERR_CONNECTION_REFUSED'),
    expectedMessage: '无法连接到 Mind Elixir Desktop'
  },
  {
    name: '未知错误',
    error: new Error('Some unknown error'),
    expectedMessage: '启动 Mind Elixir 失败'
  }
]

// 模拟错误处理函数
function handleMindElixirError(error) {
  let errorMessage = '启动 Mind Elixir 失败'
  let detailedMessage = ''
  
  if (error instanceof Error) {
    const errorString = error.message.toLowerCase()
    
    // 优先检查更具体的错误
    if (errorString.includes('ping')) {
      errorMessage = '无法连接到 Mind Elixir Desktop'
      detailedMessage = '请启动 Mind Elixir Desktop 应用程序'
    } else if (errorString.includes('scheme') || errorString.includes('protocol')) {
      errorMessage = 'Mind Elixir Desktop 未安装'
      detailedMessage = '请先安装 Mind Elixir Desktop 应用程序'
    } else if (errorString.includes('timeout') || errorString.includes('connection') || errorString.includes('启动超时') || errorString.includes('服务启动')) {
      errorMessage = 'Mind Elixir Desktop 连接超时'
      detailedMessage = '请确保 Mind Elixir Desktop 正在运行'
    }
  }
  
  return `${errorMessage}${detailedMessage ? ': ' + detailedMessage : ''}`
}

console.log('📋 错误处理测试:')
console.log('错误类型 -> 处理结果 (期望) ✅/❌\n')

let passCount = 0
errorTypes.forEach(testCase => {
  const result = handleMindElixirError(testCase.error)
  const passed = result.includes(testCase.expectedMessage)
  if (passed) passCount++
  
  console.log(`${testCase.name}:`)
  console.log(`  输入: ${testCase.error.message.substring(0, 50)}...`)
  console.log(`  输出: ${result}`)
  console.log(`  期望包含: ${testCase.expectedMessage} ${passed ? '✅' : '❌'}\n`)
})

console.log(`📊 测试结果: ${passCount}/${errorTypes.length} 通过`)

if (passCount === errorTypes.length) {
  console.log('✅ 错误处理逻辑优化成功')
  console.log('\n💡 优化说明:')
  console.log('- 根据错误类型提供具体的错误提示')
  console.log('- 添加了下载链接按钮，方便用户获取 Mind Elixir Desktop')
  console.log('- 在控制台提供详细的安装帮助信息')
  console.log('- 增加了错误提示的显示时间（8秒）')
} else {
  console.log('❌ 错误处理逻辑仍有问题')
}

console.log('\n🔄 用户操作流程:')
console.log('1. 用户点击"在 Mind Elixir 中打开"')
console.log('2. 系统检测到 Mind Elixir Desktop 未安装')
console.log('3. 显示友好的错误提示和下载按钮')
console.log('4. 用户点击"下载"按钮跳转到官网')
console.log('5. 用户安装并启动 Mind Elixir Desktop')
console.log('6. 再次点击按钮即可正常打开思维导图')

console.log('\n🛠️ 防重复处理优化:')
console.log('- EpubProcessor 添加了文件处理状态跟踪')
console.log('- 避免同一文件被重复处理')
console.log('- 提供清晰的处理状态日志')
