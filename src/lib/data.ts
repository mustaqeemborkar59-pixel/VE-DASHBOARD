
export type JobCard = {
  id: string;
  jobTitle: string;
  forkliftId: string;
  companyId: string;
  employeeId?: string;
  status: 'Pending' | 'Assigned' | 'In Progress' | 'Completed' | 'Cancelled';
  creationDate: string; // ISO DateTime
  jobDescription: string;
  technicianNotes?: string;
  completionDate?: string; // YYYY-MM-DD
};


export type Employee = {
  id: string;
  fullName: string;
  empCode?: string;
  specialization: string;
  department?: string;
  contactNumber: string;
  workLocation: string;
  availability: boolean;
  doj?: string; // Date of Joining
  panNumber?: string;
  pfNumber?: string;
  uanNumber?: string;
  esicNumber?: string;
  bankName?: string;
  bankAccountNumber?: string;
  createdAt?: string;
};

export type AttendanceStatus = 'Present' | 'Absent' | 'Half-Day' | 'Holiday';

export type Attendance = {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  status?: AttendanceStatus;
  overtimeHours?: number;
  notes?: string;
  updatedAt: string;
};

export type Technician = Employee;

export type Forklift = {
  id:string;
  serialNumber: string;
  make: string;
  model: string;
  year: number;
  srNumber?: number;
  capacity?: string;
  equipmentType?: string;
  firm?: 'Vithal' | 'RV';
  voltage?: string;
  mastHeight?: string;
  locationType: 'Workshop' | 'On-Site' | 'Not Confirm';
  locationAssignmentDate?: string; // ISO DateTime
  siteCompany?: string;
  siteArea?: string;
  siteContactPerson?: string;
  siteContactNumber?: string;
  remarks?: string;
  poPiNumber?: string;
};

export type ServiceRequest = {
  id: string;
  forkliftId: string;
  issueDescription: string;
  status: 'Pending' | 'Assigned' | 'In Progress' | 'Completed';
  assignedTechnicianId?: string;
  requestDate: string;
  technicianNotes?: string;
  partsUsed?: string[];
  completionDate?: string;
};

export type Part = {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  sku?: string; // sku is not in the backend.json but is used in the inventory page
};

export type Company = {
    id: string;
    name: string;
    address: string;
    gstin?: string;
    createdAt: string;
}

export type InvoiceItem = {
    particulars: string;
    rate?: string;
    amount: number;
}

export type PageMargin = {
    top: number,
    right: number,
    bottom: number,
    left: number,
};

export type BankAccount = {
    id: string;
    nickname: string;
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    bankBranch: string;
}

export type InvoiceTemplate = {
  columns: {
    id: 'sr_no' | keyof InvoiceItem;
    label: string;
    align: 'left' | 'center' | 'right';
    fontSize?: number;
  }[];
};

export type DocumentSettings = {
    pageSize?: 'A4' | 'LETTER' | 'LEGAL';
    pageOrientation?: 'portrait' | 'landscape';
    pageMargins?: PageMargin;
    pageFontSize?: number;
    addressFontSize?: number;
    tableBodyFontSize?: number;
};

export type CompanySettings = {
    id?: string;
    companyName: string;
    address: string;
    pan: string;
    gstin: string;
    sacCode: string;
    serviceTaxCode?: string;
    contactPerson: string;
    contactNumber: string;
    // New fields for invoice and document settings
    nextBillNo?: number;
    pageSize?: 'A4' | 'LETTER' | 'LEGAL';
    pageOrientation?: 'portrait' | 'landscape';
    pageMargins?: PageMargin;
    pageFontSize?: number;
    addressFontSize?: number;
    tableBodyFontSize?: number;
    template?: InvoiceTemplate;
};

export type DownloadOptions = {
    myCompany: {
        showGstin: boolean;
        showPan: boolean;
        showBankDetails: boolean;
        showSacCode: boolean;
        showServiceTaxCode: boolean;
    };
    clientCompany: {
        showGstin: boolean;
    };
    includeSiteInFilename?: boolean;
};


export type Invoice = {
    id: string;
    enterprise: 'Vithal' | 'RV';
    billNo: number;
    billNoSuffix?: string;
    billDate: string; // YYYY-MM-DD
    billingMonth?: string; // YYYY-MM
    companyId: string;
    poNumber?: string;
    site?: string;
    items: InvoiceItem[];
    netTotal: number;
    cgst: number;
    sgst: number;
    grandTotal: number;
    tdsPercentage?: number;
    discount?: number;
    discountType?: 'before_gst' | 'after_gst';
    advanceReceived?: number;
    myCompanyDetails: CompanySettings; // Snapshot of my company settings
    clientCompanyDetails: Company; // Snapshot of client company details
    selectedBankAccount?: BankAccount; // Snapshot of selected bank account
    documentSettings?: DocumentSettings;
    downloadOptions?: DownloadOptions;
    template?: InvoiceTemplate;
}

export type Payment = {
    id: string;
    invoiceId: string;
    companyId: string;
    paymentDate: string; // YYYY-MM-DD
    receivedAmount: number;
    tdsDeducted: number;
    otherDeductions: number;
    notes?: string;
    createdAt: string;
    paymentMode?: 'RTGS' | 'NEFT' | 'IMPS' | 'CHEQUE' | 'CASH';
    chequeDetails?: string;
}

export type MonthlyRepair = {
  id: string; // YYYY-MM format
  repairs: number;
};

export type Note = {
  id: string;
  title?: string;
  content: string;
  color: string;
  createdAt: string;
};

export type Salary = {
  id: string;
  employeeId: string;
  enterprise: 'Vithal' | 'RV';
  month: string; // YYYY-MM
  workingDays: number;
  presentDays: number;
  absentDays: number;
  baseSalary: number; // Basic
  hra: number;
  conveyance: number;
  medical: number;
  special: number;
  bonus: number; // Added
  ot: number; // Overtime
  pf: number;
  esic: number;
  pt: number;
  tds: number;
  lwf: number;
  advance: number;
  otherDeductions: number; // Added
  netSalary: number;
  paymentDate: string; // YYYY-MM-DD
  status: 'Paid' | 'Pending';
  notes?: string;
  createdAt: string;
};
