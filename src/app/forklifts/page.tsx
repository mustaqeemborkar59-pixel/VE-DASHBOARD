
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
import { Forklift } from "@/lib/data";
import { MoreHorizontal, PlusCircle, Search } from "lucide-react";
import { useCollection, useFirebase, useMemoFirebase } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { ForkliftForm, ForkliftFormData } from "@/components/forklift-form";
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

type DialogMode = 'add' | 'edit' | 'delete' | null;

export default function ForkliftsPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [selectedForklift, setSelectedForklift] = useState<Forklift | null>(null);

  const [equipmentTypeFilter, setEquipmentTypeFilter] = useState('All');
  const [capacityFilter, setCapacityFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  const forkliftsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'forklifts') : null, [firestore]);
  const { data: forklifts, isLoading } = useCollection<Forklift>(forkliftsQuery);

  const equipmentTypes = useMemo(() => {
    if (!forklifts) return [];
    const types = new Set(forklifts.map(f => f.equipmentType).filter(Boolean));
    return ['All', ...Array.from(types)];
  }, [forklifts]);

  const capacities = useMemo(() => {
    if (!forklifts) return [];
    const caps = new Set(forklifts.map(f => f.capacity).filter(Boolean));
    return ['All', ...Array.from(caps)];
  }, [forklifts]);


  const filteredForklifts = useMemo(() => {
    const lowercasedSearchTerm = searchTerm.toLowerCase();
    return forklifts?.filter(forklift => {
      const typeMatch = equipmentTypeFilter === 'All' ? true : forklift.equipmentType === equipmentTypeFilter;
      const capacityMatch = capacityFilter === 'All' ? true : forklift.capacity === capacityFilter;
      const searchMatch = searchTerm === '' ? true : (
        forklift.serialNumber.toLowerCase().includes(lowercasedSearchTerm) ||
        forklift.make.toLowerCase().includes(lowercasedSearchTerm)
      );
      return typeMatch && capacityMatch && searchMatch;
    });
  }, [forklifts, equipmentTypeFilter, capacityFilter, searchTerm]);


  const handleDelete = () => {
    if (!firestore || !selectedForklift) return;
    
    const forkliftDocRef = doc(firestore, 'forklifts', selectedForklift.id);
    deleteDocumentNonBlocking(forkliftDocRef);

    toast({
      title: "Forklift Deleted",
      description: `Forklift ${selectedForklift.serialNumber} has been removed.`,
    });

    closeDialog();
  };

  const openDialog = (mode: DialogMode, data?: Forklift) => {
    setDialogMode(mode);
    setSelectedForklift(data || null);
  };

  const closeDialog = () => {
    setDialogMode(null);
    setSelectedForklift(null);
  };
  
  const handleFormSubmit = (formData: ForkliftFormData) => {
    if (!firestore) return;
    
    if (dialogMode === 'add') {
      const forkliftsCollection = collection(firestore, 'forklifts');
      addDocumentNonBlocking(forkliftsCollection, {
        ...formData,
        year: parseInt(formData.year, 10),
      });
      toast({ title: "Success", description: "Forklift added successfully." });
    } else if (dialogMode === 'edit' && selectedForklift) {
      const forkliftDocRef = doc(firestore, 'forklifts', selectedForklift.id);
      updateDocumentNonBlocking(forkliftDocRef, {
        ...formData,
        year: parseInt(formData.year, 10),
      });
      toast({ title: "Success", description: "Forklift updated successfully." });
    }

    closeDialog();
  };

  const isAddOrEdit = dialogMode === 'add' || dialogMode === 'edit';

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Forklift Fleet</h1>
          <p className="text-muted-foreground">Search, filter, and manage your fleet of forklifts.</p>
        </div>
        <Button onClick={() => openDialog('add')} size="sm">
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Forklift
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row items-center gap-4">
              <div className="relative w-full flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search by Serial No. or Make..."
                  className="pl-8 w-full md:w-[300px]"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex w-full md:w-auto items-center gap-4">
                <Select value={equipmentTypeFilter} onValueChange={setEquipmentTypeFilter}>
                  <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Filter by Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {equipmentTypes.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={capacityFilter} onValueChange={setCapacityFilter}>
                  <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Filter by Capacity" />
                  </SelectTrigger>
                  <SelectContent>
                    {capacities.map(capacity => (
                      <SelectItem key={capacity} value={capacity}>{capacity}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Serial Number</TableHead>
                <TableHead>Make</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Equipment Type</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center h-24">Loading fleet...</TableCell>
                </TableRow>
              ) : filteredForklifts && filteredForklifts.length > 0 ? (
                filteredForklifts.map((forklift) => (
                  <TableRow key={forklift.id}>
                    <TableCell className="font-medium">{forklift.serialNumber}</TableCell>
                    <TableCell>{forklift.make}</TableCell>
                    <TableCell>{forklift.model}</TableCell>
                    <TableCell>{forklift.equipmentType}</TableCell>
                    <TableCell>{forklift.year}</TableCell>
                    <TableCell>{forklift.capacity}</TableCell>
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
                          <DropdownMenuItem onSelect={() => openDialog('edit', forklift)}>
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onSelect={() => openDialog('delete', forklift)} className="text-destructive focus:text-destructive">
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center h-24">
                    No forklifts found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isAddOrEdit} onOpenChange={(isOpen) => !isOpen && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogMode === 'add' ? 'Add New Forklift' : 'Edit Forklift'}</DialogTitle>
            <DialogDescription>
              {dialogMode === 'add' ? 'Fill out the form to add a new forklift.' : 'Update the details of your forklift.'}
            </DialogDescription>
          </DialogHeader>
          <ForkliftForm
            onSubmit={handleFormSubmit}
            onCancel={closeDialog}
            initialData={selectedForklift || undefined}
            mode={dialogMode || 'add'}
          />
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={dialogMode === 'delete'} onOpenChange={(isOpen) => !isOpen && closeDialog()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this forklift?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the forklift with serial number <span className="font-medium">{selectedForklift?.serialNumber}</span>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={closeDialog}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
