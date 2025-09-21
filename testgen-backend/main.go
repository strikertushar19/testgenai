package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
)

type RepoRequest struct {
	RepoURL string `json:"repoUrl"`
}

type FileContent struct {
	Path    string `json:"path"`
	Content string `json:"content"`
	Size    int    `json:"size"`
}

type RepoResponse struct {
	Success     bool          `json:"success"`
	Message     string        `json:"message"`
	FilesCount  int           `json:"filesCount"`
	ContextPath string        `json:"contextPath"`
	Files       []FileContent `json:"files"`
}

type GeminiTestCase struct {
	ID          string      `json:"id"`
	Name        string      `json:"name"`
	Description string      `json:"description"`
	Input       interface{} `json:"input"`
	Expected    interface{} `json:"expected"`
	Code        string      `json:"code"`
	TestType    string      `json:"testType"`
	Priority    string      `json:"priority"`
}

type GeminiResponse struct {
	TestCases []GeminiTestCase `json:"testCases"`
	Summary   struct {
		TotalTests         int `json:"totalTests"`
		UnitTests          int `json:"unitTests"`
		IntegrationTests   int `json:"integrationTests"`
		EdgeCases          int `json:"edgeCases"`
		ErrorHandlingTests int `json:"errorHandlingTests"`
	} `json:"summary"`
}

type GeminiRequest struct {
	APIKey           string `json:"apiKey"`
	CodeContext      string `json:"codeContext"`
	AdditionalPrompt string `json:"additionalPrompt,omitempty"`
}

// Files and directories to exclude when processing repository
var excludePatterns = []string{
	"node_modules", ".git", "dist", "build", "coverage", ".next", ".nuxt",
	".cache", "*.log", "*.tmp", ".DS_Store", "Thumbs.db", "*.min.js",
	"*.min.css", "package-lock.json", "yarn.lock", "pnpm-lock.yaml",
	"bun.lockb", ".env*", ".vscode", ".idea", "*.md", "LICENSE",
	"README*", ".gitignore", ".eslintrc*", ".prettierrc*", "tsconfig.json",
	"vite.config.*", "webpack.config.*", "rollup.config.*", "jest.config.*",
	"vitest.config.*", "cypress", "e2e", "__tests__", "test", "tests",
	"spec", "specs", "docs", "documentation", "assets", "images", "public", "static",
}

func shouldExcludeFile(filePath string) bool {
	pathParts := strings.Split(filePath, "/")

	for _, pattern := range excludePatterns {
		for _, part := range pathParts {
			if strings.Contains(pattern, "*") {
				regexPattern := strings.ReplaceAll(pattern, "*", ".*")
				matched, _ := regexp.MatchString(regexPattern, part)
				if matched {
					return true
				}
			} else if part == pattern || strings.HasPrefix(part, pattern) {
				return true
			}
		}
	}
	return false
}

func parseGitHubURL(url string) (string, string, error) {
	// Clean the URL to remove any file paths, branches, or specific files
	cleanURL := url

	// Remove /blob/ and everything after it
	if strings.Contains(cleanURL, "/blob/") {
		cleanURL = strings.Split(cleanURL, "/blob/")[0]
	}

	// Remove /tree/ and everything after it
	if strings.Contains(cleanURL, "/tree/") {
		cleanURL = strings.Split(cleanURL, "/tree/")[0]
	}

	// Remove trailing slash
	cleanURL = strings.TrimSuffix(cleanURL, "/")

	// Remove .git if present
	cleanURL = strings.TrimSuffix(cleanURL, ".git")

	// Extract owner and repo using regex
	re := regexp.MustCompile(`github\.com/([^/]+)/([^/]+)$`)
	matches := re.FindStringSubmatch(cleanURL)
	if len(matches) != 3 {
		return "", "", fmt.Errorf("invalid GitHub URL: %s", url)
	}

	owner := strings.TrimSpace(matches[1])
	repo := strings.TrimSpace(matches[2])

	// Validate that we have valid owner and repo
	if owner == "" || repo == "" {
		return "", "", fmt.Errorf("invalid GitHub URL: %s", url)
	}

	return owner, repo, nil
}

func cloneRepository(owner, repo, clonePath string) error {
	// Remove existing directory if it exists
	if _, err := os.Stat(clonePath); !os.IsNotExist(err) {
		os.RemoveAll(clonePath)
	}

	// Construct the proper GitHub clone URL
	repoURL := fmt.Sprintf("https://github.com/%s/%s.git", owner, repo)

	// Clone the repository
	cmd := exec.Command("git", "clone", "--depth", "1", repoURL, clonePath)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("failed to clone repository: %s, output: %s", err.Error(), string(output))
	}
	return nil
}

func readRepositoryFiles(repoPath string) ([]FileContent, error) {
	var files []FileContent

	err := filepath.Walk(repoPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		if info.IsDir() {
			return nil
		}

		// Get relative path
		relPath, err := filepath.Rel(repoPath, path)
		if err != nil {
			return err
		}

		// Check if file should be excluded
		if shouldExcludeFile(relPath) {
			return nil
		}

		// Check file size (less than 1MB)
		if info.Size() > 1024*1024 {
			return nil
		}

		// Check if it's a source code file or important config file
		ext := strings.ToLower(filepath.Ext(path))
		sourceExts := []string{".js", ".jsx", ".ts", ".tsx", ".py", ".java", ".cpp", ".c", ".cs", ".php", ".rb", ".go", ".rs", ".swift", ".kt", ".vue", ".svelte", ".html", ".css", ".scss", ".sass", ".less", ".json", ".yaml", ".yml", ".toml", ".ini", ".env", ".sql", ".sh", ".bat", ".ps1"}
		isSourceFile := false
		for _, sourceExt := range sourceExts {
			if ext == sourceExt {
				isSourceFile = true
				break
			}
		}

		// Also include files without extensions that might be important
		baseName := strings.ToLower(filepath.Base(path))
		importantFiles := []string{"dockerfile", "makefile", "readme", "license", "changelog", "contributing", "docker-compose", "package", "composer", "requirements", "pom", "gradle", "gemfile", "cargo", "go.mod", "go.sum"}
		for _, importantFile := range importantFiles {
			if strings.Contains(baseName, importantFile) {
				isSourceFile = true
				break
			}
		}

		if !isSourceFile {
			return nil
		}

		// Read file content
		content, err := os.ReadFile(path)
		if err != nil {
			log.Printf("Warning: Could not read file %s: %v", path, err)
			return nil
		}

		files = append(files, FileContent{
			Path:    relPath,
			Content: string(content),
			Size:    len(content),
		})

		return nil
	})

	return files, err
}

func generatePromptContext(files []FileContent) string {
	var context strings.Builder

	// Add header
	context.WriteString("=== REPOSITORY CODE CONTEXT FOR TEST GENERATION ===\n\n")
	context.WriteString("This context contains all source code files from the cloned repository.\n")
	context.WriteString("Generate comprehensive test cases based on the functions, methods, and logic found in these files.\n\n")
	context.WriteString("=== FILES ===\n\n")

	// Group files by type for better organization
	goFiles := []FileContent{}
	configFiles := []FileContent{}
	otherFiles := []FileContent{}

	for _, file := range files {
		ext := strings.ToLower(filepath.Ext(file.Path))
		if ext == ".go" {
			goFiles = append(goFiles, file)
		} else if ext == ".json" || ext == ".yaml" || ext == ".yml" || ext == ".toml" || ext == ".ini" || ext == ".env" || strings.Contains(strings.ToLower(file.Path), "go.mod") || strings.Contains(strings.ToLower(file.Path), "go.sum") {
			configFiles = append(configFiles, file)
		} else {
			otherFiles = append(otherFiles, file)
		}
	}

	// Add Go files first (most important for Go projects)
	if len(goFiles) > 0 {
		context.WriteString("=== GO SOURCE FILES ===\n\n")
		for _, file := range goFiles {
			context.WriteString(fmt.Sprintf("// File: %s\n%s\n\n---\n", file.Path, file.Content))
		}
	}

	// Add config files
	if len(configFiles) > 0 {
		context.WriteString("=== CONFIGURATION FILES ===\n\n")
		for _, file := range configFiles {
			context.WriteString(fmt.Sprintf("// File: %s\n%s\n\n---\n", file.Path, file.Content))
		}
	}

	// Add other files
	if len(otherFiles) > 0 {
		context.WriteString("=== OTHER FILES ===\n\n")
		for _, file := range otherFiles {
			context.WriteString(fmt.Sprintf("// File: %s\n%s\n\n---\n", file.Path, file.Content))
		}
	}

	context.WriteString("\n=== END OF CONTEXT ===\n")
	context.WriteString("Generate comprehensive test cases for the functions and methods found in the above code.\n")

	return context.String()
}

func cloneRepoHandler(w http.ResponseWriter, r *http.Request) {
	// Enable CORS for frontend on port 8080
	w.Header().Set("Access-Control-Allow-Origin", "http://localhost:8080")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	w.Header().Set("Access-Control-Allow-Credentials", "true")

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req RepoRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	if req.RepoURL == "" {
		http.Error(w, "Repository URL is required", http.StatusBadRequest)
		return
	}

	// Parse GitHub URL
	owner, repo, err := parseGitHubURL(req.RepoURL)
	if err != nil {
		http.Error(w, "Invalid GitHub URL", http.StatusBadRequest)
		return
	}

	log.Printf("Cloning repository: %s/%s", owner, repo)

	// Create repos directory if it doesn't exist
	reposDir := "repos"
	if err := os.MkdirAll(reposDir, 0755); err != nil {
		http.Error(w, "Failed to create repos directory", http.StatusInternalServerError)
		return
	}

	// Clone repository
	clonePath := filepath.Join(reposDir, fmt.Sprintf("%s-%s", owner, repo))
	if err := cloneRepository(owner, repo, clonePath); err != nil {
		log.Printf("Error cloning repository: %v", err)
		http.Error(w, fmt.Sprintf("Failed to clone repository: %v", err), http.StatusInternalServerError)
		return
	}

	// Read repository files
	files, err := readRepositoryFiles(clonePath)
	if err != nil {
		log.Printf("Error reading repository files: %v", err)
		http.Error(w, fmt.Sprintf("Failed to read repository files: %v", err), http.StatusInternalServerError)
		return
	}

	// Generate comprehensive prompt context
	context := generatePromptContext(files)

	// Save context to file
	contextPath := filepath.Join(reposDir, fmt.Sprintf("%s-%s-context.txt", owner, repo))
	if err := os.WriteFile(contextPath, []byte(context), 0644); err != nil {
		log.Printf("Error saving context file: %v", err)
		http.Error(w, "Failed to save context file", http.StatusInternalServerError)
		return
	}

	log.Printf("Context saved to: %s", contextPath)
	log.Printf("Context size: %d characters", len(context))

	// Clean up cloned directory
	os.RemoveAll(clonePath)

	// Prepare response
	response := RepoResponse{
		Success:     true,
		Message:     "Repository cloned successfully",
		FilesCount:  len(files),
		ContextPath: contextPath,
		Files:       files,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)

	log.Printf("Successfully processed repository %s/%s: %d files", owner, repo, len(files))
}

func getContextHandler(w http.ResponseWriter, r *http.Request) {
	// Enable CORS for frontend on port 8080
	w.Header().Set("Access-Control-Allow-Origin", "http://localhost:8080")
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	w.Header().Set("Access-Control-Allow-Credentials", "true")

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	// Extract owner and repo from URL path
	path := strings.TrimPrefix(r.URL.Path, "/api/context/")
	parts := strings.Split(path, "/")
	if len(parts) != 2 {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}

	owner, repo := parts[0], parts[1]
	contextPath := filepath.Join("repos", fmt.Sprintf("%s-%s-context.txt", owner, repo))

	// Check if context file exists
	if _, err := os.Stat(contextPath); os.IsNotExist(err) {
		http.Error(w, "Context file not found", http.StatusNotFound)
		return
	}

	// Read context file
	content, err := os.ReadFile(contextPath)
	if err != nil {
		http.Error(w, "Failed to read context file", http.StatusInternalServerError)
		return
	}

	response := map[string]string{
		"context": string(content),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func generateTestsHandler(w http.ResponseWriter, r *http.Request) {
	// Enable CORS for frontend on port 8080
	w.Header().Set("Access-Control-Allow-Origin", "http://localhost:8080")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	w.Header().Set("Access-Control-Allow-Credentials", "true")

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req GeminiRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	if req.APIKey == "" {
		http.Error(w, "API Key is required", http.StatusBadRequest)
		return
	}

	if req.CodeContext == "" {
		http.Error(w, "Code context is required", http.StatusBadRequest)
		return
	}

	// Generate prompt for Gemini
	prompt := fmt.Sprintf(`
You are an expert software testing engineer. Analyze the provided code and generate comprehensive test cases.

Code Context:
%s

%s

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

Return only valid JSON, no additional text or markdown formatting.`, req.CodeContext, req.AdditionalPrompt)

	// Call Gemini API
	geminiURL := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=%s", req.APIKey)

	requestBody := map[string]interface{}{
		"contents": []map[string]interface{}{
			{
				"parts": []map[string]interface{}{
					{
						"text": prompt,
					},
				},
			},
		},
		"generationConfig": map[string]interface{}{
			"temperature":     0.7,
			"topK":            40,
			"topP":            0.95,
			"maxOutputTokens": 8192,
		},
	}

	jsonBody, err := json.Marshal(requestBody)
	if err != nil {
		http.Error(w, "Failed to marshal request", http.StatusInternalServerError)
		return
	}

	resp, err := http.Post(geminiURL, "application/json", bytes.NewBuffer(jsonBody))
	if err != nil {
		log.Printf("Error calling Gemini API: %v", err)
		http.Error(w, "Failed to call Gemini API", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		http.Error(w, "Failed to read Gemini response", http.StatusInternalServerError)
		return
	}

	if resp.StatusCode != http.StatusOK {
		log.Printf("Gemini API error: %s", string(body))
		http.Error(w, fmt.Sprintf("Gemini API error: %s", string(body)), http.StatusInternalServerError)
		return
	}

	var geminiResp map[string]interface{}
	if err := json.Unmarshal(body, &geminiResp); err != nil {
		http.Error(w, "Failed to parse Gemini response", http.StatusInternalServerError)
		return
	}

	// Extract the generated text
	candidates, ok := geminiResp["candidates"].([]interface{})
	if !ok || len(candidates) == 0 {
		http.Error(w, "Invalid Gemini response format", http.StatusInternalServerError)
		return
	}

	candidate, ok := candidates[0].(map[string]interface{})
	if !ok {
		http.Error(w, "Invalid candidate format", http.StatusInternalServerError)
		return
	}

	content, ok := candidate["content"].(map[string]interface{})
	if !ok {
		http.Error(w, "Invalid content format", http.StatusInternalServerError)
		return
	}

	parts, ok := content["parts"].([]interface{})
	if !ok || len(parts) == 0 {
		http.Error(w, "Invalid parts format", http.StatusInternalServerError)
		return
	}

	part, ok := parts[0].(map[string]interface{})
	if !ok {
		http.Error(w, "Invalid part format", http.StatusInternalServerError)
		return
	}

	generatedText, ok := part["text"].(string)
	if !ok {
		http.Error(w, "Invalid text format", http.StatusInternalServerError)
		return
	}

	// Extract JSON from the response
	jsonStart := strings.Index(generatedText, "{")
	jsonEnd := strings.LastIndex(generatedText, "}")
	if jsonStart == -1 || jsonEnd == -1 || jsonStart >= jsonEnd {
		log.Printf("No valid JSON found in Gemini response: %s", generatedText)
		http.Error(w, "No valid JSON found in Gemini response", http.StatusInternalServerError)
		return
	}

	jsonStr := generatedText[jsonStart : jsonEnd+1]
	log.Printf("Extracted JSON: %s", jsonStr)

	var testResponse GeminiResponse
	if err := json.Unmarshal([]byte(jsonStr), &testResponse); err != nil {
		log.Printf("Error parsing test response: %v", err)
		log.Printf("JSON string: %s", jsonStr)
		http.Error(w, fmt.Sprintf("Failed to parse test cases from Gemini response: %v", err), http.StatusInternalServerError)
		return
	}

	// Add unique IDs if missing
	for i, testCase := range testResponse.TestCases {
		if testCase.ID == "" {
			testResponse.TestCases[i].ID = fmt.Sprintf("test_%d", i+1)
		}
		if testCase.TestType == "" {
			testResponse.TestCases[i].TestType = "unit"
		}
		if testCase.Priority == "" {
			testResponse.TestCases[i].Priority = "medium"
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(testResponse)
}

func main() {
	// Create repos directory
	if err := os.MkdirAll("repos", 0755); err != nil {
		log.Fatal("Failed to create repos directory:", err)
	}

	// Set up routes
	http.HandleFunc("/api/clone-repo", cloneRepoHandler)
	http.HandleFunc("/api/context/", getContextHandler)
	http.HandleFunc("/api/generate-tests", generateTestsHandler)

	// Serve static files from the frontend
	http.Handle("/", http.FileServer(http.Dir("../dist")))

	log.Println("Server starting on :3001")
	log.Fatal(http.ListenAndServe(":3001", nil))
}
