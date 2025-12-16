'use client';
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
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button";
import { Technician } from "@/lib/data";
import { MoreHorizontal, PlusCircle } from "lucide-react";
import { useCollection, useFirebase, useMemoFirebase, deleteDocumentNonBlocking, addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { TechnicianForm, TechnicianFormData } from "@/components/technician-form";
import { Badge } from "@/components/ui/badge";

type DialogMode = 'add' | 'edit' | 'delete' | null;

export default function TechniciansPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [selectedTechnician, setSelectedTechnician] = useState<Technician | null>(null);

  const techniciansQuery = useMemoFirebase(() => firestore ? collection(firestore, 'technicians') : null, [firestore]);
  const { data: technicians, isLoading } = useCollection<Technician>(techniciansQuery);

  const handleDelete = () => {
    if (!firestore || !selectedTechnician) return;
    
    const technicianDocRef = doc(firestore, 'technicians', selectedTechnician.id);
    deleteDocumentNonBlocking(technicianDocRef);

    toast({
      title: "Technician Deleted",
      description: `Technician ${selectedTechnician.firstName} ${selectedTechnician.lastName} has been removed.`,
    });

    closeDialog();
  };

  const openDialog = (mode: DialogMode, data?: Technician) => {
    setDialogMode(mode);
    setSelectedTechnician(data || null);
  };

  const closeDialog = () => {
    setDialogMode(null);
    setSelectedTechnician(null);
  };
  
  const handleFormSubmit = (formData: TechnicianFormData) => {
    if (!firestore) return;
    
    if (dialogMode === 'add') {
      const techniciansCollection = collection(firestore, 'technicians');
      addDocumentNonBlocking(techniciansCollection, formData);
      toast({ title: "Success", description: "Technician added successfully." });
    } else if (dialogMode === 'edit' && selectedTechnician) {
      const technicianDocRef = doc(firestore, 'technicians', selectedTechnician.id);
      updateDocumentNonBlocking(technicianDocRef, formData);
      toast({ title: "Success", description: "Technician updated successfully." });
    }

    closeDialog();
  };

  const isAddOrEdit = dialogMode === 'add' || dialogMode === 'edit';

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Technicians</CardTitle>
              <CardDescription>Manage your workshop technicians.</CardDescription>
            </div>
            <Button onClick={() => openDialog('add')} size="sm">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Technician
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>First Name</TableHead>
                <TableHead>Last Name</TableHead>
                <TableHead>Specialization</TableHead>
                <TableHead>Availability</TableHead>
                <TableHead><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">Loading...</TableCell>
                </TableRow>
              ) : (
                technicians?.map((technician) => (
                  <TableRow key={technician.id}>
                    <TableCell className="font-medium">{technician.firstName}</TableCell>
                    <TableCell>{technician.lastName}</TableCell>
                    <TableCell>{technician.specialization}</TableCell>
                    <TableCell>
                      <Badge variant={technician.availability ? 'outline' : 'secondary'} className={technician.availability ? 'border-green-600/40 text-green-700' : ''}>
                        {technician.availability ? 'Available' : 'Unavailable'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                       <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onSelect={() => openDialog('edit', technician)}>
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onSelect={() => openDialog('delete', technician)} className="text-destructive focus:text-destructive">
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

      {/* Add/Edit Dialog */}
      <Dialog open={isAddOrEdit} onOpenChange={(isOpen) => !isOpen && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogMode === 'add' ? 'Add New Technician' : 'Edit Technician'}</DialogTitle>
            <DialogDescription>
              {dialogMode === 'add' ? 'Fill out the form to add a new technician.' : 'Update the details of the technician.'}
            </DialogDescription>
          </DialogHeader>
          <TechnicianForm
            onSubmit={handleFormSubmit}
            onCancel={closeDialog}
            initialData={selectedTechnician || undefined}
            mode={dialogMode || 'add'}
          />
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={dialogMode === 'delete'} onOpenChange={(isOpen) => !isOpen && closeDialog()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this technician?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <span className="font-medium">{selectedTechnician?.firstName} {selectedTechnician?.lastName}</span>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={closeDialog}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
