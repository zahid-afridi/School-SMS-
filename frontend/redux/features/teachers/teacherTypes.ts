// ── Teacher domain types ──────────────────────────────────────────────────

export const EMPLOYEE_DESIGNATIONS = [
  "PRINCIPAL",
  "VICE_PRINCIPAL",
  "MANAGEMENT",
  "MANAGEMENT_STAFF",
  "TEACHER",
  "ACCOUNTANT",
  "LIBRARIAN",
  "SUPPORT_STAFF",
  "OTHER",
] as const;

export type EmployeeDesignation = (typeof EMPLOYEE_DESIGNATIONS)[number];

export const GENDERS = ["MALE", "FEMALE", "OTHER"] as const;
export type Gender = (typeof GENDERS)[number];

export const DESIGNATION_LABELS: Record<EmployeeDesignation, string> = {
  PRINCIPAL: "Principal",
  VICE_PRINCIPAL: "Vice Principal",
  MANAGEMENT: "Management",
  MANAGEMENT_STAFF: "Management Staff",
  TEACHER: "Teacher",
  ACCOUNTANT: "Accountant",
  LIBRARIAN: "Librarian",
  SUPPORT_STAFF: "Support Staff",
  OTHER: "Other",
};

/** Roles that can be added from Employees UI (school Principal already exists from registration) */
export const CREATABLE_DESIGNATIONS = EMPLOYEE_DESIGNATIONS.filter(
  (d) => d !== "PRINCIPAL"
) as EmployeeDesignation[];

export interface Teacher {
  id: string;
  name: string;
  designation: string;
  joiningDate: string;
  salary: number;
  phone?: string | null;
  photoUrl?: string | null;
  employeeCode?: string;
  fatherOrHusbandName?: string | null;
  gender?: string | null;
  experience?: string | number | null;
  nationalId?: string | null;
  religion?: string | null;
  education?: string | null;
  bloodGroup?: string | null;
  dateOfBirth?: string | null;
  address?: string | null;
  status?: string;
  createdAt?: string;
}

export interface TeacherState {
  teachers: Teacher[];
  selectedTeacher: Teacher | null;
}

export interface TeacherCredentials {
  username: string;
  email: string;
  password: string;
}

export interface TeachersResponse {
  message: string;
  data: Teacher[];
}

export interface TeacherResponse {
  message: string;
  data: Teacher;
}

export interface RegisterTeacherResponse {
  message: string;
  data: {
    employee: Teacher;
    user: { id: string; role: string };
    credentials: TeacherCredentials;
  };
}
