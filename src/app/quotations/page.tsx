'use client';

import React, { useState } from 'react';
import AppLayout from "@/components/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useFirebase, useUser } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';
import { generateQuotation, QuotationOutput } from '@/ai/flows/generate-quotation-flow';
import { Loader2, Sparkles, Save, Download, FileText, Send } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

export default function QuotationsPage() {
  const { firestore } = useFirebase();
  const { user } = useUser();
  const { toast } = useToast();

  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [quotation, setQuotation] = useState<QuotationOutput | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({ variant: 'destructive', title: 'Empty Input', description: 'Please describe your quotation requirements.' });
      return;
    }

    setIsGenerating(true);
    setQuotation(null);

    try {
      const result = await generateQuotation(prompt);
      setQuotation(result);
      toast({ title: 'Success', description: 'AI has generated your quotation.' });
    } catch (error: any) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Generation Failed', description: error.message || 'AI was unable to process your request.' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!firestore || !user || !quotation) return;

    setIsSaving(true);
    try {
      const quotationsCol = collection(firestore, 'quotations');
      await addDocumentNonBlocking(quotationsCol, {
        ...quotation,
        createdBy: user.uid,
        createdAt: new Date().toISOString(),
      });
      toast({ title: 'Quotation Saved', description: 'Your estimate has been stored in the database.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Save Error', description: 'Could not save the quotation.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!quotation) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('VE ENTERPRISES', pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('QUOTATION / ESTIMATE', pageWidth / 2, 28, { align: 'center' });

    doc.line(15, 35, pageWidth - 15, 35);

    // Info
    doc.setFontSize(10);
    doc.text(`Quotation No: ${quotation.quotationNumber}`, 15, 45);
    doc.text(`Date: ${format(parseISO(quotation.date), 'dd MMM yyyy')}`, pageWidth - 15, 45, { align: 'right' });
    
    doc.setFont('helvetica', 'bold');
    doc.text('To:', 15, 55);
    doc.setFont('helvetica', 'normal');
    doc.text(quotation.clientName, 15, 60);

    // Items Table
    const tableBody = quotation.items.map(item => [
      item.description,
      item.quantity.toString(),
      item.unitPrice.toLocaleString('en-IN'),
      item.total.toLocaleString('en-IN')
    ]);

    autoTable(doc, {
      startY: 70,
      head: [['Description', 'Qty', 'Unit Price', 'Total']],
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: [40, 40, 40] },
      columnStyles: {
        1: { halign: 'center' },
        2: { halign: 'right' },
        3: { halign: 'right' },
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;

    // Totals
    doc.text(`Subtotal:`, pageWidth - 60, finalY);
    doc.text(`INR ${quotation.subtotal.toLocaleString('en-IN')}`, pageWidth - 15, finalY, { align: 'right' });
    
    doc.text(`GST (${quotation.gstPercent}%):`, pageWidth - 60, finalY + 7);
    doc.text(`INR ${quotation.gstAmount.toLocaleString('en-IN')}`, pageWidth - 15, finalY + 7, { align: 'right' });
    
    doc.setFont('helvetica', 'bold');
    doc.text(`Grand Total:`, pageWidth - 60, finalY + 14);
    doc.text(`INR ${quotation.grandTotal.toLocaleString('en-IN')}`, pageWidth - 15, finalY + 14, { align: 'right' });

    // Terms
    doc.setFont('helvetica', 'bold');
    doc.text('Terms & Conditions:', 15, finalY + 25);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const splitTerms = doc.splitTextToSize(quotation.terms, pageWidth - 30);
    doc.text(splitTerms, 15, finalY + 30);

    doc.save(`Quotation_${quotation.quotationNumber}.pdf`);
    toast({ title: 'PDF Ready', description: 'Your document has been downloaded.' });
  };

  const parseISO = (dateStr: string) => {
    try {
      return new Date(dateStr);
    } catch (e) {
      return new Date();
    }
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 animate-in fade-in duration-500">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-primary" />
            AI Quotation Generator
          </h1>
          <p className="text-muted-foreground text-sm uppercase font-bold tracking-widest">Transform requirements into professional estimates instantly.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Input Panel */}
          <Card className="lg:col-span-1 shadow-md border-primary/10">
            <CardHeader>
              <CardTitle className="text-lg">Describe Requirements</CardTitle>
              <CardDescription>Tell AI about the client, parts, labor, or rental duration.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="prompt">Instructions</Label>
                <Textarea 
                  id="prompt"
                  placeholder="e.g., Create a quotation for Bisleri International for 2 months rental of Toyota 2.5 Ton Forklift at 45,000 per month plus 18% GST. Include terms for operator overtime."
                  className="min-h-[200px] text-sm resize-none"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />
              </div>
              <Button 
                onClick={handleGenerate} 
                disabled={isGenerating} 
                className="w-full h-11 font-bold shadow-lg shadow-primary/20"
              >
                {isGenerating ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing...</>
                ) : (
                  <><Send className="mr-2 h-4 w-4" /> Generate Estimate</>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Result Panel */}
          <Card className="lg:col-span-2 shadow-lg border-none bg-card/50 backdrop-blur-sm overflow-hidden">
            {!quotation && !isGenerating ? (
              <div className="h-full flex flex-col items-center justify-center p-12 text-center space-y-4 opacity-40">
                <FileText className="h-16 w-16 text-muted-foreground" />
                <div className="space-y-1">
                  <h3 className="text-lg font-bold">No Quotation Generated</h3>
                  <p className="text-xs max-w-xs">Your AI-generated estimate will appear here once you provide instructions.</p>
                </div>
              </div>
            ) : isGenerating ? (
              <div className="h-full flex flex-col items-center justify-center p-12 text-center space-y-6">
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
                <div className="space-y-2">
                  <h3 className="text-lg font-black uppercase tracking-tighter animate-pulse">Drafting Your Quotation</h3>
                  <p className="text-xs text-muted-foreground italic">Calculating prices, applying GST, and formatting terms...</p>
                </div>
              </div>
            ) : (
              <div className="animate-in slide-in-from-right-4 duration-500">
                <div className="p-6 bg-primary/5 border-b border-primary/10 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-[10px] font-black uppercase text-primary tracking-widest">Previewing AI Draft</div>
                    <CardTitle className="text-xl">{quotation?.quotationNumber}</CardTitle>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleDownloadPdf} className="h-9 border-primary/20 text-primary hover:bg-primary/5">
                      <Download className="mr-2 h-4 w-4" /> PDF
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={isSaving} className="h-9 font-bold px-6">
                      {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="mr-2 h-4 w-4" /> Save</>}
                    </Button>
                  </div>
                </div>
                
                <div className="p-6 space-y-8">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase text-muted-foreground font-black tracking-wider">Client Name</Label>
                      <p className="font-bold text-lg">{quotation?.clientName}</p>
                    </div>
                    <div className="text-right space-y-1">
                      <Label className="text-[10px] uppercase text-muted-foreground font-black tracking-wider">Issue Date</Label>
                      <p className="font-bold">{quotation && format(parseISO(quotation.date), 'dd MMMM yyyy')}</p>
                    </div>
                  </div>

                  <div className="border rounded-xl overflow-hidden">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead className="text-[10px] uppercase font-black">Description</TableHead>
                          <TableHead className="text-center text-[10px] uppercase font-black">Qty</TableHead>
                          <TableHead className="text-right text-[10px] uppercase font-black">Unit Price</TableHead>
                          <TableHead className="text-right text-[10px] uppercase font-black">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {quotation?.items.map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium text-xs">{item.description}</TableCell>
                            <TableCell className="text-center text-xs">{item.quantity}</TableCell>
                            <TableCell className="text-right text-xs font-mono">{item.unitPrice.toLocaleString('en-IN')}</TableCell>
                            <TableCell className="text-right text-xs font-bold font-mono">{item.total.toLocaleString('en-IN')}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="flex justify-end">
                    <div className="w-full max-w-xs space-y-2 text-sm">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Subtotal</span>
                        <span className="font-mono">{quotation?.subtotal.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>GST ({quotation?.gstPercent}%)</span>
                        <span className="font-mono">{quotation?.gstAmount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</span>
                      </div>
                      <Separator className="my-2" />
                      <div className="flex justify-between font-black text-lg text-primary">
                        <span>Grand Total</span>
                        <span className="font-mono">{quotation?.grandTotal.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-[10px] uppercase text-muted-foreground font-black tracking-[0.2em]">Terms & Conditions</Label>
                    <div className="p-4 rounded-xl bg-muted/30 border border-muted-foreground/10 text-[11px] leading-relaxed whitespace-pre-wrap italic">
                      {quotation?.terms}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}