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
    return relativePath.some(part => {
      if (pattern.includes('*')) {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(part);
      }
      return part === pattern || part.startsWith(pattern);
    });
  });
}

// Use GitHub API to actually clone repository content
export async function cloneRepositoryAndGetFiles(repoInfo: RepoInfo): Promise<FileContent[]> {
  const files: FileContent[] = [];
  
  try {
    console.log(`Cloning repository ${repoInfo.owner}/${repoInfo.repo} using GitHub API...`);
    
    // First, get the default branch
    const repoResponse = await fetch(`https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}`);
    
    if (!repoResponse.ok) {
      throw new Error(`GitHub API error: ${repoResponse.status} ${repoResponse.statusText}`);
    }
    
    const repoData = await repoResponse.json();
    const defaultBranch = repoData.default_branch || 'main';
    
    console.log(`Using branch: ${defaultBranch}`);
    
    // Get the repository tree
    const treeResponse = await fetch(`https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/git/trees/${defaultBranch}?recursive=1`);
    
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
      const isNotExcluded = !shouldExcludeFile(item.path);
      const isReasonableSize = item.size < 50000; // Less than 50KB
      const isSourceFile = ['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.cs', '.php', '.rb', '.go', '.rs', '.swift', '.kt'].includes(
        item.path.split('.').pop()?.toLowerCase() || ''
      );
      
      return isBlob && isNotExcluded && isReasonableSize && isSourceFile;
    });
    
    console.log(`Found ${sourceFiles.length} source files to fetch`);
    
    if (sourceFiles.length === 0) {
      console.log('No source files found, trying fallback approach...');
      return await createFallbackExample(repoInfo);
    }
    
    // Fetch content for each file (limit to first 15 files for performance)
    const limitedFiles = sourceFiles.slice(0, 15);
    
    for (const file of limitedFiles) {
      try {
        console.log(`Fetching content for: ${file.path}`);
        const contentResponse = await fetch(`https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/contents/${file.path}`);
        
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
    return files;
    
  } catch (error) {
    console.error('Error fetching repository files:', error);
    throw new Error(`Failed to fetch repository files: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function generatePromptContext(files: FileContent[]): Promise<string> {
  const context = files
    .filter(file => {
      // Only include source code files
      const ext = file.path.split('.').pop()?.toLowerCase() || '';
      return ['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.cs', '.php', '.rb', '.go', '.rs', '.swift', '.kt'].includes('.' + ext);
    })
    .map(file => {
      return `// File: ${file.path}\n${file.content}\n\n---\n`;
    })
    .join('\n');
  
  return context;
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
