export type FeeScope = "ALL_STUDENTS" | "CLASS" | "STUDENT";
export type FeeValueType = "EDITABLE" | "AUTO" | "FIXED";
export type FeeInvoiceStatus =
  | "UNPAID"
  | "PARTIAL"
  | "PAID"
  | "WAIVED"
  | "CANCELLED";
export type FeePaymentMethod =
  | "CASH"
  | "BANK_TRANSFER"
  | "CHEQUE"
  | "ONLINE"
  | "OTHER";

export interface FeeStructureItem {
  particularId: string;
  key: string;
  label: string;
  valueType: FeeValueType;
  sortOrder: number;
  amount: number;
  displayValue: string | number;
  isEditable: boolean;
}

export interface FeeStructureData {
  scope: FeeScope;
  scopeKey: string;
  classId?: string | null;
  studentId?: string | null;
  class?: { id: string; className: string; montlyFee: number } | null;
  student?: { id: string; name: string; registrationNo: string } | null;
  items: FeeStructureItem[];
}

export interface FeeStructureResponse {
  message: string;
  data: FeeStructureData;
}

export interface SaveFeeStructureRequest {
  scope: FeeScope;
  classId?: string;
  studentId?: string;
  items: { particularId: string; amount: number }[];
}

export interface FeeInvoiceItem {
  id: string;
  label: string;
  key?: string | null;
  amount: number;
  sortOrder: number;
  isDiscount: boolean;
}

export interface FeeInvoice {
  id: string;
  invoiceNo: string;
  academicYear: string;
  billingMonth: number;
  billingYear: number;
  monthLabel?: string;
  status: FeeInvoiceStatus;
  dueDate?: string | null;
  subtotal: number;
  discountAmount: number;
  fineAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  remarks?: string | null;
  student: {
    id: string;
    name: string;
    registrationNo: string;
    photoUrl?: string | null;
    contactPhone?: string | null;
  };
  enrollment?: {
    id: string;
    academicYear: string;
    rollNo?: string | null;
    class: { id: string; className: string; montlyFee: number };
    section?: { id: string; sectionName: string } | null;
  } | null;
  items?: FeeInvoiceItem[];
}

export interface FeePayment {
  id: string;
  receiptNo: string;
  amount: number;
  method: FeePaymentMethod;
  paidAt: string;
  reference?: string | null;
  remarks?: string | null;
  student?: { id: string; name: string; registrationNo: string };
  allocations?: Array<{
    id: string;
    amount: number;
    invoice: {
      id?: string;
      invoiceNo: string;
      billingMonth: number;
      billingYear: number;
      totalAmount?: number;
      paidAmount?: number;
      balanceAmount?: number;
      status?: string;
    };
  }>;
}

export interface FeesDashboardData {
  totalBilled: number;
  totalCollected: number;
  totalOutstanding: number;
  unpaidInvoiceCount: number;
  defaulterCount: number;
  thisMonth: {
    label: string;
    billed: number;
    collected: number;
    outstanding: number;
    invoiceCount: number;
  };
  today: { collected: number; paymentCount: number };
}

export interface FeeDefaulter {
  student: {
    id: string;
    name: string;
    registrationNo: string;
    contactPhone?: string | null;
    photoUrl?: string | null;
  };
  className: string | null;
  sectionName: string | null;
  rollNo: string | null;
  totalBalance: number;
  unpaidMonths: number;
  oldestDue: string | null;
  invoices: Array<{
    id: string;
    invoiceNo: string;
    monthLabel: string;
    balanceAmount: number;
    status: string;
    dueDate: string | null;
  }>;
}

export interface StudentFeeLedger {
  student: {
    id: string;
    name: string;
    registrationNo: string;
    photoUrl?: string | null;
    contactPhone?: string | null;
    enrollment: {
      academicYear: string;
      feeDiscount: number;
      rollNo?: string | null;
      class: { id: string; className: string; montlyFee: number };
      section?: { sectionName: string } | null;
    } | null;
  };
  summary: {
    totalBilled: number;
    totalPaid: number;
    totalBalance: number;
    unpaidMonths: number;
    paidMonths: number;
  };
  months: Array<{
    id: string;
    invoiceNo: string;
    billingMonth: number;
    billingYear: number;
    monthLabel: string;
    academicYear: string;
    status: FeeInvoiceStatus;
    totalAmount: number;
    paidAmount: number;
    balanceAmount: number;
    dueDate?: string | null;
    items: FeeInvoiceItem[];
    isPaid: boolean;
  }>;
  payments: FeePayment[];
}

export interface StudentFeePreview {
  student: { id: string; name: string; registrationNo: string };
  enrollment: {
    id: string;
    academicYear: string;
    feeDiscount: number;
    classId: string;
    className: string;
    montlyFee: number;
    sectionName: string | null;
  };
  lines: Array<{
    key: string;
    label: string;
    amount: number;
    isDiscount: boolean;
  }>;
  openInvoices: Array<{
    id: string;
    invoiceNo: string;
    monthLabel: string;
    balanceAmount: number;
    status: string;
    totalAmount: number;
    paidAmount: number;
  }>;
  outstandingBalance: number;
}

export interface CollectionReport {
  from: string;
  to: string;
  totalCollected: number;
  paymentCount: number;
  byMethod: Record<string, number>;
  payments: FeePayment[];
}
