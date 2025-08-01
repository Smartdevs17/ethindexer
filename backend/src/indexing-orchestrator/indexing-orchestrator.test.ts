interface TestCase {
  name: string;
  query: string;
  expectedFields: string[];
  shouldCreateJob: boolean;
}

const testCases: TestCase[] = [
  {
    name: "Basic USDC indexing",
    query: "Index USDC transfers from block 18000000",
    expectedFields: ["jobId", "status", "config"],
    shouldCreateJob: true
  },
  {
    name: "Address-specific query",
    query: "Index transfers for 0x742d35cc44b75c42b4b6c5a8b964b08d2a6f6c42",
    expectedFields: ["jobId", "status", "config"],
    shouldCreateJob: true
  },
  {
    name: "Multi-token query",
    query: "Show me WETH and USDT transfers in the last 100 blocks",
    expectedFields: ["jobId", "status", "config"],
    shouldCreateJob: true
  },
  {
    name: "Complex filter query",
    query: "Index DAI transfers above $10,000 from block 19000000 to 19001000",
    expectedFields: ["jobId", "status", "config"],
    shouldCreateJob: true
  }
];

class EthIndexerE2ETester {
  private baseUrl = 'http://localhost:3001';
  private createdJobs: string[] = [];

  async runAllTests() {
    console.log('🧪 Starting EthIndexer End-to-End Tests\n');
    console.log('=' .repeat(60));

    // Test 1: Health Check
    await this.testHealthCheck();

    // Test 2: AI Parsing (Direct)
    await this.testAiParsing();

    // Test 3: Orchestrator Execution
    await this.testOrchestratorExecution();

    // Test 4: Job Status Monitoring
    await this.testJobStatusMonitoring();

    // Test 5: Jobs Listing
    await this.testJobsListing();

    // Test 6: Orchestrator Stats
    await this.testOrchestratorStats();

    console.log('\n' + '=' .repeat(60));
    console.log('🎉 All tests completed!');
    console.log(`📊 Created ${this.createdJobs.length} test jobs`);
    console.log('🧹 Jobs will continue processing in background');
  }

  async testHealthCheck() {
    console.log('\n🏥 Testing Health Check...');
    
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      const data = await response.json();
      
      if (response.ok && data.status === 'ok') {
        console.log('✅ Health check passed');
        console.log(`   Database: ${data.database.status}`);
        console.log(`   Stats: ${JSON.stringify(data.stats)}`);
      } else {
        console.log('❌ Health check failed:', data);
      }
    } catch (error) {
      console.log('❌ Health check error:', error.message);
    }
  }

  async testAiParsing() {
    console.log('\n🤖 Testing AI Parsing...');
    
    const testQuery = "Index USDC transfers from block 18000000";
    
    try {
      const response = await fetch(`${this.baseUrl}/ai/parse-query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: testQuery })
      });
      
      const data = await response.json();
      
      if (response.ok && data.originalQuery) {
        console.log('✅ AI parsing works');
        console.log(`   Query: "${data.originalQuery}"`);
        console.log(`   From Block: ${data.fromBlock}`);
        console.log(`   API Endpoint: ${data.apiEndpoint}`);
      } else {
        console.log('❌ AI parsing failed:', data);
      }
    } catch (error) {
      console.log('❌ AI parsing error:', error.message);
    }
  }

  async testOrchestratorExecution() {
    console.log('\n🎯 Testing Orchestrator Execution...');
    
    for (const testCase of testCases) {
      console.log(`\n   📝 Test: ${testCase.name}`);
      console.log(`   Query: "${testCase.query}"`);
      
      try {
        const response = await fetch(`${this.baseUrl}/orchestrator/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: testCase.query })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
          console.log('   ✅ Execution successful');
          console.log(`   📊 Job ID: ${data.result.jobId}`);
          console.log(`   📈 Status: ${data.result.status}`);
          console.log(`   🔍 Config: ${JSON.stringify(data.result.config)}`);
          
          // Store job ID for status testing
          this.createdJobs.push(data.result.jobId);
          
          // Validate expected fields
          const missingFields = testCase.expectedFields.filter(field => !(field in data.result));
          if (missingFields.length > 0) {
            console.log(`   ⚠️  Missing fields: ${missingFields.join(', ')}`);
          }
          
        } else {
          console.log('   ❌ Execution failed:', data);
        }
        
      } catch (error) {
        console.log('   ❌ Execution error:', error.message);
      }
      
      // Brief pause between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  async testJobStatusMonitoring() {
    console.log('\n📊 Testing Job Status Monitoring...');
    
    if (this.createdJobs.length === 0) {
      console.log('⚠️  No jobs to monitor');
      return;
    }

    for (const jobId of this.createdJobs.slice(0, 2)) { // Test first 2 jobs
      console.log(`\n   🔍 Checking job: ${jobId.substring(0, 12)}...`);
      
      try {
        const response = await fetch(`${this.baseUrl}/orchestrator/job/${jobId}`);
        const data = await response.json();
        
        if (response.ok && data.success) {
          console.log('   ✅ Job status retrieved');
          console.log(`   📈 Status: ${data.job.status}`);
          console.log(`   📐 Progress: ${data.job.progress}%`);
          
          if (data.job.processedRecords) {
            console.log(`   📊 Processed: ${data.job.processedRecords} records`);
          }
        } else {
          console.log('   ❌ Job status failed:', data.error);
        }
        
      } catch (error) {
        console.log('   ❌ Job status error:', error.message);
      }
    }
  }

  async testJobsListing() {
    console.log('\n📋 Testing Jobs Listing...');
    
    try {
      const response = await fetch(`${this.baseUrl}/orchestrator/jobs?limit=5`);
      const data = await response.json();
      
      if (response.ok && data.success) {
        console.log('✅ Jobs listing works');
        console.log(`   📊 Found ${data.count} jobs`);
        
        data.jobs.forEach((job: any, index: number) => {
          console.log(`   ${index + 1}. ${job.jobId.substring(0, 12)}... (${job.status}) - ${job.progress}%`);
        });
      } else {
        console.log('❌ Jobs listing failed:', data);
      }
    } catch (error) {
      console.log('❌ Jobs listing error:', error.message);
    }
  }

  async testOrchestratorStats() {
    console.log('\n📈 Testing Orchestrator Stats...');
    
    try {
      const response = await fetch(`${this.baseUrl}/orchestrator/stats`);
      const data = await response.json();
      
      if (response.ok && data.success) {
        console.log('✅ Orchestrator stats work');
        console.log(`   📊 Message: ${data.stats.message}`);
        console.log('   🔗 Available endpoints:');
        Object.entries(data.stats.endpoints).forEach(([name, endpoint]) => {
          console.log(`      - ${name}: ${endpoint}`);
        });
      } else {
        console.log('❌ Orchestrator stats failed:', data);
      }
    } catch (error) {
      console.log('❌ Orchestrator stats error:', error.message);
    }
  }

  // Helper method to wait for job completion (optional)
  async waitForJobCompletion(jobId: string, maxWaitTime: number = 30000): Promise<boolean> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      try {
        const response = await fetch(`${this.baseUrl}/orchestrator/job/${jobId}`);
        const data = await response.json();
        
        if (data.success && data.job.status === 'completed') {
          return true;
        }
        
        if (data.success && data.job.status === 'error') {
          return false;
        }
        
        // Wait before checking again
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.log('Error checking job status:', error.message);
        break;
      }
    }
    
    return false; // Timeout
  }
}

// Run the tests
const tester = new EthIndexerE2ETester();
tester.runAllTests().catch(console.error);

// Export for use as module
export { EthIndexerE2ETester };