import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Github, 
  Play, 
  Settings, 
  CheckCircle, 
  XCircle, 
  Clock,
  Code2,
  TestTube,
  Zap,
  Download,
  Loader2
} from "lucide-react";
import TestRunner from "@/components/TestRunner";
import ResultsDisplay from "@/components/ResultsDisplay";
import { useToast } from "@/hooks/use-toast";
import { ApiService, parseGitHubUrl, convertGeminiTestsToAppFormat } from "@/lib/api";

interface TestCase {
  id: string;
  name: string;
  input: any;
  expected: any;
  code: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  result?: any;
  error?: string;
  duration?: number;
}

const Dashboard = () => {
  const [repoUrl, setRepoUrl] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isCloning, setIsCloning] = useState(false);
  const [clonedFiles, setClonedFiles] = useState<string[]>([]);
  const [currentRepo, setCurrentRepo] = useState<string>("");
  const { toast } = useToast();

  const handleCloneRepository = async () => {
    if (!repoUrl) {
      toast({
        title: "Repository URL Required",
        description: "Please enter a GitHub repository URL",
        variant: "destructive"
      });
      return;
    }

    const repoInfo = parseGitHubUrl(repoUrl);
    if (!repoInfo) {
      toast({
        title: "Invalid GitHub URL",
        description: "Please enter a valid GitHub repository URL",
        variant: "destructive"
      });
      return;
    }

    setIsCloning(true);

    try {
      // Clone repository using backend API
      const response = await ApiService.cloneRepository(repoUrl);
      
      if (!response.success) {
        throw new Error(response.message);
      }
      
      // Generate prompt context from files
      const promptContext = response.files
        .map(file => `// File: ${file.path}\n${file.content}\n\n---\n`)
        .join('\n');
      
      // Update state
      setClonedFiles(response.files.map(f => f.path));
      setCurrentRepo(`${repoInfo.owner}/${repoInfo.repo}`);
      setCodeInput(promptContext);
      
      toast({
        title: "Repository Cloned Successfully",
        description: `Cloned ${response.filesCount} files from ${repoInfo.owner}/${repoInfo.repo}`,
      });

    } catch (error) {
      console.error('Error cloning repository:', error);
      toast({
        title: "Clone Failed",
        description: `Failed to clone repository: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    } finally {
      setIsCloning(false);
    }
  };

  const handleGenerateTests = async () => {
    if (!geminiKey) {
      toast({
        title: "API Key Required",
        description: "Please enter your Gemini API key in Settings tab",
        variant: "destructive"
      });
      return;
    }

    if (!codeInput.trim()) {
      toast({
        title: "Code Required",
        description: "Please clone a repository or paste code to generate tests",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    try {
      // Generate test cases using backend API
      const geminiResponse = await ApiService.generateTests({
        apiKey: geminiKey,
        codeContext: codeInput,
        additionalPrompt: currentRepo ? `Repository: ${currentRepo}` : undefined
      });

      // Convert Gemini format to app format
      const appTests = convertGeminiTestsToAppFormat(geminiResponse.testCases);
      
      setTestCases(appTests);
      
      toast({
        title: "Tests Generated!",
        description: `Generated ${appTests.length} test cases successfully`,
      });

    } catch (error) {
      console.error('Error generating tests:', error);
      toast({
        title: "Generation Failed",
        description: `Failed to generate test cases: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRunTests = async () => {
    setIsRunning(true);
    // TestRunner component will handle the execution
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">TestGen AI Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Generate and execute test cases for your code with AI
          </p>
        </div>

        <Tabs defaultValue="generate" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="generate" className="flex items-center gap-2">
              <Code2 className="h-4 w-4" />
              Generate
            </TabsTrigger>
            <TabsTrigger value="execute" className="flex items-center gap-2">
              <TestTube className="h-4 w-4" />
              Execute
            </TabsTrigger>
            <TabsTrigger value="results" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Results
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="generate" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Input Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Github className="h-5 w-5" />
                    Code Input
                  </CardTitle>
                  <CardDescription>
                    Enter GitHub repo URL or paste code directly
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="repo-url">GitHub Repository URL</Label>
                    <Input
                      id="repo-url"
                      placeholder="https://github.com/username/repository"
                      value={repoUrl}
                      onChange={(e) => setRepoUrl(e.target.value)}
                    />
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={handleCloneRepository}
                      disabled={isCloning || !repoUrl}
                    >
                      {isCloning ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Cloning Repository...
                        </>
                      ) : (
                        <>
                          <Download className="mr-2 h-4 w-4" />
                          Clone Repository
                        </>
                      )}
                    </Button>
                    {currentRepo && (
                      <div className="p-2 bg-muted rounded-md">
                        <p className="text-sm text-muted-foreground">
                          <strong>Current Repository:</strong> {currentRepo}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          <strong>Files Cloned:</strong> {clonedFiles.length}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <Label htmlFor="code-input">Or paste code directly</Label>
                    <Textarea
                      id="code-input"
                      placeholder="function calculateSum(a, b) {
  return a + b;
}"
                      rows={8}
                      value={codeInput}
                      onChange={(e) => setCodeInput(e.target.value)}
                    />
                  </div>

                  <Button 
                    onClick={handleGenerateTests}
                    disabled={isGenerating || (!repoUrl && !codeInput)}
                    className="w-full"
                  >
                    {isGenerating ? (
                      <>
                        <Clock className="mr-2 h-4 w-4 animate-spin" />
                        Generating Tests...
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        Generate Test Cases
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Generated Tests Preview */}
              <Card>
                <CardHeader>
                  <CardTitle>Generated Test Cases</CardTitle>
                  <CardDescription>
                    {testCases.length} test cases generated
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    {testCases.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        No test cases generated yet
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {testCases.map((test) => (
                          <div key={test.id} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium">{test.name}</h4>
                              <div className="flex gap-2">
                                {(test as any).testType && (
                                  <Badge variant="outline" className="text-xs">
                                    {(test as any).testType}
                                  </Badge>
                                )}
                                {(test as any).priority && (
                                  <Badge 
                                    variant={
                                      (test as any).priority === 'high' ? 'destructive' :
                                      (test as any).priority === 'medium' ? 'default' : 'secondary'
                                    }
                                    className="text-xs"
                                  >
                                    {(test as any).priority}
                                  </Badge>
                                )}
                                <Badge 
                                  variant={
                                    test.status === 'passed' ? 'default' : 
                                    test.status === 'failed' ? 'destructive' :
                                    test.status === 'running' ? 'secondary' : 'outline'
                                  }
                                >
                                  {test.status === 'passed' && <CheckCircle className="mr-1 h-3 w-3" />}
                                  {test.status === 'failed' && <XCircle className="mr-1 h-3 w-3" />}
                                  {test.status === 'running' && <Clock className="mr-1 h-3 w-3 animate-spin" />}
                                  {test.status}
                                </Badge>
                              </div>
                            </div>
                            {(test as any).description && (
                              <div className="text-sm text-muted-foreground mb-2">
                                {(test as any).description}
                              </div>
                            )}
                            <div className="text-sm text-muted-foreground">
                              Input: {JSON.stringify(test.input)}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Expected: {JSON.stringify(test.expected)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="execute">
            <TestRunner 
              testCases={testCases} 
              setTestCases={setTestCases}
              isRunning={isRunning}
              setIsRunning={setIsRunning}
            />
          </TabsContent>

          <TabsContent value="results">
            <ResultsDisplay testCases={testCases} />
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>API Configuration</CardTitle>
                <CardDescription>
                  Configure your API keys for test generation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="gemini-key">Gemini API Key</Label>
                  <Input
                    id="gemini-key"
                    type="password"
                    placeholder="Enter your Gemini API key"
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground">
                    Get your API key from Google AI Studio
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;