'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { aiDiagnosticTool } from '@/ai/flows/ai-diagnostic-tool';
import { Bot, Sparkles } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function DiagnosticsPage() {
  const [issueDescription, setIssueDescription] = useState('');
  const [potentialSolutions, setPotentialSolutions] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueDescription) {
      setError('Please describe the issue.');
      return;
    }
    setIsLoading(true);
    setError('');
    setPotentialSolutions('');

    try {
      const result = await aiDiagnosticTool({ issueDescription });
      setPotentialSolutions(result.potentialSolutions);
    } catch (err) {
      setError('Failed to get diagnostics. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">AI Diagnostic Tool</h1>
            <p className="text-muted-foreground">Describe the forklift issue to get potential solutions from our AI expert.</p>
          </div>
        </div>
      <div className="grid md:grid-cols-2 gap-8 items-start">
        <Card>
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle>Describe the Issue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2">
                <Label htmlFor="issue">Issue Description</Label>
                <Textarea
                  id="issue"
                  value={issueDescription}
                  onChange={(e) => setIssueDescription(e.target.value)}
                  placeholder="e.g., 'The forklift is making a loud grinding noise when lifting...'"
                  className="min-h-48"
                  aria-required="true"
                />
              </div>
              {error && 
                <Alert variant="destructive" className="mt-4">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              }
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Analyzing...' : 'Get Diagnosis'}
                <Sparkles className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </form>
        </Card>
        <Card className="bg-muted/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Potential Solutions
            </CardTitle>
            <CardDescription>AI-generated suggestions will appear here.</CardDescription>
          </CardHeader>
          <CardContent className="min-h-[260px]">
            {isLoading && (
              <div className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            )}
            {potentialSolutions && (
              <div className="prose prose-sm max-w-none text-foreground">
                {potentialSolutions.split('\n').map((line, index) => (
                  line.trim() !== '' && <p key={index}>{line}</p>
                ))}
              </div>
            )}
            {!isLoading && !potentialSolutions && (
              <div className="text-center text-muted-foreground py-8">
                <p>Results will be displayed here.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
