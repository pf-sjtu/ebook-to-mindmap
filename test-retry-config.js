// 测试重试配置的简单脚本
// 在浏览器控制台中运行此脚本来验证配置

console.log('=== 测试AI服务重试配置 ===');

// 获取当前的配置store
const store = window.useConfigStore?.getState?.();
if (store) {
  console.log('当前AI服务选项:', store.aiServiceOptions);
  console.log('最大重试次数:', store.aiServiceOptions.maxRetries);
  console.log('基础重试延迟 (毫秒):', store.aiServiceOptions.baseRetryDelay);
  console.log('基础重试延迟 (秒):', store.aiServiceOptions.baseRetryDelay / 1000);
} else {
  console.log('无法获取配置store，请确保应用已加载');
}

// 测试AIService实例
console.log('\n=== 测试AIService实例 ===');
// 模拟创建AIService实例来测试配置
const testConfig = {
  provider: 'openai',
  apiKey: 'test-key',
  apiUrl: 'https://api.openai.com/v1',
  model: 'gpt-3.5-turbo',
  temperature: 0.7
};

const testOptions = {
  maxRetries: 3,
  baseRetryDelay: 60000 // 60秒
};

console.log('测试配置:', testOptions);
console.log('预期等待时间: 60秒');

// 如果AIService在全局作用域中可用
if (window.AIService) {
  const testService = new window.AIService(testConfig, undefined, testOptions);
  console.log('AIService实例配置:');
  console.log('- maxRetries:', testService.maxRetries);
  console.log('- baseRetryDelay:', testService.baseRetryDelay, '毫秒');
  console.log('- baseRetryDelay:', testService.baseRetryDelay / 1000, '秒');
} else {
  console.log('AIService不在全局作用域中');
}

console.log('\n=== 配置验证完成 ===');
