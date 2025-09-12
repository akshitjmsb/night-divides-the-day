// Test script to debug content generation issues
// Run with: node test-content-generation.js

const BASE_URL = 'https://night-divides-the-day.vercel.app';

async function testEndpoint(endpoint, method = 'GET', body = null) {
  console.log(`\n🔍 Testing ${method} ${endpoint}...`);
  
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const data = await response.json();
    
    console.log(`✅ Status: ${response.status}`);
    console.log(`📄 Response:`, JSON.stringify(data, null, 2));
    
    return { success: response.ok, data, status: response.status };
  } catch (error) {
    console.log(`❌ Error:`, error.message);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('🚀 Starting content generation tests...\n');
  
  const today = new Date().toISOString().split('T')[0];
  console.log(`📅 Today's date: ${today}`);
  
  // Test 1: Check if content exists for today
  console.log('\n=== Test 1: Check existing content ===');
  await testEndpoint(`/api/content?date=${today}`);
  
  // Test 2: Try manual content generation for today
  console.log('\n=== Test 2: Manual content generation ===');
  await testEndpoint(`/api/manual-trigger?date=${today}`, 'POST');
  
  // Test 3: Check content again after generation
  console.log('\n=== Test 3: Verify content was generated ===');
  await testEndpoint(`/api/content?date=${today}`);
  
  // Test 4: Test with tomorrow's date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  
  console.log('\n=== Test 4: Test tomorrow\'s content ===');
  await testEndpoint(`/api/content?date=${tomorrowStr}`);
  
  console.log('\n✅ Tests completed!');
}

// Run the tests
runTests().catch(console.error);
