// URL重写测试脚本
// 验证代理URL转换逻辑

function getProxiedUrl(originalUrl) {
  // 模拟开发环境
  const isDev = true;
  
  if (isDev) {
    // 如果是坚果云的URL，转换为代理URL
    if (originalUrl.includes('dav.jianguoyun.com')) {
      // 提取基础URL并转换为代理路径
      const url = new URL(originalUrl)
      // 如果路径以 /dav 开头，直接替换为 /webdav
      if (url.pathname.startsWith('/dav')) {
        return `/webdav${url.pathname.replace('/dav', '')}`
      }
      return `/webdav${url.pathname}`
    }
  }
  return originalUrl
}

// 测试不同的URL
const testUrls = [
  'https://dav.jianguoyun.com/dav/',
  'https://dav.jianguoyun.com/dav/test.txt',
  'https://dav.jianguoyun.com/dav/folder/subfolder/',
  'https://other-webdav.com/dav/',
  'https://dav.jianguoyun.com/otherpath/'
];

console.log('=== URL重写测试 ===\n');

testUrls.forEach((url, index) => {
  const proxiedUrl = getProxiedUrl(url);
  console.log(`${index + 1}. 原始URL: ${url}`);
  console.log(`   代理URL: ${proxiedUrl}`);
  console.log('');
});
