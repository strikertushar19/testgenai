const BACKEND_URL = 'http://localhost:3001';

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

export class ApiService {
  private static async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${BACKEND_URL}${endpoint}`;
    
    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, defaultOptions);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  static async cloneRepository(repoUrl: string): Promise<RepoResponse> {
    return this.makeRequest<RepoResponse>('/api/clone-repo', {
      method: 'POST',
      body: JSON.stringify({ repoUrl }),
    });
  }

  static async getContext(owner: string, repo: string): Promise<{ context: string }> {
    return this.makeRequest<{ context: string }>(`/api/context/${owner}/${repo}`);
  }

  static async generateTests(request: GeminiRequest): Promise<GeminiResponse> {
    return this.makeRequest<GeminiResponse>('/api/generate-tests', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }
}

// Utility function to parse GitHub URL
export function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  try {
    const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) return null;
    
    const [, owner, repo] = match;
    return {
      owner: owner.trim(),
      repo: repo.replace('.git', '').trim(),
    };
  } catch (error) {
    console.error('Error parsing GitHub URL:', error);
    return null;
  }
}

// Convert Gemini test cases to app format
export function convertGeminiTestsToAppFormat(geminiTests: GeminiTestCase[]): any[] {
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
