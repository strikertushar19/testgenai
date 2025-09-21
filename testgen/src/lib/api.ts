// Import the client-side backend
import ClientBackend, { 
  RepoRequest, 
  FileContent, 
  RepoResponse, 
  GeminiTestCase, 
  GeminiResponse, 
  GeminiRequest 
} from './backend';

// Re-export types for compatibility
export type { 
  RepoRequest, 
  FileContent, 
  RepoResponse, 
  GeminiTestCase, 
  GeminiResponse, 
  GeminiRequest 
};

export class ApiService {
  static async cloneRepository(repoUrl: string): Promise<RepoResponse> {
    return ClientBackend.cloneRepository(repoUrl);
  }

  static async getContext(owner: string, repo: string): Promise<{ context: string }> {
    // For client-side, we don't need to get context separately
    // as it's already included in the clone response
    return { context: 'Context is included in clone response' };
  }

  static async generateTests(request: GeminiRequest): Promise<GeminiResponse> {
    return ClientBackend.generateTests(request);
  }
}

// Utility function to parse GitHub URL
export function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  return ClientBackend.parseGitHubUrl(url);
}

// Convert Gemini test cases to app format
export function convertGeminiTestsToAppFormat(geminiTests: GeminiTestCase[]): any[] {
  return ClientBackend.convertGeminiTestsToAppFormat(geminiTests);
}
