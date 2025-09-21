import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  BarChart3, 
  Download,
  Filter,
  Search
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

interface ResultsDisplayProps {
  testCases: TestCase[];
}

const ResultsDisplay = ({ testCases }: ResultsDisplayProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Calculate statistics
  const totalTests = testCases.length;
  const passedTests = testCases.filter(t => t.status === 'passed').length;
  const failedTests = testCases.filter(t => t.status === 'failed').length;
  const pendingTests = testCases.filter(t => t.status === 'pending').length;
  const avgDuration = testCases.filter(t => t.duration)
    .reduce((acc, t) => acc + (t.duration || 0), 0) / testCases.filter(t => t.duration).length;

  // Filter tests
  const filteredTests = testCases.filter(test => {
    const matchesSearch = test.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || test.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const exportResults = () => {
    const csvContent = [
      ["Test Name", "Status", "Input", "Expected", "Result", "Error", "Duration (ms)"],
      ...testCases.map(test => [
        test.name,
        test.status,
        JSON.stringify(test.input),
        JSON.stringify(test.expected),
        JSON.stringify(test.result),
        test.error || "",
        test.duration?.toFixed(2) || ""
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `test-results-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Tests</p>
                <p className="text-2xl font-bold">{totalTests}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Passed</p>
                <p className="text-2xl font-bold text-green-600">{passedTests}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Failed</p>
                <p className="text-2xl font-bold text-red-600">{failedTests}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Time</p>
                <p className="text-2xl font-bold">
                  {isNaN(avgDuration) ? "0" : avgDuration.toFixed(1)}ms
                </p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Results Display */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Test Results</CardTitle>
            <Button onClick={exportResults} variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="list" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="list">List View</TabsTrigger>
              <TabsTrigger value="postman">Postman View</TabsTrigger>
            </TabsList>

            <TabsContent value="list" className="space-y-4">
              {/* Filters */}
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search test cases..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="passed">Passed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <ScrollArea className="h-[600px]">
                <div className="space-y-4">
                  {filteredTests.length === 0 ? (
                    <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                      No test results match your filters
                    </div>
                  ) : (
                    filteredTests.map((test, index) => (
                      <div key={test.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline">#{index + 1}</Badge>
                            <h4 className="font-medium">{test.name}</h4>
                          </div>
                          <div className="flex items-center gap-2">
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
                            {test.duration && (
                              <Badge variant="outline" className="text-xs">
                                {test.duration.toFixed(2)}ms
                              </Badge>
                            )}
                          </div>
                        </div>

                        <Separator />

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <div className="font-medium text-muted-foreground mb-1">Input:</div>
                            <code className="bg-muted p-2 rounded text-xs block overflow-x-auto">
                              {JSON.stringify(test.input, null, 2)}
                            </code>
                          </div>
                          <div>
                            <div className="font-medium text-muted-foreground mb-1">Expected:</div>
                            <code className="bg-muted p-2 rounded text-xs block overflow-x-auto">
                              {JSON.stringify(test.expected, null, 2)}
                            </code>
                          </div>
                          <div>
                            <div className="font-medium text-muted-foreground mb-1">Result:</div>
                            <code className={`p-2 rounded text-xs block overflow-x-auto ${
                              test.status === 'passed' ? 'bg-green-50 text-green-700 border border-green-200' :
                              test.status === 'failed' ? 'bg-red-50 text-red-700 border border-red-200' :
                              'bg-muted'
                            }`}>
                              {test.error ? test.error : test.result !== undefined ? JSON.stringify(test.result, null, 2) : 'N/A'}
                            </code>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="postman" className="space-y-4">
              <ScrollArea className="h-[600px]">
                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-4 p-3 bg-muted rounded-lg font-medium text-sm">
                    <div className="col-span-1">#</div>
                    <div className="col-span-3">Test Name</div>
                    <div className="col-span-2">Status</div>
                    <div className="col-span-2">Input</div>
                    <div className="col-span-2">Expected</div>
                    <div className="col-span-2">Result</div>
                  </div>
                  
                  {filteredTests.map((test, index) => (
                    <div key={test.id} className={`grid grid-cols-12 gap-4 p-3 border rounded-lg text-sm ${
                      test.status === 'passed' ? 'bg-green-50 border-green-200' :
                      test.status === 'failed' ? 'bg-red-50 border-red-200' :
                      'bg-background'
                    }`}>
                      <div className="col-span-1 font-mono">{index + 1}</div>
                      <div className="col-span-3 font-medium truncate" title={test.name}>
                        {test.name}
                      </div>
                      <div className="col-span-2">
                        <Badge 
                          variant={
                            test.status === 'passed' ? 'default' : 
                            test.status === 'failed' ? 'destructive' :
                            test.status === 'running' ? 'secondary' : 'outline'
                          }
                          className="text-xs"
                        >
                          {test.status === 'passed' && <CheckCircle className="mr-1 h-3 w-3" />}
                          {test.status === 'failed' && <XCircle className="mr-1 h-3 w-3" />}
                          {test.status}
                        </Badge>
                      </div>
                      <div className="col-span-2">
                        <code className="text-xs bg-background px-1 rounded">
                          {JSON.stringify(test.input)}
                        </code>
                      </div>
                      <div className="col-span-2">
                        <code className="text-xs bg-background px-1 rounded">
                          {JSON.stringify(test.expected)}
                        </code>
                      </div>
                      <div className="col-span-2">
                        <code className="text-xs bg-background px-1 rounded">
                          {test.error ? `Error: ${test.error}` : 
                           test.result !== undefined ? JSON.stringify(test.result) : 'N/A'}
                        </code>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResultsDisplay;