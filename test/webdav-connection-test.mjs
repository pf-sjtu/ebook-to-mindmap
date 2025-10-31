import { createClient } from 'webdav';

// 坚果云WebDAV配置
const JIANGUOYUN_CONFIG = {
  url: 'https://dav.jianguoyun.com/dav/',
  username: '', // 需要填入坚果云账户邮箱
  password: ''  // 需要填入应用密码
};

// 测试WebDAV连接
async function testWebDAVConnection(config) {
  console.log('开始测试WebDAV连接...');
  console.log(`服务器地址: ${config.url}`);
  
  try {
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
    
    directoryContents.forEach((item, index) => {
      console.log(`  ${index + 1}. ${item.basename} (${item.type}) - ${item.size} bytes`);
    });

    return {
      success: true,
      client: client,
      directoryContents: directoryContents
    };
    
  } catch (error) {
    console.error('❌ 连接失败:');
    console.error(`错误类型: ${error.name}`);
    console.error(`错误信息: ${error.message}`);
    
    return {
      success: false,
      error: error
    };
  }
}

// 测试文件操作
async function testFileOperations(client) {
  console.log('\n开始测试文件操作...');
  
  try {
    // 创建测试目录
    const testDirPath = '/fastReader-test';
    console.log(`创建测试目录: ${testDirPath}`);
    
    try {
      await client.createDirectory(testDirPath);
      console.log('✅ 测试目录创建成功');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️ 测试目录已存在');
      } else {
        throw error;
      }
    }

    // 上传测试文件
    const testFilePath = `${testDirPath}/test-file.txt`;
    const testContent = `这是一个测试文件\n创建时间: ${new Date().toISOString()}\nWebDAV测试`;
    
    console.log(`上传测试文件: ${testFilePath}`);
    const uploadResult = await client.putFileContents(testFilePath, testContent);
    
    if (uploadResult) {
      console.log('✅ 文件上传成功');
    } else {
      console.log('❌ 文件上传失败');
      return;
    }

    // 获取文件信息
    console.log('获取文件信息...');
    const fileStat = await client.stat(testFilePath);
    console.log(`✅ 文件信息: ${fileStat.basename}, 大小: ${fileStat.size} bytes`);

    // 下载文件内容
    console.log('下载文件内容...');
    const downloadedContent = await client.getFileContents(testFilePath, { format: 'text' });
    console.log('✅ 文件下载成功');
    console.log('文件内容:');
    console.log(downloadedContent);

    // 列出测试目录内容
    console.log('列出测试目录内容...');
    const testDirContents = await client.getDirectoryContents(testDirPath);
    console.log(`✅ 测试目录包含 ${testDirContents.length} 个项目:`);
    testDirContents.forEach((item, index) => {
      console.log(`  ${index + 1}. ${item.basename} (${item.type})`);
    });

    // 清理测试文件
    console.log('清理测试文件...');
    await client.deleteFile(testFilePath);
    console.log('✅ 测试文件删除成功');

    // 清理测试目录
    await client.deleteDirectory(testDirPath);
    console.log('✅ 测试目录删除成功');

    console.log('\n🎉 所有文件操作测试通过！');
    
  } catch (error) {
    console.error('❌ 文件操作测试失败:');
    console.error(`错误类型: ${error.name}`);
    console.error(`错误信息: ${error.message}`);
  }
}

// 主函数
async function main() {
  console.log('=== WebDAV连接和功能测试 ===\n');
  
  // 检查配置
  if (!JIANGUOYUN_CONFIG.username || !JIANGUOYUN_CONFIG.password) {
    console.error('❌ 错误: 请在脚本中填入坚果云账户信息');
    console.log('需要设置:');
    console.log('- username: 坚果云账户邮箱');
    console.log('- password: 坚果云应用密码（在账户安全选项中生成）');
    return;
  }

  // 测试连接
  const connectionResult = await testWebDAVConnection(JIANGUOYUN_CONFIG);
  
  if (connectionResult.success) {
    // 测试文件操作
    await testFileOperations(connectionResult.client);
  } else {
    console.log('\n💡 连接失败可能的原因:');
    console.log('1. 用户名或密码错误');
    console.log('2. 应用密码未正确生成（需要在坚果云安全选项中生成）');
    console.log('3. 网络连接问题');
    console.log('4. 坚果云WebDAV服务暂时不可用');
  }
}

// 运行测试
main().catch(console.error);
