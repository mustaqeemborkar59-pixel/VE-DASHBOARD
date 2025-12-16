export type Technician = {
  id: string;
  name: string;
  specialty: string;
};

export type Forklift = {
  id: string;
  model: string;
  year: number;
  lastService: string;
};

export type ServiceRequest = {
  id: string;
  forkliftId: string;
  issue: string;
  status: 'Pending' | 'Assigned' | 'In Progress' | 'Completed';
  technicianId?: string;
  date: string;
};

export type Part = {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  price: number;
};

export const technicians: Technician[] = [
  { id: 'tech-1', name: 'John Doe', specialty: 'Engine' },
  { id: 'tech-2', name: 'Jane Smith', specialty: 'Hydraulics' },
  { id: 'tech-3', name: 'Mike Johnson', specialty: 'Electrical' },
  { id: 'tech-4', name: 'Sarah Lee', specialty: 'General Maintenance' },
];

export const forklifts: Forklift[] = [
  { id: 'FL-001', model: 'Hyster H50FT', year: 2021, lastService: '2024-05-10' },
  { id: 'FL-002', model: 'Toyota 8FGCU25', year: 2020, lastService: '2024-04-22' },
  { id: 'FL-003', model: 'Clark C25', year: 2022, lastService: '2024-06-01' },
  { id: 'FL-004', model: 'Cat GP25N', year: 2019, lastService: '2024-03-15' },
];

export const serviceRequests: ServiceRequest[] = [
  { id: 'SR-001', forkliftId: 'FL-001', issue: 'Engine is overheating after short use.', status: 'Assigned', technicianId: 'tech-1', date: '2024-07-15' },
  { id: 'SR-002', forkliftId: 'FL-002', issue: 'Hydraulic lift is slow and jerky.', status: 'Pending', date: '2024-07-14' },
  { id: 'SR-003', forkliftId: 'FL-003', issue: 'Battery dies quickly, not holding charge.', status: 'In Progress', technicianId: 'tech-3', date: '2024-07-13' },
  { id: 'SR-004', forkliftId: 'FL-001', issue: 'Brakes are squeaking loudly.', status: 'Completed', technicianId: 'tech-2', date: '2024-07-10' },
  { id: 'SR-005', forkliftId: 'FL-004', issue: 'Forklift won\'t start, electrical issue suspected.', status: 'Pending', date: '2024-07-16' },
  { id: 'SR-006', forkliftId: 'FL-002', issue: 'Annual maintenance and inspection required.', status: 'Completed', technicianId: 'tech-4', date: '2024-07-05' },
];

export const parts: Part[] = [
  { id: 'P-1001', name: 'Hydraulic Filter', sku: 'HF-5521', quantity: 25, price: 45.50 },
  { id: 'P-1002', name: 'Engine Oil Filter', sku: 'EOF-3341', quantity: 40, price: 25.00 },
  { id: 'P-1003', name: 'Brake Pad Set', sku: 'BPS-9876', quantity: 15, price: 120.00 },
  { id: 'P-1004', name: '12V Heavy Duty Battery', sku: 'BAT-12V-H', quantity: 8, price: 350.00 },
  { id: 'P-1005', name: 'Spark Plug (Set of 4)', sku: 'SP-4PK', quantity: 50, price: 30.00 },
  { id: 'P-1006', name: 'Forklift Tire - Solid', sku: 'TRS-21-7-15', quantity: 12, price: 180.00 },
];
