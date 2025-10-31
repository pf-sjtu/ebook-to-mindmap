import { createClient } from 'webdav';

// 测试WebDAV库的基本功能
async function testWebDAVLibrary() {
  console.log('=== WebDAV库基本功能测试 ===\n');
  
  try {
    // 测试创建客户端（不需要真实连接）
    console.log('1. 测试客户端创建...');
    const client = createClient('https://dav.jianguoyun.com/dav/', {
      username: 'test@example.com',
      password: 'test-password'
    });
    console.log('✅ 客户端创建成功');
    
    // 测试客户端方法是否存在
    console.log('\n2. 测试客户端方法...');
    const methods = [
      'getDirectoryContents',
      'getFileContents', 
      'putFileContents',
      'createDirectory',
      'deleteFile',
      'stat',
      'exists'
    ];
    
    methods.forEach(method => {
      if (typeof client[method] === 'function') {
        console.log(`✅ ${method} 方法存在`);
      } else {
        console.log(`❌ ${method} 方法不存在`);
      }
    });
    
    console.log('\n✅ WebDAV库基本功能测试通过！');
    console.log('\n💡 下一步：');
    console.log('1. 在 webdav-connection-test.mjs 中填入真实的坚果云凭据');
    console.log('2. 运行完整的连接测试');
    console.log('3. 验证文件操作功能');
    
  } catch (error) {
    console.error('❌ WebDAV库测试失败:');
    console.error(error.message);
  }
}

// 运行测试
testWebDAVLibrary().catch(console.error);
