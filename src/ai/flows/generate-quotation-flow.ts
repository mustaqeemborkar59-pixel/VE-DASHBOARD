'use server';
/**
 * @fileOverview AI Quotation Generation Flow.
 *
 * - generateQuotation - Handles transforming user requirements into a professional quotation.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { googleAI } from '@genkit-ai/google-genai';

const QuotationItemSchema = z.object({
  description: z.string().describe('Name or description of the product or service.'),
  quantity: z.number().describe('Number of units.'),
  unitPrice: z.number().describe('Price per unit in INR.'),
  total: z.number().describe('Total price for this item.'),
});

const QuotationOutputSchema = z.object({
  quotationNumber: z.string().describe('Suggested quotation number in format QT-YYYY-XXX.'),
  date: z.string().describe('Current date in YYYY-MM-DD format.'),
  clientName: z.string().describe('Name of the client.'),
  items: z.array(QuotationItemSchema).describe('List of items in the quotation.'),
  subtotal: z.number().describe('Sum of all item totals.'),
  gstPercent: z.number().describe('GST percentage applied.'),
  gstAmount: z.number().describe('Total GST amount in INR.'),
  grandTotal: z.number().describe('Total amount including GST.'),
  terms: z.string().describe('Professional terms and conditions for this quotation.'),
});

export type QuotationOutput = z.infer<typeof QuotationOutputSchema>;

const generateQuotationPrompt = ai.definePrompt({
  name: 'generateQuotationPrompt',
  model: googleAI('gemini-1.5-flash-latest'),
  input: {
    schema: z.object({
      description: z.string(),
      currentYear: z.string(),
    }),
  },
  output: {
    schema: QuotationOutputSchema,
  },
  system: `You are a professional business manager for a forklift workshop named "VE Enterprises".
Your goal is to generate a professional quotation based on user requirements.
- Use Indian Rupees (INR) for all prices.
- Be precise with calculations.
- If quantity or price is missing, suggest standard industry rates.
- Terms and conditions should be professional and relevant to forklift services/rentals.`,
  prompt: `Generate a professional quotation for the following requirements:
{{{description}}}

Use the year {{{currentYear}}} for the quotation number.`,
});

export async function generateQuotation(description: string): Promise<QuotationOutput> {
  const currentYear = new Date().getFullYear().toString();
  const { output } = await generateQuotationPrompt({ description, currentYear });
  if (!output) throw new Error('AI failed to generate quotation.');
  return output;
}