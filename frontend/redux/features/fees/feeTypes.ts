export type FeeScope = "ALL_STUDENTS" | "CLASS" | "STUDENT";
export type FeeValueType = "EDITABLE" | "AUTO" | "FIXED";

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
  class?: {
    id: string;
    className: string;
    montlyFee: number;
  } | null;
  student?: {
    id: string;
    name: string;
    registrationNo: string;
  } | null;
  items: FeeStructureItem[];
}

export interface FeeStructureResponse {
  success?: boolean;
  statusCode?: number;
  message: string;
  data: FeeStructureData;
}

export interface SaveFeeStructureRequest {
  scope: FeeScope;
  classId?: string;
  studentId?: string;
  items: Array<{ particularId: string; amount: number }>;
}
