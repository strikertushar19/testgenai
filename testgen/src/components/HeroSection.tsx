import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Sparkles, Zap, Shield } from "lucide-react";

const HeroSection = () => {
  return (
    <section className="relative overflow-hidden py-20 lg:py-32">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5" />
      
      <div className="container relative">
        <div className="mx-auto max-w-4xl text-center">
          <Badge variant="secondary" className="mb-6 px-4 py-2">
            <Sparkles className="mr-2 h-4 w-4" />
            Powered by AI
          </Badge>
          
          <h1 className="mb-6 text-4xl font-bold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
            Generate Perfect{" "}
            <span className="bg-gradient-hero bg-clip-text text-transparent">
              Test Cases
            </span>{" "}
            in Seconds
          </h1>
          
          <p className="mb-8 text-xl text-muted-foreground sm:text-2xl">
            Transform your code into comprehensive test suites with AI. 
            Paste your code, get intelligent test cases with edge cases and scenarios.
          </p>
          
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button size="lg" className="bg-gradient-primary hover:opacity-90 text-lg px-8 py-4" asChild>
              <a href="/dashboard">
                Start Testing Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </a>
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8 py-4">
              View Demo
            </Button>
          </div>
          
          <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Lightning Fast</h3>
              <p className="text-muted-foreground">Generate comprehensive test cases in seconds, not hours</p>
            </div>
            
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-success/10">
                <Sparkles className="h-6 w-6 text-success" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">AI-Powered</h3>
              <p className="text-muted-foreground">Smart edge case detection and scenario generation</p>
            </div>
            
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
                <Shield className="h-6 w-6 text-accent" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Comprehensive</h3>
              <p className="text-muted-foreground">Unit tests, integration tests, and edge cases covered</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;