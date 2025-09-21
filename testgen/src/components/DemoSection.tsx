import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, Code, FileText, Play } from "lucide-react";

const DemoSection = () => {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container">
        <div className="mx-auto max-w-4xl text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl mb-4">
            How TestGen AI Works
          </h2>
          <p className="text-xl text-muted-foreground">
            From code to comprehensive test cases in three simple steps
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Input Code Demo */}
          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <Code className="h-4 w-4 text-primary" />
                </div>
                <CardTitle className="text-lg">1. Paste Your Code</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-code-bg p-4 text-sm font-mono">
                <span className="text-code-keyword">function</span>{" "}
                <span className="text-code-text">calculateTotal(items, tax) {"{"}</span>
                <br />
                <span className="text-code-comment ml-4">{"  // Calculate sum with tax"}</span>
                <br />
                <span className="text-code-keyword ml-4">  const</span>{" "}
                <span className="text-code-text">subtotal = items.reduce((sum, item) =&gt;</span>
                <br />
                <span className="text-code-text ml-8">    sum + item.price, 0);</span>
                <br />
                <span className="text-code-keyword ml-4">  return</span>{" "}
                <span className="text-code-text">subtotal * (1 + tax);</span>
                <br />
                <span className="text-code-text">{"}"}</span>
              </div>
              <Button className="w-full bg-gradient-primary hover:opacity-90">
                <Play className="mr-2 h-4 w-4" />
                Generate Test Cases
              </Button>
            </CardContent>
          </Card>

          {/* Generated Test Cases Demo */}
          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/10">
                  <FileText className="h-4 w-4 text-success" />
                </div>
                <CardTitle className="text-lg">2. AI Generates Tests</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                  <div className="text-sm">
                    <div className="font-medium">Basic calculation</div>
                    <div className="text-muted-foreground">items: [{"{"}&quot;price: 10&quot;{"}"}, {"{"}&quot;price: 20&quot;{"}"}], tax: 0.1</div>
                  </div>
                  <Badge variant="outline" className="text-success border-success">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Pass
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                  <div className="text-sm">
                    <div className="font-medium">Empty array edge case</div>
                    <div className="text-muted-foreground">items: [], tax: 0.1</div>
                  </div>
                  <Badge variant="outline" className="text-success border-success">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Pass
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                  <div className="text-sm">
                    <div className="font-medium">Zero tax scenario</div>
                    <div className="text-muted-foreground">items: [{"{"}&quot;price: 100&quot;{"}"}], tax: 0</div>
                  </div>
                  <Badge variant="outline" className="text-success border-success">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Pass
                  </Badge>
                </div>
              </div>
              
              <div className="text-center pt-2">
                <Badge variant="secondary">
                  <CheckCircle className="mr-1 h-3 w-3" />
                  12 test cases generated
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-12">
          <p className="text-muted-foreground mb-6">
            Ready to supercharge your testing workflow?
          </p>
          <Button size="lg" className="bg-gradient-primary hover:opacity-90">
            Try TestGen AI Free
          </Button>
        </div>
      </div>
    </section>
  );
};

export default DemoSection;