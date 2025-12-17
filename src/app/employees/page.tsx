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
import { collection, doc, query, orderBy } from "firebase/firestore";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { EmployeeForm, EmployeeFormData } from "@/components/employee-form";
import { Badge } from "@/components/ui/badge";

export default function EmployeesPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  
  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState<string | null>(null);

  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const employeesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'employees'), orderBy('createdAt', 'asc')) : null, [firestore]);
  const { data: employees, isLoading } = useCollection<Employee>(employeesQuery);

  const openAddEditDialog = (employee: Employee | null) => {
    setIsDropdownOpen(null);
    setSelectedEmployee(employee);
    setIsAddEditDialogOpen(true);
  };

  const openDeleteDialog = (employee: Employee) => {
    setIsDropdownOpen(null);
    setSelectedEmployee(employee);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = () => {
    if (!firestore || !selectedEmployee) return;
    
    const employeeDocRef = doc(firestore, 'employees', selectedEmployee.id);
    deleteDocumentNonBlocking(employeeDocRef);

    toast({
      title: "Employee Deleted",
      description: `Employee ${selectedEmployee.fullName} has been removed.`,
    });

    setIsDeleteDialogOpen(false);
    setSelectedEmployee(null);
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
    <>
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
                       <DropdownMenu open={isDropdownOpen === employee.id} onOpenChange={(open) => setIsDropdownOpen(open ? employee.id : null)}>
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
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isAddEditDialogOpen} onOpenChange={setIsAddEditDialogOpen}>
        <DialogContent>
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
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this employee?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <span className="font-medium">{selectedEmployee?.fullName}</span>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
