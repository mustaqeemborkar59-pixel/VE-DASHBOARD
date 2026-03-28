'use client';

import React, { useState, useMemo } from 'react';
import AppLayout from "@/components/app-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCollection, useFirebase, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { Company, CompanySettings } from '@/lib/data';
import { Printer, Mail, Search, XCircle, Building2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export default function EnvelopesPage() {
  const { firestore, user } = useFirebase();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [selectedEnterprise, setSelectedEnterprise] = useState<'Vithal' | 'RV'>('Vithal');
  const [searchTerm, setSearchTerm] = useState('');

  // Queries
  const companiesQuery = useMemoFirebase(() => 
    firestore && user ? query(collection(firestore, 'companies'), orderBy('name', 'asc')) : null, 
    [firestore, user]
  );
  
  const vithalSettingsRef = useMemoFirebase(() => 
    firestore && user ? doc(firestore, 'companySettings', 'vithal') : null, 
    [firestore, user]
  );
  const rvSettingsRef = useMemoFirebase(() => 
    firestore && user ? doc(firestore, 'companySettings', 'rv') : null, 
    [firestore, user]
  );

  const { data: companies, isLoading: isLoadingCompanies } = useCollection<Company>(companiesQuery);
  const { data: vithalSettings } = useDoc<CompanySettings>(vithalSettingsRef);
  const { data: rvSettings } = useDoc<CompanySettings>(rvSettingsRef);

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

  const senderSettings = selectedEnterprise === 'Vithal' ? vithalSettings : rvSettings;

  const handlePrint = () => {
    window.print();
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 max-w-5xl mx-auto animate-in fade-in duration-500 print:hidden">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Mail className="h-7 w-7 text-primary" />
            Envelope Printer
          </h1>
          <p className="text-sm text-muted-foreground uppercase font-bold tracking-widest opacity-70">
            Generate Mailing Envelopes for Invoices
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls Card */}
          <Card className="lg:col-span-1 border-none shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">Print Options</CardTitle>
              <CardDescription>Select company and sender enterprise.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Sender Enterprise</label>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    variant={selectedEnterprise === 'Vithal' ? 'default' : 'outline'} 
                    onClick={() => setSelectedEnterprise('Vithal')}
                    className="h-9 text-xs font-bold"
                  >
                    Vithal Ent.
                  </Button>
                  <Button 
                    variant={selectedEnterprise === 'RV' ? 'default' : 'outline'} 
                    onClick={() => setSelectedEnterprise('RV')}
                    className="h-9 text-xs font-bold"
                  >
                    RV Ent.
                  </Button>
                </div>
              </div>

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
                <div className="max-h-[300px] overflow-y-auto border rounded-xl divide-y">
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
                  className="bg-white border-2 border-dashed border-muted-foreground/30 shadow-2xl relative flex flex-col p-8 overflow-hidden font-sans text-black"
                  style={{ width: '550px', height: '275px' }} // Scale-down aspect ratio of DL
                >
                  {/* From Section */}
                  <div className="absolute top-6 left-6 max-w-[200px] text-[10px] leading-tight">
                    <p className="font-black text-primary uppercase mb-1 border-b border-primary/20 pb-0.5">Sender (From):</p>
                    <p className="font-bold text-gray-900">{senderSettings?.companyName || (selectedEnterprise === 'Vithal' ? 'VITHAL ENTERPRISES' : 'R.V ENTERPRISES')}</p>
                    <p className="text-gray-600 line-clamp-3">{senderSettings?.address || 'Company Address'}</p>
                    <p className="text-gray-600 mt-1 font-medium">{senderSettings?.contactNumber || ''}</p>
                  </div>

                  {/* To Section */}
                  <div className="mt-auto mb-10 ml-auto mr-10 w-[300px]">
                    <p className="font-black text-primary uppercase text-[10px] mb-1.5 tracking-[0.2em]">Recipient (To):</p>
                    <div className="border-l-4 border-primary pl-4 py-1">
                      <p className="font-black text-lg text-gray-900 leading-none mb-2">{selectedCompany.name.toUpperCase()}</p>
                      <p className="text-sm text-gray-700 font-medium leading-relaxed whitespace-pre-wrap">{selectedCompany.address}</p>
                    </div>
                  </div>

                  {/* Stamp Placeholder */}
                  <div className="absolute top-6 right-6 w-12 h-14 border border-dashed border-muted-foreground/20 rounded flex items-center justify-center">
                    <span className="text-[8px] font-black text-muted-foreground/30 uppercase -rotate-45">Stamp</span>
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
            {/* From Address */}
            <div className="absolute top-[8mm] left-[10mm] max-w-[80mm] text-[9pt] leading-snug">
              <p className="font-bold border-b border-black/20 pb-[1mm] mb-[1mm]">Sender:</p>
              <p className="font-bold">{senderSettings?.companyName.toUpperCase()}</p>
              <p className="text-gray-800">{senderSettings?.address}</p>
              <p className="text-gray-800">{senderSettings?.contactNumber}</p>
            </div>

            {/* To Address */}
            <div className="absolute top-[45mm] left-[100mm] w-[100mm]">
              <p className="font-bold text-[10pt] uppercase tracking-wider mb-2">To,</p>
              <div className="pl-[2mm]">
                <p className="font-bold text-[14pt] leading-none mb-2">{selectedCompany.name.toUpperCase()}</p>
                <p className="text-[11pt] font-medium leading-relaxed uppercase">{selectedCompany.address}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
