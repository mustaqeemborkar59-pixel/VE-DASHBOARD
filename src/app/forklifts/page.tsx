
'use client';
import {
  Card,
  CardContent,
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
import { Forklift, ServiceRequest } from "@/lib/data";
import { MoreHorizontal, PlusCircle, Search, ChevronDown, Warehouse, Truck, User, Phone, Wrench, X, ListFilter } from "lucide-react";
import { useCollection, useFirebase, useMemoFirebase } from "@/firebase";
import { collection, doc, query, where } from "firebase/firestore";
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
import { Separator } from "@/components/ui/separator";
import { ForkliftIcon } from "@/components/icons/forklift-icon";

type SearchField = 'All' | 'serialNumber' | 'make' | 'model' | 'siteCompany' | 'siteArea';
const searchFieldLabels: Record<SearchField, string> = {
  All: 'All Fields',
  serialNumber: 'Serial No.',
  make: 'Make',
  model: 'Model',
  siteCompany: 'Site / Company',
  siteArea: 'Site Area'
};

export default function ForkliftsPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  
  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedForklift, setSelectedForklift] = useState<Forklift | null>(null);

  const [locationFilter, setLocationFilter] = useState('All');
  const [equipmentTypeFilter, setEquipmentTypeFilter] = useState('All');
  const [capacityFilter, setCapacityFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchField, setSearchField] = useState<SearchField>('All');
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const forkliftsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'forklifts') : null, [firestore]);
  const serviceRequestsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'serviceRequests'), where('status', '!=', 'Completed')) : null, [firestore]);
  
  const { data: forklifts, isLoading: isLoadingForklifts } = useCollection<Forklift>(forkliftsQuery);
  const { data: activeServiceRequests, isLoading: isLoadingRequests } = useCollection<ServiceRequest>(serviceRequestsQuery);
  
  const isLoading = isLoadingForklifts || isLoadingRequests;
  
  const stats = useMemo(() => {
    const total = forklifts?.length || 0;
    const inWorkshop = forklifts?.filter(f => f.locationType === 'Workshop').length || 0;
    const onSite = forklifts?.filter(f => f.locationType === 'On-Site').length || 0;
    return { total, inWorkshop, onSite };
  }, [forklifts]);


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
      const locationMatch = locationFilter === 'All' ? true : forklift.locationType === locationFilter;
      
      if (searchTerm === '') return typeMatch && capacityMatch && locationMatch;

      const searchInField = (field: keyof Forklift) => 
          forklift[field]?.toString().toLowerCase().includes(lowercasedSearchTerm) ?? false;

      let searchMatch = false;
      if (searchField === 'All') {
        searchMatch = 
          searchInField('serialNumber') || 
          searchInField('make') || 
          searchInField('model') ||
          searchInField('siteCompany') ||
          searchInField('siteArea');
      } else {
        searchMatch = searchInField(searchField);
      }

      return typeMatch && capacityMatch && locationMatch && searchMatch;
    });
  }, [forklifts, equipmentTypeFilter, capacityFilter, locationFilter, searchTerm, searchField]);

  const searchPlaceholder = useMemo(() => {
    if (searchField === 'All') {
      return "Search fleet...";
    }
    return `Search by ${searchFieldLabels[searchField]}...`;
  }, [searchField]);


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
  
  const cardClassName = "border-0 bg-gradient-to-br shadow-lg";

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

      <div className="grid gap-4 md:grid-cols-3">
        <Card className={cn(cardClassName, "from-blue-500 to-indigo-600 text-white shadow-blue-500/30")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Forklifts</CardTitle>
            <ForkliftIcon className="h-5 w-5 text-white/80" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{isLoading ? '...' : stats.total}</div>
            <p className="text-xs text-white/90">Total units in fleet</p>
          </CardContent>
        </Card>
        <Card className={cn(cardClassName, "from-emerald-500 to-green-600 text-white shadow-emerald-500/30")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Workshop</CardTitle>
            <Warehouse className="h-5 w-5 text-white/80" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{isLoading ? '...' : stats.inWorkshop}</div>
            <p className="text-xs text-white/90">Units available at workshop</p>
          </CardContent>
        </Card>
        <Card className={cn(cardClassName, "from-amber-500 to-orange-600 text-white shadow-amber-500/30")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On-Site</CardTitle>
            <Truck className="h-5 w-5 text-white/80" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{isLoading ? '...' : stats.onSite}</div>
            <p className="text-xs text-white/90">Units deployed at client sites</p>
          </CardContent>
        </Card>
      </div>
      
       <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex w-full flex-1 items-center gap-2">
          <Select value={searchField} onValueChange={(value) => setSearchField(value as SearchField)}>
            <SelectTrigger className="w-auto px-3 border-r-0 rounded-r-none">
              <ListFilter className="h-4 w-4 text-muted-foreground" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(searchFieldLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
           <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder={searchPlaceholder}
              className="pl-8 rounded-l-none"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="flex w-full sm:w-auto items-center gap-2">
          <Select value={locationFilter} onValueChange={setLocationFilter}>
            <SelectTrigger className="w-full sm:w-auto">
              <SelectValue placeholder="Filter by Location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Locations</SelectItem>
              <SelectItem value="Workshop">Workshop</SelectItem>
              <SelectItem value="On-Site">On-Site</SelectItem>
            </SelectContent>
          </Select>
          <Select value={equipmentTypeFilter} onValueChange={setEquipmentTypeFilter}>
            <SelectTrigger className="w-full sm:w-auto">
              <SelectValue placeholder="Filter by Type" />
            </SelectTrigger>
            <SelectContent>
              {equipmentTypes.map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={capacityFilter} onValueChange={setCapacityFilter}>
            <SelectTrigger className="w-full sm:w-auto">
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

      <Card>
        <CardContent className="pt-6">
        {isLoadingForklifts ? (
          <div className="flex justify-center items-center h-64 p-6 pt-0">
            <p className="text-muted-foreground">Loading fleet...</p>
          </div>
        ) : filteredForklifts && filteredForklifts.length > 0 ? (
            <div>
              <Table>
                  <TableHeader>
                      <TableRow>
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
                          <TableRow onClick={() => toggleRow(forklift.id)} className={cn("cursor-pointer", expandedRow === forklift.id && "bg-accent hover:bg-accent")} data-state={expandedRow === forklift.id ? 'open' : 'closed'}>
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
                              <TableRow className="bg-accent/50 hover:bg-accent/50">
                                  <TableCell colSpan={6} className="p-2.5">
                                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 border rounded-md bg-background/50">
                                        <div className="flex flex-col gap-1">
                                          <Label className="text-xs text-muted-foreground">MFG Year</Label>
                                          <span className="font-medium">{forklift.year}</span>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                          <Label className="text-xs text-muted-foreground">Capacity</Label>
                                          <span className="font-medium">{forklift.capacity || 'N/A'}</span>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                          <Label className="text-xs text-muted-foreground">Equip. Type</Label>
                                          <span className="font-medium">{forklift.equipmentType || 'N/A'}</span>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                          <Label className="text-xs text-muted-foreground">Voltage</Label>
                                          <span className="font-medium">{forklift.voltage || 'NA'}</span>
                                        </div>
                                         <div className="flex flex-col gap-1">
                                          <Label className="text-xs text-muted-foreground">Mast Height</Label>
                                          <span className="font-medium">{forklift.mastHeight || 'N/A'}</span>
                                        </div>
                                        
                                        {forklift.locationType === 'On-Site' && (
                                          <>
                                            <div className="col-span-full"><Separator className="my-2" /></div>
                                            <div className="col-span-2 flex flex-col gap-1">
                                              <Label className="text-xs text-muted-foreground">Site / Company</Label>
                                              <span className="font-medium">{forklift.siteCompany || 'N/A'}</span>
                                            </div>
                                            <div className="col-span-2 flex flex-col gap-1">
                                              <Label className="text-xs text-muted-foreground">Area</Label>
                                              <span className="font-medium">{forklift.siteArea || 'N/A'}</span>
                                            </div>
                                             <div className="col-span-2 flex flex-col gap-1">
                                              <Label className="text-xs text-muted-foreground flex items-center gap-2"><User className="h-3 w-3" /> Contact Person</Label>
                                              <span className="font-medium">{forklift.siteContactPerson || 'N/A'}</span>
                                            </div>
                                             <div className="col-span-2 flex flex-col gap-1">
                                              <Label className="text-xs text-muted-foreground flex items-center gap-2"><Phone className="h-3 w-3" /> Contact Number</Label>
                                              <span className="font-medium">{forklift.siteContactNumber || 'N/A'}</span>
                                            </div>
                                          </>
                                        )}

                                        {forklift.remarks && (
                                           <>
                                            <div className="col-span-full"><Separator className="my-2" /></div>
                                            <div className="col-span-full flex flex-col gap-1">
                                                 <Label className="text-xs text-muted-foreground">Remarks</Label>
                                                 <p className="text-sm text-foreground whitespace-pre-wrap">{forklift.remarks}</p>
                                            </div>
                                           </>
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
            <div className="flex flex-col items-center justify-center h-64 rounded-b-lg border-t">
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
