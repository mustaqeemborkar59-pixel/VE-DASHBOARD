
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
import { Button } from "@/components/ui/button";
import { Employee } from "@/lib/data";
import { EllipsisVertical, Pencil, PlusCircle, Trash2 } from "lucide-react";
import { useCollection, useFirebase, useMemoFirebase } from "@/firebase";
import { collection, doc, query, orderBy } from "firebase/firestore";
import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { EmployeeForm, EmployeeFormData } from "@/components/employee-form";
import { Badge } from "@/components/ui/badge";
import AppLayout from "@/components/app-layout";
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export default function EmployeesPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  
  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const employeesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'employees'), orderBy('createdAt', 'asc')) : null, [firestore]);
  const { data: employees, isLoading } = useCollection<Employee>(employeesQuery);

  const handleDelayedAction = (action: () => void) => {
    setTimeout(action, 100);
  };
  
  const openAddEditDialog = useCallback((employee: Employee | null) => {
    setSelectedEmployee(employee);
    setIsAddEditDialogOpen(true);
  }, []);
  
  const openDeleteDialog = useCallback((employee: Employee) => {
    setEmployeeToDelete(employee);
  }, []);

  const handleDelete = () => {
    if (!firestore || !employeeToDelete) return;
    
    const employeeDocRef = doc(firestore, 'employees', employeeToDelete.id);
    deleteDocumentNonBlocking(employeeDocRef);

    toast({
      title: "Employee Deleted",
      description: `Employee ${employeeToDelete.fullName} has been removed.`,
    });

    setEmployeeToDelete(null);
  };
  
  const handleFormSubmit = (formData: EmployeeFormData) => {
    if (!firestore) return;
    
    if (selectedEmployee) { // Edit mode
      const employeeDocRef = doc(firestore, 'employees', selectedEmployee.id);
      updateDocumentNonBlocking(employeeDocRef, formData);
      toast({ title: "Success", description: "Employee updated successfully." });
    } else { // Add mode
      const employeesCollection = collection(firestore, 'employees');
      addDocumentNonBlocking(employeesCollection, {
        ...formData,
        createdAt: new Date().toISOString(),
      });
      toast({ title: "Success", description: "Employee added successfully." });
    }

    setIsAddEditDialogOpen(false);
    setSelectedEmployee(null);
  };
  
  const renderActions = (employee: Employee) => (
      <DropdownMenu>
          <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                  <EllipsisVertical className="h-4 w-4" />
              </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-40" onMouseLeave={(e) => (e.currentTarget as HTMLElement).blur()}>
              <DropdownMenuItem onSelect={() => handleDelayedAction(() => openAddEditDialog(employee))}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => handleDelayedAction(() => openDeleteDialog(employee))} className="text-destructive hover:text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
              </DropdownMenuItem>
          </DropdownMenuContent>
      </DropdownMenu>
  );

  return (
    <AppLayout>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Employees</CardTitle>
              <CardDescription>Manage your workshop employees.</CardDescription>
            </div>
            <Button onClick={() => openAddEditDialog(null)} size="sm">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Employee
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0 md:p-3 pt-0">
          <div className="md:hidden">
            {isLoading ? (
                <div className="text-center p-6 text-muted-foreground">Loading employees...</div>
             ) : employees && employees.length > 0 ? (
                <div className="space-y-4 p-4">
                  {employees.map((employee) => (
                    <div key={employee.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <div className="font-bold">{employee.fullName}</div>
                            <div className="text-sm text-muted-foreground">{employee.specialization || 'N/A'}</div>
                          </div>
                           {renderActions(employee)}
                        </div>
                        <Badge variant={employee.availability ? 'outline' : 'secondary'} className={employee.availability ? 'border-green-600/40 text-green-700' : ''}>
                          {employee.availability ? 'Available' : 'Unavailable'}
                        </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-10 text-muted-foreground">No employees found.</div>
              )}
          </div>
          <Table className="hidden md:table">
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Availability</TableHead>
                <TableHead><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">Loading...</TableCell>
                </TableRow>
              ) : employees && employees.length > 0 ? (
                employees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell>
                      <div className="font-medium">{employee.fullName}</div>
                      <div className="text-sm text-muted-foreground">{employee.contactNumber || 'No contact'}</div>
                    </TableCell>
                    <TableCell>{employee.specialization}</TableCell>
                    <TableCell>
                      <Badge variant={employee.availability ? 'outline' : 'secondary'} className={employee.availability ? 'border-green-600/40 text-green-700' : ''}>
                        {employee.availability ? 'Available' : 'Unavailable'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                       {renderActions(employee)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">No employees found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isAddEditDialogOpen} onOpenChange={setIsAddEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedEmployee ? 'Edit Employee' : 'Add New Employee'}</DialogTitle>
            <DialogDescription>
              {selectedEmployee ? 'Update the details of the employee.' : 'Fill out the form to add a new employee.'}
            </DialogDescription>
          </DialogHeader>
          <EmployeeForm
            onSubmit={handleFormSubmit}
            onCancel={() => setIsAddEditDialogOpen(false)}
            initialData={selectedEmployee || undefined}
            mode={selectedEmployee ? 'edit' : 'add'}
          />
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={!!employeeToDelete} onOpenChange={(open) => !open && setEmployeeToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this employee?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <span className="font-medium">{employeeToDelete?.fullName}</span>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
