export interface RepoInfo {
  owner: string;
  repo: string;
  url: string;
}

export interface FileContent {
  path: string;
  content: string;
  size: number;
}

// Files and directories to exclude when processing repository
const EXCLUDE_PATTERNS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  '.next',
  '.nuxt',
  '.cache',
  '*.log',
  '*.tmp',
  '.DS_Store',
  'Thumbs.db',
  '*.min.js',
  '*.min.css',
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'bun.lockb',
  '.env*',
  '.vscode',
  '.idea',
  '*.md',
  'LICENSE',
  'README*',
  '.gitignore',
  '.eslintrc*',
  '.prettierrc*',
  'tsconfig.json',
  'vite.config.*',
  'webpack.config.*',
  'rollup.config.*',
  'jest.config.*',
  'vitest.config.*',
  'cypress',
  'e2e',
  '__tests__',
  'test',
  'tests',
  'spec',
  'specs',
  'docs',
  'documentation',
  'assets',
  'images',
  'public',
  'static'
];

export function parseGitHubUrl(url: string): RepoInfo | null {
  try {
    const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) return null;
    
    const [, owner, repo] = match;
    return {
      owner: owner.trim(),
      repo: repo.replace('.git', '').trim(),
      url: url.trim()
    };
  } catch (error) {
    console.error('Error parsing GitHub URL:', error);
    return null;
  }
}

export function shouldExcludeFile(filePath: string): boolean {
  const relativePath = filePath.split('/');
  
  return EXCLUDE_PATTERNS.some(pattern => {
    // Check if any part of the path matches the pattern
    return relativePath.some(part => {
      if (pattern.includes('*')) {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(part);
      }
      return part === pattern || part.startsWith(pattern);
    });
  });
}

export async function fetchRepositoryFiles(repoInfo: RepoInfo): Promise<FileContent[]> {
  const files: FileContent[] = [];
  
  try {
    // First, try to get the default branch
    const repoResponse = await fetch(`https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}`);
    
    if (!repoResponse.ok) {
      throw new Error(`GitHub API error: ${repoResponse.status} ${repoResponse.statusText}`);
    }
    
    const repoData = await repoResponse.json();
    const defaultBranch = repoData.default_branch || 'main';
    
    // Fetch repository tree using GitHub API
    const response = await fetch(`https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/git/trees/${defaultBranch}?recursive=1`);
    
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.tree) {
      throw new Error('No tree data found in GitHub API response');
    }
    
    console.log('Repository tree data:', data.tree.length, 'items found');
    
    // Filter and fetch file contents
    const sourceFiles = data.tree.filter((item: any) => {
      const isBlob = item.type === 'blob';
      const isNotExcluded = !shouldExcludeFile(item.path);
      const isReasonableSize = item.size < 1024 * 1024; // Less than 1MB
      const isSourceFile = ['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.cs', '.php', '.rb', '.go', '.rs', '.swift', '.kt'].includes(
        item.path.split('.').pop()?.toLowerCase() || ''
      );
      
      console.log(`File ${item.path}: blob=${isBlob}, notExcluded=${isNotExcluded}, size=${item.size}, sourceFile=${isSourceFile}`);
      
      return isBlob && isNotExcluded && isReasonableSize && isSourceFile;
    });
    
    console.log('Filtered source files:', sourceFiles.length);
    
    // Fetch content for each file (limited to first 10 files for demo)
    const limitedFiles = sourceFiles.slice(0, 10);
    
    for (const file of limitedFiles) {
      try {
        console.log(`Fetching content for: ${file.path}`);
        const contentResponse = await fetch(`https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/contents/${file.path}`);
        
        if (contentResponse.ok) {
          const contentData = await contentResponse.json();
          
          if (contentData.content) {
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
        console.warn(`Could not fetch content for ${file.path}:`, error);
      }
    }
    
    console.log(`Total files fetched: ${files.length}`);
    return files;
  } catch (error) {
    console.error('Error fetching repository files:', error);
    throw new Error(`Failed to fetch repository files: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function generatePromptContext(files: FileContent[]): Promise<string> {
  const context = files
    .map(file => {
      return `// File: ${file.path}\n${file.content}\n\n---\n`;
    })
    .join('\n');
  
  return context;
}

// Alternative approach: Fetch common source files directly
export async function fetchCommonSourceFiles(repoInfo: RepoInfo): Promise<FileContent[]> {
  const files: FileContent[] = [];
  
  // Common source file patterns to look for
  const commonFiles = [
    // React/JS projects
    'src/index.js',
    'src/index.ts',
    'src/App.js',
    'src/App.tsx',
    'src/main.js',
    'src/main.ts',
    'src/components/App.js',
    'src/components/App.tsx',
    'index.js',
    'index.ts',
    'app.js',
    'app.ts',
    'main.js',
    'main.ts',
    'lib/index.js',
    'lib/index.ts',
    'utils.js',
    'utils.ts',
    'helpers.js',
    'helpers.ts',
    // React monorepo structure
    'packages/react/src/index.js',
    'packages/react/src/index.ts',
    'packages/react/src/React.js',
    'packages/react/src/React.ts',
    // Node.js projects
    'lib/index.js',
    'lib/index.ts',
    'src/lib/index.js',
    'src/lib/index.ts',
    // Common utility files
    'src/utils.js',
    'src/utils.ts',
    'src/helpers.js',
    'src/helpers.ts',
    'src/constants.js',
    'src/constants.ts',
    // Simple examples
    'example.js',
    'example.ts',
    'demo.js',
    'demo.ts',
    // Popular libraries (smaller files)
    'src/lodash.js',
    'src/underscore.js',
    'src/jquery.js',
    'src/moment.js'
  ];
  
  console.log(`Trying to fetch common source files for ${repoInfo.owner}/${repoInfo.repo}`);
  
  for (const filePath of commonFiles) {
    try {
      console.log(`Trying to fetch: ${filePath}`);
      const response = await fetch(`https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/contents/${filePath}`);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.content && data.type === 'file' && data.size < 50000) { // Less than 50KB
          const content = atob(data.content);
          files.push({
            path: filePath,
            content,
            size: data.size
          });
          console.log(`Successfully fetched: ${filePath} (${content.length} chars)`);
        } else if (data.size >= 50000) {
          console.log(`File too large: ${filePath} (${data.size} bytes)`);
        }
      } else {
        console.log(`File not found: ${filePath} (${response.status})`);
      }
    } catch (error) {
      console.warn(`Error fetching ${filePath}:`, error);
    }
  }
  
  console.log(`Total files fetched: ${files.length}`);
  return files;
}

// Fallback: Create a simple example if no files are found
export async function createFallbackExample(repoInfo: RepoInfo): Promise<FileContent[]> {
  console.log('Creating fallback example for repository analysis');
  
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

  return [{
    path: 'example.js',
    content: exampleCode,
    size: exampleCode.length
  }];
}

// Placeholder functions for compatibility
export async function cloneRepository(repoInfo: RepoInfo, tempDir: string): Promise<string> {
  // This is a placeholder - in a real implementation, you'd need a backend service
  throw new Error('Repository cloning requires a backend service');
}

export async function readRepositoryFiles(repoPath: string): Promise<FileContent[]> {
  // This is a placeholder - in a real implementation, you'd need a backend service
  throw new Error('Reading repository files requires a backend service');
}

export async function cleanupTempDirectory(tempDir: string): Promise<void> {
  // This is a placeholder - in a real implementation, you'd need a backend service
  console.log('Cleanup would happen here in a real implementation');
}
