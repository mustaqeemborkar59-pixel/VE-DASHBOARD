
'use client';

import React, { useState, useMemo } from 'react';
import AppLayout from "@/components/app-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { FileSpreadsheet, Printer, Trash2, Zap, Ruler, Info, Search, Upload, FileUp, XCircle, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ExcelUnit {
  serialNumber: string;
  make: string;
  model: string;
  year: string;
  capacity: string;
  mastType: string;
  liftHeight: string;
  forkLength: string;
  voltage: string;
  ampere: string;
  batteryType: string;
  weight: string;
  radius: string;
  remarks: string;
}

// User-friendly column mapping for Excel
const columnMapping: Record<string, keyof ExcelUnit> = {
  'Serial No': 'serialNumber',
  'Serial Number': 'serialNumber',
  'Sl No': 'serialNumber',
  'Make': 'make',
  'Company Make': 'make',
  'Model': 'model',
  'Model No': 'model',
  'Mfg Year': 'year',
  'Year': 'year',
  'Capacity': 'capacity',
  'Tonnage': 'capacity',
  'Mast': 'mastType',
  'Mast Type': 'mastType',
  'Max Lift': 'liftHeight',
  'Lift Height': 'liftHeight',
  'Fork': 'forkLength',
  'Voltage': 'voltage',
  'Ampere': 'ampere',
  'Battery': 'batteryType',
  'Weight': 'weight',
  'Radius': 'radius',
  'Remarks': 'remarks',
};

export default function ForkliftSheetPage() {
  const { toast } = useToast();
  const [excelData, setExcelData] = useState<ExcelUnit[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  
  const [sheetData, setSheetData] = useState<ExcelUnit>({
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
    weight: '',
    radius: '',
    remarks: '',
  });

  // Excel Dropzone logic
  const onDrop = (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json: any[] = XLSX.utils.sheet_to_json(worksheet);

        if (json.length === 0) throw new Error("File is empty.");

        const formattedData: ExcelUnit[] = json.map(row => {
          const unit: any = {};
          // Map each column using our mapping dictionary
          Object.keys(row).forEach(key => {
            const mappedKey = columnMapping[key.trim()];
            if (mappedKey) unit[mappedKey] = String(row[key]);
          });
          return unit as ExcelUnit;
        });

        setExcelData(formattedData);
        toast({ title: "Excel Connected", description: `Loaded ${formattedData.length} units from ${file.name}.` });
      } catch (err) {
        toast({ variant: 'destructive', title: "Error", description: "Failed to parse Excel file. Check column names." });
      }
    };
    reader.readAsBinaryString(file);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'], 'text/csv': ['.csv'] },
    maxFiles: 1
  });

  const filteredUnits = useMemo(() => {
    if (!searchTerm) return [];
    return excelData.filter(u => 
      u.serialNumber?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      u.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.make?.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 10);
  }, [excelData, searchTerm]);

  const selectUnit = (unit: ExcelUnit) => {
    setSheetData(unit);
    setSearchTerm('');
    toast({ title: "Unit Loaded", description: `Technical data for ${unit.serialNumber} is ready.` });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setSheetData(prev => ({ ...prev, [id]: value }));
  };

  const handlePrint = () => window.print();

  const handleClear = () => {
    if (confirm("Reset current sheet?")) {
      setSheetData({
        serialNumber: '', make: '', model: '', year: '', capacity: '',
        mastType: '', liftHeight: '', forkLength: '', voltage: '', ampere: '',
        batteryType: '', weight: '', radius: '', remarks: '',
      });
    }
  };

  const disconnectExcel = () => {
    setExcelData([]);
    setFileName(null);
    setSearchTerm('');
    toast({ title: "Excel Disconnected" });
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 max-w-6xl mx-auto animate-in fade-in duration-500 print:hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
              <FileSpreadsheet className="h-7 w-7 text-primary" />
              Technical Data Source
            </h1>
            <p className="text-sm text-muted-foreground uppercase font-bold tracking-widest opacity-70">
              Excel Driven Specification Generator
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleClear} className="h-10 px-4 font-bold border-destructive/20 text-destructive hover:bg-destructive/5">
                <Trash2 className="mr-2 h-4 w-4" /> Reset
            </Button>
            <Button onClick={handlePrint} className="h-10 px-6 font-black uppercase tracking-widest shadow-lg shadow-primary/20">
              <Printer className="mr-2 h-4 w-4" /> Print Sheet
            </Button>
          </div>
        </div>

        {/* Data Connector Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-12">
                {excelData.length === 0 ? (
                    <div {...getRootProps()} className={cn(
                        "p-10 border-4 border-dashed rounded-3xl text-center cursor-pointer transition-all",
                        isDragActive ? "border-primary bg-primary/5 scale-[0.99]" : "border-muted-foreground/20 hover:border-primary/50"
                    )}>
                        <input {...getInputProps()} />
                        <div className="flex flex-col items-center gap-3">
                            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                                <FileUp className="h-8 w-8 text-primary" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black uppercase tracking-tight">Connect Excel Database</h3>
                                <p className="text-sm text-muted-foreground">Drag and drop your technical data file here</p>
                            </div>
                            <Badge variant="secondary" className="mt-2 text-[10px] uppercase font-black">Supports .xlsx & .csv</Badge>
                        </div>
                    </div>
                ) : (
                    <div className="bg-card border rounded-3xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                        <div className="flex items-center gap-4 flex-1 w-full">
                            <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <h4 className="font-black text-sm uppercase truncate">{fileName}</h4>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{excelData.length} units detected in local database</p>
                            </div>
                            <div className="relative flex-1 max-w-sm hidden md:block">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input 
                                    placeholder="Search Serial No. from Excel..." 
                                    className="pl-9 h-11 rounded-2xl"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                {filteredUnits.length > 0 && searchTerm && (
                                    <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-card border rounded-2xl shadow-xl overflow-hidden animate-in slide-in-from-top-1 duration-200">
                                        <ScrollArea className="max-h-60">
                                            {filteredUnits.map((u, i) => (
                                                <button 
                                                    key={i} 
                                                    onClick={() => selectUnit(u)}
                                                    className="w-full text-left p-3 hover:bg-muted transition-colors flex flex-col border-b last:border-0"
                                                >
                                                    <span className="font-black text-sm">{u.serialNumber}</span>
                                                    <span className="text-[10px] font-bold text-muted-foreground uppercase">{u.make} - {u.model}</span>
                                                </button>
                                            ))}
                                        </ScrollArea>
                                    </div>
                                )}
                            </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={disconnectExcel} className="h-11 rounded-2xl text-xs font-bold text-destructive hover:bg-destructive/5">
                            <XCircle className="mr-2 h-4 w-4" /> Disconnect
                        </Button>
                    </div>
                )}
            </div>

            {/* Manual Edit / Search for Mobile */}
            <div className="lg:hidden col-span-12">
                 <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Quick Find from Excel..." 
                        className="pl-9 h-11 rounded-2xl"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        disabled={excelData.length === 0}
                    />
                    {filteredUnits.length > 0 && searchTerm && (
                        <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-card border rounded-2xl shadow-xl">
                            {filteredUnits.map((u, i) => (
                                <button key={i} onClick={() => selectUnit(u)} className="w-full text-left p-4 border-b last:border-0 active:bg-muted">
                                    <span className="font-black text-sm block">{u.serialNumber}</span>
                                    <span className="text-[10px] text-muted-foreground uppercase">{u.make} {u.model}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Editor Form */}
            <Card className="lg:col-span-4 border-none shadow-xl rounded-3xl bg-card">
              <CardHeader className="border-b pb-4">
                <CardTitle className="text-lg">Technical Editor</CardTitle>
                <CardDescription>Update values before printing.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="serialNumber">Serial No.</Label>
                      <Input id="serialNumber" value={sheetData.serialNumber} onChange={handleInputChange} className="h-9 font-bold" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="year">MFG Year</Label>
                      <Input id="year" value={sheetData.year} onChange={handleInputChange} className="h-9" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="make">Make</Label>
                      <Input id="make" value={sheetData.make} onChange={handleInputChange} className="h-9" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="model">Model</Label>
                      <Input id="model" value={sheetData.model} onChange={handleInputChange} className="h-9" />
                    </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="capacity">Capacity (T)</Label>
                      <Input id="capacity" value={sheetData.capacity} onChange={handleInputChange} className="h-9" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="liftHeight">Lift Height</Label>
                      <Input id="liftHeight" value={sheetData.liftHeight} onChange={handleInputChange} className="h-9" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="voltage">Voltage (V)</Label>
                      <Input id="voltage" value={sheetData.voltage} onChange={handleInputChange} className="h-9" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="ampere">Ampere (Ah)</Label>
                      <Input id="ampere" value={sheetData.ampere} onChange={handleInputChange} className="h-9" />
                    </div>
                </div>

                <Separator />

                <div className="space-y-1.5">
                  <Label htmlFor="remarks">Internal Remarks</Label>
                  <Textarea id="remarks" value={sheetData.remarks} onChange={handleInputChange} className="min-h-[100px] resize-none text-xs" />
                </div>
              </CardContent>
            </Card>

            {/* Document Preview */}
            <div className="lg:col-span-8 space-y-4">
              <div className="bg-white p-12 border-2 border-dashed rounded-[40px] shadow-2xl min-h-[1000px] text-black font-sans relative overflow-hidden flex flex-col">
                  {/* Watermark Logo Pattern */}
                  <div className="absolute top-0 right-0 p-10 opacity-[0.03]">
                      <FileSpreadsheet className="h-96 w-96 -rotate-12" />
                  </div>

                  {/* Header */}
                  <div className="flex justify-between items-start border-b-4 border-primary pb-8 mb-10">
                    <div className="space-y-2">
                      <h2 className="text-5xl font-black tracking-tighter text-primary">TECH DATA</h2>
                      <div className="bg-primary text-white px-4 py-1 text-[11px] font-black uppercase tracking-[0.2em] inline-block rounded-full">Official Specification Sheet</div>
                    </div>
                    <div className="text-right">
                      <p className="text-4xl font-black text-slate-900 leading-none mb-2">{sheetData.serialNumber || 'UNIT-ID'}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">GEN ID: FS-{format(new Date(), 'yyMMdd')}</p>
                    </div>
                  </div>

                  {/* Identity Row */}
                  <div className="grid grid-cols-2 gap-10 mb-10">
                    <div className="space-y-1">
                      <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Brand Identity</p>
                      <p className="text-3xl font-black text-slate-900 leading-tight uppercase">
                        {sheetData.make || '-'} {sheetData.model || '-'}
                      </p>
                      <p className="text-sm font-bold text-primary italic">Year of Manufacture: {sheetData.year || '-'}</p>
                    </div>
                    <div className="flex flex-col items-end">
                      <div className="bg-slate-50 border-2 border-slate-100 p-6 rounded-3xl w-full max-w-[240px] text-center shadow-sm">
                         <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Load Rating</p>
                         <p className="text-4xl font-black text-primary leading-none">{sheetData.capacity || '-'}<span className="text-lg ml-1 opacity-60">T</span></p>
                      </div>
                    </div>
                  </div>

                  {/* Specs Sections */}
                  <div className="grid grid-cols-1 gap-10 flex-1">
                     <div className="space-y-4">
                        <h5 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] border-l-8 border-primary pl-4">01. Dynamic Performance</h5>
                        <div className="grid grid-cols-2 gap-x-12 gap-y-5 text-sm bg-slate-50/50 p-8 rounded-[30px] border border-slate-100">
                          <div className="flex justify-between border-b-2 border-white pb-1">
                            <span className="font-bold text-slate-500">Mast Configuration</span>
                            <span className="font-black text-slate-900">{sheetData.mastType || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between border-b-2 border-white pb-1">
                            <span className="font-bold text-slate-500">Max Lift Height</span>
                            <span className="font-black text-slate-900">{sheetData.liftHeight || '0'} mm</span>
                          </div>
                          <div className="flex justify-between border-b-2 border-white pb-1">
                            <span className="font-bold text-slate-500">Fork Dimensions</span>
                            <span className="font-black text-slate-900">{sheetData.forkLength || 'Standard'}</span>
                          </div>
                          <div className="flex justify-between border-b-2 border-white pb-1">
                            <span className="font-bold text-slate-500">Rated Capacity</span>
                            <span className="font-black text-slate-900">{sheetData.capacity || '0'} Tons</span>
                          </div>
                        </div>
                     </div>

                     <div className="space-y-4">
                        <h5 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] border-l-8 border-primary pl-4">02. Power Electronics</h5>
                        <div className="grid grid-cols-2 gap-x-12 gap-y-5 text-sm bg-slate-50/50 p-8 rounded-[30px] border border-slate-100">
                          <div className="flex justify-between border-b-2 border-white pb-1">
                            <span className="font-bold text-slate-500">System Voltage</span>
                            <span className="font-black text-slate-900">{sheetData.voltage || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between border-b-2 border-white pb-1">
                            <span className="font-bold text-slate-500">Ampere Rating</span>
                            <span className="font-black text-slate-900">{sheetData.ampere || '0'} Ah</span>
                          </div>
                          <div className="flex justify-between border-b-2 border-white pb-1 col-span-2">
                            <span className="font-bold text-slate-500">Accumulator Type</span>
                            <span className="font-black text-slate-900 uppercase">{sheetData.batteryType || 'Lead-Acid / Li-Ion'}</span>
                          </div>
                        </div>
                     </div>

                     <div className="space-y-4">
                        <h5 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] border-l-8 border-primary pl-4">03. Dimensional Geometry</h5>
                        <div className="grid grid-cols-2 gap-x-12 gap-y-5 text-sm bg-slate-50/50 p-8 rounded-[30px] border border-slate-100">
                          <div className="flex justify-between border-b-2 border-white pb-1">
                            <span className="font-bold text-slate-500">Operating Weight</span>
                            <span className="font-black text-slate-900">{sheetData.weight || '0'} KG</span>
                          </div>
                          <div className="flex justify-between border-b-2 border-white pb-1">
                            <span className="font-bold text-slate-500">Turning Circle</span>
                            <span className="font-black text-slate-900">{sheetData.radius || '0'} mm</span>
                          </div>
                        </div>
                     </div>
                  </div>

                  {/* Footer */}
                  <div className="mt-10 pt-10 border-t-2 border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Validation & Reliability Statement</p>
                      <p className="text-xs text-slate-600 leading-relaxed italic mb-8">
                        {sheetData.remarks || "Data derived from verified local database records. Internal specifications are calibrated for standard workshop operations."}
                      </p>
                      
                      <div className="flex justify-between items-end italic text-[9px] text-slate-400 font-bold border-t border-slate-50 pt-6">
                        <div className="space-y-1">
                          <p>• DOCUMENT VERIFIED FOR INTERNAL FLEET OPERATIONS</p>
                          <p>• DATA ACCURACY GUARANTEED AS PER EXCEL SOURCE</p>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-slate-900 mb-0.5 uppercase tracking-tighter">VITHAL ENTERPRISES - MHE DEPARTMENT</p>
                          <p>DATED: {format(new Date(), 'dd MMM yyyy, p')}</p>
                        </div>
                      </div>
                  </div>
              </div>
            </div>
        </div>

        {/* CSS for printing */}
        <style dangerouslySetInnerHTML={{ __html: `
            @media print {
                @page { size: A4; margin: 0; }
                body { background: white !important; margin: 0; padding: 0; }
                .print\\:hidden { display: none !important; }
                main { padding: 0 !important; overflow: visible !important; }
                .bg-white { border: none !important; box-shadow: none !important; width: 100% !important; padding: 15mm !important; }
                .rounded-[40px] { border-radius: 0 !important; }
            }
        `}} />
      </div>
    </AppLayout>
  );
}
