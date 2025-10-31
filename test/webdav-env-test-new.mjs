#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { createClient } from 'webdav'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PROJECT_ROOT = path.join(__dirname, '..')

// 读取 .env 文件
function loadEnvConfig() {
  try {
    const envPath = path.join(PROJECT_ROOT, '.env')
    if (!fs.existsSync(envPath)) {
      console.error('❌ .env 文件不存在:', envPath)
      return null
    }
    
    const envContent = fs.readFileSync(envPath, 'utf8')
    const envConfig = {}
    
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=')
        if (key && valueParts.length > 0) {
          envConfig[key.trim()] = valueParts.join('=').trim()
        }
      }
    })
    
    return envConfig
  } catch (error) {
    console.error('❌ 读取 .env 文件失败:', error.message)
    return null
  }
}

// 创建 tmp 目录
const TMP_DIR = path.join(PROJECT_ROOT, 'tmp')
if (!fs.existsSync(TMP_DIR)) {
  fs.mkdirSync(TMP_DIR, { recursive: true })
  console.log('✅ 创建 tmp 目录:', TMP_DIR)
}

async function testWebDAVWithEnv() {
  console.log('=== WebDAV 环境变量测试 ===\n')
  
  // 加载环境变量
  const envConfig = loadEnvConfig()
  if (!envConfig) {
    return
  }
  
  console.log('📋 环境变量配置:')
  Object.keys(envConfig).forEach(key => {
    if (key.toLowerCase().includes('webdav') || key.toLowerCase().includes('dav')) {
      const value = envConfig[key]
      const maskedValue = value.includes('password') || value.includes('secret') 
        ? value.substring(0, 2) + '***' + value.substring(value.length - 2)
        : value
      console.log(`   ${key}: ${maskedValue}`)
    }
  })
  
  // 尝试从环境变量中提取 WebDAV 配置
  const webdavConfig = {
    url: envConfig.VITE_WEBDAV_URL || envConfig.WEBDAV_URL || 'https://dav.jianguoyun.com/dav/',
    username: envConfig.VITE_WEBDAV_USERNAME || envConfig.WEBDAV_USERNAME,
    password: envConfig.VITE_WEBDAV_PASSWORD || envConfig.WEBDAV_PASSWORD
  }
  
  if (!webdavConfig.username || !webdavConfig.password) {
    console.log('\n❌ 未找到 WebDAV 用户名或密码配置')
    console.log('请检查 .env 文件中是否包含以下配置:')
    console.log('- VITE_WEBDAV_USERNAME 或 WEBDAV_USERNAME')
    console.log('- VITE_WEBDAV_PASSWORD 或 WEBDAV_PASSWORD')
    return
  }
  
  console.log('\n🔗 开始测试 WebDAV 连接...')
  
  try {
    // 创建 WebDAV 客户端
    const client = createClient(webdavConfig.url, {
      username: webdavConfig.username,
      password: webdavConfig.password
    })
    
    // 测试连接
    console.log('🔍 测试基本连接...')
    await client.getDirectoryContents('/')
    console.log('✅ WebDAV 连接成功')
    
    // 获取 EBooks 目录
    console.log('📚 获取 EBooks 目录内容...')
    const ebooksContent = await client.getDirectoryContents('/EBooks/')
    console.log(`📁 找到 ${ebooksContent.length} 个文件/目录`)
    
    // 找到 EPUB 文件
    const epubFiles = ebooksContent.filter(file => 
      file.type === 'file' && file.basename.toLowerCase().endsWith('.epub')
    )
    
    if (epubFiles.length === 0) {
      console.log('❌ 未找到 EPUB 文件')
      return
    }
    
    console.log(`📖 找到 ${epubFiles.length} 个 EPUB 文件:`)
    epubFiles.slice(0, 5).forEach(file => {
      console.log(`   - ${file.basename} (${file.size} 字节)`)
    })
    
    // 下载第一个 EPUB 文件进行测试
    const testFile = epubFiles[0]
    console.log(`\n⬇️ 下载测试文件: ${testFile.basename}`)
    
    const fileContent = await client.getFileContents(testFile.filename, { format: 'binary' })
    
    console.log('🔍 文件内容分析:')
    console.log(`   - 类型: ${typeof fileContent}`)
    console.log(`   - 构造函数: ${fileContent.constructor.name}`)
    console.log(`   - 长度: ${fileContent.length || fileContent.byteLength}`)
    
    // 保存文件
    let bufferToWrite
    if (fileContent instanceof ArrayBuffer) {
      bufferToWrite = Buffer.from(fileContent)
    } else if (fileContent instanceof Uint8Array) {
      bufferToWrite = Buffer.from(fileContent)
    } else {
      bufferToWrite = Buffer.from(fileContent)
    }
    
    const downloadPath = path.join(TMP_DIR, 'test-' + testFile.basename)
    fs.writeFileSync(downloadPath, bufferToWrite)
    
    console.log(`✅ 文件下载成功: ${downloadPath}`)
    console.log(`📏 本地文件大小: ${fs.statSync(downloadPath).size} 字节`)
    
    // 验证 EPUB 格式
    const fileBuffer = fs.readFileSync(downloadPath)
    const header = fileBuffer.slice(0, 4).toString('hex')
    console.log(`🔍 文件头部: ${header}`)
    
    if (header === '504b0304') {
      console.log('✅ 文件格式正确 (ZIP/EPUB)')
      console.log('\n🎉 WebDAV 下载测试成功！')
      console.log('现在可以在浏览器中测试 WebDAV 文件选择功能了。')
    } else {
      console.log('❌ 文件格式不正确')
      console.log('可能是 WebDAV 服务器返回了错误页面或配置问题。')
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message)
    if (error.message.includes('401') || error.message.includes('403')) {
      console.log('💡 可能是认证失败，请检查用户名和密码')
    } else if (error.message.includes('404')) {
      console.log('💡 可能是路径不存在，请检查 WebDAV 服务器配置')
    }
  }
}

// 运行测试
testWebDAVWithEnv()
