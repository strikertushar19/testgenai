# Client-Side Backend Implementation

This document explains the client-side backend implementation that replaces the Go backend server.

## 🏗️ Architecture

The client-side backend (`src/lib/backend.ts`) provides all the functionality of the Go backend but runs entirely in the browser using:

- **GitHub API**: For repository cloning and file fetching
- **Gemini API**: For test case generation
- **Browser APIs**: For file processing and data manipulation

## 🔧 Key Features

### 1. Repository Cloning
- **GitHub API Integration**: Uses GitHub's REST API to fetch repository contents
- **Smart File Filtering**: Excludes unnecessary files (node_modules, .git, etc.)
- **Size Limits**: Automatically limits file sizes for performance
- **Multiple File Types**: Supports Go, JavaScript, TypeScript, Python, Java, etc.

### 2. Context Generation
- **Organized Structure**: Groups files by type (Go files, config files, other files)
- **Comprehensive Coverage**: Includes all relevant source code files
- **Clear Formatting**: Well-structured context for AI processing

### 3. Test Generation
- **Direct Gemini API**: Calls Google's Gemini API directly from the browser
- **Smart Prompting**: Generates comprehensive prompts for test case generation
- **Error Handling**: Robust error handling and validation

## 🚀 Benefits

### ✅ **Advantages**
- **No Server Required**: Runs entirely in the browser
- **Simplified Deployment**: Just deploy the frontend to Vercel/Netlify
- **Better Performance**: No server round-trips for API calls
- **Cost Effective**: No backend server costs
- **Easier Maintenance**: Single codebase to maintain

### ⚠️ **Considerations**
- **CORS Limitations**: GitHub API calls are subject to CORS policies
- **API Rate Limits**: GitHub API has rate limits (60 requests/hour for unauthenticated)
- **Browser Security**: API keys are exposed in the browser (use environment variables)

## 🔧 Implementation Details

### GitHub API Usage
```typescript
// Fetch repository tree
const treeResponse = await fetch(
  `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`
);

// Fetch file content
const contentResponse = await fetch(
  `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`
);
```

### Gemini API Integration
```typescript
// Direct API call to Gemini
const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
  }
);
```

## 🛠️ Usage

The client-side backend is used through the `ApiService` class:

```typescript
import { ApiService } from '@/lib/api';

// Clone repository
const repoResponse = await ApiService.cloneRepository('https://github.com/user/repo');

// Generate tests
const testResponse = await ApiService.generateTests({
  apiKey: 'your-gemini-api-key',
  codeContext: 'your code context...',
  additionalPrompt: 'Generate unit tests'
});
```

## 🔒 Security Considerations

1. **API Key Management**: Store Gemini API key in environment variables
2. **Rate Limiting**: Implement client-side rate limiting for GitHub API
3. **Error Handling**: Don't expose sensitive information in error messages
4. **CORS**: Ensure proper CORS configuration for API calls

## 📊 Performance

- **File Processing**: Processes up to 15 files per repository
- **Size Limits**: Files larger than 50KB are excluded
- **Caching**: Browser caching can improve performance
- **Parallel Requests**: Multiple API calls can be made in parallel

## 🚀 Deployment

The client-side backend works with any static hosting service:
- **Vercel**: Automatic deployment from GitHub
- **Netlify**: Easy deployment with environment variables
- **GitHub Pages**: Free hosting for public repositories
- **AWS S3 + CloudFront**: Scalable static hosting

## 🔄 Migration from Go Backend

The migration is seamless:
1. Replace Go backend calls with `ApiService` calls
2. Update environment variables for API keys
3. Deploy only the frontend
4. Remove Go backend server

This approach provides the same functionality with better scalability and easier maintenance!
