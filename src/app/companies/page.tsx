'use client';
import { useState, useCallback, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button";
import { 
  EllipsisVertical, 
  Pencil, 
  PlusCircle, 
  Search, 
  Trash2, 
  Eye, 
  Building2, 
  MapPin, 
  Fingerprint, 
  ArrowUpDown,
  UserCircle2,
  CalendarDays
} from "lucide-react";
import AppLayout from "@/components/app-layout";
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, doc, query, orderBy, OrderByDirection } from 'firebase/firestore';
import { Company } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { CompanyForm, CompanyFormData } from '@/components/company-form';
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format, parseISO } from 'date-fns';

type SortOption = 'date-desc' | 'date-asc' | 'name-asc' | 'name-desc';

export default function CompaniesPage() {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  
  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [detailsCompany, setDetailsCompany] = useState<Company | null>(null);

  const [sortOrder, setSortOrder] = useState<SortOption>('date-desc');
  const [searchTerm, setSearchTerm] = useState('');

  const companiesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    
    let field: string, direction: OrderByDirection;
    switch (sortOrder) {
        case 'name-asc':
            field = 'name';
            direction = 'asc';
            break;
        case 'name-desc':
            field = 'name';
            direction = 'desc';
            break;
        case 'date-asc':
            field = 'createdAt';
            direction = 'asc';
            break;
        case 'date-desc':
        default:
            field = 'createdAt';
            direction = 'desc';
            break;
    }
    return query(collection(firestore, 'companies'), orderBy(field, direction));
  }, [firestore, user, sortOrder]);

  const { data: companies, isLoading } = useCollection<Company>(companiesQuery);

  const filteredCompanies = useMemo(() => {
    if (!companies) return [];
    const lowercasedSearchTerm = searchTerm.toLowerCase();

    if (!lowercasedSearchTerm) return companies;

    return companies.filter(company => {
      const nameMatch = company.name.toLowerCase().includes(lowercasedSearchTerm);
      const addressMatch = company.address.toLowerCase().includes(lowercasedSearchTerm);
      const gstinMatch = company.gstin?.toLowerCase().includes(lowercasedSearchTerm) ?? false;
      return nameMatch || addressMatch || gstinMatch;
    });
  }, [companies, searchTerm]);

  const closeAllDialogs = useCallback(() => {
    setIsAddEditDialogOpen(false);
    setCompanyToDelete(null);
    setDetailsCompany(null);
  }, []);
  
  const handleDelayedAction = (action: () => void) => {
    setTimeout(action, 100);
  };
  
  const openAddEditDialog = useCallback((company: Company | null) => {
    closeAllDialogs();
    setSelectedCompany(company);
    handleDelayedAction(() => setIsAddEditDialogOpen(true));
  }, [closeAllDialogs]);

  const openDeleteDialog = useCallback((company: Company) => {
    closeAllDialogs();
    handleDelayedAction(() => setCompanyToDelete(company));
  }, [closeAllDialogs]);

  const openDetailsDialog = useCallback((company: Company) => {
    closeAllDialogs();
    handleDelayedAction(() => setDetailsCompany(company));
  }, [closeAllDialogs]);

  const handleFormSubmit = (formData: CompanyFormData) => {
    if (!firestore || !companies) return;

    const newName = formData.name.trim().toLowerCase();
    const newAddress = formData.address.trim().toLowerCase();

    const isDuplicate = companies.some(company => {
      if (selectedCompany && company.id === selectedCompany.id) {
        return false;
      }
      return company.name.trim().toLowerCase() === newName && company.address.trim().toLowerCase() === newAddress;
    });

    if (isDuplicate) {
      toast({
        variant: "destructive",
        title: "Duplicate Company",
        description: "A company with the same name and address already exists.",
      });
      return;
    }
    
    if (selectedCompany) {
      const companyDocRef = doc(firestore, 'companies', selectedCompany.id);
      updateDocumentNonBlocking(companyDocRef, formData);
      toast({ title: "Updated", description: "Company information has been updated." });
    } else {
      const companiesCollection = collection(firestore, 'companies');
      addDocumentNonBlocking(companiesCollection, {
        ...formData,
        createdAt: new Date().toISOString(),
      });
      toast({ title: "Added", description: "New company successfully registered." });
    }
    setIsAddEditDialogOpen(false);
    setSelectedCompany(null);
  };
  
  const handleDelete = () => {
    if (!firestore || !companyToDelete) return;
    
    const companyDocRef = doc(firestore, 'companies', companyToDelete.id);
    deleteDocumentNonBlocking(companyDocRef);

    toast({
      title: "Company Removed",
      description: `${companyToDelete.name} has been deleted.`,
    });

    setCompanyToDelete(null);
  };

  const getCompanyInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const renderActions = (company: Company) => (
    <DropdownMenu>
        <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-muted" onClick={(e) => e.stopPropagation()}>
                <EllipsisVertical className="h-4 w-4" />
            </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-48" align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1">Options</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => openDetailsDialog(company)} className="cursor-pointer">
                <Eye className="mr-2 h-4 w-4 text-primary" />
                Quick View
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => openAddEditDialog(company)} className="cursor-pointer">
                <Pencil className="mr-2 h-4 w-4 text-amber-500" />
                Edit Details
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => openDeleteDialog(company)} className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer font-medium">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Company
            </DropdownMenuItem>
        </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <AppLayout>
      <div className="flex flex-col gap-4 sm:gap-6 animate-in fade-in duration-500">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                    <Building2 className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
                    Clients Directory
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground">Manage your relationships with {companies?.length || 0} active client companies.</p>
            </div>
            <Button onClick={() => openAddEditDialog(null)} className="shadow-lg shadow-primary/20 h-10 px-4 group">
                <PlusCircle className="mr-2 h-4 w-4 transition-transform group-hover:rotate-90" />
                New Company
            </Button>
        </div>

        <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-3 border-b border-border/50">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
              <div className="relative flex-1 w-full max-md:max-w-none group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                      type="search"
                      placeholder="Search by name, address, or GSTIN..."
                      className="pl-9 w-full h-10 border-muted focus-visible:ring-primary/30"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                  />
              </div>
              <div className="flex items-center gap-2">
                  <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as SortOption)}>
                      <SelectTrigger className="w-full sm:w-[180px] h-10 border-muted">
                          <div className="flex items-center gap-2">
                            <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                            <SelectValue placeholder="Sort order" />
                          </div>
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="date-desc">Newest First</SelectItem>
                          <SelectItem value="date-asc">Oldest First</SelectItem>
                          <SelectItem value="name-asc">A to Z (Name)</SelectItem>
                          <SelectItem value="name-desc">Z to A (Name)</SelectItem>
                      </SelectContent>
                  </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {/* Mobile Cards View */}
            <div className="md:hidden">
               {isLoading ? (
                  <div className="space-y-3 p-4">
                    {[1, 2, 3].map(i => <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />)}
                  </div>
               ) : filteredCompanies.length > 0 ? (
                  <div className="grid grid-cols-1 gap-3 p-4">
                    {filteredCompanies.map((company) => (
                      <div 
                        key={company.id} 
                        className="group relative border rounded-xl overflow-hidden bg-card hover:border-primary/50 transition-all shadow-sm active:scale-[0.98]" 
                        onClick={() => openDetailsDialog(company)}
                      >
                        <div className="p-4 space-y-3">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3 pr-8">
                              <Avatar className="h-10 w-10 rounded-lg border-2 border-primary/10">
                                <AvatarFallback className="bg-primary/5 text-primary font-bold text-xs">
                                  {getCompanyInitials(company.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="space-y-0.5">
                                <h3 className="text-sm font-bold text-foreground leading-tight line-clamp-1">{company.name}</h3>
                                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                  <CalendarDays className="h-2.5 w-2.5" />
                                  <span>{company.createdAt ? format(parseISO(company.createdAt), 'MMM dd, yyyy') : 'N/A'}</span>
                                </div>
                              </div>
                            </div>
                            <div className="absolute top-2 right-2">
                                {renderActions(company)}
                            </div>
                          </div>
                          
                          <div className="flex items-start gap-1.5">
                            <MapPin className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
                            <span className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">{company.address}</span>
                          </div>
                          
                          {company.gstin && (
                            <div className="flex items-center gap-2 pt-1">
                                <Badge variant="secondary" className="bg-muted/50 text-[10px] py-0 h-5 font-mono flex items-center gap-1">
                                    <Fingerprint className="h-2.5 w-2.5" />
                                    {company.gstin}
                                </Badge>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16 px-4">
                    <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                    <h3 className="text-lg font-medium">No results found</h3>
                    <p className="text-sm text-muted-foreground mt-1">Try adjusting your search terms or filters.</p>
                  </div>
                )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 border-b border-border/50">
                    <TableHead className="w-[30%] py-4 font-semibold text-foreground pl-6">Company Profile</TableHead>
                    <TableHead className="w-[35%] py-4 font-semibold text-foreground">Registered Address</TableHead>
                    <TableHead className="w-[15%] py-4 font-semibold text-foreground">Tax ID (GSTIN)</TableHead>
                    <TableHead className="w-[12%] py-4 font-semibold text-foreground">Joined On</TableHead>
                    <TableHead className="w-[8%] py-4 text-right pr-6"><span className="sr-only">Actions</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                            <TableCell className="pl-6">
                              <div className="flex items-center gap-3">
                                <Skeleton className="h-10 w-10 rounded-lg" />
                                <div className="space-y-2">
                                  <Skeleton className="h-4 w-32" />
                                  <Skeleton className="h-3 w-20" />
                                </div>
                              </div>
                            </TableCell>
                            <TableCell><Skeleton className="h-4 w-64" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                            <TableCell className="pr-6"><Skeleton className="h-8 w-8 ml-auto rounded-full" /></TableCell>
                        </TableRow>
                    ))
                  ) : filteredCompanies.length > 0 ? (
                    filteredCompanies.map((company) => (
                      <TableRow 
                        key={company.id} 
                        onClick={() => openDetailsDialog(company)} 
                        className="cursor-pointer group hover:bg-muted/30 transition-colors"
                      >
                        <TableCell className="py-4 pl-6">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 rounded-lg border-2 border-primary/10 transition-transform group-hover:scale-105">
                              <AvatarFallback className="bg-primary/5 text-primary font-bold text-xs">
                                {getCompanyInitials(company.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="font-bold text-foreground leading-tight">{company.name}</span>
                              <span className="text-[10px] text-muted-foreground uppercase tracking-tight font-medium">Client Account</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                            <div className="flex items-center gap-2 max-w-xs text-muted-foreground group-hover:text-foreground transition-colors">
                              <MapPin className="h-3 w-3 shrink-0" />
                              <span className="truncate text-sm" title={company.address}>{company.address}</span>
                            </div>
                        </TableCell>
                        <TableCell className="py-4">
                            {company.gstin ? (
                                <Badge variant="outline" className="font-mono text-[11px] px-2 py-0.5 bg-background/50 border-muted-foreground/20 group-hover:border-primary/30 transition-colors">
                                    {company.gstin}
                                </Badge>
                            ) : (
                                <span className="text-xs text-muted-foreground italic">N/A</span>
                            )}
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <CalendarDays className="h-3.5 w-3.5" />
                            <span>{company.createdAt ? format(parseISO(company.createdAt), 'dd MMM yyyy') : 'N/A'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right py-4 pr-6">
                           {renderActions(company)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-64 text-center">
                        <div className="flex flex-col items-center justify-center space-y-3">
                            <Building2 className="h-12 w-12 text-muted-foreground opacity-20" />
                            <div className="text-lg font-medium text-muted-foreground">No companies found</div>
                            {searchTerm && (
                                <Button variant="link" size="sm" onClick={() => setSearchTerm('')} className="text-primary font-bold">
                                    Clear Search
                                </Button>
                            )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Details Dialog */}
      <Dialog open={!!detailsCompany} onOpenChange={(open) => { if (!open) closeAllDialogs(); }}>
        <DialogContent className="max-w-[95vw] sm:max-w-xl p-0 overflow-hidden rounded-2xl border-none shadow-2xl">
          <div className="bg-primary/5 p-6 sm:p-8 flex items-center gap-4 border-b border-primary/10">
              <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                  <UserCircle2 className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
              </div>
              <div className="space-y-1">
                  <DialogTitle className="text-xl sm:text-2xl font-black text-foreground tracking-tight leading-tight">{detailsCompany?.name}</DialogTitle>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Client Profile</p>
              </div>
          </div>
          <div className="p-6 sm:p-8 space-y-6">
              <div className="grid gap-6">
                  <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                          <MapPin className="h-3.5 w-3.5 text-primary" />
                          Registered Office
                      </div>
                      <div className="p-4 rounded-xl bg-muted/30 border border-muted-foreground/10">
                        <p className="text-sm sm:text-base text-foreground leading-relaxed font-medium">
                            {detailsCompany?.address}
                        </p>
                      </div>
                  </div>
                  
                  <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                          <Fingerprint className="h-3.5 w-3.5 text-primary" />
                          Tax Information
                      </div>
                      <div className="p-4 rounded-xl bg-muted/30 border border-muted-foreground/10 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-muted-foreground font-semibold">GSTIN</p>
                            <p className="text-lg font-mono font-bold tracking-tight text-foreground">{detailsCompany?.gstin || 'NOT PROVIDED'}</p>
                        </div>
                        {detailsCompany?.gstin && <Badge className="bg-primary/10 text-primary border-none">Verified</Badge>}
                      </div>
                  </div>
              </div>
          </div>
          <DialogFooter className="p-6 bg-muted/20 border-t border-border/50 gap-3 sm:gap-0">
             <Button variant="outline" onClick={() => setDetailsCompany(null)} className="h-11 px-6 rounded-xl font-bold">Close View</Button>
             <Button onClick={() => detailsCompany && openAddEditDialog(detailsCompany)} className="h-11 px-6 rounded-xl font-bold bg-primary shadow-lg shadow-primary/20">Edit Profile</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Dialog */}
      <Dialog open={isAddEditDialogOpen} onOpenChange={(open) => {if(!open) closeAllDialogs(); else setIsAddEditDialogOpen(true);}}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] flex flex-col p-0 rounded-2xl overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-6 sm:p-8 pb-0">
            <DialogTitle className="text-2xl font-black text-foreground">{selectedCompany ? 'Modify Client' : 'Onboard New Client'}</DialogTitle>
            <DialogDescription className="text-sm font-medium text-muted-foreground pt-1">
              {selectedCompany ? `Updating records for ${selectedCompany.name}` : 'Enter the official company details to start billing.'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-grow overflow-y-auto px-6 sm:px-8 py-4">
            <CompanyForm 
              onSubmit={handleFormSubmit}
              initialData={selectedCompany || undefined}
              mode={selectedCompany ? 'edit' : 'add'}
            />
          </div>
           <DialogFooter className="p-6 sm:p-8 pt-4 border-t border-border/50 bg-muted/10 flex flex-col-reverse sm:flex-row gap-3">
              <Button variant="ghost" type="button" onClick={() => setIsAddEditDialogOpen(false)} className="h-11 rounded-xl font-bold text-muted-foreground hover:text-foreground">
                Discard
              </Button>
              <Button type="submit" form="company-form" className="h-11 rounded-xl font-bold bg-primary px-8 shadow-lg shadow-primary/20">
                {selectedCompany ? 'Confirm Changes' : 'Register Client'}
              </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation */}
      <AlertDialog open={!!companyToDelete} onOpenChange={(open) => { if (!open) closeAllDialogs(); }}>
        <AlertDialogContent className="max-w-[90vw] sm:max-w-md p-6 rounded-2xl border-none shadow-2xl">
          <AlertDialogHeader>
            <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mb-2 mx-auto sm:mx-0">
                <Trash2 className="h-6 w-6 text-destructive" />
            </div>
            <AlertDialogTitle className="text-xl font-black">Remove Client?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium leading-relaxed">
              This action will permanently delete <span className="font-bold text-foreground">"{companyToDelete?.name}"</span> from the directory. All associated records may become orphan data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 flex flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="h-11 rounded-xl font-bold border-muted">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="h-11 rounded-xl font-bold bg-destructive hover:bg-destructive/90 shadow-lg shadow-destructive/20">Yes, Delete Client</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
