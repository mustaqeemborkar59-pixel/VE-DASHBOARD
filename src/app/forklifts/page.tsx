
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
import { MoreHorizontal, PlusCircle, Search, Home, Truck } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

export default function ForkliftsPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  
  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const [selectedForklift, setSelectedForklift] = useState<Forklift | null>(null);

  const [equipmentTypeFilter, setEquipmentTypeFilter] = useState('All');
  const [capacityFilter, setCapacityFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  const forkliftsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'forklifts') : null, [firestore]);
  const { data: forklifts, isLoading } = useCollection<Forklift>(forkliftsQuery);

  const openAddEditDialog = (forklift: Forklift | null) => {
    setIsDropdownOpen(null);
    setSelectedForklift(forklift);
    setIsAddEditDialogOpen(true);
  };

  const openDeleteDialog = (forklift: Forklift) => {
    setIsDropdownOpen(null);
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

    setIsDeleteDialogOpen(false);
    setSelectedForklift(null);
  };

  const handleFormSubmit = (formData: Partial<ForkliftFormData>) => {
    if (!firestore) return;
    
    const dataToSubmit = {
      ...formData,
      year: formData.year ? parseInt(formData.year, 10) : new Date().getFullYear(),
    };

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
                  placeholder="Search by Serial No. or Make..."
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Serial Number</TableHead>
                <TableHead>Make & Model</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24">Loading fleet...</TableCell>
                </TableRow>
              ) : filteredForklifts && filteredForklifts.length > 0 ? (
                filteredForklifts.map((forklift) => (
                  <Collapsible asChild key={forklift.id} open={expandedRow === forklift.id} onOpenChange={(open) => setExpandedRow(open ? forklift.id : null)}>
                    <>
                      <CollapsibleTrigger asChild>
                        <TableRow className="cursor-pointer">
                          <TableCell className="font-medium">{forklift.serialNumber}</TableCell>
                          <TableCell>
                            <div className="font-medium">{forklift.make}</div>
                            <div className="text-sm text-muted-foreground">{forklift.model}</div>
                          </TableCell>
                          <TableCell>{forklift.locationType === 'On-Site' ? forklift.siteName : 'Workshop'}</TableCell>
                          <TableCell>
                              <Badge variant={forklift.locationType === 'Workshop' ? 'secondary' : 'outline'}>
                                  {forklift.locationType === 'Workshop' ? <Home className="mr-2 h-3.5 w-3.5"/> : <Truck className="mr-2 h-3.5 w-3.5"/>}
                                  {forklift.locationType}
                              </Badge>
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                             <DropdownMenu open={isDropdownOpen === forklift.id} onOpenChange={(open) => setIsDropdownOpen(open ? forklift.id : null)}>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <span className="sr-only">Open menu</span>
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
                      </CollapsibleTrigger>
                      <CollapsibleContent asChild>
                         <TableRow className="bg-muted/50 hover:bg-muted/50">
                            <TableCell colSpan={5}>
                              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-4 text-sm">
                                <div className="flex flex-col gap-1">
                                  <span className="font-medium text-muted-foreground">Year</span>
                                  <span>{forklift.year}</span>
                                </div>
                                <div className="flex flex-col gap-1">
                                  <span className="font-medium text-muted-foreground">Capacity</span>
                                  <span>{forklift.capacity || 'N/A'}</span>
                                </div>
                                <div className="flex flex-col gap-1">
                                  <span className="font-medium text-muted-foreground">Equipment Type</span>
                                  <span>{forklift.equipmentType || 'N/A'}</span>
                                </div>
                                
                                {forklift.locationType === 'On-Site' && (
                                  <>
                                    <div className="col-span-2 lg:col-span-4 my-2 border-t -mx-4"></div>
                                    <div className="col-span-2 lg:col-span-4 font-semibold">Site Information</div>
                                    <div className="flex flex-col gap-1">
                                      <span className="font-medium text-muted-foreground">Company</span>
                                      <span>{forklift.siteCompany || 'N/A'}</span>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                      <span className="font-medium text-muted-foreground">Contact</span>
                                      <span>{forklift.siteContactPerson || 'N/A'}</span>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                      <span className="font-medium text-muted-foreground">Phone</span>
                                      <span>{forklift.siteContactNumber || 'N/A'}</span>
                                    </div>
                                  </>
                                )}
                              </div>
                            </TableCell>
                         </TableRow>
                      </CollapsibleContent>
                    </>
                  </Collapsible>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24">
                    No forklifts found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
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

    