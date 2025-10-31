#!/usr/bin/env node

/**
 * Gemini API 代理测试脚本
 * 用于验证不同代理配置下 Gemini API 的连接状态
 */

const fs = require('fs');
const path = require('path');

// 加载环境变量
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...values] = trimmed.split('=');
        if (key && values.length > 0) {
          process.env[key.trim()] = values.join('=').trim();
        }
      }
    });
    console.log('✅ 已加载 .env 文件');
  } else {
    console.log('⚠️  未找到 .env 文件');
  }
}

// 显示当前代理配置
function showProxyConfig() {
  console.log('\n📋 当前代理配置:');
  console.log(`HTTP_PROXY: ${process.env.HTTP_PROXY || '未设置'}`);
  console.log(`HTTPS_PROXY: ${process.env.HTTPS_PROXY || '未设置'}`);
  console.log(`NO_PROXY: ${process.env.NO_PROXY || '未设置'}`);
  console.log(`GEMINI_API_KEY: ${process.env.VITE_GEMINI_API_KEY ? '已设置' : '未设置'}`);
  console.log(`GEMINI_MODEL: ${process.env.VITE_GEMINI_MODEL || '未设置'}`);
}

// 测试方法1: 使用环境变量代理 (Node.js fetch)
async function testWithEnvProxy() {
  console.log('\n🧪 测试方法1: 环境变量代理 (Node.js fetch)');
  
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${process.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash'}:generateContent?key=${process.env.VITE_GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: "Hello, this is a proxy test. Please respond with 'Proxy works!'"
          }]
        }]
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ 环境变量代理测试成功');
      console.log('📝 响应:', data.candidates?.[0]?.content?.parts?.[0]?.text || '无响应内容');
      return true;
    } else {
      console.log('❌ 环境变量代理测试失败');
      console.log('📊 状态码:', response.status);
      console.log('📝 错误信息:', await response.text());
      return false;
    }
  } catch (error) {
    console.log('❌ 环境变量代理测试异常');
    console.log('📝 错误信息:', error.message);
    return false;
  }
}

// 测试方法2: 使用 undici EnvHttpProxyAgent
async function testWithUndici() {
  console.log('\n🧪 测试方法2: undici EnvHttpProxyAgent');
  
  try {
    // 动态导入 undici
    const { EnvHttpProxyAgent } = await import('undici');
    
    const agent = new EnvHttpProxyAgent();
    console.log('🔧 已创建 EnvHttpProxyAgent');
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${process.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash'}:generateContent?key=${process.env.VITE_GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: "Test with undici proxy agent. Respond with 'Undici proxy works!'"
          }]
        }]
      }),
      dispatcher: agent
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ undici 代理测试成功');
      console.log('📝 响应:', data.candidates?.[0]?.content?.parts?.[0]?.text || '无响应内容');
      return true;
    } else {
      console.log('❌ undici 代理测试失败');
      console.log('📊 状态码:', response.status);
      console.log('📝 错误信息:', await response.text());
      return false;
    }
  } catch (error) {
    console.log('❌ undici 代理测试异常');
    console.log('📝 错误信息:', error.message);
    if (error.message.includes('Cannot resolve module')) {
      console.log('💡 提示: 需要安装 undici - npm install undici');
    }
    return false;
  }
}

// 测试方法3: 使用 https-proxy-agent
async function testWithHttpsProxyAgent() {
  console.log('\n🧪 测试方法3: https-proxy-agent');
  
  try {
    // 动态导入 https-proxy-agent
    const { HttpsProxyAgent } = await import('https-proxy-agent');
    
    const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
    if (!proxyUrl) {
      console.log('⚠️  未设置代理环境变量，跳过此测试');
      return false;
    }
    
    const agent = new HttpsProxyAgent(proxyUrl);
    console.log('🔧 已创建 HttpsProxyAgent:', proxyUrl);
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${process.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash'}:generateContent?key=${process.env.VITE_GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: "Test with https-proxy-agent. Respond with 'HTTPS proxy agent works!'"
          }]
        }]
      }),
      agent: agent
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ https-proxy-agent 测试成功');
      console.log('📝 响应:', data.candidates?.[0]?.content?.parts?.[0]?.text || '无响应内容');
      return true;
    } else {
      console.log('❌ https-proxy-agent 测试失败');
      console.log('📊 状态码:', response.status);
      console.log('📝 错误信息:', await response.text());
      return false;
    }
  } catch (error) {
    console.log('❌ https-proxy-agent 测试异常');
    console.log('📝 错误信息:', error.message);
    if (error.message.includes('Cannot resolve module')) {
      console.log('💡 提示: 需要安装 https-proxy-agent - npm install https-proxy-agent');
    }
    return false;
  }
}

// 测试方法4: 使用 socks-proxy-agent
async function testWithSocksProxyAgent() {
  console.log('\n🧪 测试方法4: socks-proxy-agent');
  
  try {
    // 动态导入 socks-proxy-agent
    const { SocksProxyAgent } = await import('socks-proxy-agent');
    
    const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
    if (!proxyUrl || !proxyUrl.includes('socks')) {
      console.log('⚠️  未设置 SOCKS 代理环境变量，跳过此测试');
      return false;
    }
    
    const agent = new SocksProxyAgent(proxyUrl);
    console.log('🔧 已创建 SocksProxyAgent:', proxyUrl);
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${process.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash'}:generateContent?key=${process.env.VITE_GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: "Test with socks-proxy-agent. Respond with 'SOCKS proxy agent works!'"
          }]
        }]
      }),
      agent: agent
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ socks-proxy-agent 测试成功');
      console.log('📝 响应:', data.candidates?.[0]?.content?.parts?.[0]?.text || '无响应内容');
      return true;
    } else {
      console.log('❌ socks-proxy-agent 测试失败');
      console.log('📊 状态码:', response.status);
      console.log('📝 错误信息:', await response.text());
      return false;
    }
  } catch (error) {
    console.log('❌ socks-proxy-agent 测试异常');
    console.log('📝 错误信息:', error.message);
    if (error.message.includes('Cannot resolve module')) {
      console.log('💡 提示: 需要安装 socks-proxy-agent - npm install socks-proxy-agent');
    }
    return false;
  }
}

// 测试基础连接（无代理）
async function testDirectConnection() {
  console.log('\n🧪 测试方法0: 直接连接（无代理）');
  
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${process.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash'}:generateContent?key=${process.env.VITE_GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: "Direct connection test. Respond with 'Direct connection works!'"
          }]
        }]
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ 直接连接测试成功');
      console.log('📝 响应:', data.candidates?.[0]?.content?.parts?.[0]?.text || '无响应内容');
      return true;
    } else {
      console.log('❌ 直接连接测试失败');
      console.log('📊 状态码:', response.status);
      console.log('📝 错误信息:', await response.text());
      return false;
    }
  } catch (error) {
    console.log('❌ 直接连接测试异常');
    console.log('📝 错误信息:', error.message);
    return false;
  }
}

// 主测试函数
async function runTests() {
  console.log('🚀 开始 Gemini API 代理测试');
  console.log('='.repeat(50));
  
  // 加载环境变量
  loadEnv();
  
  // 显示配置
  showProxyConfig();
  
  // 检查 API Key
  if (!process.env.VITE_GEMINI_API_KEY) {
    console.log('\n❌ 错误: 未设置 VITE_GEMINI_API_KEY');
    console.log('💡 请在 .env 文件中设置有效的 Gemini API Key');
    process.exit(1);
  }
  
  const results = {};
  
  // 运行所有测试
  console.log('\n' + '='.repeat(50));
  console.log('🧪 开始执行测试');
  console.log('='.repeat(50));
  
  results.direct = await testDirectConnection();
  results.envProxy = await testWithEnvProxy();
  results.undici = await testWithUndici();
  results.httpsProxy = await testWithHttpsProxyAgent();
  results.socksProxy = await testWithSocksProxyAgent();
  
  // 显示测试结果摘要
  console.log('\n' + '='.repeat(50));
  console.log('📊 测试结果摘要');
  console.log('='.repeat(50));
  
  Object.entries(results).forEach(([method, success]) => {
    const status = success ? '✅ 成功' : '❌ 失败';
    const methodName = {
      direct: '直接连接',
      envProxy: '环境变量代理',
      undici: 'undici EnvHttpProxyAgent',
      httpsProxy: 'https-proxy-agent',
      socksProxy: 'socks-proxy-agent'
    }[method] || method;
    console.log(`${status} - ${methodName}`);
  });
  
  const successCount = Object.values(results).filter(Boolean).length;
  const totalCount = Object.keys(results).length;
  
  console.log(`\n📈 总体结果: ${successCount}/${totalCount} 个测试成功`);
  
  if (successCount > 0) {
    console.log('🎉 恭喜！已有可用的代理方案');
    
    // 推荐最佳方案
    if (results.undici) {
      console.log('💡 推荐方案: undici EnvHttpProxyAgent (现代且高效)');
    } else if (results.envProxy) {
      console.log('💡 推荐方案: 环境变量代理 (简单易用)');
    } else if (results.httpsProxy) {
      console.log('💡 推荐方案: https-proxy-agent (灵活可控)');
    }
  } else {
    console.log('😞 所有测试失败，请检查:');
    console.log('   1. 代理服务器是否正常运行');
    console.log('   2. 代理配置是否正确');
    console.log('   3. 网络连接是否正常');
    console.log('   4. API Key 是否有效');
  }
  
  console.log('\n🏁 测试完成');
}

// 运行测试
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  runTests,
  testDirectConnection,
  testWithEnvProxy,
  testWithUndici,
  testWithHttpsProxyAgent,
  testWithSocksProxyAgent
};
