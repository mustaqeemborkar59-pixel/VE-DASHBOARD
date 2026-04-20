'use client';

import React, { useState, useCallback } from 'react';
import AppLayout from "@/components/app-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { FileSpreadsheet, Printer, RefreshCw, Trash2, Zap, Settings, Ruler, Info, Upload, FileDown, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { useToast } from '@/hooks/use-toast';
import { useDropzone } from 'react-dropzone';

export default function ForkliftSheetPage() {
  const { toast } = useToast();
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [sheetData, setSheetData] = useState({
    serialNumber: '',
    make: '',
    model: '',
    year: '',
    capacity: '',
    mastType: '',
    liftHeight: '',
    forkLength: '',
    voltage: '',
    ampere: '',
    batteryType: '',
    chargerType: '',
    weight: '',
    length: '',
    width: '',
    radius: '',
    remarks: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setSheetData(prev => ({ ...prev, [id]: value }));
  };

  const handlePrint = () => {
    window.print();
  };

  const handleClear = () => {
    if (confirm("Are you sure you want to clear the entire sheet?")) {
      setSheetData({
        serialNumber: '',
        make: '',
        model: '',
        year: '',
        capacity: '',
        mastType: '',
        liftHeight: '',
        forkLength: '',
        voltage: '',
        ampere: '',
        batteryType: '',
        chargerType: '',
        weight: '',
        length: '',
        width: '',
        radius: '',
        remarks: '',
      });
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json: any[] = XLSX.utils.sheet_to_json(worksheet);

        if (json.length > 0) {
          const firstRow = json[0];
          // Map Excel columns to state keys
          setSheetData({
            serialNumber: String(firstRow.serialNumber || firstRow['Serial No'] || ''),
            make: String(firstRow.make || firstRow['Make'] || ''),
            model: String(firstRow.model || firstRow['Model'] || ''),
            year: String(firstRow.year || firstRow['Year'] || ''),
            capacity: String(firstRow.capacity || firstRow['Capacity'] || ''),
            mastType: String(firstRow.mastType || firstRow['Mast Type'] || ''),
            liftHeight: String(firstRow.liftHeight || firstRow['Max Lift'] || ''),
            forkLength: String(firstRow.forkLength || firstRow['Fork Length'] || ''),
            voltage: String(firstRow.voltage || firstRow['Voltage'] || ''),
            ampere: String(firstRow.ampere || firstRow['Ampere'] || ''),
            batteryType: String(firstRow.batteryType || firstRow['Battery'] || ''),
            chargerType: String(firstRow.chargerType || firstRow['Charger'] || ''),
            weight: String(firstRow.weight || firstRow['Weight'] || ''),
            length: String(firstRow.length || ''),
            width: String(firstRow.width || ''),
            radius: String(firstRow.radius || firstRow['Turning Radius'] || ''),
            remarks: String(firstRow.remarks || firstRow['Notes'] || ''),
          });
          toast({ title: "Import Successful", description: "Data has been populated from Excel." });
          setIsImportOpen(false);
        } else {
          toast({ variant: 'destructive', title: "Import Failed", description: "The Excel file seems to be empty." });
        }
      } catch (err) {
        toast({ variant: 'destructive', title: "Error", description: "Could not read the Excel file." });
      }
    };
    reader.readAsBinaryString(file);
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'], 'text/csv': ['.csv'] },
    maxFiles: 1
  });

  const downloadSample = () => {
    const headers = Object.keys(sheetData).join(',');
    const sampleRow = "F-100,Toyota,8FGCU25,2023,3.0,Triple,4500,1070,48V,450,Lead Acid,Standard,4800,,,2100,Good Condition";
    const csvContent = `${headers}\n${sampleRow}`;
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'forklift_sheet_sample.csv';
    link.click();
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 max-w-6xl mx-auto animate-in fade-in duration-500 print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
              <FileSpreadsheet className="h-7 w-7 text-primary" />
              Forklift Technical Sheet
            </h1>
            <p className="text-sm text-muted-foreground uppercase font-bold tracking-widest opacity-70">
              Excel-Ready Specification Generator
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setIsImportOpen(true)} className="h-10 px-4 font-bold border-primary/20 text-primary hover:bg-primary/5">
                <Upload className="mr-2 h-4 w-4" /> Import Excel
            </Button>
            <Button variant="outline" onClick={handleClear} className="h-10 px-4 font-bold border-destructive/20 text-destructive hover:bg-destructive/5">
                <Trash2 className="mr-2 h-4 w-4" /> Clear
            </Button>
            <Button onClick={handlePrint} className="h-10 px-6 font-black uppercase tracking-widest shadow-lg shadow-primary/20">
              <Printer className="mr-2 h-4 w-4" /> Print Sheet
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Editor Form */}
          <Card className="lg:col-span-5 border-none shadow-xl rounded-2xl bg-card">
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-lg">Editor</CardTitle>
              <CardDescription>Fill technical specs manually or via Excel.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase text-primary tracking-[0.2em] flex items-center gap-2">
                  <Info className="h-3 w-3" /> General Details
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="serialNumber">Serial No.</Label>
                    <Input id="serialNumber" value={sheetData.serialNumber} onChange={handleInputChange} className="h-9" placeholder="F-001" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="year">MFG Year</Label>
                    <Input id="year" value={sheetData.year} onChange={handleInputChange} className="h-9" placeholder="2023" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="make">Make</Label>
                    <Input id="make" value={sheetData.make} onChange={handleInputChange} className="h-9" placeholder="Toyota" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="model">Model No.</Label>
                    <Input id="model" value={sheetData.model} onChange={handleInputChange} className="h-9" placeholder="8FGCU25" />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase text-primary tracking-[0.2em] flex items-center gap-2">
                  <RefreshCw className="h-3 w-3" /> Performance
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="capacity">Capacity (TON)</Label>
                    <Input id="capacity" value={sheetData.capacity} onChange={handleInputChange} className="h-9" placeholder="3.0" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="mastType">Mast Type</Label>
                    <Input id="mastType" value={sheetData.mastType} onChange={handleInputChange} className="h-9" placeholder="Triple" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="liftHeight">Max Lift (mm)</Label>
                    <Input id="liftHeight" value={sheetData.liftHeight} onChange={handleInputChange} className="h-9" placeholder="4500" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="forkLength">Fork Length (mm)</Label>
                    <Input id="forkLength" value={sheetData.forkLength} onChange={handleInputChange} className="h-9" placeholder="1070" />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase text-primary tracking-[0.2em] flex items-center gap-2">
                  <Zap className="h-3 w-3" /> Electrical Specs
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="voltage">Voltage (V)</Label>
                    <Input id="voltage" value={sheetData.voltage} onChange={handleInputChange} className="h-9" placeholder="48V" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ampere">Ampere (Ah)</Label>
                    <Input id="ampere" value={sheetData.ampere} onChange={handleInputChange} className="h-9" placeholder="450" />
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <Label htmlFor="batteryType">Battery Model / Type</Label>
                    <Input id="batteryType" value={sheetData.batteryType} onChange={handleInputChange} className="h-9" placeholder="Lead Acid / Li-ion" />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase text-primary tracking-[0.2em] flex items-center gap-2">
                   <Ruler className="h-3 w-3" /> Physical Data
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="weight">Op. Weight (KG)</Label>
                    <Input id="weight" value={sheetData.weight} onChange={handleInputChange} className="h-9" placeholder="4800" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="radius">Turning Radius (mm)</Label>
                    <Input id="radius" value={sheetData.radius} onChange={handleInputChange} className="h-9" placeholder="2100" />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="remarks">Internal Remarks</Label>
                <Textarea id="remarks" value={sheetData.remarks} onChange={handleInputChange} className="min-h-[100px] resize-none" placeholder="Enter condition or log notes..." />
              </div>
            </CardContent>
          </Card>

          {/* Preview Pane */}
          <div className="lg:col-span-7 space-y-4">
            <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-2">Live Document Preview</h4>
            <div className="bg-white p-12 border-2 border-dashed rounded-3xl shadow-2xl min-h-[842px] text-black font-sans relative overflow-hidden">
                {/* Header */}
                <div className="flex justify-between items-start border-b-4 border-primary pb-8 mb-8">
                  <div className="space-y-2">
                    <h2 className="text-4xl font-black tracking-tighter text-primary">TECHNICAL DATA</h2>
                    <div className="bg-primary text-white px-3 py-1 text-[10px] font-black uppercase tracking-widest inline-block rounded">Forklift Specification Sheet</div>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-black text-slate-900 leading-none mb-1">{sheetData.serialNumber || 'SN-XXXX'}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Document ID: FS-{format(new Date(), 'YYMMdd')}</p>
                  </div>
                </div>

                {/* Main Identity */}
                <div className="grid grid-cols-2 gap-10 mb-10">
                  <div className="space-y-1">
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Equipment Identity</p>
                    <p className="text-2xl font-black text-slate-900 leading-tight uppercase">
                      {sheetData.make || 'MAKE'} {sheetData.model || 'MODEL'}
                    </p>
                    <p className="text-sm font-bold text-primary italic">Manufactured: {sheetData.year || 'YYYY'}</p>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl w-full max-w-[200px] text-center">
                       <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Load Capacity</p>
                       <p className="text-3xl font-black text-primary leading-none">{sheetData.capacity || '-'}<span className="text-sm ml-1 opacity-60">T</span></p>
                    </div>
                  </div>
                </div>

                {/* Specs Tables */}
                <div className="grid grid-cols-1 gap-8">
                   <div className="space-y-4">
                      <h5 className="text-[12px] font-black text-slate-900 uppercase tracking-widest border-l-4 border-primary pl-3">I. Performance & Lift Specs</h5>
                      <div className="grid grid-cols-2 gap-x-12 gap-y-4 text-sm bg-slate-50 p-6 rounded-2xl border border-slate-100">
                        <div className="flex justify-between border-b border-slate-200 pb-1">
                          <span className="font-bold text-slate-500">Mast Configuration</span>
                          <span className="font-black text-slate-900">{sheetData.mastType || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-200 pb-1">
                          <span className="font-bold text-slate-500">Max Lift Height</span>
                          <span className="font-black text-slate-900">{sheetData.liftHeight || '0'} mm</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-200 pb-1">
                          <span className="font-bold text-slate-500">Standard Fork Length</span>
                          <span className="font-black text-slate-900">{sheetData.forkLength || '0'} mm</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-200 pb-1">
                          <span className="font-bold text-slate-500">Load Capacity</span>
                          <span className="font-black text-slate-900">{sheetData.capacity || '0'} Tons</span>
                        </div>
                      </div>
                   </div>

                   <div className="space-y-4">
                      <h5 className="text-[12px] font-black text-slate-900 uppercase tracking-widest border-l-4 border-primary pl-3">II. Battery & Power Systems</h5>
                      <div className="grid grid-cols-2 gap-x-12 gap-y-4 text-sm bg-slate-50 p-6 rounded-2xl border border-slate-100">
                        <div className="flex justify-between border-b border-slate-200 pb-1">
                          <span className="font-bold text-slate-500">System Voltage</span>
                          <span className="font-black text-slate-900">{sheetData.voltage || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-200 pb-1">
                          <span className="font-bold text-slate-500">Battery Capacity</span>
                          <span className="font-black text-slate-900">{sheetData.ampere || '0'} Ah</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-200 pb-1 col-span-2">
                          <span className="font-bold text-slate-500">Accumulator Type</span>
                          <span className="font-black text-slate-900 uppercase">{sheetData.batteryType || 'Standard Lead Acid'}</span>
                        </div>
                      </div>
                   </div>

                   <div className="space-y-4">
                      <h5 className="text-[12px] font-black text-slate-900 uppercase tracking-widest border-l-4 border-primary pl-3">III. Dimensions & Weight</h5>
                      <div className="grid grid-cols-2 gap-x-12 gap-y-4 text-sm bg-slate-50 p-6 rounded-2xl border border-slate-100">
                        <div className="flex justify-between border-b border-slate-200 pb-1">
                          <span className="font-bold text-slate-500">Service Weight</span>
                          <span className="font-black text-slate-900">{sheetData.weight || '0'} KG</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-200 pb-1">
                          <span className="font-bold text-slate-500">Turning Radius</span>
                          <span className="font-black text-slate-900">{sheetData.radius || '0'} mm</span>
                        </div>
                      </div>
                   </div>
                </div>

                {/* Footer Section */}
                <div className="mt-auto pt-10 border-t border-slate-100 flex flex-col gap-6">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Technical Remarks & Logs</p>
                      <p className="text-[13px] text-slate-700 leading-relaxed italic">
                        {sheetData.remarks || "No additional logs provided for this unit. Technical integrity is verified based on standard operating procedures."}
                      </p>
                    </div>
                    
                    <div className="flex justify-between items-end italic text-[9px] text-slate-400 font-medium">
                      <div className="flex flex-col gap-1">
                        <span>* Specifications may vary based on attachment configuration.</span>
                        <span>* This is a system-generated data sheet for internal workshop use.</span>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-slate-900 mb-0.5">VITHAL ENTERPRISES MHE DEPT.</p>
                        <p>Printed on: {format(new Date(), 'dd MMM yyyy, p')}</p>
                      </div>
                    </div>
                </div>

                {/* Visual Accent */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 -mr-32 -mt-32 rounded-full pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Excel Import Dialog */}
      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" /> Import Technical Data
            </DialogTitle>
            <DialogDescription>
              Upload an Excel/CSV file to fill the spec sheet instantly.
            </DialogDescription>
          </DialogHeader>
          
          <div 
            {...getRootProps()} 
            className={cn(
              "p-10 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all",
              isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/20 hover:border-primary/50"
            )}
          >
            <input {...getInputProps()} />
            <FileSpreadsheet className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-bold text-foreground">Click to select or drag Excel file here</p>
            <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-widest">Supports .xlsx and .csv</p>
          </div>

          <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-xl">
             <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Info className="h-4 w-4 text-primary" />
             </div>
             <p className="text-[11px] text-muted-foreground leading-snug">
               Ensure your Excel has columns like <b>serialNumber</b>, <b>make</b>, <b>model</b>, etc.
             </p>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="ghost" onClick={downloadSample} className="text-xs font-bold w-full sm:w-auto">
              <FileDown className="mr-2 h-4 w-4" /> Download Sample
            </Button>
            <Button variant="outline" onClick={() => setIsImportOpen(false)} className="w-full sm:w-auto">Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { size: A4; margin: 0; }
          body { background: white !important; margin: 0; padding: 0; }
          .print\\:hidden { display: none !important; }
          main { padding: 0 !important; overflow: visible !important; }
          .bg-white { border: none !important; box-shadow: none !important; width: 100% !important; padding: 15mm !important; }
          .rounded-3xl { border-radius: 0 !important; }
        }
      `}} />
    </AppLayout>
  );
}
