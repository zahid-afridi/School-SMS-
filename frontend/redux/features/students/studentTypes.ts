// ── Student domain types ──────────────────────────────────────────────────

export type Gender = "MALE" | "FEMALE" | "OTHER";
export type PersonStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";
export type ParentType = "FATHER" | "MOTHER" | "GUARDIAN" | "OTHER";

export interface StudentParentInfo {
  id: string;
  name: string;
  type: ParentType;
  mobileNo?: string | null;
}

export interface StudentEnrollmentSummary {
  id: string;
  academicYear: string;
  rollNo?: string | null;
  feeDiscount?: number;
  status?: string;
  isCurrent?: boolean;
  enrolledAt?: string;
  promotedAt?: string | null;
  completedAt?: string | null;
  withdrawnAt?: string | null;
  transferredAt?: string | null;
  remarks?: string | null;
  withdrawnReason?: string | null;
  class?: { id: string; className: string; montlyFee?: number } | null;
  section?: { id: string; sectionName: string } | null;
}

export interface Student {
  id: string;
  registrationNo: string;
  name: string;
  photoUrl?: string | null;
  admissionDate: string;
  contactPhone?: string | null;
  email?: string | null;
  gender?: Gender | null;
  familyCode?: string | null;
  status: PersonStatus;
  createdAt?: string;
  updatedAt?: string;
  schoolId?: string;
  dateOfBirth?: string | null;
  birthFormId?: string | null;
  caste?: string | null;
  identificationMark?: string | null;
  bloodGroup?: string | null;
  disease?: string | null;
  previousSchool?: string | null;
  previousClass?: string | null;
  previousRollNo?: string | null;
  additionalNote?: string | null;
  isOrphan?: boolean;
  isOsc?: boolean;
  religion?: string | null;
  nationality?: string | null;
  motherTongue?: string | null;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  postalCode?: string | null;
  emergencyPhone?: string | null;
  leavingDate?: string | null;
  leavingReason?: string | null;
  enrollments?: StudentEnrollmentSummary[];
  parents?: {
    isPrimaryGuardian?: boolean;
    isEmergencyContact?: boolean;
    canPickup?: boolean;
    notes?: string | null;
    parent: StudentParentInfo & {
      nationalId?: string | null;
      whatsappNo?: string | null;
      email?: string | null;
      education?: string | null;
      occupation?: string | null;
      profession?: string | null;
      workplace?: string | null;
      income?: number | null;
      address?: string | null;
    };
  }[];
  user?: {
    id: string;
    email: string;
    username: string;
    role: string;
    isActive: boolean;
    createdAt?: string;
  } | null;
}

export interface StudentState {
  students: Student[];
  selectedStudent: Student | null;
}

export interface StudentPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  nextPage: boolean;
  previousPage: boolean;
}

export interface StudentsListData {
  students: Student[];
  pagination: StudentPagination;
}

export interface StudentsListResponse {
  success?: boolean;
  statusCode?: number;
  message: string;
  data: StudentsListData;
}

export interface StudentResponse {
  success?: boolean;
  statusCode?: number;
  message: string;
  data: Student;
}

export interface AddStudentResponse {
  success?: boolean;
  statusCode?: number;
  message: string;
  data: {
    student: Student;
    enrollment: StudentEnrollmentSummary;
    parents: StudentParentInfo[];
    user: {
      id: string;
      email: string;
      username: string;
      role: string;
    };
    credentials: {
      username: string;
      email: string;
      password: string;
    };
  };
}

export interface GetStudentsParams {
  search?: string;
  status?: PersonStatus;
  gender?: Gender;
  classId?: string;
  sectionId?: string;
  academicYear?: string;
  familyCode?: string;
  page?: number;
  limit?: number;
}

export interface ParentInput {
  name: string;
  type: ParentType;
  nationalId?: string;
  mobileNo?: string;
  whatsappNo?: string;
  email?: string;
  education?: string;
  occupation?: string;
  address?: string;
  isPrimaryGuardian?: boolean;
  isEmergencyContact?: boolean;
}

export interface ParentSearchResult {
  id: string;
  name: string;
  type: ParentType;
  nationalId?: string | null;
  mobileNo?: string | null;
  whatsappNo?: string | null;
  email?: string | null;
  occupation?: string | null;
  address?: string | null;
  students?: {
    isPrimaryGuardian: boolean;
    student: {
      id: string;
      name: string;
      registrationNo: string;
      familyCode?: string | null;
    };
  }[];
}

export interface ParentsSearchResponse {
  success?: boolean;
  statusCode?: number;
  message: string;
  data: ParentSearchResult[];
}

export interface SearchParentsParams {
  search?: string;
  nationalId?: string;
  mobileNo?: string;
  limit?: number;
}

export interface PromoteStudentRequest {
  classId: string;
  academicYear: string;
  sectionId?: string;
  rollNo?: string;
  feeDiscount?: number;
  remarks?: string;
}

export interface BulkPromoteRequest {
  studentIds: string[];
  classId: string;
  academicYear: string;
  sectionId?: string;
  feeDiscount?: number;
  remarks?: string;
}

export interface PromotionEnrollment {
  id: string;
  academicYear: string;
  rollNo?: string | null;
  status?: string;
  promotedAt?: string | null;
  class?: { id: string; className: string; montlyFee?: number } | null;
  section?: { id: string; sectionName: string } | null;
}

export interface PromoteResult {
  student: {
    id: string;
    name: string;
    registrationNo: string;
    photoUrl?: string | null;
  };
  from: PromotionEnrollment;
  to: PromotionEnrollment;
}

export interface PromoteResponse {
  success?: boolean;
  statusCode?: number;
  message: string;
  data: PromoteResult;
}

export interface BulkPromoteResponse {
  success?: boolean;
  statusCode?: number;
  message: string;
  data: {
    promotedCount: number;
    failedCount: number;
    promoted: PromoteResult[];
    failed: { studentId: string; name: string; reason: string }[];
  };
}

export interface PromotionRecord {
  id: string;
  promotedAt: string;
  remarks?: string | null;
  student: {
    id: string;
    name: string;
    registrationNo: string;
    photoUrl?: string | null;
    status?: string;
  };
  from: PromotionEnrollment | null;
  to: PromotionEnrollment;
}

export interface GetPromotionsParams {
  search?: string;
  academicYear?: string;
  fromClassId?: string;
  toClassId?: string;
  page?: number;
  limit?: number;
}

export interface PromotionsListData {
  promotions: PromotionRecord[];
  pagination: StudentPagination;
}

export interface PromotionsListResponse {
  success?: boolean;
  statusCode?: number;
  message: string;
  data: PromotionsListData;
}
