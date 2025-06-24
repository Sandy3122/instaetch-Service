const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

// Test configuration
const testConfig = {
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'InstaFetch-Test/1.0',
  },
};

// Test data
const testData = {
  username: 'instagram',
  url: 'https://www.instagram.com/p/CxYz123/', // Example URL
};

async function testEndpoint(endpoint, method = 'GET', data = null) {
  try {
    console.log(`\n🧪 Testing ${method} ${endpoint}`);
    
    const response = await axios({
      method,
      url: `${BASE_URL}${endpoint}`,
      data,
      ...testConfig,
    });
    
    console.log(`✅ Success: ${response.status}`);
    console.log(`📊 Response size: ${JSON.stringify(response.data).length} bytes`);
    
    if (response.data && typeof response.data === 'object') {
      const keys = Object.keys(response.data);
      console.log(`🔑 Response keys: ${keys.join(', ')}`);
    }
    
    return response.data;
  } catch (error) {
    console.log(`❌ Error: ${error.response?.status || error.code}`);
    if (error.response?.data) {
      console.log(`📝 Error details: ${JSON.stringify(error.response.data)}`);
    }
    return null;
  }
}

async function runTests() {
  console.log('🚀 Starting InstaFetch API Tests');
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log('=' .repeat(50));
  
  // Test 1: Health Check
  await testEndpoint('/health');
  
  // Test 2: API Documentation
  await testEndpoint('/docs');
  
  // Test 3: Cache Stats
  await testEndpoint('/cache/stats');
  
  // Test 4: Cloudflare Token (new endpoint)
  await testEndpoint('/cf', 'POST', {
    cfToken: '0.ZHIt0iLO3FIJTSkyvML8iOSkjbbR3O8arrdwmHg7du7fhm3UM7tKIcUycgrvhi2PC5-w_FVfXMmR15mxGBc8_i6H6cWUi6f6WA9JrfseOqUBOoAn-s4dbm2EkG2KBwnd1EXsHQOU-scJDGCJllkNXp-Zm2_9n4Q8NvbAq2Gqn2MkusqeBqkV8OdEcMtDFFa7hLFfSoWXiNh6AH85MiJvZ8XSpR6b1cEpNE0ZmzBDg3O5CQSkcP2AQLic7Er0gD70v3FeXr2fQxjwXBga-JPfblCEgCj5xyuSeQGKpOMrKVLkUnoW3N-0l_TAD94-irr2EefyCVNs9ZPJQJa8xybeKC7f19h70NBlHWfEhSN11Dg4pEMGGFIZXofz4RYNDZs2EoUyY-DQXUJSLysdkdufKr1cxIHj_IEtHADRxjPnNsJC5NXTriLhWgbbdG3h6o0zMagbMZHjmjAP_1s3IkEhc_DrjMS5dJIWN7aiQT0OV7LxuJSiK0qxIs240nTjxZQag1Ngb35UTG_Yc7_tilOGnJfMXCFhO8wOCwADihKaCy8HPzyaCElhF6goQaDcp_nLry5Y2abgB2mht4_bpzsBbusdwQ-STzBjoSg9CTXu4FzAPRO-3F7D65eQs64m-Ocnvr6phxVdoonk1X51SMk35nhDwp9IwzCrstzCPq80MFvrJm-cAyJG-6nsyrBNmD-T_rmoC-eDKJ5p7E4tTGv2qTqZRXcD2UcB6QCeEDfeuNw6-HZanZzNteYecn_BFXpkuyIuq2r5stgVp5dPslPGYuOIFHAmxxq4oV9Ltc33XS28TUPLBHKpTLbuQaDNH-JUflZYr3-qUP_5awcTCPY2RKUFSab2AjAOmhhVDMqCeN10pW7gLhil82CUHj21Im8pI4XeoCGrHA71x9YQ1tMLt2RSGDPgrz476KbWz4E2OeCjUrrRvDqbXmM0e2vHBvuXh3GEftmSAHEwpJBWDVxRxA.IaClkqMIIG5JuSGGF_awYQ.c464a69b8bd1e3a996d21a8271841fd6573a0f2d1410be64071d88a6adaa366a',
  });
  
  // Test 5: Millisecond Timestamp (new endpoint)
  await testEndpoint('/msec');
  
  // Test 6: Get User Info
  await testEndpoint('/v1/instagram/userInfo', 'POST', {
    username: testData.username,
  });
  
  // Test 7: Get User Posts
  await testEndpoint('/v1/instagram/postsV2', 'POST', {
    username: testData.username,
    maxId: '',
  });
  
  // Test 8: Convert Media (this might fail with example URL)
  await testEndpoint('/convert', 'POST', {
    url: testData.url,
    ts: Date.now(),
  });
  
  // Test 9: Get Stories
  await testEndpoint('/v1/instagram/stories', 'POST', {
    username: testData.username,
  });
  
  // Test 10: Get Highlights
  await testEndpoint('/v1/instagram/highlights', 'POST', {
    username: testData.username,
  });
  
  // Test 11: Alternative GET endpoints
  await testEndpoint(`/user/${testData.username}`);
  await testEndpoint(`/user/${testData.username}/posts`);
  await testEndpoint('/convert?url=' + encodeURIComponent(testData.url));
  
  console.log('\n' + '=' .repeat(50));
  console.log('🏁 Tests completed!');
  console.log('\n💡 Tips:');
  console.log('- Check the server logs for detailed information');
  console.log('- Some endpoints might fail with example data');
  console.log('- Use real Instagram URLs for better testing');
  console.log('- Monitor rate limits and cache behavior');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testEndpoint, runTests }; 