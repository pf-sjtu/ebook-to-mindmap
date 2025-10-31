// WebDAV代理连接测试脚本
// 使用Vite代理测试WebDAV连接

import { createClient } from 'webdav';

// 使用代理的WebDAV配置
const PROXY_CONFIG = {
  url: 'http://localhost:5174/webdav/', // 使用代理URL
  username: '', // 需要填入坚果云账户邮箱
  password: ''  // 需要填入应用密码
};

// 测试WebDAV连接
async function testWebDAVConnection(config) {
  console.log('开始测试WebDAV代理连接...');
  console.log(`代理服务器地址: ${config.url}`);
  
  try {
    // 创建WebDAV客户端
    const client = createClient(config.url, {
      username: config.username,
      password: config.password
    });

    // 测试连接 - 获取根目录内容
    console.log('正在获取根目录内容...');
    const directoryContents = await client.getDirectoryContents('/');
    
    console.log('✅ 代理连接成功！');
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
    console.error('❌ 代理连接失败:');
    console.error(`错误类型: ${error.name}`);
    console.error(`错误信息: ${error.message}`);
    
    return {
      success: false,
      error: error
    };
  }
}

// 主函数
async function main() {
  console.log('=== WebDAV代理连接测试 ===\n');
  
  // 检查配置
  if (!PROXY_CONFIG.username || !PROXY_CONFIG.password) {
    console.error('❌ 错误: 请在脚本中填入坚果云账户信息');
    console.log('需要设置:');
    console.log('- username: 坚果云账户邮箱');
    console.log('- password: 坚果云应用密码（在账户安全选项中生成）');
    return;
  }

  // 测试代理连接
  const connectionResult = await testWebDAVConnection(PROXY_CONFIG);
  
  if (connectionResult.success) {
    console.log('\n🎉 代理配置测试通过！现在可以在应用中正常使用WebDAV功能。');
  } else {
    console.log('\n💡 代理连接失败可能的原因:');
    console.log('1. Vite开发服务器未启动或代理配置错误');
    console.log('2. 用户名或密码错误');
    console.log('3. 应用密码未正确生成');
    console.log('4. 坚果云WebDAV服务问题');
  }
}

// 运行测试
main().catch(console.error);
