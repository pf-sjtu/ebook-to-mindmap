import { webdavService } from '../src/services/webdavService.js'
import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// 加载环境变量
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
config({ path: join(__dirname, '..', '.env') })

// 测试配置
const testConfig = {
  enabled: true,
  serverUrl: process.env.VITE_WEBDAV_URL || 'https://dav.jianguoyun.com/dav/',
  username: process.env.VITE_WEBDAV_USERNAME || '',
  password: process.env.VITE_WEBDAV_PASSWORD || '',
  appName: process.env.VITE_WEBDAV_APP_NAME || 'fastReader_by_PF',
  autoSync: false,
  syncPath: '/fastReader',
  lastSyncTime: null,
  connectionStatus: 'disconnected'
}

// 测试WebDAV服务
async function testWebDAVService() {
  console.log('=== WebDAV服务封装类测试 ===\n')
  
  try {
    // 1. 测试初始化
    console.log('1. 测试WebDAV服务初始化...')
    const initResult = await webdavService.initialize(testConfig)
    
    if (!initResult.success) {
      console.error('❌ 初始化失败:', initResult.error)
      return
    }
    console.log('✅ WebDAV服务初始化成功')
    
    // 2. 测试连接
    console.log('\n2. 测试连接状态...')
    const connectionResult = await webdavService.testConnection()
    
    if (!connectionResult.success) {
      console.error('❌ 连接测试失败:', connectionResult.error)
      return
    }
    console.log('✅ WebDAV连接测试通过')
    
    // 3. 测试获取目录内容
    console.log('\n3. 测试获取目录内容...')
    const dirResult = await webdavService.getDirectoryContents('/')
    
    if (!dirResult.success) {
      console.error('❌ 获取目录内容失败:', dirResult.error)
      return
    }
    
    console.log(`✅ 根目录包含 ${dirResult.data?.length} 个项目:`)
    dirResult.data?.slice(0, 5).forEach((item, index) => {
      console.log(`  ${index + 1}. ${item.basename} (${item.type})`)
    })
    
    // 4. 测试获取支持的文件
    console.log('\n4. 测试获取支持的文件类型...')
    const filesResult = await webdavService.getSupportedFiles('/')
    
    if (!filesResult.success) {
      console.error('❌ 获取支持文件失败:', filesResult.error)
      return
    }
    
    console.log(`✅ 找到 ${filesResult.data?.length} 个支持的文件:`)
    filesResult.data?.forEach((file, index) => {
      console.log(`  ${index + 1}. ${file.basename} (${file.size} bytes)`)
    })
    
    // 5. 测试确保同步目录
    console.log('\n5. 测试确保同步目录存在...')
    const ensureDirResult = await webdavService.ensureSyncDirectory()
    
    if (!ensureDirResult.success) {
      console.error('❌ 确保同步目录失败:', ensureDirResult.error)
      return
    }
    console.log('✅ 同步目录已就绪')
    
    // 6. 测试文件操作
    console.log('\n6. 测试文件操作...')
    
    // 创建测试文件
    const testContent = `WebDAV服务测试文件\n创建时间: ${new Date().toISOString()}\n测试状态: 成功`
    const testFilePath = `${testConfig.syncPath}/service-test.txt`
    
    console.log('  上传测试文件...')
    const uploadResult = await webdavService.putFileContents(testFilePath, testContent)
    
    if (!uploadResult.success) {
      console.error('❌ 文件上传失败:', uploadResult.error)
      return
    }
    console.log('  ✅ 文件上传成功')
    
    // 获取文件信息
    console.log('  获取文件信息...')
    const statResult = await webdavService.getStat(testFilePath)
    
    if (!statResult.success) {
      console.error('❌ 获取文件信息失败:', statResult.error)
      return
    }
    console.log(`  ✅ 文件信息: ${statResult.data?.basename}, 大小: ${statResult.data?.size} bytes`)
    
    // 下载文件内容
    console.log('  下载文件内容...')
    const downloadResult = await webdavService.getFileContents(testFilePath, 'text')
    
    if (!downloadResult.success) {
      console.error('❌ 文件下载失败:', downloadResult.error)
      return
    }
    
    if (downloadResult.data === testContent) {
      console.log('  ✅ 文件内容验证成功')
    } else {
      console.log('  ❌ 文件内容不匹配')
    }
    
    // 7. 测试同步功能
    console.log('\n7. 测试文件同步功能...')
    const testFiles = [
      {
        name: 'test1.md',
        content: '# 测试Markdown文件\n\n这是第一个测试文件。',
        path: 'documents/test1.md'
      },
      {
        name: 'test2.txt',
        content: '这是第二个测试文件。\n包含中文内容。',
        path: 'documents/test2.txt'
      }
    ]
    
    const syncResult = await webdavService.syncFiles(testFiles, (progress) => {
      console.log(`  同步进度: ${Math.round(progress * 100)}%`)
    })
    
    if (!syncResult.success) {
      console.error('❌ 文件同步失败:', syncResult.error)
      return
    }
    console.log('  ✅ 文件同步成功')
    
    // 8. 清理测试文件
    console.log('\n8. 清理测试文件...')
    
    // 删除同步的文件
    for (const file of testFiles) {
      const filePath = `${testConfig.syncPath}/${file.path}`
      await webdavService.deleteFile(filePath)
    }
    
    // 删除测试文件
    await webdavService.deleteFile(testFilePath)
    console.log('✅ 测试文件清理完成')
    
    // 9. 测试服务状态
    console.log('\n9. 测试服务状态...')
    console.log(`  是否已初始化: ${webdavService.isInitialized()}`)
    console.log(`  配置信息: ${webdavService.getConfig()?.appName}`)
    
    console.log('\n🎉 所有WebDAV服务测试通过！')
    
    // 断开连接
    webdavService.disconnect()
    console.log('✅ WebDAV服务已断开连接')
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message)
  }
}

// 运行测试
testWebDAVService().catch(console.error)
