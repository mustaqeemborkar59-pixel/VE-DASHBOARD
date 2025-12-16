export type Technician = {
  id: string;
  firstName: string;
  lastName: string;
  specialization: string;
  availability: boolean;
};

export type Forklift = {
  id: string;
  serialNumber: string;
  make: string;
  model: string;
  year: number;
  capacity?: string;
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
