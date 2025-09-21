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

export async function generateTestCasesWithGemini(
  apiKey: string,
  codeContext: string,
  additionalPrompt?: string
): Promise<GeminiResponse> {
  const prompt = `
You are an expert software testing engineer. Analyze the provided code and generate comprehensive test cases.

Code Context:
${codeContext}

${additionalPrompt ? `Additional Requirements: ${additionalPrompt}` : ''}

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

Return only valid JSON, no additional text or markdown formatting.
`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`, {
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
