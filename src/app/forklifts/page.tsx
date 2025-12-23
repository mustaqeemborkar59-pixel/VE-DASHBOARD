
'use client';
import {
  Card,
  CardContent,
  CardHeader,
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
import { MoreHorizontal, PlusCircle, Search, ChevronDown, Warehouse, Truck, User, Phone } from "lucide-react";
import { useCollection, useFirebase, useMemoFirebase } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { useState, useMemo, Fragment } from "react";
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
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function ForkliftsPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  
  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedForklift, setSelectedForklift] = useState<Forklift | null>(null);

  const [equipmentTypeFilter, setEquipmentTypeFilter] = useState('All');
  const [capacityFilter, setCapacityFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const forkliftsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'forklifts') : null, [firestore]);
  const { data: forklifts, isLoading } = useCollection<Forklift>(forkliftsQuery);

  const openAddEditDialog = (forklift: Forklift | null) => {
    setOpenDropdownId(null);
    setSelectedForklift(forklift);
    setIsAddEditDialogOpen(true);
  };

  const openDeleteDialog = (forklift: Forklift) => {
    setOpenDropdownId(null);
    setSelectedForklift(forklift);
    setIsDeleteDialogOpen(true);
  };

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
        forklift.make.toLowerCase().includes(lowercasedSearchTerm) ||
        forklift.model.toLowerCase().includes(lowercasedSearchTerm)
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

    setIsDeleteDialogOpen(false);
    setSelectedForklift(null);
  };

  const handleFormSubmit = (formData: Partial<ForkliftFormData>) => {
    if (!firestore) return;
    
    const dataToSubmit: Partial<Forklift> = {
      ...formData,
      year: formData.year ? parseInt(formData.year, 10) : new Date().getFullYear(),
    };
    
    if (formData.locationType === 'Workshop') {
      dataToSubmit.siteCompany = '';
      dataToSubmit.siteArea = '';
      dataToSubmit.siteContactPerson = '';
      dataToSubmit.siteContactNumber = '';
    }

    if (selectedForklift) { // Edit mode
      const forkliftDocRef = doc(firestore, 'forklifts', selectedForklift.id);
      updateDocumentNonBlocking(forkliftDocRef, dataToSubmit);
      toast({ title: "Success", description: "Forklift updated successfully." });
    } else { // Add mode
      const forkliftsCollection = collection(firestore, 'forklifts');
      addDocumentNonBlocking(forkliftsCollection, dataToSubmit);
      toast({ title: "Success", description: "Forklift added successfully." });
    }

    setIsAddEditDialogOpen(false);
    setSelectedForklift(null);
  };

  const toggleRow = (id: string) => {
    setExpandedRow(expandedRow === id ? null : id);
  };
  
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Forklift Fleet</h1>
          <p className="text-muted-foreground">Search, filter, and manage your fleet of forklifts.</p>
        </div>
        <Button onClick={() => openAddEditDialog(null)} size="sm">
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
                  placeholder="Search by Serial No., Make, or Model..."
                  className="pl-8 w-full md:w-[300px]"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex w-full md:w-auto items-end gap-4">
                <div className="grid w-full md:w-[180px] gap-1.5">
                  <Label htmlFor="type-filter">Type</Label>
                  <Select value={equipmentTypeFilter} onValueChange={setEquipmentTypeFilter}>
                    <SelectTrigger id="type-filter">
                      <SelectValue placeholder="Filter by Type" />
                    </SelectTrigger>
                    <SelectContent>
                      {equipmentTypes.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid w-full md:w-[180px] gap-1.5">
                  <Label htmlFor="capacity-filter">Capacity</Label>
                  <Select value={capacityFilter} onValueChange={setCapacityFilter}>
                    <SelectTrigger id="capacity-filter">
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
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <p className="text-muted-foreground">Loading fleet...</p>
            </div>
          ) : filteredForklifts && filteredForklifts.length > 0 ? (
             <div className="border rounded-xl shadow-sm">
                <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead className="w-[100px]"></TableHead>
                        <TableHead>Serial Number</TableHead>
                        <TableHead>Make</TableHead>
                        <TableHead>Model</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead className="w-[50px] text-right"><span className="sr-only">Actions</span></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredForklifts.map((forklift) => (
                        <Fragment key={forklift.id}>
                            <TableRow onClick={() => toggleRow(forklift.id)} className={cn("cursor-pointer", expandedRow === forklift.id && "bg-muted/50 hover:bg-muted/50")} data-state={expandedRow === forklift.id ? 'open' : 'closed'}>
                                <TableCell className="w-[100px] text-center">
                                    <Button variant="ghost" size="sm">
                                        <span className="text-xs">{expandedRow === forklift.id ? "Hide" : "View"}</span>
                                        <ChevronDown className={cn("h-4 w-4 ml-1 transition-transform", expandedRow === forklift.id && "rotate-180")} />
                                    </Button>
                                </TableCell>
                                <TableCell className="font-medium">{forklift.serialNumber}</TableCell>
                                <TableCell>{forklift.make}</TableCell>
                                <TableCell>{forklift.model}</TableCell>
                                <TableCell>
                                    <Badge variant={'outline'} className={cn(
                                        'font-medium',
                                        forklift.locationType === 'Workshop' && 'border-green-500/60 bg-green-50 text-green-700 dark:border-green-400/50 dark:bg-green-900/20 dark:text-green-400',
                                        forklift.locationType === 'On-Site' && 'border-amber-500/60 bg-amber-50 text-amber-700 dark:border-amber-400/50 dark:bg-amber-900/20 dark:text-amber-400'
                                    )}>
                                        {forklift.locationType === 'Workshop' ? <Warehouse className="mr-2 h-3.5 w-3.5"/> : <Truck className="mr-2 h-3.5 w-3.5"/>}
                                        {forklift.locationType === 'On-Site' ? forklift.siteCompany : 'Workshop'}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu open={openDropdownId === forklift.id} onOpenChange={(isOpen) => setOpenDropdownId(isOpen ? forklift.id : null)}>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                        <DropdownMenuItem onSelect={() => openAddEditDialog(forklift)}>
                                        Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onSelect={() => openDeleteDialog(forklift)} className="text-destructive focus:text-destructive">
                                        Delete
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                            {expandedRow === forklift.id && (
                                <TableRow className="bg-muted/50 hover:bg-muted/50">
                                    <TableCell colSpan={6} className="p-0">
                                        <div className="p-6">
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                                <div className="flex flex-col gap-1">
                                                    <span className="font-medium text-muted-foreground">Year</span>
                                                    <span>{forklift.year}</span>
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <span className="font-medium text-muted-foreground">Capacity</span>
                                                    <span>{forklift.capacity || 'N/A'}</span>
                                                </div>
                                                <div className="flex flex-col gap-1 col-span-2">
                                                    <span className="font-medium text-muted-foreground">Equipment Type</span>
                                                    <span>{forklift.equipmentType || 'N/A'}</span>
                                                </div>
                                                
                                                {forklift.locationType === 'On-Site' && (
                                                    <>
                                                    <div className="col-span-full mt-4 border-t pt-4 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                                                        <div>
                                                            <h4 className="font-semibold mb-2">Site Location</h4>
                                                            <div className="flex flex-col gap-1">
                                                                <span className="font-medium text-muted-foreground">Site / Company</span>
                                                                <span>{forklift.siteCompany || 'N/A'}</span>
                                                            </div>
                                                            <div className="flex flex-col gap-1 mt-2">
                                                                <span className="font-medium text-muted-foreground">Area</span>
                                                                <span>{forklift.siteArea || 'N/A'}</span>
                                                            </div>
                                                        </div>
                                                         <div>
                                                            <h4 className="font-semibold mb-2">Site Contact</h4>
                                                             <div className="flex items-center gap-2">
                                                                <User className="h-4 w-4 text-muted-foreground" />
                                                                <span>{forklift.siteContactPerson || 'NA'}</span>
                                                            </div>
                                                             <div className="flex items-center gap-2 mt-2">
                                                                <Phone className="h-4 w-4 text-muted-foreground" />
                                                                <span>{forklift.siteContactNumber || 'N/A'}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    </>
                                                )}
                                            </div>
                                             {forklift.remarks && (
                                                <div className="mt-4 pt-4 border-t">
                                                     <h4 className="font-semibold mb-2 text-sm">Remarks</h4>
                                                     <p className="text-sm text-muted-foreground whitespace-pre-wrap">{forklift.remarks}</p>
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </Fragment>
                        ))}
                    </TableBody>
                </Table>
            </div>
          ) : (
             <div className="flex flex-col items-center justify-center h-64 rounded-lg border-2 border-dashed">
                <h3 className="text-xl font-semibold">No Forklifts Found</h3>
                <p className="text-muted-foreground mt-2">
                  No forklifts match your current filters. Try adding one!
                </p>
             </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isAddEditDialogOpen} onOpenChange={setIsAddEditDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedForklift ? 'Edit Forklift' : 'Add New Forklift'}</DialogTitle>
            <DialogDescription>
              {selectedForklift ? 'Update the details of your forklift.' : 'Fill out the form to add a new forklift.'}
            </DialogDescription>
          </DialogHeader>
          <ForkliftForm
            onSubmit={handleFormSubmit}
            onCancel={() => { setIsAddEditDialogOpen(false); setSelectedForklift(null);}}
            initialData={selectedForklift || undefined}
            mode={selectedForklift ? 'edit' : 'add'}
          />
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this forklift?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the forklift with serial number <span className="font-medium">{selectedForklift?.serialNumber}</span>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setIsDeleteDialogOpen(false); setSelectedForklift(null);}}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
