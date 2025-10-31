#!/usr/bin/env node

import fs from 'fs'
import path from 'path'

// 创建 tmp 目录
const TMP_DIR = path.join(process.cwd(), 'tmp')
if (!fs.existsSync(TMP_DIR)) {
  fs.mkdirSync(TMP_DIR, { recursive: true })
  console.log('✅ 创建 tmp 目录:', TMP_DIR)
}

async function testWebDAVDownload() {
  console.log('=== WebDAV 简单下载测试 ===\n')
  
  // WebDAV 配置 - 请根据实际情况修改
  const username = 'your_username'  // 需要替换为实际用户名
  const password = 'your_password'  // 需要替换为实际密码
  const filePath = '/EBooks/%E9%94%99%E8%AF%AF.epub'  // 测试文件路径（URL编码）
  
  if (username === 'your_username' || password === 'your_password') {
    console.log('❌ 请先修改脚本中的用户名和密码')
    return
  }
  
  try {
    console.log('🔗 尝试下载文件:', filePath)
    
    // 使用 fetch 直接下载
    const response = await fetch(`https://dav.jianguoyun.com/dav${filePath}`, {
      method: 'GET',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(username + ':' + password).toString('base64')
      }
    })
    
    console.log('📊 响应状态:', response.status, response.statusText)
    console.log('📊 响应头:')
    response.headers.forEach((value, key) => {
      console.log(`   ${key}: ${value}`)
    })
    
    if (!response.ok) {
      console.error('❌ 下载失败:', response.statusText)
      return
    }
    
    // 获取文件内容
    const arrayBuffer = await response.arrayBuffer()
    console.log('📏 下载大小:', arrayBuffer.byteLength, '字节')
    
    // 保存文件
    const fileName = path.basename(filePath)
    const downloadPath = path.join(TMP_DIR, 'downloaded-' + fileName)
    
    const buffer = Buffer.from(arrayBuffer)
    fs.writeFileSync(downloadPath, buffer)
    
    console.log('✅ 文件保存成功:', downloadPath)
    console.log('📏 本地文件大小:', fs.statSync(downloadPath).size, '字节')
    
    // 验证文件格式
    const fileBuffer = fs.readFileSync(downloadPath)
    const header = fileBuffer.slice(0, 4).toString('hex')
    console.log('🔍 文件头部:', header)
    
    if (header === '504b0304') {
      console.log('✅ 文件格式正确 (ZIP/EPUB)')
    } else {
      console.log('❌ 文件格式不正确，可能是错误页面或其他内容')
      
      // 查看文件前100字节的内容
      const preview = fileBuffer.slice(0, 100).toString('utf8', 0, 100)
      console.log('📄 文件预览:', preview)
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message)
  }
}

console.log('⚠️ 请先修改脚本中的 WebDAV 用户名和密码')
console.log('然后运行: node test/webdav-simple-download.mjs\n')

// 如果配置了正确的用户名密码，取消下面的注释
// testWebDAVDownload()
