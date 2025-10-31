// 路径处理测试
// 验证各种路径格式的转换逻辑

function normalizePath(path) {
  let newPath = path
  
  // 处理各种可能的路径格式
  if (newPath.startsWith('http://localhost:5174/dav/')) {
    newPath = newPath.replace('http://localhost:5174/dav/', '/')
  } else if (newPath.startsWith('https://dav.jianguoyun.com/dav/')) {
    newPath = newPath.replace('https://dav.jianguoyun.com/dav/', '/')
  } else if (newPath.startsWith('/../dav/')) {
    newPath = newPath.replace('/../dav/', '/')
  }
  
  // 确保路径以 / 开头和结尾
  if (!newPath.startsWith('/')) {
    newPath = '/' + newPath
  }
  if (!newPath.endsWith('/')) {
    newPath = newPath + '/'
  }
  
  return newPath
}

// 测试各种路径格式
const testPaths = [
  '/../dav/fastReader',
  'http://localhost:5174/dav/anx',
  'https://dav.jianguoyun.com/dav/cherry-studio',
  'fastReader',
  '/fastReader',
  '/fastReader/',
  '../dav/test'
]

console.log('=== 路径处理测试 ===\n')

testPaths.forEach((path, index) => {
  const normalized = normalizePath(path)
  console.log(`${index + 1}. 原始路径: ${path}`)
  console.log(`   处理后: ${normalized}`)
  console.log('')
})
