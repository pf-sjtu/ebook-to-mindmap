#!/usr/bin/env node

/**
 * 简单代理连接测试
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
  }
}

// 测试基础 HTTP 请求通过代理
async function testBasicProxy() {
  console.log('\n🧪 测试基础 HTTP 代理连接');
  
  try {
    const { HttpsProxyAgent } = await import('https-proxy-agent');
    const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
    
    if (!proxyUrl) {
      console.log('❌ 未设置代理环境变量');
      return false;
    }
    
    console.log('🔧 使用代理:', proxyUrl);
    const agent = new HttpsProxyAgent(proxyUrl);
    
    // 测试访问一个简单的 HTTP 服务
    const response = await fetch('https://httpbin.org/ip', {
      agent: agent,
      method: 'GET',
      headers: {
        'User-Agent': 'proxy-test/1.0'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ 代理连接成功');
      console.log('📝 当前 IP:', data.origin);
      return true;
    } else {
      console.log('❌ 代理连接失败');
      console.log('📊 状态码:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ 代理连接异常');
    console.log('📝 错误信息:', error.message);
    return false;
  }
}

// 测试 undici 代理
async function testUndiciProxy() {
  console.log('\n🧪 测试 undici 代理连接');
  
  try {
    const { EnvHttpProxyAgent } = await import('undici');
    
    console.log('🔧 创建 EnvHttpProxyAgent');
    const agent = new EnvHttpProxyAgent();
    
    // 测试访问一个简单的 HTTP 服务
    const response = await fetch('https://httpbin.org/ip', {
      dispatcher: agent,
      method: 'GET',
      headers: {
        'User-Agent': 'undici-proxy-test/1.0'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ undici 代理连接成功');
      console.log('📝 当前 IP:', data.origin);
      return true;
    } else {
      console.log('❌ undici 代理连接失败');
      console.log('📊 状态码:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ undici 代理连接异常');
    console.log('📝 错误信息:', error.message);
    return false;
  }
}

// 测试 Gemini API 通过代理
async function testGeminiWithProxy(agent) {
  console.log('\n🧪 测试 Gemini API 通过代理');
  
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${process.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash'}:generateContent?key=${process.env.VITE_GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: "Proxy test successful! Please respond with 'API works through proxy!'"
          }]
        }]
      }),
      ...agent
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Gemini API 代理测试成功');
      console.log('📝 响应:', data.candidates?.[0]?.content?.parts?.[0]?.text || '无响应内容');
      return true;
    } else {
      console.log('❌ Gemini API 代理测试失败');
      console.log('📊 状态码:', response.status);
      const errorText = await response.text();
      console.log('📝 错误信息:', errorText);
      
      // 分析错误类型
      if (errorText.includes('User location is not supported')) {
        console.log('💡 提示: 代理可能未生效，仍然检测到中国地区');
      } else if (errorText.includes('API key')) {
        console.log('💡 提示: API Key 可能无效');
      }
      
      return false;
    }
  } catch (error) {
    console.log('❌ Gemini API 代理测试异常');
    console.log('📝 错误信息:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 开始简单代理测试');
  console.log('='.repeat(50));
  
  loadEnv();
  
  console.log('\n📋 当前代理配置:');
  console.log(`HTTP_PROXY: ${process.env.HTTP_PROXY || '未设置'}`);
  console.log(`HTTPS_PROXY: ${process.env.HTTPS_PROXY || '未设置'}`);
  console.log(`GEMINI_API_KEY: ${process.env.VITE_GEMINI_API_KEY ? '已设置' : '未设置'}`);
  
  if (!process.env.VITE_GEMINI_API_KEY) {
    console.log('\n❌ 错误: 未设置 VITE_GEMINI_API_KEY');
    process.exit(1);
  }
  
  const results = {};
  
  // 测试基础代理连接
  results.basicProxy = await testBasicProxy();
  
  if (results.basicProxy) {
    // 如果基础代理工作，测试 undici
    results.undiciProxy = await testUndiciProxy();
    
    // 测试 Gemini API
    console.log('\n' + '='.repeat(50));
    console.log('🎯 开始 Gemini API 测试');
    console.log('='.repeat(50));
    
    // 使用 https-proxy-agent 测试 Gemini
    const { HttpsProxyAgent } = await import('https-proxy-agent');
    const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
    const agent = new HttpsProxyAgent(proxyUrl);
    
    results.httpsProxyGemini = await testGeminiWithProxy({ agent });
    
    // 如果 undici 工作，也用它测试
    if (results.undiciProxy) {
      const { EnvHttpProxyAgent } = await import('undici');
      const dispatcher = new EnvHttpProxyAgent();
      results.undiciGemini = await testGeminiWithProxy({ dispatcher });
    }
  }
  
  // 显示结果
  console.log('\n' + '='.repeat(50));
  console.log('📊 测试结果摘要');
  console.log('='.repeat(50));
  
  Object.entries(results).forEach(([method, success]) => {
    const status = success ? '✅ 成功' : '❌ 失败';
    const methodName = {
      basicProxy: '基础代理连接',
      undiciProxy: 'undici 代理连接',
      httpsProxyGemini: 'HTTPS代理 + Gemini',
      undiciGemini: 'undici代理 + Gemini'
    }[method] || method;
    console.log(`${status} - ${methodName}`);
  });
  
  const successCount = Object.values(results).filter(Boolean).length;
  console.log(`\n📈 总体结果: ${successCount}/${Object.keys(results).length} 个测试成功`);
  
  if (results.httpsProxyGemini || results.undiciGemini) {
    console.log('🎉 恭喜！Gemini API 代理测试成功！');
    if (results.undiciGemini) {
      console.log('💡 推荐使用 undici 方案');
    } else {
      console.log('💡 推荐使用 https-proxy-agent 方案');
    }
  } else {
    console.log('😞 代理测试失败，请检查代理配置');
  }
}

main().catch(console.error);
