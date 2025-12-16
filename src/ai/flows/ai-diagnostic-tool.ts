'use server';

/**
 * @fileOverview An AI diagnostic tool for forklift maintenance.
 *
 * - aiDiagnosticTool - A function that provides potential solutions to forklift problems based on a description of the issue.
 * - AIDiagnosticToolInput - The input type for the aiDiagnosticTool function.
 * - AIDiagnosticToolOutput - The return type for the aiDiagnosticTool function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AIDiagnosticToolInputSchema = z.object({
  issueDescription: z.string().describe('A description of the forklift issue.'),
});
export type AIDiagnosticToolInput = z.infer<typeof AIDiagnosticToolInputSchema>;

const AIDiagnosticToolOutputSchema = z.object({
  potentialSolutions: z.string().describe('Potential solutions to the forklift problem.'),
});
export type AIDiagnosticToolOutput = z.infer<typeof AIDiagnosticToolOutputSchema>;

export async function aiDiagnosticTool(input: AIDiagnosticToolInput): Promise<AIDiagnosticToolOutput> {
  return aiDiagnosticToolFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aiDiagnosticToolPrompt',
  input: {schema: AIDiagnosticToolInputSchema},
  output: {schema: AIDiagnosticToolOutputSchema},
  prompt: `You are an expert forklift mechanic. Based on the following description of the forklift issue, provide potential solutions to resolve the problem.\n\nIssue Description: {{{issueDescription}}}`,
});

const aiDiagnosticToolFlow = ai.defineFlow(
  {
    name: 'aiDiagnosticToolFlow',
    inputSchema: AIDiagnosticToolInputSchema,
    outputSchema: AIDiagnosticToolOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
