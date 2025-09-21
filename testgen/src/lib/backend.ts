// Client-side backend implementation using TypeScript/JavaScript
// This replaces the Go backend with browser-compatible functions

export interface RepoRequest {
  repoUrl: string;
}

export interface FileContent {
  path: string;
  content: string;
  size: number;
}

export interface RepoResponse {
  success: boolean;
  message: string;
  filesCount: number;
  contextPath: string;
  files: FileContent[];
}

export interface GeminiTestCase {
  id: string;
  name: string;
  description: string;
  input: any;
  expected: any;
  code: string;
  testType: 'unit' | 'integration' | 'edge-case' | 'error-handling';
  priority: 'high' | 'medium' | 'low';
}

export interface GeminiResponse {
  testCases: GeminiTestCase[];
  summary: {
    totalTests: number;
    unitTests: number;
    integrationTests: number;
    edgeCases: number;
    errorHandlingTests: number;
  };
}

export interface GeminiRequest {
  apiKey: string;
  codeContext: string;
  additionalPrompt?: string;
}

// Files and directories to exclude when processing repository
const EXCLUDE_PATTERNS = [
  'node_modules', '.git', 'dist', 'build', 'coverage', '.next', '.nuxt',
  '.cache', '*.log', '*.tmp', '.DS_Store', 'Thumbs.db', '*.min.js',
  '*.min.css', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
  'bun.lockb', '.env*', '.vscode', '.idea', '*.md', 'LICENSE',
  'README*', '.gitignore', '.eslintrc*', '.prettierrc*', 'tsconfig.json',
  'vite.config.*', 'webpack.config.*', 'rollup.config.*', 'jest.config.*',
  'vitest.config.*', 'cypress', 'e2e', '__tests__', 'test', 'tests',
  'spec', 'specs', 'docs', 'documentation', 'assets', 'images', 'public', 'static'
];

export class ClientBackend {
  private static async makeRequest<T>(
    url: string,
    options: RequestInit = {}
  ): Promise<T> {
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed for ${url}:`, error);
      throw error;
    }
  }

  // Parse GitHub URL to extract owner and repo
  static parseGitHubUrl(url: string): { owner: string; repo: string } | null {
    try {
      // Clean the URL to remove any file paths, branches, or specific files
      let cleanURL = url;
      
      // Remove /blob/ and everything after it
      if (cleanURL.includes('/blob/')) {
        cleanURL = cleanURL.split('/blob/')[0];
      }
      
      // Remove /tree/ and everything after it
      if (cleanURL.includes('/tree/')) {
        cleanURL = cleanURL.split('/tree/')[0];
      }
      
      // Remove trailing slash
      cleanURL = cleanURL.replace(/\/$/, '');
      
      // Remove .git if present
      cleanURL = cleanURL.replace(/\.git$/, '');
      
      // Extract owner and repo using regex
      const match = cleanURL.match(/github\.com\/([^\/]+)\/([^\/]+)$/);
      if (!match) {
        throw new Error(`Invalid GitHub URL: ${url}`);
      }
      
      const owner = match[1].trim();
      const repo = match[2].trim();
      
      if (!owner || !repo) {
        throw new Error(`Invalid GitHub URL: ${url}`);
      }
      
      return { owner, repo };
    } catch (error) {
      console.error('Error parsing GitHub URL:', error);
      return null;
    }
  }

  // Check if file should be excluded
  static shouldExcludeFile(filePath: string): boolean {
    const pathParts = filePath.split('/');
    
    return EXCLUDE_PATTERNS.some(pattern => {
      return pathParts.some(part => {
        if (pattern.includes('*')) {
          const regex = new RegExp(pattern.replace(/\*/g, '.*'));
          return regex.test(part);
        }
        return part === pattern || part.startsWith(pattern);
      });
    });
  }

  // Clone repository using GitHub API (no actual git clone needed)
  static async cloneRepository(repoUrl: string): Promise<RepoResponse> {
    try {
      const repoInfo = this.parseGitHubUrl(repoUrl);
      if (!repoInfo) {
        throw new Error('Invalid GitHub URL');
      }

      console.log(`Fetching repository: ${repoInfo.owner}/${repoInfo.repo}`);

      // Get repository information
      const repoResponse = await fetch(`https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}`, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'TestGen-AI/1.0'
        }
      });
      if (!repoResponse.ok) {
        throw new Error(`GitHub API error: ${repoResponse.status} ${repoResponse.statusText}`);
      }
      
      const repoData = await repoResponse.json();
      const defaultBranch = repoData.default_branch || 'main';
      
      console.log(`Using branch: ${defaultBranch}`);
      
      // Get the repository tree
      const treeResponse = await fetch(`https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/git/trees/${defaultBranch}?recursive=1`, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'TestGen-AI/1.0'
        }
      });
      if (!treeResponse.ok) {
        throw new Error(`GitHub API error: ${treeResponse.status} ${treeResponse.statusText}`);
      }
      
      const treeData = await treeResponse.json();
      if (!treeData.tree) {
        throw new Error('No tree data found in GitHub API response');
      }
      
      console.log(`Found ${treeData.tree.length} items in repository`);
      
      // Filter for source code files
      const sourceFiles = treeData.tree.filter((item: any) => {
        const isBlob = item.type === 'blob';
        const isNotExcluded = !this.shouldExcludeFile(item.path);
        const isReasonableSize = item.size < 50000; // Less than 50KB
        const isSourceFile = ['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.cs', '.php', '.rb', '.go', '.rs', '.swift', '.kt', '.vue', '.svelte', '.html', '.css', '.scss', '.sass', '.less', '.json', '.yaml', '.yml', '.toml', '.ini', '.env', '.sql', '.sh', '.bat', '.ps1'].includes(
          item.path.split('.').pop()?.toLowerCase() || ''
        );
        
        return isBlob && isNotExcluded && isReasonableSize && isSourceFile;
      });
      
      console.log(`Found ${sourceFiles.length} source files to fetch`);
      
      if (sourceFiles.length === 0) {
        console.log('No source files found, creating fallback example...');
        return this.createFallbackResponse(repoInfo);
      }
      
      // Fetch content for each file (limit to first 15 files for performance)
      const limitedFiles = sourceFiles.slice(0, 15);
      const files: FileContent[] = [];
      
      for (const file of limitedFiles) {
        try {
          console.log(`Fetching content for: ${file.path}`);
          const contentResponse = await fetch(`https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/contents/${file.path}`, {
            headers: {
              'Accept': 'application/vnd.github.v3+json',
              'User-Agent': 'TestGen-AI/1.0'
            }
          });
          
          if (contentResponse.ok) {
            const contentData = await contentResponse.json();
            
            if (contentData.content && contentData.type === 'file') {
              // Decode base64 content
              const content = atob(contentData.content);
              files.push({
                path: file.path,
                content,
                size: file.size
              });
              console.log(`Successfully fetched: ${file.path} (${content.length} chars)`);
            }
          } else {
            console.warn(`Failed to fetch content for ${file.path}: ${contentResponse.status}`);
          }
        } catch (error) {
          console.warn(`Error fetching content for ${file.path}:`, error);
        }
      }
      
      console.log(`Total files fetched: ${files.length}`);
      
      // Generate context
      const context = this.generatePromptContext(files);
      
      return {
        success: true,
        message: 'Repository cloned successfully',
        filesCount: files.length,
        contextPath: `repos/${repoInfo.owner}-${repoInfo.repo}-context.txt`,
        files
      };
      
    } catch (error) {
      console.error('Error cloning repository:', error);
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('CORS')) {
          throw new Error('CORS error: GitHub API calls are blocked by browser. This is a known limitation when running from localhost. Try deploying to Vercel or use a CORS proxy.');
        } else if (error.message.includes('404')) {
          throw new Error('Repository not found. Please check the URL and ensure the repository is public.');
        } else if (error.message.includes('403')) {
          throw new Error('GitHub API rate limit exceeded. Please try again later.');
        }
      }
      
      throw new Error(`Failed to clone repository: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Generate prompt context from files
  static generatePromptContext(files: FileContent[]): string {
    // Group files by type for better organization
    const goFiles: FileContent[] = [];
    const configFiles: FileContent[] = [];
    const otherFiles: FileContent[] = [];

    for (const file of files) {
      const ext = file.path.split('.').pop()?.toLowerCase() || '';
      if (ext === 'go') {
        goFiles.push(file);
      } else if (['json', 'yaml', 'yml', 'toml', 'ini', 'env'].includes(ext) || 
                 file.path.includes('go.mod') || file.path.includes('go.sum')) {
        configFiles.push(file);
      } else {
        otherFiles.push(file);
      }
    }

    let context = '=== REPOSITORY CODE CONTEXT FOR TEST GENERATION ===\n\n';
    context += 'This context contains all source code files from the cloned repository.\n';
    context += 'Generate comprehensive test cases based on the functions, methods, and logic found in these files.\n\n';
    context += '=== FILES ===\n\n';

    // Add Go files first (most important for Go projects)
    if (goFiles.length > 0) {
      context += '=== GO SOURCE FILES ===\n\n';
      for (const file of goFiles) {
        context += `// File: ${file.path}\n${file.content}\n\n---\n`;
      }
    }

    // Add config files
    if (configFiles.length > 0) {
      context += '=== CONFIGURATION FILES ===\n\n';
      for (const file of configFiles) {
        context += `// File: ${file.path}\n${file.content}\n\n---\n`;
      }
    }

    // Add other files
    if (otherFiles.length > 0) {
      context += '=== OTHER FILES ===\n\n';
      for (const file of otherFiles) {
        context += `// File: ${file.path}\n${file.content}\n\n---\n`;
      }
    }

    context += '\n=== END OF CONTEXT ===\n';
    context += 'Generate comprehensive test cases for the functions and methods found in the above code.\n';

    return context;
  }

  // Create fallback response when no files are found
  static createFallbackResponse(repoInfo: { owner: string; repo: string }): RepoResponse {
    const exampleCode = `
// Example function for testing
function calculateSum(a, b) {
  return a + b;
}

// Example class for testing
class Calculator {
  constructor() {
    this.history = [];
  }
  
  add(a, b) {
    const result = a + b;
    this.history.push(\`\${a} + \${b} = \${result}\`);
    return result;
  }
  
  subtract(a, b) {
    const result = a - b;
    this.history.push(\`\${a} - \${b} = \${result}\`);
    return result;
  }
  
  getHistory() {
    return this.history;
  }
}

// Example async function
async function fetchData(url) {
  try {
    const response = await fetch(url);
    return await response.json();
  } catch (error) {
    throw new Error(\`Failed to fetch data: \${error.message}\`);
  }
}

// Export for testing
module.exports = { calculateSum, Calculator, fetchData };
`;

    const files: FileContent[] = [{
      path: 'example.js',
      content: exampleCode,
      size: exampleCode.length
    }];

    return {
      success: true,
      message: 'Repository cloned successfully (using fallback example)',
      filesCount: files.length,
      contextPath: `repos/${repoInfo.owner}-${repoInfo.repo}-context.txt`,
      files
    };
  }

  // Generate tests using Gemini API
  static async generateTests(request: GeminiRequest): Promise<GeminiResponse> {
    const prompt = `
You are an expert software testing engineer. Analyze the provided code and generate comprehensive test cases.

Code Context:
${request.codeContext}

${request.additionalPrompt ? `Additional Requirements: ${request.additionalPrompt}` : ''}

Please generate test cases in the following JSON format:
{
  "testCases": [
    {
      "id": "unique_id",
      "name": "descriptive_test_name",
      "description": "detailed_description_of_what_this_test_does",
      "input": "input_data_for_the_test",
      "expected": "expected_output_or_result",
      "code": "the_function_or_code_being_tested",
      "testType": "unit|integration|edge-case|error-handling",
      "priority": "high|medium|low"
    }
  ],
  "summary": {
    "totalTests": "number",
    "unitTests": "number",
    "integrationTests": "number",
    "edgeCases": "number",
    "errorHandlingTests": "number"
  }
}

Guidelines:
1. Generate comprehensive test cases covering normal cases, edge cases, and error scenarios
2. Include both positive and negative test cases
3. Test boundary conditions and edge cases
4. Include error handling tests
5. Make test names descriptive and clear
6. Ensure test inputs are realistic and meaningful
7. Focus on the main functionality of the code
8. Generate at least 5-10 test cases for good coverage

Return only valid JSON, no additional text or markdown formatting.`;

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${request.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 8192,
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
        throw new Error('Invalid response from Gemini API');
      }

      const generatedText = data.candidates[0].content.parts[0].text;
      
      // Extract JSON from the response (in case there's extra text)
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in Gemini response');
      }

      const parsedResponse = JSON.parse(jsonMatch[0]);
      
      // Validate the response structure
      if (!parsedResponse.testCases || !Array.isArray(parsedResponse.testCases)) {
        throw new Error('Invalid test cases structure in Gemini response');
      }

      // Add unique IDs if missing
      parsedResponse.testCases = parsedResponse.testCases.map((testCase: any, index: number) => ({
        ...testCase,
        id: testCase.id || `test_${index + 1}`,
        testType: testCase.testType || 'unit',
        priority: testCase.priority || 'medium'
      }));

      return parsedResponse as GeminiResponse;
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      throw new Error(`Failed to generate test cases: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Convert Gemini test cases to app format
  static convertGeminiTestsToAppFormat(geminiTests: GeminiTestCase[]): any[] {
    return geminiTests.map((test, index) => ({
      id: test.id || `test_${index + 1}`,
      name: test.name,
      input: test.input,
      expected: test.expected,
      code: test.code,
      status: 'pending' as const,
      description: test.description,
      testType: test.testType,
      priority: test.priority
    }));
  }
}

// Export the class as default
export default ClientBackend;
