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
import { Employee } from "@/lib/data";
import { MoreHorizontal, PlusCircle } from "lucide-react";
import { useCollection, useFirebase, useMemoFirebase } from "@/firebase";
import { collection, doc, query, orderBy } from "firebase/firestore";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { EmployeeForm, EmployeeFormData } from "@/components/employee-form";
import { Badge } from "@/components/ui/badge";
import AppLayout from "@/components/app-layout";
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";

export default function EmployeesPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  
  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const employeesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'employees'), orderBy('createdAt', 'asc')) : null, [firestore]);
  const { data: employees, isLoading } = useCollection<Employee>(employeesQuery);

  const openAddEditDialog = (employee: Employee | null) => {
    setSelectedEmployee(employee);
    setEmployeeToDelete(null);
    setIsAddEditDialogOpen(true);
  };
  
  const openDeleteDialog = (employee: Employee) => {
    setSelectedEmployee(null);
    setIsAddEditDialogOpen(false);
    setEmployeeToDelete(employee);
  };

  const handleCancelDelete = () => {
    setEmployeeToDelete(null);
  };

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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px] hidden sm:table-cell">Sr.</TableHead>
                <TableHead>Full Name</TableHead>
                <TableHead className="hidden md:table-cell">Role</TableHead>
                <TableHead className="hidden lg:table-cell">Contact Number</TableHead>
                <TableHead>Availability</TableHead>
                <TableHead><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">Loading...</TableCell>
                </TableRow>
              ) : employees && employees.length > 0 ? (
                employees.map((employee, index) => (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium hidden sm:table-cell">{index + 1}</TableCell>
                    <TableCell>
                      <div className="font-medium">{employee.fullName}</div>
                      <div className="text-sm text-muted-foreground md:hidden">{employee.specialization}</div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{employee.specialization}</TableCell>
                    <TableCell className="hidden lg:table-cell">{employee.contactNumber}</TableCell>
                    <TableCell>
                      <Badge variant={employee.availability ? 'outline' : 'secondary'} className={employee.availability ? 'border-green-600/40 text-green-700' : ''}>
                        {employee.availability ? 'Available' : 'Unavailable'}
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
                          <DropdownMenuItem onSelect={() => openAddEditDialog(employee)}>
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onSelect={() => openDeleteDialog(employee)} className="text-destructive focus:text-destructive">
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">No employees found.</TableCell>
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
      
      <AlertDialog open={!!employeeToDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this employee?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <span className="font-medium">{employeeToDelete?.fullName}</span>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDelete}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
