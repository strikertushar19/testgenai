# TestGen - AI-Powered Test Case Generator

TestGen is a comprehensive AI-powered test case generation platform that automatically creates and executes test cases for your code repositories using Google's Gemini AI. The system consists of a React frontend and a Go backend that work together to clone repositories, analyze code, and generate comprehensive test suites.

## 🎥 Demo & Live Application

- **📹 Demo Video**: [Watch TestGen in Action](https://drive.google.com/file/d/1oe_iXDBiUjaP40NkFQlxKrJ40jFhGJJA)
- **🌐 Live Application**: [Try TestGen Online](https://testgenai-psi.vercel.app/)

## 🚀 Quick Start

1. **Watch the Demo**: See TestGen in action with the demo video above
2. **Try Online**: Use the live application to test without installation
3. **Local Setup**: Follow the setup instructions below for development

## 🏗️ Architecture Overview

```
┌─────────────────┐    HTTP/API    ┌─────────────────┐    Gemini API    ┌─────────────────┐
│   Frontend      │◄──────────────►│   Backend       │◄────────────────►│   Google AI     │
│   (React/Vite)  │                │   (Go)          │                  │   (Gemini)      │
└─────────────────┘                └─────────────────┘                  └─────────────────┘
        │                                   │
        │                                   │
        ▼                                   ▼
┌─────────────────┐                ┌─────────────────┐
│   Test Runner   │                │   Git Clone     │
│   (JavaScript)  │                │   File Reader   │
└─────────────────┘                └─────────────────┘
```

## 📁 Project Structure

```
hackathons/
├── testgen/                    # Frontend (React + Vite + TypeScript)
│   ├── src/
│   │   ├── components/         # UI Components
│   │   │   ├── TestRunner.tsx  # Test execution engine
│   │   │   ├── ResultsDisplay.tsx
│   │   │   └── ui/             # shadcn/ui components
│   │   ├── pages/
│   │   │   └── Dashboard.tsx   # Main application page
│   │   ├── lib/
│   │   │   ├── api.ts          # Backend API service
│   │   │   ├── gemini.ts       # Gemini integration
│   │   │   └── git-clone.ts    # Git utilities
│   │   └── hooks/              # React hooks
│   ├── package.json
│   └── vite.config.ts
├── testgen-backend/            # Backend (Go)
│   ├── main.go                 # Main server file
│   ├── go.mod                  # Go dependencies
│   └── repos/                  # Cloned repositories (temporary)
└── README.md                   # This file
```

## 🚀 Frontend Architecture (testgen/)

### Technology Stack
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI component library
- **Lucide React** - Icons

### Key Components

#### 1. Dashboard (`src/pages/Dashboard.tsx`)
The main application interface with four tabs:
- **Generate**: Repository cloning and test generation
- **Execute**: Test execution and results
- **Results**: Test results visualization
- **Settings**: API key configuration

#### 2. TestRunner (`src/components/TestRunner.tsx`)
Advanced test execution engine with:
- **Mock Function Library**: Pre-defined functions for common operations
- **Smart Function Detection**: Automatically detects which function to test
- **Real-time Execution**: Executes tests with progress tracking
- **Result Validation**: Compares actual vs expected results

#### 3. API Service (`src/lib/api.ts`)
Centralized backend communication:
- `ApiService.cloneRepository()` - Clone GitHub repositories
- `ApiService.generateTests()` - Generate test cases via Gemini
- `ApiService.getContext()` - Retrieve repository context

### Mock Functions Available
The test runner includes comprehensive mock functions:
```javascript
// User Management
CreateUser(userData)           // Create user with validation
Login(credentials)             // User authentication
GetUserProfile(currentUser)    // Get user profile

// Utility Functions
validateEmail(email)           // Email validation
calculateSum(a, b)             // Basic math
fetchData(url)                 // Mock API calls
saveToDatabase(data)           // Database operations
```

## 🔧 Backend Architecture (testgen-backend/)

### Technology Stack
- **Go 1.21+** - Server language
- **Standard Library** - HTTP server, file operations
- **Git** - Repository cloning
- **Google Gemini API** - AI test generation

### API Endpoints

#### 1. Repository Cloning (`POST /api/clone-repo`)
```json
Request:
{
  "repoUrl": "https://github.com/username/repository"
}

Response:
{
  "success": true,
  "message": "Repository cloned successfully",
  "filesCount": 25,
  "contextPath": "repos/username-repo-context.txt",
  "files": [...]
}
```

#### 2. Test Generation (`POST /api/generate-tests`)
```json
Request:
{
  "apiKey": "your-gemini-api-key",
  "codeContext": "repository code context...",
  "additionalPrompt": "Generate unit tests"
}

Response:
{
  "testCases": [
    {
      "id": "test_1",
      "name": "Test Case Name",
      "description": "Test description",
      "input": {...},
      "expected": {...},
      "code": "function to test",
      "testType": "unit",
      "priority": "high"
    }
  ],
  "summary": {
    "totalTests": 10,
    "unitTests": 8,
    "integrationTests": 2
  }
}
```

#### 3. Context Retrieval (`GET /api/context/{owner}/{repo}`)
Returns the generated context file for a repository.

### Key Features

#### 1. Smart Repository Cloning
- **URL Parsing**: Handles various GitHub URL formats
- **File Filtering**: Includes source code, config, and important files
- **Size Limits**: Excludes large files (>1MB)
- **Extension Support**: Go, JavaScript, TypeScript, Python, Java, etc.

#### 2. Context Generation
Creates comprehensive context files with:
- **Organized Structure**: Files grouped by type
- **Clear Headers**: Easy to read sections
- **Complete Coverage**: All relevant files included

#### 3. CORS Configuration
Properly configured for frontend communication:
```go
w.Header().Set("Access-Control-Allow-Origin", "http://localhost:8080")
w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
```

## 🔄 Workflow

### 1. Repository Analysis
```
User Input → URL Validation → Git Clone → File Reading → Context Generation
```

### 2. Test Generation
```
Context + API Key → Gemini API → Test Cases → Frontend Display
```

### 3. Test Execution
```
Test Cases → Mock Functions → Execution → Result Validation → Display
```

## 🚀 Getting Started

### Option 1: Try Online (Recommended)
- **🌐 Live Demo**: [testgenai-psi.vercel.app](https://testgenai-psi.vercel.app/)
- **📹 Video Demo**: [Watch TestGen in Action](https://drive.google.com/file/d/1oe_iXDBiUjaP40NkFQlxKrJ40jFhGJJA)
- No installation required - just add your Gemini API key and start generating tests!

### Option 2: Local Development Setup

#### Prerequisites
- Node.js 18+
- Go 1.21+
- Git
- Google Gemini API Key

#### Frontend Setup
```bash
cd testgen/
npm install
npm run dev
# Runs on http://localhost:8080
```

#### Backend Setup
```bash
cd testgen-backend/
go mod tidy
go run main.go
# Runs on http://localhost:3001
```

### Usage
1. **Enter API Key**: Add your Gemini API key in Settings
2. **Clone Repository**: Enter GitHub URL and click "Clone Repository"
3. **Generate Tests**: Click "Generate Test Cases" to create tests
4. **Execute Tests**: Run tests in the Execute tab
5. **View Results**: See results in the Results tab

## 🎯 Key Features

### AI-Powered Test Generation
- **Comprehensive Coverage**: Unit, integration, edge case, and error handling tests
- **Smart Analysis**: Understands code structure and generates relevant tests
- **Multiple Languages**: Supports Go, JavaScript, TypeScript, Python, Java, etc.

### Advanced Test Execution
- **Mock Functions**: Pre-built functions for common operations
- **Real-time Execution**: Live test execution with progress tracking
- **Result Validation**: Automatic comparison of actual vs expected results
- **Error Handling**: Comprehensive error reporting and debugging

### User-Friendly Interface
- **Modern UI**: Clean, responsive design with Tailwind CSS
- **Real-time Updates**: Live progress and status updates
- **Comprehensive Results**: Detailed test results and analytics
- **Easy Configuration**: Simple API key setup

## 🔧 Configuration

### Environment Variables
- `GEMINI_API_KEY`: Your Google Gemini API key
- `PORT`: Backend port (default: 3001)
- `FRONTEND_URL`: Frontend URL for CORS (default: http://localhost:8080)

### File Limits
- **Max File Size**: 1MB per file
- **Max Files**: No limit (but large repositories may take time)
- **Supported Extensions**: 20+ programming languages

## 🐛 Troubleshooting

### Common Issues
1. **CORS Errors**: Ensure backend is running on port 3001
2. **Clone Failures**: Check repository URL format and accessibility
3. **API Errors**: Verify Gemini API key is valid
4. **Test Execution**: Ensure mock functions cover your use case

### Debug Mode
Enable detailed logging in the backend by checking console output for:
- Repository cloning progress
- File reading statistics
- API call details
- Error messages

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **Google Gemini AI** - For powerful test generation capabilities
- **shadcn/ui** - For beautiful UI components
- **Vite** - For fast development experience
- **Go** - For robust backend performance
- **Vercel** - For hosting the live application

## 🔗 Links

- **🌐 Live Application**: [testgenai-psi.vercel.app](https://testgenai-psi.vercel.app/)
- **📹 Demo Video**: [Watch TestGen in Action](https://drive.google.com/file/d/1oe_iXDBiUjaP40NkFQlxKrJ40jFhGJJA)
- **📚 Documentation**: This README file

---

**TestGen** - Making test case generation as easy as cloning a repository! 🚀
