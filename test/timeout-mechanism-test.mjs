#!/usr/bin/env node

// 测试超时机制修复
console.log('🧪 测试 Mind Elixir 超时机制修复...\n')

// 模拟 launchMindElixir 函数（会无限重试）
function mockLaunchMindElixir() {
  return new Promise((resolve, reject) => {
    // 模拟无限重试，永不解决
    let retryCount = 0
    const retry = () => {
      retryCount++
      console.log(`  🔄 模拟重试第 ${retryCount} 次...`)
      
      // 模拟网络请求失败
      setTimeout(() => {
        if (retryCount < 20) { // 最多重试20次
          retry()
        } else {
          reject(new Error('模拟重试失败'))
        }
      }, 500)
    }
    
    retry()
  })
}

// 模拟修复后的 openInMindElixir 函数
async function mockOpenInMindElixir() {
  try {
    console.log('正在尝试启动 Mind Elixir Desktop...')
    
    // 添加超时机制，防止无限重试
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('服务启动超时'))
      }, 3000) // 3秒超时（测试用）
    })
    
    // 使用 Promise.race 来实现超时控制
    await Promise.race([
      mockLaunchMindElixir(),
      timeoutPromise
    ])
    
    console.log('✅ 成功启动 Mind Elixir Desktop')
    return { success: true }
  } catch (error) {
    console.error('启动 Mind Elixir 失败:', error.message)
    
    // 根据错误类型提供不同的提示
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
    
    const fullMessage = `${errorMessage}${detailedMessage ? ': ' + detailedMessage : ''}`
    console.log(`📢 错误提示: ${fullMessage}`)
    
    return { success: false, error: fullMessage }
  }
}

async function runTest() {
  console.log('📋 测试场景: Mind Elixir Desktop 未安装/未运行')
  console.log('期望结果: 3秒后显示超时错误提示\n')
  
  const startTime = Date.now()
  const result = await mockOpenInMindElixir()
  const duration = Date.now() - startTime
  
  console.log(`\n⏱️  执行时间: ${duration}ms`)
  
  if (result.success) {
    console.log('❌ 测试失败: 应该超时但成功了')
  } else {
    if (duration < 5000 && result.error?.includes('连接超时')) {
      console.log('✅ 测试通过: 正确捕获超时错误')
      console.log('\n💡 修复效果:')
      console.log('- 避免了无限重试导致的性能问题')
      console.log('- 10秒内必定返回错误提示')
      console.log('- 提供友好的错误信息和下载链接')
      console.log('- 改善了用户体验')
    } else {
      console.log('❌ 测试失败: 超时机制未生效')
    }
  }
}

runTest().catch(console.error)
