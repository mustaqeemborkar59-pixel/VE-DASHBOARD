export type Employee = {
  id: string;
  fullName: string;
  specialization: string;
  contactNumber: string;
  workLocation: string;
  availability: boolean;
  createdAt?: string;
};

export type Technician = Employee;

export type Forklift = {
  id: string;
  serialNumber: string;
  make: string;
  model: string;
  year: number;
  capacity?: string;
  equipmentType?: string;
  locationType: 'Workshop' | 'On-Site';
  siteName?: string;
  siteCompany?: string;
  siteContactPerson?: string;
  siteContactNumber?: string;
};

export type ServiceRequest = {
  id: string;
  forkliftId: string;
  issueDescription: string;
  status: 'Pending' | 'Assigned' | 'In Progress' | 'Completed';
  assignedTechnicianId?: string;
  requestDate: string;
};

export type Part = {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  sku?: string; // sku is not in the backend.json but is used in the inventory page
};
