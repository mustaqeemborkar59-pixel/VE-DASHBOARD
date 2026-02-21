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
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button";
import { Forklift, JobCard, Company } from "@/lib/data";
import { EllipsisVertical, Pencil, PlusCircle, Search, Warehouse, User, Phone, Wrench, ListFilter, Upload, AlertTriangle, ChevronDown, XCircle, Share2, MapPin, CalendarDays, Zap, Ruler, Hash } from "lucide-react";
import { useCollection, useFirebase, useMemoFirebase } from "@/firebase";
import { collection, doc, query, where, orderBy, deleteField } from "firebase/firestore";
import { useState, useMemo, Fragment, useCallback } from "react";
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toBlob } from 'html-to-image';


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
  const { firestore, user } = useFirebase();
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
  const [isSharing, setIsSharing] = useState<string | null>(null);

  const forkliftsQuery = useMemoFirebase(() => firestore && user ? query(collection(firestore, 'forklifts'), orderBy('srNumber', 'asc')) : null, [firestore, user]);
  const activeJobCardsQuery = useMemoFirebase(() => firestore && user ? query(collection(firestore, 'jobCards'), where('status', 'in', ['Pending', 'Assigned', 'In Progress'])) : null, [firestore, user]);
  const companiesQuery = useMemoFirebase(() => firestore && user ? query(collection(firestore, 'companies'), orderBy('name', 'asc')) : null, [firestore, user]);
  
  const { data: forklifts, isLoading: isLoadingForklifts } = useCollection<Forklift>(forkliftsQuery);
  const { data: activeJobCards, isLoading: isLoadingJobs } = useCollection<JobCard>(activeJobCardsQuery);
  const { data: companies, isLoading: isLoadingCompanies } = useCollection<Company>(companiesQuery);
  
  const isLoading = isLoadingForklifts || isLoadingJobs || isLoadingCompanies;
  
  const stats = useMemo(() => {
    const total = forklifts?.length || 0;
    const inWorkshop = forklifts?.filter(f => f.locationType === 'Workshop').length || 0;
    const onSite = forklifts?.filter(f => f.locationType === 'On-Site').length || 0;
    const notConfirmed = forklifts?.filter(f => f.locationType === 'Not Confirm').length || 0;
    return { total, inWorkshop, onSite, notConfirmed };
  }, [forklifts]);

  const handleDelayedAction = (action: () => void) => {
    setTimeout(action, 100);
  };

  const openAddEditDialog = useCallback((forklift: Forklift | null) => {
    setSelectedForklift(forklift);
    handleDelayedAction(() => setIsAddEditDialogOpen(true));
  }, []);

  const openDeleteDialog = useCallback((forklift: Forklift) => {
    handleDelayedAction(() => setForkliftToDelete(forklift));
  }, []);

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

  const handleClearFilters = () => {
    setLocationFilter('All');
    setEquipmentTypeFilter('All');
    setCapacityFilter('All');
    setSearchTerm('');
    setSearchField('All');
  };
  
  const anyFilterActive = useMemo(() => {
      return locationFilter !== 'All' || equipmentTypeFilter !== 'All' || capacityFilter !== 'All' || searchTerm !== '';
  }, [locationFilter, equipmentTypeFilter, capacityFilter, searchTerm]);


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

      const searchInField = (field: keyof Forklift) => {
          const value = forklift[field as keyof Forklift];
          return value ? value.toString().toLowerCase().includes(lowercasedSearchTerm) : false;
      };

      let searchMatch = false;
      if (searchField === 'All') {
        searchMatch = 
          searchInField('serialNumber') || 
          searchInField('make') || 
          searchInField('model') ||
          searchInField('siteCompany') ||
          searchInField('siteArea');
      } else {
        searchMatch = searchInField(searchField as keyof Forklift);
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

    const { firm, ...restOfFormData } = formData;
    
    const dataToSubmit: any = {
      ...restOfFormData,
      year: formData.year ? parseInt(formData.year, 10) : new Date().getFullYear(),
    };

    if (formData.locationType === 'Workshop' || formData.locationType === 'Not Confirm') {
      dataToSubmit.siteCompany = '';
      dataToSubmit.siteArea = '';
      dataToSubmit.siteContactPerson = '';
      dataToSubmit.siteContactNumber = '';
    }

    if (selectedForklift) {
        if (firm === 'Vithal' || firm === 'RV') {
            dataToSubmit.firm = firm;
        } else {
            dataToSubmit.firm = deleteField();
        }
        const forkliftDocRef = doc(firestore, 'forklifts', selectedForklift.id);
        updateDocumentNonBlocking(forkliftDocRef, dataToSubmit);
        toast({ title: "Success", description: "Forklift updated successfully." });
    } else {
        if (firm === 'Vithal' || firm === 'RV') {
            dataToSubmit.firm = firm;
        }
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

  const handleShare = async (forklift: Forklift) => {
    const node = document.getElementById(`share-card-${forklift.id}`);
    if (!node) return;

    setIsSharing(forklift.id);
    try {
      const blob = await toBlob(node, { 
        backgroundColor: '#FFFFFF',
        pixelRatio: 3, 
        width: 600,
        style: {
          display: 'block'
        }
      });
      
      if (!blob) throw new Error("Failed to generate image");

      const file = new File([blob], `forklift-${forklift.serialNumber}.png`, { type: 'image/png' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Forklift Details: ${forklift.serialNumber}`,
          text: `Details for ${forklift.make} ${forklift.model} - Shared via VE Dashboard`
        });
      } else {
        const link = document.createElement('a');
        link.download = `forklift-${forklift.serialNumber}.png`;
        link.href = URL.createObjectURL(blob);
        link.click();
        toast({ title: "Image Generated", description: "Image downloaded. You can now send it manually." });
      }
    } catch (error) {
      console.error('Error sharing:', error);
      toast({ variant: 'destructive', title: "Share Error", description: "Failed to create shareable image." });
    } finally {
      setIsSharing(null);
    }
  };
  
  const cardClassName = "border-0 bg-gradient-to-br shadow-lg transition-transform hover:scale-[1.02] cursor-pointer";
  
  const getLocationIcon = (locationType: Forklift['locationType']) => {
    switch (locationType) {
      case 'Workshop':
        return <Warehouse className="mr-1.5 h-3 w-3" />;
      case 'On-Site':
        return <ForkliftIcon className="mr-1.5 h-3 w-3" />;
      case 'Not Confirm':
        return <AlertTriangle className="mr-1.5 h-3 w-3" />;
      default:
        return null;
    }
  }
  
  const getLocationText = (forklift: Forklift) => {
    let text: string;
    switch (forklift.locationType) {
      case 'Workshop':
        text = 'Workshop';
        break;
      case 'On-Site':
        text = forklift.siteCompany || 'On-Site';
        break;
      case 'Not Confirm':
        text = 'Not Confirmed';
        break;
      default:
        text = 'Unknown';
    }
    
    return text;
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

  const getFirmBadgeClass = (firm: Forklift['firm']) => {
    switch (firm) {
      case 'Vithal':
        return 'border-red-500/60 bg-red-50 text-red-700 dark:border-red-400/50 dark:bg-red-900/20 dark:text-red-400';
      case 'RV':
        return 'border-blue-800/60 bg-blue-50 text-blue-900 dark:border-blue-500/50 dark:bg-blue-900/20 dark:text-blue-400';
      default:
        return '';
    }
  }

  const hasActiveRequest = (forkliftId: string) => {
      if (!user) return false;
      return activeJobCards?.some(job => job.forkliftId === forkliftId);
  }
  
  const renderActions = (forklift: Forklift) => (
      <DropdownMenu>
          <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                  <EllipsisVertical className="h-4 w-4" />
              </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-40" align="end" onMouseLeave={(e) => (e.currentTarget as HTMLElement).blur()}>
              <DropdownMenuItem onSelect={() => handleShare(forklift)} disabled={isSharing === forklift.id}>
                  <Share2 className="mr-2 h-4 w-4" />
                  {isSharing === forklift.id ? 'Generating...' : 'Share Card'}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => openAddEditDialog(forklift)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => openDeleteDialog(forklift)} className="text-destructive hover:text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
              </DropdownMenuItem>
          </DropdownMenuContent>
      </DropdownMenu>
  );

  return (
    <AppLayout>
      <div className="flex flex-col gap-4 sm:gap-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Forklift Fleet</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Search, filter, and manage your fleet of forklifts.</p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button onClick={() => setIsImportDialogOpen(true)} variant="outline" size="sm" className="flex-1 sm:flex-none text-xs">
              <Upload className="mr-2 h-3.5 w-3.5" />
              Import
            </Button>
            <Button onClick={() => openAddEditDialog(null)} size="sm" className="flex-1 sm:flex-none text-xs">
              <PlusCircle className="mr-2 h-3.5 w-3.5" />
              Add Forklift
            </Button>
          </div>
        </div>

        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <Card onClick={() => setLocationFilter('Workshop')} className={cn(cardClassName, "from-emerald-500 to-green-600 text-white shadow-emerald-500/30")}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Workshop</CardTitle>
              <Warehouse className="h-5 w-5 text-white/80" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isLoading ? '...' : stats.inWorkshop}</div>
              <p className="text-[10px] text-white/90">Units available at workshop</p>
            </CardContent>
          </Card>
          <Card onClick={() => setLocationFilter('On-Site')} className={cn(cardClassName, "from-amber-500 to-orange-600 text-white shadow-amber-500/30")}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">On-Site</CardTitle>
              <ForkliftIcon className="h-5 w-5 text-white/80" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isLoading ? '...' : stats.onSite}</div>
              <p className="text-[10px] text-white/90">Units deployed at client sites</p>
            </CardContent>
          </Card>
          <Card onClick={() => setLocationFilter('Not Confirm')} className={cn(cardClassName, "from-red-500 to-rose-600 text-white shadow-red-500/30")}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Not Confirmed</CardTitle>
              <AlertTriangle className="h-5 w-5 text-white/80" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isLoading ? '...' : stats.notConfirmed}</div>
              <p className="text-[10px] text-white/90">Units with unconfirmed locations</p>
            </CardContent>
          </Card>
          <Card onClick={handleClearFilters} className={cn(cardClassName, "from-blue-500 to-indigo-600 text-white shadow-blue-500/30")}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Forklifts</CardTitle>
              <ForkliftIcon className="h-5 w-5 text-white/80" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isLoading ? '...' : stats.total}</div>
              <p className="text-[10px] text-white/90">Total units in fleet</p>
            </CardContent>
          </Card>
        </div>
        
        <div className="space-y-3">
            <div className="flex items-center w-full">
                <Select value={searchField} onValueChange={(value) => setSearchField(value as SearchField)}>
                <SelectTrigger className="w-auto px-2 sm:px-3 border-r-0 rounded-r-none focus:ring-0 focus:ring-offset-0 h-9 text-xs">
                    <ListFilter className="h-3.5 w-3.5 text-muted-foreground" />
                </SelectTrigger>
                <SelectContent>
                    {Object.entries(searchFieldLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key} className="text-xs">{label}</SelectItem>
                    ))}
                </SelectContent>
                </Select>
                <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder={searchPlaceholder}
                    className="pl-8 rounded-l-none w-full h-9 text-xs"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
                </div>
            </div>
            <div className="grid grid-cols-2 sm:flex sm:flex-row flex-wrap items-center gap-2 w-full">
                <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger className="h-9 text-[10px] sm:text-xs">
                    <SelectValue placeholder="Location" />
                </SelectTrigger>
                <SelectContent>
                     {locationOptions.map(loc => (
                      <SelectItem key={loc} value={loc} className="text-xs">
                        {loc === 'All' ? 'All Locations' : loc}
                      </SelectItem>
                    ))}
                </SelectContent>
                </Select>
                <Select value={equipmentTypeFilter} onValueChange={setEquipmentTypeFilter}>
                <SelectTrigger className="h-9 text-[10px] sm:text-xs">
                    <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                    {equipmentTypes.map(type => (
                    <SelectItem key={type} value={type} className="text-xs">{type}</SelectItem>
                    ))}
                </SelectContent>
                </Select>
                <Select value={capacityFilter} onValueChange={setCapacityFilter}>
                <SelectTrigger className="h-9 text-[10px] sm:text-xs">
                    <SelectValue placeholder="Capacity" />
                </SelectTrigger>
                <SelectContent>
                    {capacities.map(capacity => (
                    <SelectItem key={capacity} value={capacity} className="text-xs">{capacity}</SelectItem>
                    ))}
                </SelectContent>
                </Select>
                 {anyFilterActive && (
                    <Button variant="ghost" size="sm" onClick={handleClearFilters} className="h-9 col-span-2 sm:col-span-1 text-[10px] sm:text-xs">
                        <XCircle className="mr-1.5 h-3.5 w-3.5" />
                        Clear Filters
                    </Button>
                )}
            </div>
        </div>

        <div className="text-[10px] sm:text-xs text-muted-foreground">
          {isLoading ? 'Loading...' : `Showing ${filteredForklifts.length} of ${forklifts?.length || 0} forklifts.`}
        </div>

        <Card className="border-none sm:border shadow-none sm:shadow-sm overflow-hidden">
          <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <p className="text-muted-foreground text-sm">Loading fleet...</p>
            </div>
          ) : filteredForklifts && filteredForklifts.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                    <TableHeader className="bg-muted/30">
                        <TableRow>
                        <TableHead className="w-[50px] hidden sm:table-cell">Sr.</TableHead>
                        <TableHead className="w-[40px] p-2"></TableHead>
                        <TableHead className="text-xs">Serial Number</TableHead>
                        <TableHead className="hidden md:table-cell text-xs">Make/Model</TableHead>
                        <TableHead className="hidden md:table-cell text-xs">Firm</TableHead>
                        <TableHead className="text-xs w-[120px] sm:w-auto">Location</TableHead>
                        <TableHead className="w-[50px] text-right"><span className="sr-only">Actions</span></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredForklifts.map((forklift) => (
                        <Fragment key={forklift.id}>
                            <TableRow onClick={() => toggleRow(forklift.id)} className={cn("cursor-pointer border-b", expandedRow === forklift.id && "bg-accent/30")}>
                                <TableCell className="font-medium hidden sm:table-cell text-xs">{forklift.srNumber || ''}</TableCell>
                                <TableCell className="p-2">
                                  <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", expandedRow === forklift.id && "rotate-180")} />
                                </TableCell>
                                <TableCell className="p-3">
                                  <div className="flex items-center gap-1.5">
                                      {hasActiveRequest(forklift.id) && (
                                          <Wrench className="h-3.5 w-3.5 text-orange-500" title="Active Service Request" />
                                      )}
                                      <span className="font-bold text-xs sm:text-sm">{forklift.serialNumber}</span>
                                  </div>
                                  <div className="text-[10px] text-muted-foreground md:hidden mt-0.5">{forklift.make} {forklift.model}</div>
                                </TableCell>
                                <TableCell className="hidden md:table-cell text-xs">{forklift.make} {forklift.model}</TableCell>
                                <TableCell className="hidden md:table-cell">
                                  {forklift.firm ? (
                                    <Badge variant={'outline'} className={cn('text-[10px]', getFirmBadgeClass(forklift.firm))}>
                                      {forklift.firm}
                                    </Badge>
                                  ) : (
                                    ''
                                  )}
                                </TableCell>
                                <TableCell className="p-2">
                                    <div className="flex items-center">
                                        <Badge 
                                            variant={'outline'} 
                                            className={cn(
                                                'font-medium pointer-events-none text-[9px] sm:text-[10px] flex items-center max-w-[110px] sm:max-w-none rounded-md px-2 py-1', 
                                                getLocationBadgeClass(forklift.locationType)
                                            )}
                                        >
                                            {getLocationIcon(forklift.locationType)}
                                            <span className="truncate">{getLocationText(forklift)}</span>
                                        </Badge>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right p-3">
                                    {renderActions(forklift)}
                                </TableCell>
                            </TableRow>
                            {expandedRow === forklift.id && (
                                <TableRow className="hover:bg-transparent">
                                    <TableCell colSpan={8} className="p-0 border-b bg-muted/10">
                                        <div className="p-4 space-y-4">
                                          <div className="flex justify-end gap-2">
                                              <Button 
                                                variant="outline" 
                                                size="sm" 
                                                className="h-8 text-[10px] sm:text-xs" 
                                                onClick={(e) => { e.stopPropagation(); handleShare(forklift); }}
                                                disabled={isSharing === forklift.id}
                                              >
                                                  <Share2 className="mr-1.5 h-3.5 w-3.5" />
                                                  {isSharing === forklift.id ? 'Generating...' : 'Share Details'}
                                              </Button>
                                          </div>
                                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <div className="space-y-1">
                                              <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">MFG Year</Label>
                                              <p className="text-xs font-semibold">{forklift.year || 'N/A'}</p>
                                            </div>
                                            <div className="space-y-1">
                                              <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Firm</Label>
                                              <div>
                                                {forklift.firm ? (
                                                  <Badge variant={'outline'} className={cn('font-medium text-[10px]', getFirmBadgeClass(forklift.firm))}>
                                                    {forklift.firm}
                                                  </Badge>
                                                ) : (
                                                  <span className="text-xs">-</span>
                                                )}
                                              </div>
                                            </div>
                                            <div className="space-y-1">
                                                  <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Location Set On</Label>
                                                  <p className="text-xs font-semibold">
                                                      {forklift.locationAssignmentDate 
                                                          ? format(parseISO(forklift.locationAssignmentDate), 'dd MMM yyyy') 
                                                          : 'N/A'
                                                      }
                                                  </p>
                                              </div>
                                            <div className="space-y-1">
                                              <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Capacity</Label>
                                              <p className="text-xs font-semibold">{forklift.capacity || 'N/A'}</p>
                                            </div>
                                            <div className="space-y-1">
                                              <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Type</Label>
                                              <p className="text-xs font-semibold">{forklift.equipmentType || 'N/A'}</p>
                                            </div>
                                            <div className="space-y-1">
                                              <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Voltage</Label>
                                              <p className="text-xs font-semibold">{forklift.voltage || 'N/A'}</p>
                                            </div>
                                            <div className="space-y-1">
                                              <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Mast Height</Label>
                                              <p className="text-xs font-semibold">{forklift.mastHeight || 'N/A'}</p>
                                            </div>
                                             <div className="space-y-1">
                                              <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">PO/PI No.</Label>
                                              <p className="text-xs font-semibold">{forklift.poPiNumber || 'N/A'}</p>
                                            </div>
                                          </div>
                                          
                                          {forklift.locationType === 'On-Site' && (
                                            <div className="space-y-3 pt-2">
                                              <Separator />
                                              <h4 className="text-[10px] uppercase font-black text-primary tracking-widest">Site Information</h4>
                                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                  <Label className="text-[10px] font-bold text-muted-foreground">Site / Company</Label>
                                                  <p className="text-xs font-bold">{forklift.siteCompany || 'N/A'}</p>
                                                </div>
                                                <div className="space-y-1">
                                                  <Label className="text-[10px] font-bold text-muted-foreground">Area</Label>
                                                  <p className="text-xs font-bold">{forklift.siteArea || 'N/A'}</p>
                                                </div>
                                                <div className="space-y-1">
                                                  <Label className="text-[10px] font-bold text-muted-foreground flex items-center gap-1.5"><User className="h-3 w-3" /> Contact Person</Label>
                                                  <p className="text-xs font-bold">{forklift.siteContactPerson || 'N/A'}</p>
                                                </div>
                                                <div className="space-y-1">
                                                  <Label className="text-[10px] font-bold text-muted-foreground flex items-center gap-1.5"><Phone className="h-3 w-3" /> Contact Number</Label>
                                                  <p className="text-xs font-bold">{forklift.siteContactNumber || 'N/A'}</p>
                                                </div>
                                              </div>
                                            </div>
                                          )}

                                          {forklift.remarks && (
                                            <div className="space-y-2 pt-2">
                                              <Separator />
                                              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Remarks</Label>
                                              <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed italic bg-background/50 p-2 rounded">{forklift.remarks}</p>
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
              <div className="flex flex-col items-center justify-center h-64 text-center px-4">
                <ForkliftIcon className="h-12 w-12 text-muted-foreground/20 mb-4" />
                <h3 className="text-lg font-bold">No Forklifts Found</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                  No forklifts match your search or filters. Try adjusting your criteria.
                </p>
                {anyFilterActive && (
                    <Button variant="link" onClick={handleClearFilters} className="mt-2 text-primary text-xs font-bold">
                        Reset All Filters
                    </Button>
                )}
              </div>
          )}
          </CardContent>
        </Card>

        {/* Professional Share Image Template - updated with requested fields */}
        <div className="fixed -left-[9999px] top-0 pointer-events-none" aria-hidden="true">
            {forklifts?.map(f => (
                <div 
                  key={`share-card-${f.id}`} 
                  id={`share-card-${f.id}`} 
                  className="bg-white p-8 w-[600px] border-4 border-[#10b981] rounded-2xl shadow-none overflow-hidden text-black font-sans"
                >
                    <div className="flex items-center justify-between mb-8 border-b-2 border-slate-100 pb-6">
                        <div className="flex items-center gap-4">
                            <div className="bg-[#10b981]/10 p-3 rounded-xl">
                                <ForkliftIcon className="h-10 w-10 text-[#10b981]" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-[#10b981] uppercase tracking-tight leading-none">Forklift Details</h2>
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">Fleet Management System</p>
                            </div>
                        </div>
                        {f.firm && (
                            <div className={cn(
                                "px-4 py-1.5 rounded-lg border-2 text-xs font-black uppercase tracking-wider",
                                f.firm === 'Vithal' ? "border-red-500 text-red-600 bg-red-50" : "border-blue-600 text-blue-700 bg-blue-50"
                            )}>
                                {f.firm} Enterprises
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-x-10 gap-y-10">
                        <div className="space-y-1.5">
                            <Label className="text-[10px] uppercase font-black text-slate-400 tracking-[0.2em] flex items-center gap-1.5"><Hash className="h-3 w-3"/> Serial Number</Label>
                            <p className="text-3xl font-black text-slate-900 leading-none">{f.serialNumber}</p>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[10px] uppercase font-black text-slate-400 tracking-[0.2em]">Current Status</Label>
                            <div className="flex items-center">
                                <div className={cn(
                                    "text-[11px] font-black py-1.5 px-4 rounded-full border-2",
                                    f.locationType === 'Workshop' ? "border-green-500 text-green-700 bg-green-50" : 
                                    f.locationType === 'On-Site' ? "border-amber-500 text-amber-700 bg-amber-50" : 
                                    "border-red-500 text-red-700 bg-red-50"
                                )}>
                                    {getLocationText(f).toUpperCase()}
                                </div>
                            </div>
                        </div>
                        
                        <div className="col-span-2 grid grid-cols-2 gap-x-10 gap-y-8 p-6 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] uppercase font-black text-slate-400 tracking-wider">MFG Year</Label>
                                <p className="text-lg font-bold text-slate-900">{f.year || '-'}</p>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Firm</Label>
                                <p className="text-lg font-bold text-slate-900">{f.firm || '-'}</p>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[10px] uppercase font-black text-slate-400 tracking-wider flex items-center gap-1"><CalendarDays className="h-3 w-3"/> Location Set On</Label>
                                <p className="text-lg font-bold text-slate-900">{f.locationAssignmentDate ? format(parseISO(f.locationAssignmentDate), 'dd MMM yyyy') : '-'}</p>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[10px] uppercase font-black text-slate-400 tracking-wider">PO/PI No.</Label>
                                <p className="text-lg font-bold text-slate-900">{f.poPiNumber || 'N/A'}</p>
                            </div>
                        </div>

                        <div className="col-span-2 grid grid-cols-4 gap-4">
                            <div className="space-y-1.5 text-center border-r border-slate-100">
                                <Label className="text-[9px] uppercase font-black text-slate-400 tracking-wider">Capacity</Label>
                                <p className="text-sm font-black text-slate-900">{f.capacity || '-'}</p>
                            </div>
                            <div className="space-y-1.5 text-center border-r border-slate-100">
                                <Label className="text-[9px] uppercase font-black text-slate-400 tracking-wider">Type</Label>
                                <p className="text-sm font-black text-slate-900">{f.equipmentType || '-'}</p>
                            </div>
                            <div className="space-y-1.5 text-center border-r border-slate-100">
                                <Label className="text-[9px] uppercase font-black text-slate-400 tracking-wider flex items-center justify-center gap-1"><Zap className="h-2.5 w-2.5"/> Voltage</Label>
                                <p className="text-sm font-black text-slate-900">{f.voltage || '-'}</p>
                            </div>
                            <div className="space-y-1.5 text-center">
                                <Label className="text-[9px] uppercase font-black text-slate-400 tracking-wider flex items-center justify-center gap-1"><Ruler className="h-2.5 w-2.5"/> Mast Height</Label>
                                <p className="text-sm font-black text-slate-900">{f.mastHeight || '-'}</p>
                            </div>
                        </div>
                    </div>

                    {f.locationType === 'On-Site' && (
                        <div className="mt-8 p-6 bg-white rounded-2xl border-2 border-slate-100">
                            <h4 className="text-[11px] font-black text-[#10b981] uppercase tracking-[0.2em] mb-5 flex items-center gap-2.5">
                                <MapPin className="h-4 w-4" /> Deployed Site Information
                            </h4>
                            <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                                <div className="space-y-1">
                                    <Label className="text-[9px] font-black text-slate-400 uppercase">Site / Company</Label>
                                    <p className="text-sm font-bold text-slate-900 truncate">{f.siteCompany}</p>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[9px] font-black text-slate-400 uppercase">Geographical Area</Label>
                                    <p className="text-sm font-bold text-slate-900">{f.siteArea || '-'}</p>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[9px] font-black text-slate-400 uppercase">Contact Person</Label>
                                    <p className="text-sm font-bold text-slate-900 truncate">{f.siteContactPerson || '-'}</p>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[9px] font-black text-slate-400 uppercase">Mobile Number</Label>
                                    <p className="text-sm font-bold text-slate-900">{f.siteContactNumber || '-'}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="mt-10 pt-6 border-t border-slate-100 flex justify-between items-center italic text-[10px] text-slate-400">
                        <span>Generated via VE Dashboard</span>
                        <span className="font-medium">{format(new Date(), 'dd MMM yyyy, p')}</span>
                    </div>
                </div>
            ))}
        </div>

        <Dialog open={isAddEditDialogOpen} onOpenChange={setIsAddEditDialogOpen}>
          <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] flex flex-col p-0 rounded-xl overflow-hidden border-none shadow-2xl">
            <DialogHeader className="p-6 pb-0">
              <DialogTitle className="text-xl font-black">{selectedForklift ? 'Modify Forklift' : 'Onboard Forklift'}</DialogTitle>
              <DialogDescription className="text-xs">
                {selectedForklift ? `Updating Serial: ${selectedForklift.serialNumber}` : 'Enter the official forklift details for the fleet.'}
              </DialogDescription>
            </DialogHeader>
            <div className='flex-grow overflow-y-auto px-6 py-4'>
                <ForkliftForm
                  onSubmit={handleFormSubmit}
                  onCancel={() => { setIsAddEditDialogOpen(false); setSelectedForklift(null);}}
                  initialData={selectedForklift || undefined}
                  mode={selectedForklift ? 'edit' : 'add'}
                  companies={companies || []}
                  isLoadingCompanies={isLoadingCompanies}
                />
            </div>
            <DialogFooter className="p-6 pt-4 border-t bg-muted/10 flex gap-2">
                 <Button variant="outline" type="button" onClick={() => { setIsAddEditDialogOpen(false); setSelectedForklift(null);}} className="rounded-xl font-bold h-10 px-6">
                    Cancel
                </Button>
                <Button type="submit" form="forklift-form" className="rounded-xl font-bold h-10 px-8">
                  {selectedForklift ? 'Update Fleet' : 'Add to Fleet'}
                </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        <AlertDialog open={!!forkliftToDelete} onOpenChange={(open) => !open && setForkliftToDelete(null)}>
          <AlertDialogContent className="max-w-[90vw] sm:max-w-md rounded-2xl">
            <AlertDialogHeader>
              <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mb-2 mx-auto sm:mx-0">
                  <Trash2 className="h-6 w-6 text-destructive" />
              </div>
              <AlertDialogTitle className="text-xl font-black">Remove Forklift?</AlertDialogTitle>
              <AlertDialogDescription className="text-sm font-medium">
                This will permanently delete <span className="font-bold text-foreground">{forkliftToDelete?.serialNumber}</span> from the fleet database.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-4 gap-2">
              <AlertDialogCancel className="h-10 rounded-xl font-bold">Keep Unit</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="h-10 rounded-xl font-bold bg-destructive hover:bg-destructive/90">Yes, Remove</AlertDialogAction>
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
