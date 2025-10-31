// WebDAV客户端测试
// 模拟WebDAV库的行为来诊断问题

import { createClient } from 'webdav'

// 模拟配置
const config = {
  url: 'http://localhost:5174/webdav/',
  username: 'test@example.com',
  password: 'test_password'
}

async function testWebDAVClient() {
  console.log('=== WebDAV客户端测试 ===\n')
  
  try {
    console.log('创建WebDAV客户端...')
    console.log('基础URL:', config.url)
    
    const client = createClient(config.url, {
      username: config.username,
      password: config.password
    })
    
    console.log('客户端创建成功')
    
    // 测试根目录
    console.log('\n测试获取根目录内容...')
    try {
      const rootContents = await client.getDirectoryContents('/')
      console.log('✅ 根目录获取成功，项目数量:', rootContents.length)
    } catch (error) {
      console.log('❌ 根目录获取失败:', error.message)
    }
    
    // 测试子目录
    console.log('\n测试获取子目录内容...')
    try {
      const subContents = await client.getDirectoryContents('/fastReader/')
      console.log('✅ 子目录获取成功，项目数量:', subContents.length)
    } catch (error) {
      console.log('❌ 子目录获取失败:', error.message)
    }
    
    // 检查客户端内部状态
    console.log('\n检查客户端内部状态...')
    console.log('客户端配置:', client.config)
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message)
  }
}

testWebDAVClient()
