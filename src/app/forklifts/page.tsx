
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
import { Button } from "@/components/ui/button";
import { Forklift, ServiceRequest } from "@/lib/data";
import { EllipsisVertical, Pencil, PlusCircle, Search, Warehouse, Truck, User, Phone, Wrench, ListFilter, Upload, AlertTriangle, Trash2 } from "lucide-react";
import { useCollection, useFirebase, useMemoFirebase } from "@/firebase";
import { collection, doc, query, where, orderBy } from "firebase/firestore";
import { useState, useMemo, Fragment } from "react";
import { useToast } from "@/hooks/use-toast";
import { ForkliftForm, ForkliftFormData } from "@/components/forklift-form";
import { ForkliftImportDialog } from "@/components/forklift-import-dialog";
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
import AppLayout from "@/components/app-layout";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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
  const [forkliftToDelete, setForkliftToDelete] = useState<Forklift | null>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [selectedForklift, setSelectedForklift] = useState<Forklift | null>(null);

  const [locationFilter, setLocationFilter] = useState('All');
  const [equipmentTypeFilter, setEquipmentTypeFilter] = useState('All');
  const [capacityFilter, setCapacityFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchField, setSearchField] = useState<SearchField>('All');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const forkliftsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'forklifts'), orderBy('srNumber', 'asc')) : null, [firestore]);
  const serviceRequestsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'serviceRequests'), where('status', '!=', 'Completed')) : null, [firestore]);
  
  const { data: forklifts, isLoading: isLoadingForklifts } = useCollection<Forklift>(forkliftsQuery);
  const { data: activeServiceRequests, isLoading: isLoadingRequests } = useCollection<ServiceRequest>(serviceRequestsQuery);
  
  const isLoading = isLoadingForklifts || isLoadingRequests;
  
  const stats = useMemo(() => {
    const total = forklifts?.length || 0;
    const inWorkshop = forklifts?.filter(f => f.locationType === 'Workshop').length || 0;
    const onSite = forklifts?.filter(f => f.locationType === 'On-Site').length || 0;
    const notConfirmed = forklifts?.filter(f => f.locationType === 'Not Confirm').length || 0;
    return { total, inWorkshop, onSite, notConfirmed };
  }, [forklifts]);


  const openAddEditDialog = (forklift: Forklift | null) => {
    setSelectedForklift(forklift);
    setForkliftToDelete(null);
    setIsAddEditDialogOpen(true);
  };

  const openDeleteDialog = (forklift: Forklift) => {
    setSelectedForklift(null);
    setIsAddEditDialogOpen(false);
    setForkliftToDelete(forklift);
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
  
  const locationOptions = useMemo(() => {
    if (!forklifts) return ['All', 'Workshop', 'On-Site', 'Not Confirm'];
    const sites = new Set(forklifts.map(f => f.siteCompany).filter(Boolean));
    return ['All', 'Workshop', 'On-Site', 'Not Confirm', ...Array.from(sites)];
  }, [forklifts]);


  const filteredForklifts = useMemo(() => {
    if (!forklifts) return [];
    const lowercasedSearchTerm = searchTerm.toLowerCase();
    return forklifts.filter(forklift => {
      const typeMatch = equipmentTypeFilter === 'All' ? true : forklift.equipmentType === equipmentTypeFilter;
      const capacityMatch = capacityFilter === 'All' ? true : forklift.capacity === capacityFilter;
      
      let locationMatch = true;
      if (locationFilter !== 'All') {
          if (['Workshop', 'On-Site', 'Not Confirm'].includes(locationFilter)) {
              locationMatch = forklift.locationType === locationFilter;
          } else {
              locationMatch = forklift.siteCompany === locationFilter;
          }
      }
      
      if (!searchTerm) return typeMatch && capacityMatch && locationMatch;

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

  const handleCancelDelete = () => {
    setForkliftToDelete(null);
  };


  const handleDelete = () => {
    if (!firestore || !forkliftToDelete) return;
    
    const forkliftDocRef = doc(firestore, 'forklifts', forkliftToDelete.id);
    deleteDocumentNonBlocking(forkliftDocRef);

    toast({
      title: "Forklift Deleted",
      description: `Forklift ${forkliftToDelete.serialNumber} has been removed.`,
    });

    setForkliftToDelete(null);
  };

  const handleFormSubmit = (formData: Partial<ForkliftFormData>) => {
    if (!firestore) return;
    
    const dataToSubmit: Partial<Forklift> = {
      ...formData,
      year: formData.year ? parseInt(formData.year, 10) : new Date().getFullYear(),
    };
    
    if (formData.locationType === 'Workshop' || formData.locationType === 'Not Confirm') {
      dataToSubmit.siteCompany = '';
      dataToSubmit.siteArea = '';
      dataToSubmit.siteContactPerson = '';
      dataToSubmit.siteContactNumber = '';
    }

    if (selectedForklift) {
      const forkliftDocRef = doc(firestore, 'forklifts', selectedForklift.id);
      updateDocumentNonBlocking(forkliftDocRef, dataToSubmit);
      toast({ title: "Success", description: "Forklift updated successfully." });
    } else {
      const maxSrNumber = forklifts ? Math.max(0, ...forklifts.map(f => f.srNumber || 0)) : 0;
      dataToSubmit.srNumber = maxSrNumber + 1;
      const forkliftsCollection = collection(firestore, 'forklifts');
      addDocumentNonBlocking(forkliftsCollection, dataToSubmit);
      toast({ title: "Success", description: "Forklift added successfully." });
    }

    setIsAddEditDialogOpen(false);
    setSelectedForklift(null);
  };

  const handleImportComplete = (count: number) => {
    toast({
      title: 'Import Successful',
      description: `${count} forklift(s) have been added to your fleet.`,
    });
    setIsImportDialogOpen(false);
  };

  const toggleRow = (id: string) => {
    setExpandedRow(expandedRow === id ? null : id);
  };
  
  const cardClassName = "border-0 bg-gradient-to-br shadow-lg";
  
  const getLocationIcon = (locationType: Forklift['locationType']) => {
    switch (locationType) {
      case 'Workshop':
        return <Warehouse className="mr-2 h-3.5 w-3.5" />;
      case 'On-Site':
        return <Truck className="mr-2 h-3.5 w-3.5" />;
      case 'Not Confirm':
        return <AlertTriangle className="mr-2 h-3.5 w-3.5" />;
      default:
        return null;
    }
  }
  
  const getLocationText = (forklift: Forklift) => {
    switch (forklift.locationType) {
      case 'Workshop':
        return 'Workshop';
      case 'On-Site':
        return forklift.siteCompany || 'On-Site';
      case 'Not Confirm':
        return 'Not Confirmed';
      default:
        return 'Unknown';
    }
  }
  
  const getLocationBadgeClass = (locationType: Forklift['locationType']) => {
    switch (locationType) {
      case 'Workshop':
        return 'border-green-500/60 bg-green-50 text-green-700 dark:border-green-400/50 dark:bg-green-900/20 dark:text-green-400';
      case 'On-Site':
        return 'border-amber-500/60 bg-amber-50 text-amber-700 dark:border-amber-400/50 dark:bg-amber-900/20 dark:text-amber-400';
      case 'Not Confirm':
        return 'border-red-500/60 bg-red-50 text-red-700 dark:border-red-400/50 dark:bg-red-900/20 dark:text-red-400';
      default:
        return '';
    }
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Forklift Fleet</h1>
            <p className="text-muted-foreground">Search, filter, and manage your fleet of forklifts.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => setIsImportDialogOpen(true)} variant="outline" size="sm">
              <Upload className="mr-2 h-4 w-4" />
              Import
            </Button>
            <Button onClick={() => openAddEditDialog(null)} size="sm">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Forklift
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
          <Card className={cn(cardClassName, "from-red-500 to-rose-600 text-white shadow-red-500/30")}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Not Confirmed</CardTitle>
              <AlertTriangle className="h-5 w-5 text-white/80" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{isLoading ? '...' : stats.notConfirmed}</div>
              <p className="text-xs text-white/90">Units with unconfirmed locations</p>
            </CardContent>
          </Card>
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
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center flex-1 w-full sm:w-auto sm:min-w-64">
                <Select value={searchField} onValueChange={(value) => setSearchField(value as SearchField)}>
                <SelectTrigger className="w-auto px-3 border-r-0 rounded-r-none focus:ring-0 focus:ring-offset-0">
                    <ListFilter className="h-4 w-4 text-muted-foreground" />
                </SelectTrigger>
                <SelectContent>
                    {Object.entries(searchFieldLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                </SelectContent>
                </Select>
                <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder={searchPlaceholder}
                    className="pl-8 rounded-l-none w-full"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
                </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger className="w-full sm:w-auto min-w-[150px]">
                    <SelectValue placeholder="Filter by Location" />
                </SelectTrigger>
                <SelectContent>
                     {locationOptions.map(loc => (
                      <SelectItem key={loc} value={loc}>
                        {loc === 'All' ? 'All Locations' : loc}
                      </SelectItem>
                    ))}
                </SelectContent>
                </Select>
                <Select value={equipmentTypeFilter} onValueChange={setEquipmentTypeFilter}>
                <SelectTrigger className="w-full sm:w-auto min-w-[150px]">
                    <SelectValue placeholder="Filter by Type" />
                </SelectTrigger>
                <SelectContent>
                    {equipmentTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                </SelectContent>
                </Select>
                <Select value={capacityFilter} onValueChange={setCapacityFilter}>
                <SelectTrigger className="w-full sm:w-auto min-w-[150px]">
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

        <div className="text-sm text-muted-foreground">
          {isLoadingForklifts ? 'Loading...' : `Showing ${filteredForklifts.length} of ${forklifts?.length || 0} forklifts.`}
        </div>

        <Card>
          <CardContent className="p-0 md:p-3 pt-0">
          {isLoadingForklifts ? (
            <div className="flex justify-center items-center h-64 p-3 pt-0">
              <p className="text-muted-foreground">Loading fleet...</p>
            </div>
          ) : filteredForklifts && filteredForklifts.length > 0 ? (
              <div>
                <Table>
                    <TableHeader className="sticky top-0 bg-card">
                        <TableRow>
                        <TableHead className="w-[50px] hidden sm:table-cell">Sr.</TableHead>
                        <TableHead>Serial Number</TableHead>
                        <TableHead className="hidden md:table-cell">Make</TableHead>
                        <TableHead className="hidden md:table-cell">Model</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead className="w-[50px] text-right"><span className="sr-only">Actions</span></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredForklifts.map((forklift) => (
                        <Fragment key={forklift.id}>
                            <TableRow onClick={() => toggleRow(forklift.id)} className={cn("cursor-pointer", expandedRow === forklift.id && "bg-accent hover:bg-accent")} data-state={expandedRow === forklift.id ? 'open' : 'closed'}>
                                <TableCell className="font-medium hidden sm:table-cell">{forklift.srNumber}</TableCell>
                                <TableCell>
                                  <div className="font-medium">{forklift.serialNumber}</div>
                                  <div className="text-sm text-muted-foreground md:hidden">{forklift.make} {forklift.model}</div>
                                </TableCell>
                                <TableCell className="hidden md:table-cell">{forklift.make}</TableCell>
                                <TableCell className="hidden md:table-cell">{forklift.model}</TableCell>
                                <TableCell>
                                  <Button variant="ghost" size="sm" className="p-1 h-auto" onClick={(e) => { e.stopPropagation(); openAddEditDialog(forklift); }}>
                                    <Badge variant={'outline'} className={cn('font-medium pointer-events-none', getLocationBadgeClass(forklift.locationType))}>
                                      {getLocationIcon(forklift.locationType)}
                                      {getLocationText(forklift)}
                                    </Badge>
                                  </Button>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Popover>
                                      <PopoverTrigger asChild>
                                          <Button variant="ghost" size="icon" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                                              <EllipsisVertical className="h-4 w-4" />
                                          </Button>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-40">
                                          <div className="grid gap-1">
                                              <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => openAddEditDialog(forklift)}>
                                                  <Pencil className="mr-2 h-4 w-4" />
                                                  Edit
                                              </Button>
                                              <Button variant="ghost" size="sm" className="w-full justify-start text-destructive hover:text-destructive" onClick={() => openDeleteDialog(forklift)}>
                                                  <Trash2 className="mr-2 h-4 w-4" />
                                                  Delete
                                              </Button>
                                          </div>
                                      </PopoverContent>
                                  </Popover>
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
                                           <div className="flex flex-col gap-1">
                                            <Label className="text-xs text-muted-foreground">POPPONS</Label>
                                            <span className="font-medium">{forklift.poppons || 'N/A'}</span>
                                          </div>
                                          
                                          {forklift.locationType === 'On-Site' && (
                                            <>
                                              <div className="col-span-full"><Separator className="my-2" /></div>
                                              <div className="col-span-full sm:col-span-1 flex flex-col gap-1">
                                                <Label className="text-xs text-muted-foreground">Site / Company</Label>
                                                <span className="font-medium">{forklift.siteCompany || 'N/A'}</span>
                                              </div>
                                              <div className="col-span-full sm:col-span-1 flex flex-col gap-1">
                                                <Label className="text-xs text-muted-foreground">Area</Label>
                                                <span className="font-medium">{forklift.siteArea || 'N/A'}</span>
                                              </div>
                                              <div className="col-span-full sm:col-span-1 flex flex-col gap-1">
                                                <Label className="text-xs text-muted-foreground flex items-center gap-2"><User className="h-3 w-3" /> Contact Person</Label>
                                                <span className="font-medium">{forklift.siteContactPerson || 'N/A'}</span>
                                              </div>
                                              <div className="col-span-full sm:col-span-1 flex flex-col gap-1">
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
        
        <AlertDialog open={!!forkliftToDelete} onOpenChange={(open) => !open && setForkliftToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure you want to delete this forklift?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the forklift with serial number <span className="font-medium">{forkliftToDelete?.serialNumber}</span>. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleCancelDelete}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <ForkliftImportDialog
          isOpen={isImportDialogOpen}
          onClose={() => setIsImportDialogOpen(false)}
          onImportComplete={handleImportComplete}
        />
      </div>
    </AppLayout>
  );
}
