import { createClient } from 'webdav';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 加载环境变量（从项目根目录）
config({ path: join(__dirname, '..', '.env') });

// 从环境变量读取WebDAV配置
const webdavConfig = {
  url: process.env.VITE_WEBDAV_URL || 'https://dav.jianguoyun.com/dav/',
  username: process.env.VITE_WEBDAV_USERNAME || '',
  password: process.env.VITE_WEBDAV_PASSWORD || '',
  appName: process.env.VITE_WEBDAV_APP_NAME || 'fastReader_by_PF'
};

// 测试WebDAV连接
async function testWebDAVConnection(config) {
  console.log('=== WebDAV环境变量测试 ===\n');
  console.log(`应用名称: ${config.appName}`);
  console.log(`服务器地址: ${config.url}`);
  console.log(`账户: ${config.username || '未设置'}`);
  console.log(`密码: ${config.password ? '已设置' : '未设置'}\n`);
  
  if (!config.username || !config.password) {
    console.error('❌ 错误: WebDAV配置不完整');
    console.log('请在.env文件中设置以下环境变量:');
    console.log('- VITE_WEBDAV_USERNAME: 坚果云账户邮箱');
    console.log('- VITE_WEBDAV_PASSWORD: 坚果云应用密码');
    return false;
  }
  
  try {
    console.log('正在连接到WebDAV服务器...');
    
    // 创建WebDAV客户端
    const client = createClient(config.url, {
      username: config.username,
      password: config.password
    });

    // 测试连接 - 获取根目录内容
    console.log('正在获取根目录内容...');
    const directoryContents = await client.getDirectoryContents('/');
    
    console.log('✅ 连接成功！');
    console.log(`根目录包含 ${directoryContents.length} 个项目:`);
    
    // 显示前10个项目，避免输出过多
    const displayItems = directoryContents.slice(0, 10);
    displayItems.forEach((item, index) => {
      const sizeInfo = item.type === 'file' ? `${item.size} bytes` : '目录';
      console.log(`  ${index + 1}. ${item.basename} (${item.type}) - ${sizeInfo}`);
    });
    
    if (directoryContents.length > 10) {
      console.log(`  ... 还有 ${directoryContents.length - 10} 个项目`);
    }

    // 测试fastReader目录
    console.log('\n检查fastReader目录...');
    const fastReaderExists = await client.exists('/fastReader');
    if (fastReaderExists) {
      console.log('✅ fastReader目录已存在');
      const fastReaderContents = await client.getDirectoryContents('/fastReader');
      console.log(`fastReader目录包含 ${fastReaderContents.length} 个项目`);
    } else {
      console.log('ℹ️ fastReader目录不存在，将在首次使用时创建');
    }

    return {
      success: true,
      client: client,
      directoryContents: directoryContents
    };
    
  } catch (error) {
    console.error('❌ 连接失败:');
    console.error(`错误类型: ${error.name}`);
    console.error(`错误信息: ${error.message}`);
    
    // 提供具体的错误解决建议
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      console.log('\n💡 解决建议:');
      console.log('1. 检查邮箱地址是否正确');
      console.log('2. 确认使用的是应用密码，不是登录密码');
      console.log('3. 重新生成应用密码');
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('Network')) {
      console.log('\n💡 解决建议:');
      console.log('1. 检查网络连接');
      console.log('2. 确认服务器地址正确');
      console.log('3. 检查防火墙设置');
    }
    
    return {
      success: false,
      error: error
    };
  }
}

// 测试文件操作
async function testBasicFileOperations(client) {
  console.log('\n=== 基本文件操作测试 ===\n');
  
  try {
    // 确保fastReader目录存在
    const fastReaderExists = await client.exists('/fastReader');
    if (!fastReaderExists) {
      console.log('创建fastReader目录...');
      await client.createDirectory('/fastReader');
      console.log('✅ fastReader目录创建成功');
    }

    // 创建测试子目录
    const testDirPath = '/fastReader/test-temp';
    console.log(`创建测试目录: ${testDirPath}`);
    
    try {
      await client.createDirectory(testDirPath);
      console.log('✅ 测试目录创建成功');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️ 测试目录已存在，清理后重新创建...');
        await client.deleteDirectory(testDirPath);
        await client.createDirectory(testDirPath);
        console.log('✅ 测试目录重新创建成功');
      } else {
        throw error;
      }
    }

    // 上传测试文件
    const testFilePath = `${testDirPath}/connection-test.txt`;
    const testContent = `WebDAV连接测试文件\n应用名称: fastReader_by_PF\n测试时间: ${new Date().toLocaleString('zh-CN')}\n测试状态: 成功`;
    
    console.log(`上传测试文件: ${testFilePath}`);
    const uploadResult = await client.putFileContents(testFilePath, testContent, { overwrite: true });
    
    if (uploadResult) {
      console.log('✅ 文件上传成功');
    } else {
      console.log('❌ 文件上传失败');
      return false;
    }

    // 获取文件信息
    console.log('获取文件信息...');
    const fileStat = await client.stat(testFilePath);
    console.log(`✅ 文件信息: ${fileStat.basename}, 大小: ${fileStat.size} bytes, 修改时间: ${fileStat.lastmod}`);

    // 下载并验证文件内容
    console.log('下载文件内容...');
    const downloadedContent = await client.getFileContents(testFilePath, { format: 'text' });
    
    if (downloadedContent === testContent) {
      console.log('✅ 文件内容验证成功');
    } else {
      console.log('❌ 文件内容不匹配');
      console.log('原始内容:', testContent);
      console.log('下载内容:', downloadedContent);
      return false;
    }

    // 清理测试文件和目录
    console.log('清理测试文件...');
    await client.deleteFile(testFilePath);
    console.log('✅ 测试文件删除成功');

    // 删除目录 - 使用deleteFile方法删除目录
    await client.deleteFile(testDirPath);
    console.log('✅ 测试目录删除成功');

    console.log('\n🎉 所有基本文件操作测试通过！');
    return true;
    
  } catch (error) {
    console.error('❌ 文件操作测试失败:');
    console.error(`错误类型: ${error.name}`);
    console.error(`错误信息: ${error.message}`);
    return false;
  }
}

// 主函数
async function main() {
  console.log('开始WebDAV环境变量测试...\n');
  
  // 测试连接
  const connectionResult = await testWebDAVConnection(webdavConfig);
  
  if (connectionResult.success) {
    // 测试文件操作
    const operationResult = await testBasicFileOperations(connectionResult.client);
    
    if (operationResult) {
      console.log('\n🎉 🎉 🎉 所有测试通过！WebDAV功能正常工作！');
      console.log('\n✅ 可以继续进行第二阶段：核心功能实现');
    } else {
      console.log('\n❌ 文件操作测试失败，请检查问题后重试');
    }
  } else {
    console.log('\n❌ 连接测试失败，请检查配置后重试');
  }
}

// 运行测试
main().catch(console.error);
