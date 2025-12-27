'use client';
import { useState } from 'react';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button";
import { MoreHorizontal, PlusCircle } from "lucide-react";
import AppLayout from "@/components/app-layout";
import { useCollection, useFirebase, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc, query, orderBy } from 'firebase/firestore';
import { Company } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { CompanyForm, CompanyFormData } from '@/components/company-form';

export default function CompaniesPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  
  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  const companiesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'companies'), orderBy('createdAt', 'desc')) : null, [firestore]);
  const { data: companies, isLoading } = useCollection<Company>(companiesQuery);
  
  const openAddEditDialog = (company: Company | null) => {
    setOpenDropdownId(null);
    setSelectedCompany(company);
    setIsAddEditDialogOpen(true);
  };

  const openDeleteDialog = (company: Company) => {
    setOpenDropdownId(null);
    setSelectedCompany(company);
    setIsDeleteDialogOpen(true);
  };

  const handleFormSubmit = (formData: CompanyFormData) => {
    if (!firestore) return;
    
    if (selectedCompany) { // Edit mode
      const companyDocRef = doc(firestore, 'companies', selectedCompany.id);
      updateDocumentNonBlocking(companyDocRef, formData);
      toast({ title: "Success", description: "Company updated successfully." });
    } else { // Add mode
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
    if (!firestore || !selectedCompany) return;
    
    const companyDocRef = doc(firestore, 'companies', selectedCompany.id);
    deleteDocumentNonBlocking(companyDocRef);

    toast({
      title: "Company Deleted",
      description: `Company ${selectedCompany.name} has been removed.`,
    });

    setIsDeleteDialogOpen(false);
    setSelectedCompany(null);
  };

  return (
    <AppLayout>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Companies</CardTitle>
              <CardDescription>Manage your client companies.</CardDescription>
            </div>
            <Button onClick={() => openAddEditDialog(null)} size="sm">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Company
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0 md:p-3 pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company Name</TableHead>
                <TableHead className="hidden md:table-cell">Address</TableHead>
                <TableHead className="hidden lg:table-cell">GSTIN</TableHead>
                <TableHead><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">Loading companies...</TableCell>
                </TableRow>
              ) : (
                companies?.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell className="font-medium">{company.name}</TableCell>
                    <TableCell className="hidden md:table-cell max-w-sm truncate">{company.address}</TableCell>
                    <TableCell className="hidden lg:table-cell font-mono">{company.gstin}</TableCell>
                    <TableCell>
                      <DropdownMenu open={openDropdownId === company.id} onOpenChange={(open) => setOpenDropdownId(open ? company.id : null)}>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onSelect={() => openAddEditDialog(company)}>
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onSelect={() => openDeleteDialog(company)} className="text-destructive focus:text-destructive">
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isAddEditDialogOpen} onOpenChange={setIsAddEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedCompany ? 'Edit Company' : 'Add New Company'}</DialogTitle>
            <DialogDescription>
              {selectedCompany ? 'Update the details of the company.' : 'Fill out the form to add a new company.'}
            </DialogDescription>
          </DialogHeader>
          <CompanyForm 
            onSubmit={handleFormSubmit}
            onCancel={() => setIsAddEditDialogOpen(false)}
            initialData={selectedCompany || undefined}
            mode={selectedCompany ? 'edit' : 'add'}
          />
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <span className="font-medium">{selectedCompany?.name}</span>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedCompany(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}

    