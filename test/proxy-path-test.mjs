// 代理路径测试
// 验证WebDAV请求的路径映射是否正确

const testProxyPaths = async () => {
  console.log('测试代理路径映射...\n');
  
  const testPaths = [
    '/webdav/',
    '/webdav/test.txt',
    '/webdav/folder/subfolder/'
  ];
  
  for (const path of testPaths) {
    try {
      console.log(`测试路径: ${path}`);
      
      const response = await fetch(`http://localhost:5174${path}`, {
        method: 'OPTIONS',
        headers: {
          'Origin': 'http://localhost:5174',
          'Access-Control-Request-Method': 'PROPFIND',
          'Access-Control-Request-Headers': 'Authorization'
        }
      });
      
      console.log(`  响应状态: ${response.status}`);
      console.log(`  CORS头: ${response.headers.get('Access-Control-Allow-Origin')}`);
      
      if (response.ok) {
        console.log('  ✅ 路径正常');
      } else {
        console.log('  ❌ 路径有问题');
      }
      console.log('');
      
    } catch (error) {
      console.error(`  ❌ 请求失败: ${error.message}\n`);
    }
  }
};

testProxyPaths();
