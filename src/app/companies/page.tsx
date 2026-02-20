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
import { EllipsisVertical, Pencil, PlusCircle, Search, Trash2, Eye } from "lucide-react";
import AppLayout from "@/components/app-layout";
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, doc, query, orderBy, OrderByDirection } from 'firebase/firestore';
import { Company } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { CompanyForm, CompanyFormData } from '@/components/company-form';
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

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

  const companiesCount = useMemo(() => filteredCompanies?.length, [filteredCompanies]);
  const totalCompaniesCount = useMemo(() => companies?.length, [companies]);
  
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
      toast({ title: "Success", description: "Company updated successfully." });
    } else {
      const companiesCollection = collection(firestore, 'companies');
      addDocumentNonBlocking(companiesCollection, {
        ...formData,
        createdAt: new Date().toISOString(),
      });
      toast({ title: "Success", description: "Company added successfully." });
    }
    setIsAddEditDialogOpen(false);
    setSelectedCompany(null);
  };
  
  const handleDelete = () => {
    if (!firestore || !companyToDelete) return;
    
    const companyDocRef = doc(firestore, 'companies', companyToDelete.id);
    deleteDocumentNonBlocking(companyDocRef);

    toast({
      title: "Company Deleted",
      description: `Company ${companyToDelete.name} has been removed.`,
    });

    setCompanyToDelete(null);
  };

  const renderActions = (company: Company) => (
    <DropdownMenu>
        <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                <EllipsisVertical className="h-4 w-4" />
            </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-40" align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onSelect={() => openDetailsDialog(company)}>
                <Eye className="mr-2 h-4 w-4" />
                View
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => openAddEditDialog(company)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => openDeleteDialog(company)} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
            </DropdownMenuItem>
        </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <AppLayout>
      <div className="flex flex-col gap-4 sm:gap-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              <div>
                <CardTitle>Companies</CardTitle>
                 <CardDescription className="hidden sm:block">
                  {isLoading ? 'Loading...' : `Showing ${companiesCount} companies.`}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative flex-1 w-full sm:w-auto">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                          type="search"
                          placeholder="Search..."
                          className="pl-8 w-full sm:w-[200px] h-9 text-xs sm:text-sm"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                      />
                  </div>
                  <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as SortOption)}>
                      <SelectTrigger className="w-full sm:w-[160px] h-9 text-xs sm:text-sm">
                          <SelectValue placeholder="Sort" />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="date-desc" className="text-xs sm:text-sm">Newest First</SelectItem>
                          <SelectItem value="date-asc" className="text-xs sm:text-sm">Oldest First</SelectItem>
                          <SelectItem value="name-asc" className="text-xs sm:text-sm">Name (A-Z)</SelectItem>
                          <SelectItem value="name-desc" className="text-xs sm:text-sm">Name (Z-A)</SelectItem>
                      </SelectContent>
                  </Select>
                  <Button onClick={() => openAddEditDialog(null)} size="sm" className="h-9 text-xs">
                    <PlusCircle className="mr-1.5 h-3.5 w-3.5" />
                    Add Company
                  </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 md:p-3 pt-0">
            <div className="md:hidden">
               {isLoading ? (
                  <div className="text-center p-6 text-muted-foreground">Loading...</div>
               ) : filteredCompanies && filteredCompanies.length > 0 ? (
                  <div className="space-y-3 p-3">
                    {filteredCompanies.map((company) => (
                      <div key={company.id} className="border rounded-lg overflow-hidden cursor-pointer bg-card" onClick={() => openDetailsDialog(company)}>
                        <div className="p-3 space-y-2">
                          <div className="flex justify-between items-start">
                            <div className="space-y-0.5">
                              <div className="text-sm font-bold">{company.name}</div>
                              <div className="text-[10px] text-muted-foreground break-words">{company.address}</div>
                            </div>
                            {renderActions(company)}
                          </div>
                          {company.gstin && (
                            <div className="text-[10px]">
                              <span className="font-medium text-muted-foreground">GSTIN: </span>
                              <span className="font-mono">{company.gstin}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-10 text-muted-foreground">No companies found.</div>
                )}
            </div>
            <Table className="hidden md:table">
              <TableHeader>
                <TableRow>
                  <TableHead>Company Name</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>GSTIN</TableHead>
                  <TableHead><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">Loading...</TableCell>
                  </TableRow>
                ) : filteredCompanies && filteredCompanies.length > 0 ? (
                  filteredCompanies.map((company) => (
                    <TableRow key={company.id} onClick={() => openDetailsDialog(company)} className="cursor-pointer">
                      <TableCell className="font-medium">{company.name}</TableCell>
                      <TableCell className="max-w-xs truncate">{company.address}</TableCell>
                      <TableCell className="font-mono">{company.gstin}</TableCell>
                      <TableCell className="text-right">
                         {renderActions(company)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center h-24">No companies found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!detailsCompany} onOpenChange={(open) => { if (!open) closeAllDialogs(); }}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>{detailsCompany?.name}</DialogTitle>
            <DialogDescription className="text-xs">
              Company contact and tax information.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
              <div className="space-y-1">
                  <h4 className="text-xs sm:text-sm font-semibold">Address</h4>
                  <p className="text-xs sm:text-sm text-muted-foreground">{detailsCompany?.address}</p>
              </div>
              <div className="space-y-1">
                  <h4 className="text-xs sm:text-sm font-semibold">GSTIN</h4>
                  <p className="text-xs sm:text-sm font-mono text-muted-foreground">{detailsCompany?.gstin || 'N/A'}</p>
              </div>
          </div>
          <DialogFooter>
             <Button variant="outline" onClick={() => setDetailsCompany(null)} className="h-9">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddEditDialogOpen} onOpenChange={(open) => {if(!open) closeAllDialogs(); else setIsAddEditDialogOpen(true);}}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-4 sm:p-6 pb-0">
            <DialogTitle>{selectedCompany ? 'Edit Company' : 'Add New Company'}</DialogTitle>
            <DialogDescription className="text-xs">
              {selectedCompany ? 'Update details.' : 'Fill out the form.'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-grow overflow-y-auto px-4 sm:px-6">
            <CompanyForm 
              onSubmit={handleFormSubmit}
              initialData={selectedCompany || undefined}
              mode={selectedCompany ? 'edit' : 'add'}
            />
          </div>
           <DialogFooter className="p-4 sm:p-6 pt-4 border-t flex gap-2 sm:gap-0">
              <Button variant="outline" type="button" onClick={() => setIsAddEditDialogOpen(false)} className="h-9">
                Cancel
              </Button>
              <Button type="submit" form="company-form" className="h-9">
                {selectedCompany ? 'Update' : 'Add'}
              </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={!!companyToDelete} onOpenChange={(open) => { if (!open) closeAllDialogs(); }}>
        <AlertDialogContent className="max-w-[90vw] sm:max-w-md p-4 sm:p-6">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Delete <span className="font-medium">{companyToDelete?.name}</span>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel className="h-9">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="h-9 bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
