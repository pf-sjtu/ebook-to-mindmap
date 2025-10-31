#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { createClient } from 'webdav'

// WebDAV 配置 - 请根据实际情况修改
const WEBDAV_CONFIG = {
  url: 'https://dav.jianguoyun.com/dav/',
  username: 'your_username',  // 需要替换为实际用户名
  password: 'your_password'   // 需要替换为实际密码
}

// 创建 tmp 目录
const TMP_DIR = path.join(process.cwd(), 'tmp')
if (!fs.existsSync(TMP_DIR)) {
  fs.mkdirSync(TMP_DIR, { recursive: true })
  console.log('✅ 创建 tmp 目录:', TMP_DIR)
}

async function testProxyDownload(filePath) {
  console.log('\n=== 测试代理下载方法 ===')
  
  try {
    // 注意：这个方法需要在开发服务器运行时测试
    const proxyUrl = `http://localhost:5174/webdav${filePath}`
    console.log('🌐 代理URL:', proxyUrl)
    
    const response = await fetch(proxyUrl, {
      method: 'GET',
      headers: {
        'Authorization': 'Basic ' + btoa(`${WEBDAV_CONFIG.username}:${WEBDAV_CONFIG.password}`),
        'User-Agent': 'ebook-to-mindmap/1.0'
      }
    })
    
    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer()
      console.log('✅ 代理下载成功，文件大小:', arrayBuffer.byteLength, '字节')
      return arrayBuffer
    } else {
      console.log('❌ 代理下载失败:', response.status, response.statusText)
      return null
    }
    
  } catch (error) {
    console.log('❌ 代理下载异常:', error.message)
    console.log('💡 请确保开发服务器正在运行 (npm run dev)')
    return null
  }
}

async function testDirectDownload(client, filePath) {
  console.log('\n=== 测试直接下载方法 ===')
  
  try {
    const fileContent = await client.getFileContents(filePath, { format: 'binary' })
    
    console.log('🔍 文件内容信息:')
    console.log(`   - 类型: ${typeof fileContent}`)
    console.log(`   - 构造函数: ${fileContent.constructor.name}`)
    console.log(`   - 长度: ${fileContent.length || fileContent.byteLength}`)
    
    return fileContent
    
  } catch (error) {
    console.log('❌ 直接下载失败:', error.message)
    if (error.message.includes('CORS')) {
      console.log('💡 这是预期的CORS错误，在开发环境中应该使用代理下载')
    }
    return null
  }
}

async function testWebDAVDownload() {
  console.log('=== WebDAV 文件下载测试 ===\n')
  
  try {
    // 创建 WebDAV 客户端
    console.log('🔗 连接 WebDAV 服务器...')
    const client = createClient(WEBDAV_CONFIG.url, {
      username: WEBDAV_CONFIG.username,
      password: WEBDAV_CONFIG.password
    })
    
    // 测试连接
    console.log('🔍 测试连接...')
    try {
      await client.getDirectoryContents('/')
      console.log('✅ WebDAV 连接成功')
    } catch (error) {
      console.error('❌ WebDAV 连接失败:', error.message)
      return
    }
    
    // 获取 EBooks 目录内容
    console.log('📚 获取 EBooks 目录内容...')
    const ebooksContent = await client.getDirectoryContents('/EBooks/')
    console.log(`📁 找到 ${ebooksContent.length} 个文件`)
    
    // 找到第一个 EPUB 文件
    const epubFile = ebooksContent.find(file => 
      file.type === 'file' && file.basename.toLowerCase().endsWith('.epub')
    )
    
    if (!epubFile) {
      console.log('❌ 未找到 EPUB 文件')
      return
    }
    
    console.log(`📖 找到 EPUB 文件: ${epubFile.basename}`)
    console.log(`📏 文件大小: ${epubFile.size} 字节`)
    
    // 测试两种下载方法
    let fileContent = null
    let downloadMethod = ''
    
    // 首先尝试代理下载（推荐方法）
    fileContent = await testProxyDownload(epubFile.filename)
    if (fileContent) {
      downloadMethod = '代理'
    } else {
      // 如果代理失败，尝试直接下载
      fileContent = await testDirectDownload(client, epubFile.filename)
      if (fileContent) {
        downloadMethod = '直接'
      }
    }
    
    if (!fileContent) {
      console.log('❌ 所有下载方法都失败了')
      return
    }
    
    // 保存文件
    console.log('\n💾 保存文件...')
    const downloadPath = path.join(TMP_DIR, `downloaded_${downloadMethod}_${epubFile.basename}`)
    
    let bufferToWrite
    if (fileContent instanceof ArrayBuffer) {
      bufferToWrite = Buffer.from(fileContent)
    } else if (fileContent instanceof Uint8Array) {
      bufferToWrite = Buffer.from(fileContent)
    } else if (typeof fileContent === 'string') {
      bufferToWrite = Buffer.from(fileContent, 'base64')
    } else {
      bufferToWrite = Buffer.from(fileContent)
    }
    
    fs.writeFileSync(downloadPath, bufferToWrite)
    console.log(`✅ 文件下载成功: ${downloadPath}`)
    console.log(`📏 本地文件大小: ${fs.statSync(downloadPath).size} 字节`)
    
    // 验证 EPUB 文件格式
    console.log('🔍 验证 EPUB 文件格式...')
    const fileBuffer = fs.readFileSync(downloadPath)
    const header = fileBuffer.slice(0, 4).toString('hex')
    console.log(`   - 文件头部: ${header}`)
    
    if (header === '504b0304') {
      console.log('✅ 文件格式正确 (ZIP/EPUB)')
    } else {
      console.log('❌ 文件格式不正确，可能是下载不完整')
    }
    
    // 比较文件大小
    const originalSize = epubFile.size
    const downloadedSize = fs.statSync(downloadPath).size
    console.log(`📊 文件大小对比:`)
    console.log(`   - 原始大小: ${originalSize} 字节`)
    console.log(`   - 下载大小: ${downloadedSize} 字节`)
    
    if (originalSize === downloadedSize) {
      console.log('✅ 文件大小匹配')
    } else {
      console.log('⚠️ 文件大小不匹配，可能下载不完整')
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message)
  }
}

console.log('⚠️ 请先修改脚本中的 WebDAV 配置信息（用户名和密码）')
console.log('然后运行: node test/webdav-download-test.mjs\n')
console.log('💡 测试代理下载方法前，请先启动开发服务器: npm run dev\n')

// 如果配置了正确的用户名密码，取消下面的注释
// testWebDAVDownload()
