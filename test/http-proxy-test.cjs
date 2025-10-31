#!/usr/bin/env node

/**
 * 使用 http 模块测试代理
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { HttpsProxyAgent } = require('https-proxy-agent');

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

// 使用 https 模块测试代理
function testGeminiWithHttpsProxy() {
  return new Promise((resolve) => {
    console.log('\n🧪 测试 HTTPS 模块 + 代理');
    
    const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
    if (!proxyUrl) {
      console.log('❌ 未设置代理环境变量');
      resolve(false);
      return;
    }
    
    console.log('🔧 使用代理:', proxyUrl);
    console.log('🔧 请求模型:', process.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash');
    
    const agent = new HttpsProxyAgent(proxyUrl);
    
    const postData = JSON.stringify({
      contents: [{
        parts: [{
          text: "What is your exact model name and version? Please be specific."
        }]
      }]
    });
    
    const options = {
      hostname: 'generativelanguage.googleapis.com',
      port: 443,
      path: `/v1beta/models/${process.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash'}:generateContent?key=${process.env.VITE_GEMINI_API_KEY}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      agent: agent
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const response = JSON.parse(data);
            console.log('✅ HTTPS 模块代理测试成功');
            console.log('📝 响应:', response.candidates?.[0]?.content?.parts?.[0]?.text || '无响应内容');
            resolve(true);
          } catch (e) {
            console.log('❌ 响应解析失败');
            console.log('📝 原始响应:', data);
            resolve(false);
          }
        } else {
          console.log('❌ HTTPS 模块代理测试失败');
          console.log('📊 状态码:', res.statusCode);
          console.log('📝 错误信息:', data);
          
          if (data.includes('User location is not supported')) {
            console.log('💡 提示: 代理可能未生效，仍然检测到中国地区');
          }
          
          resolve(false);
        }
      });
    });
    
    req.on('error', (error) => {
      console.log('❌ HTTPS 模块代理测试异常');
      console.log('📝 错误信息:', error.message);
      resolve(false);
    });
    
    req.write(postData);
    req.end();
  });
}

// 测试基础连接
function testBasicConnection() {
  return new Promise((resolve) => {
    console.log('\n🧪 测试基础 HTTPS 连接（通过代理）');
    
    const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
    const agent = new HttpsProxyAgent(proxyUrl);
    
    const options = {
      hostname: 'httpbin.org',
      port: 443,
      path: '/ip',
      method: 'GET',
      agent: agent
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const response = JSON.parse(data);
            console.log('✅ 基础连接测试成功');
            console.log('📝 当前 IP:', response.origin);
            resolve(true);
          } catch (e) {
            console.log('❌ 响应解析失败');
            resolve(false);
          }
        } else {
          console.log('❌ 基础连接测试失败');
          console.log('📊 状态码:', res.statusCode);
          resolve(false);
        }
      });
    });
    
    req.on('error', (error) => {
      console.log('❌ 基础连接测试异常');
      console.log('📝 错误信息:', error.message);
      resolve(false);
    });
    
    req.end();
  });
}

async function main() {
  console.log('🚀 开始 HTTPS 模块代理测试');
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
  
  // 测试基础连接
  results.basic = await testBasicConnection();
  
  // 测试 Gemini API
  results.gemini = await testGeminiWithHttpsProxy();
  
  // 显示结果
  console.log('\n' + '='.repeat(50));
  console.log('📊 测试结果摘要');
  console.log('='.repeat(50));
  
  Object.entries(results).forEach(([method, success]) => {
    const status = success ? '✅ 成功' : '❌ 失败';
    const methodName = {
      basic: '基础 HTTPS 连接',
      gemini: 'Gemini API 连接'
    }[method] || method;
    console.log(`${status} - ${methodName}`);
  });
  
  if (results.gemini) {
    console.log('\n🎉 恭喜！Gemini API 代理测试成功！');
    console.log('💡 可以使用 https-proxy-agent 方案');
  } else {
    console.log('\n😞 代理测试失败');
  }
}

main().catch(console.error);
