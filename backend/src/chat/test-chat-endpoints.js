#!/usr/bin/env node

/**
 * Simple test script to verify chat endpoints work
 * Run with: node test-chat-endpoints.js
 */

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:3001';

async function testChatEndpoints() {
  console.log('🧪 Testing Chat Endpoints\n');
  console.log(`Base URL: ${BASE_URL}\n`);

  // Test 1: Health Check
  await testHealthCheck();
  
  // Test 2: Get Suggestions
  await testSuggestions();
  
  // Test 3: Process Simple Message (incomplete)
  await testIncompleteMessage();
  
  // Test 4: Process Complete Query 
  await testCompleteQuery();
  
  // Test 5: Process Conversation
  await testConversation();

  console.log('\n✅ All tests completed!');
}

async function testHealthCheck() {
  console.log('1️⃣ Testing Chat Health Check...');
  
  try {
    const response = await fetch(`${BASE_URL}/chat/health`);
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log('   ✅ Health check passed');
      console.log(`   📊 Status: ${data.status}`);
      console.log(`   🧠 Test confidence: ${data.test?.confidence}`);
    } else {
      console.log('   ❌ Health check failed:', data.error || 'Unknown error');
    }
  } catch (error) {
    console.log('   ❌ Health check error:', error.message);
  }
  
  console.log('');
}

async function testSuggestions() {
  console.log('2️⃣ Testing Chat Suggestions...');
  
  try {
    const response = await fetch(`${BASE_URL}/chat/suggestions`);
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log('   ✅ Suggestions retrieved');
      console.log(`   📝 Count: ${data.suggestions?.length || 0}`);
      data.suggestions?.slice(0, 2).forEach((suggestion, i) => {
        console.log(`   ${i + 1}. "${suggestion}"`);
      });
    } else {
      console.log('   ❌ Suggestions failed:', data.error || 'Unknown error');
    }
  } catch (error) {
    console.log('   ❌ Suggestions error:', error.message);
  }
  
  console.log('');
}

async function testIncompleteMessage() {
  console.log('3️⃣ Testing Incomplete Message...');
  
  const testMessage = "I want to track something";
  
  try {
    const response = await fetch(`${BASE_URL}/chat/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message: testMessage,
        conversationHistory: []
      })
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log('   ✅ Message processed');
      console.log(`   📥 Input: "${testMessage}"`);
      console.log(`   📤 Response: "${data.response.message?.substring(0, 50)}..."`);
      console.log(`   🎯 Ready to execute: ${data.response.isQueryReady}`);
      console.log(`   📊 Confidence: ${data.response.confidence}`);
      console.log(`   ❓ Needs more info: ${data.response.needsMoreInfo?.join(', ') || 'None'}`);
    } else {
      console.log('   ❌ Message processing failed:', data.error || 'Unknown error');
    }
  } catch (error) {
    console.log('   ❌ Message processing error:', error.message);
  }
  
  console.log('');
}

async function testCompleteQuery() {
  console.log('4️⃣ Testing Complete Query...');
  
  const testMessage = "Index USDC transfers from the latest 1000 blocks";
  
  try {
    const response = await fetch(`${BASE_URL}/chat/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message: testMessage,
        conversationHistory: []
      })
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log('   ✅ Query processed');
      console.log(`   📥 Input: "${testMessage}"`);
      console.log(`   📤 Response: "${data.response.message?.substring(0, 50)}..."`);
      console.log(`   🎯 Ready to execute: ${data.response.isQueryReady}`);
      console.log(`   📊 Confidence: ${data.response.confidence}`);
      console.log(`   🔧 Suggested query: "${data.response.suggestedQuery || 'None'}"`);
    } else {
      console.log('   ❌ Query processing failed:', data.error || 'Unknown error');
    }
  } catch (error) {
    console.log('   ❌ Query processing error:', error.message);
  }
  
  console.log('');
}

async function testConversation() {
  console.log('5️⃣ Testing Conversation Flow...');
  
  // Simulate a conversation
  const conversation = [
    { message: "I want to index something", expectReady: false },
    { message: "USDC transfers", expectReady: false },
    { message: "Index USDC transfers from latest blocks", expectReady: true }
  ];
  
  let history = [];
  
  for (let i = 0; i < conversation.length; i++) {
    const { message, expectReady } = conversation[i];
    console.log(`   💬 Step ${i + 1}: "${message}"`);
    
    try {
      const response = await fetch(`${BASE_URL}/chat/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message,
          conversationHistory: history
        })
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        const isReady = data.response.isQueryReady;
        const confidence = data.response.confidence;
        
        console.log(`      📊 Ready: ${isReady}, Confidence: ${confidence}`);
        console.log(`      🎯 Expected ready: ${expectReady}, Actual: ${isReady} ${isReady === expectReady ? '✅' : '❌'}`);
        
        // Update conversation history
        history.push(
          { role: 'user', content: message },
          { role: 'assistant', content: data.response.message }
        );
      } else {
        console.log(`      ❌ Step ${i + 1} failed:`, data.error);
        break;
      }
    } catch (error) {
      console.log(`      ❌ Step ${i + 1} error:`, error.message);
      break;
    }
  }
  
  console.log('');
}

// Run the tests
testChatEndpoints().catch(console.error);