
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import AppLayout from "@/components/app-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import { Company } from '@/lib/data';
import { Printer, Mail, Search, Building2, UserCircle2, Phone } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

export default function EnvelopesPage() {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Courier / Kind Attn details
  const [kindAttn, setKindAttn] = useState('');
  const [attnMobile, setAttnMobile] = useState('');

  // Queries
  const companiesQuery = useMemoFirebase(() => 
    firestore && user ? query(collection(firestore, 'companies'), orderBy('name', 'asc')) : null, 
    [firestore, user]
  );
  
  const { data: companies, isLoading: isLoadingCompanies } = useCollection<Company>(companiesQuery);

  const filteredCompanies = useMemo(() => {
    if (!companies) return [];
    return companies.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.address.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [companies, searchTerm]);

  const selectedCompany = useMemo(() => 
    companies?.find(c => c.id === selectedCompanyId), 
    [companies, selectedCompanyId]
  );

  // Sync Kind Attn fields when company changes
  useEffect(() => {
    if (selectedCompany) {
        setKindAttn(selectedCompany.kindAttn || '');
        setAttnMobile(selectedCompany.contactNumber || '');
    } else {
        setKindAttn('');
        setAttnMobile('');
    }
  }, [selectedCompany]);

  const handlePrint = async () => {
    // If details changed, offer to save to company profile or just update it
    if (selectedCompany && (kindAttn !== selectedCompany.kindAttn || attnMobile !== selectedCompany.contactNumber)) {
        try {
            const companyRef = doc(firestore, 'companies', selectedCompany.id);
            await updateDoc(companyRef, {
                kindAttn: kindAttn.trim(),
                contactNumber: attnMobile.trim()
            });
        } catch (e) {
            console.error("Failed to update company suggestions", e);
        }
    }
    
    window.print();
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 max-w-6xl mx-auto animate-in fade-in duration-500 print:hidden">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Mail className="h-7 w-7 text-primary" />
            Envelope Printer
          </h1>
          <p className="text-sm text-muted-foreground uppercase font-bold tracking-widest opacity-70">
            Generate Mailing Envelopes (Recipient Only)
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls Card */}
          <Card className="lg:col-span-1 border-none shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">Print Options</CardTitle>
              <CardDescription>Select a company and specify attention details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Select Client Company</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search company..." 
                    className="pl-9 h-10 text-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="max-h-[250px] overflow-y-auto border rounded-xl divide-y">
                  {isLoadingCompanies ? (
                    <div className="p-4 text-center text-xs text-muted-foreground">Loading...</div>
                  ) : filteredCompanies.length > 0 ? (
                    filteredCompanies.map(company => (
                      <button
                        key={company.id}
                        onClick={() => setSelectedCompanyId(company.id)}
                        className={cn(
                          "w-full text-left p-3 text-xs transition-colors hover:bg-muted/50",
                          selectedCompanyId === company.id ? "bg-primary/10 font-bold" : ""
                        )}
                      >
                        <div className="truncate">{company.name}</div>
                        <div className="text-[9px] text-muted-foreground truncate opacity-70 mt-0.5">{company.address}</div>
                      </button>
                    ))
                  ) : (
                    <div className="p-4 text-center text-xs text-muted-foreground italic">No matches found.</div>
                  )}
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-1.5">
                        <UserCircle2 className="h-3 w-3 text-primary" /> Kind Attn
                    </label>
                    <Input 
                        placeholder="e.g. Mr. Ajay Sharma" 
                        value={kindAttn} 
                        onChange={e => setKindAttn(e.target.value)}
                        className="h-10 text-sm font-bold"
                        disabled={!selectedCompanyId}
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-1.5">
                        <Phone className="h-3 w-3 text-primary" /> Mobile No.
                    </label>
                    <Input 
                        placeholder="e.g. 9821XXXXXX" 
                        value={attnMobile} 
                        onChange={e => setAttnMobile(e.target.value)}
                        className="h-10 text-sm font-bold"
                        disabled={!selectedCompanyId}
                    />
                </div>
                <p className="text-[9px] text-muted-foreground italic leading-tight">Note: These details will be saved for this company after printing.</p>
              </div>

              <Button 
                disabled={!selectedCompanyId} 
                onClick={handlePrint} 
                className="w-full h-12 rounded-xl shadow-lg shadow-primary/20 font-black uppercase tracking-widest"
              >
                <Printer className="mr-2 h-5 w-5" />
                Print Envelope
              </Button>
            </CardContent>
          </Card>

          {/* Preview Card */}
          <Card className="lg:col-span-2 border-none shadow-lg overflow-hidden bg-muted/20">
            <CardHeader className="bg-white border-b">
              <CardTitle className="text-lg">Live Preview</CardTitle>
              <CardDescription>Standard DL Envelope (220mm x 110mm)</CardDescription>
            </CardHeader>
            <CardContent className="p-8 flex items-center justify-center min-h-[400px]">
              {selectedCompany ? (
                <div 
                  className="bg-white border-2 border-dashed border-muted-foreground/30 shadow-2xl relative flex flex-col p-10 overflow-hidden font-sans text-black"
                  style={{ width: '550px', height: '275px' }} // Scale-down aspect ratio of DL
                >
                  {/* Recipient Section */}
                  <div className="w-[450px]">
                    <p className="font-black text-primary uppercase text-[9px] mb-2 tracking-[0.2em]">Recipient (To):</p>
                    <div className="border-l-4 border-primary pl-4 py-1">
                      <p className="font-black text-xl text-gray-900 leading-none mb-2">{selectedCompany.name.toUpperCase()}</p>
                      <p className="text-base text-gray-700 font-bold leading-relaxed whitespace-pre-wrap mb-4">{selectedCompany.address}</p>
                      
                      {(kindAttn || attnMobile) && (
                        <div className="mt-4 pt-2 border-t border-dashed border-gray-200">
                           {kindAttn && (
                             <p className="text-sm font-black text-gray-800 flex items-center gap-2">
                                <span className="uppercase text-[10px] text-gray-400 font-bold">Kind Attn:</span> {kindAttn.toUpperCase()}
                             </p>
                           )}
                           {attnMobile && (
                             <p className="text-sm font-black text-gray-800 flex items-center gap-2">
                                <span className="uppercase text-[10px] text-gray-400 font-bold">Mob:</span> {attnMobile}
                             </p>
                           )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Stamp Placeholder */}
                  <div className="absolute top-6 right-6 w-14 h-16 border-2 border-dashed border-muted-foreground/20 rounded-xl flex items-center justify-center">
                    <span className="text-[10px] font-black text-muted-foreground/30 uppercase -rotate-45">Stamp</span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4 text-muted-foreground opacity-40">
                  <Building2 className="h-16 w-16" />
                  <p className="font-bold uppercase tracking-widest text-xs">Select a company to preview</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Print-Only Style Container */}
      <div className="hidden print:block fixed inset-0 bg-white z-[9999] overflow-hidden">
        <style dangerouslySetInnerHTML={{ __html: `
          @page {
            size: 220mm 110mm;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 0;
            background: white !important;
          }
        `}} />
        
        {selectedCompany && (
          <div className="w-[220mm] h-[110mm] relative p-[10mm] text-black font-sans box-border bg-white">
            {/* Recipient Address (Top-Left area) */}
            <div className="absolute top-[15mm] left-[10mm] w-[180mm]">
              <p className="font-bold text-[9pt] uppercase tracking-widest mb-2 text-gray-500">To,</p>
              <div className="pl-[2mm]">
                <p className="font-black text-[15pt] leading-tight mb-2">{selectedCompany.name.toUpperCase()}</p>
                <p className="text-[11pt] font-bold leading-snug uppercase mb-4">{selectedCompany.address}</p>
                
                {(kindAttn || attnMobile) && (
                    <div className="mt-4 pt-4 border-t border-dashed border-gray-300">
                        {kindAttn && (
                            <p className="text-[11pt] font-black leading-tight">
                                <span className="text-[9pt] text-gray-500 font-bold uppercase tracking-tighter mr-2">Kind Attn:</span> {kindAttn.toUpperCase()}
                            </p>
                        )}
                        {attnMobile && (
                            <p className="text-[11pt] font-black leading-tight mt-1">
                                <span className="text-[9pt] text-gray-500 font-bold uppercase tracking-tighter mr-2">Mob:</span> {attnMobile}
                            </p>
                        )}
                    </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
