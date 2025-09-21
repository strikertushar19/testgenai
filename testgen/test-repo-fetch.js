// Test script to verify repository fetching functionality
import { ClientBackend } from './src/lib/backend.js';

async function testRepositoryFetch() {
  console.log('Testing repository fetch functionality...');
  
  try {
    // Test with a simple repository
    const repoUrl = 'https://github.com/facebook/react';
    console.log(`Fetching repository: ${repoUrl}`);
    
    const result = await ClientBackend.cloneRepository(repoUrl);
    
    console.log('✅ Repository fetch successful!');
    console.log(`Success: ${result.success}`);
    console.log(`Message: ${result.message}`);
    console.log(`Files Count: ${result.filesCount}`);
    console.log(`Context Path: ${result.contextPath}`);
    console.log(`Files: ${result.files.length} files fetched`);
    
    // Show first few files
    console.log('\nFirst 3 files:');
    result.files.slice(0, 3).forEach((file, index) => {
      console.log(`${index + 1}. ${file.path} (${file.size} bytes)`);
    });
    
    // Show context preview
    console.log('\nContext preview (first 500 chars):');
    const context = ClientBackend.generatePromptContext(result.files);
    console.log(context.substring(0, 500) + '...');
    
  } catch (error) {
    console.error('❌ Repository fetch failed:', error.message);
    console.error('Full error:', error);
  }
}

// Run the test
testRepositoryFetch();
