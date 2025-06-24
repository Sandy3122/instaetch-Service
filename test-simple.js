#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

async function testBackend() {
  console.log('🧪 Testing InstaFetch Backend');
  console.log('=' .repeat(40));
  
  try {
    // Test 1: Health check
    console.log('1. Testing health check...');
    const health = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health check passed:', health.data.status);
    
    // Test 2: Cloudflare token
    console.log('\n2. Testing Cloudflare token endpoint...');
    const cfResponse = await axios.post(`${BASE_URL}/cf`, {
      cfToken: 'test-token-123'
    });
    console.log('✅ CF token generated:', cfResponse.data.result);
    
    // Test 3: Millisecond timestamp
    console.log('\n3. Testing millisecond timestamp...');
    const msecResponse = await axios.get(`${BASE_URL}/msec`);
    console.log('✅ Timestamp generated:', msecResponse.data.msec);
    
    // Test 4: API documentation
    console.log('\n4. Testing API documentation...');
    const docsResponse = await axios.get(`${BASE_URL}/docs`);
    console.log('✅ Documentation available:', docsResponse.data.endpoints.length, 'endpoints');
    
    // Test 5: Cache stats
    console.log('\n5. Testing cache stats...');
    const cacheResponse = await axios.get(`${BASE_URL}/cache/stats`);
    console.log('✅ Cache stats:', cacheResponse.data.cache);
    
    console.log('\n🎉 All basic tests passed!');
    console.log('\n📝 Next steps:');
    console.log('- Test with real Instagram usernames');
    console.log('- Test media conversion with real Instagram URLs');
    console.log('- Monitor rate limits and caching behavior');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

// Run the test
testBackend(); 