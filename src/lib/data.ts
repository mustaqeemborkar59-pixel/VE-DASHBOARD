

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
  srNumber?: number;
  capacity?: string;
  equipmentType?: string;
  voltage?: string;
  mastHeight?: string;
  locationType: 'Workshop' | 'On-Site' | 'Not Confirm';
  siteCompany?: string;
  siteArea?: string;
  siteContactPerson?: string;
  siteContactNumber?: string;
  remarks?: string;
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

export type CompanySettings = {
    id?: string;
    companyName: string;
    pan: string;
    gstin: string;
    sacCode: string;
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    bankBranch: string;
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
};

export type DownloadOptions = {
    myCompany: {
        showGstin: boolean;
        showPan: boolean;
        showBankDetails: boolean;
    };
    clientCompany: {
        showGstin: boolean;
    };
};

export type Invoice = {
    id: string;
    billNo: number;
    billNoSuffix?: string;
    billDate: string; // YYYY-MM-DD
    companyId: string;
    poNumber?: string;
    site?: string;
    items: InvoiceItem[];
    netTotal: number;
    cgst: number;
    sgst: number;
    grandTotal: number;
    myCompanyDetails: CompanySettings; // Snapshot of my company settings
    clientCompanyDetails: Company; // Snapshot of client company details
    pageSize?: 'A4' | 'LETTER' | 'LEGAL';
    pageOrientation?: 'portrait' | 'landscape';
    pageMargins?: PageMargin;
    pageFontSize?: number;
    addressFontSize?: number;
    tableBodyFontSize?: number;
    downloadOptions?: DownloadOptions;
}

export type InvoiceTemplate = {
  columns: {
    id: keyof InvoiceItem;
    label: string;
    width: number;
    align: 'left' | 'center' | 'right';
    order: number;
  }[];
};

    