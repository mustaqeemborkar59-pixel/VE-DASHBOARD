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
import { useCollection, useFirebase, useMemoFirebase, deleteDocumentNonBlocking, addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { EmployeeForm, EmployeeFormData } from "@/components/employee-form";
import { Badge } from "@/components/ui/badge";

type DialogMode = 'add' | 'edit' | 'delete' | null;

export default function EmployeesPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const employeesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'employees') : null, [firestore]);
  const { data: employees, isLoading } = useCollection<Employee>(employeesQuery);

  const handleDelete = () => {
    if (!firestore || !selectedEmployee) return;
    
    const employeeDocRef = doc(firestore, 'employees', selectedEmployee.id);
    deleteDocumentNonBlocking(employeeDocRef);

    toast({
      title: "Employee Deleted",
      description: `Employee ${selectedEmployee.fullName} has been removed.`,
    });

    closeDialog();
  };

  const openDialog = (mode: DialogMode, data?: Employee) => {
    setDialogMode(mode);
    setSelectedEmployee(data || null);
  };

  const closeDialog = () => {
    setDialogMode(null);
    setSelectedEmployee(null);
  };
  
  const handleFormSubmit = (formData: EmployeeFormData) => {
    if (!firestore) return;
    
    if (dialogMode === 'add') {
      const employeesCollection = collection(firestore, 'employees');
      addDocumentNonBlocking(employeesCollection, formData);
      toast({ title: "Success", description: "Employee added successfully." });
    } else if (dialogMode === 'edit' && selectedEmployee) {
      const employeeDocRef = doc(firestore, 'employees', selectedEmployee.id);
      updateDocumentNonBlocking(employeeDocRef, formData);
      toast({ title: "Success", description: "Employee updated successfully." });
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
              <CardTitle>Employees</CardTitle>
              <CardDescription>Manage your workshop employees.</CardDescription>
            </div>
            <Button onClick={() => openDialog('add')} size="sm">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Employee
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Full Name</TableHead>
                <TableHead>Role/Specialization</TableHead>
                <TableHead>Contact Number</TableHead>
                <TableHead>Work Location</TableHead>
                <TableHead>Availability</TableHead>
                <TableHead><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">Loading...</TableCell>
                </TableRow>
              ) : (
                employees?.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">{employee.fullName}</TableCell>
                    <TableCell>{employee.specialization}</TableCell>
                    <TableCell>{employee.contactNumber}</TableCell>
                    <TableCell>{employee.workLocation}</TableCell>
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
                          <DropdownMenuItem onSelect={() => openDialog('edit', employee)}>
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onSelect={() => openDialog('delete', employee)} className="text-destructive focus:text-destructive">
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
            <DialogTitle>{dialogMode === 'add' ? 'Add New Employee' : 'Edit Employee'}</DialogTitle>
            <DialogDescription>
              {dialogMode === 'add' ? 'Fill out the form to add a new employee.' : 'Update the details of the employee.'}
            </DialogDescription>
          </DialogHeader>
          <EmployeeForm
            onSubmit={handleFormSubmit}
            onCancel={closeDialog}
            initialData={selectedEmployee || undefined}
            mode={dialogMode || 'add'}
          />
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={dialogMode === 'delete'} onOpenChange={(isOpen) => !isOpen && closeDialog()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this employee?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <span className="font-medium">{selectedEmployee?.fullName}</span>. This action cannot be undone.
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
