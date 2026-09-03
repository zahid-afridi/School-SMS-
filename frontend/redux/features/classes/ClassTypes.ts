// ── Section ───────────────────────────────────────────────────────────────

export interface SectionTeacher {
  id: string;
  name: string;
  employeeCode: string;
  designation: string;
}

export interface Section {
  id: string;
  sectionName: string;
  teacherId: string | null;
  teacher: SectionTeacher | null;
  _count?: { enrollments: number };
}

// ── Class ─────────────────────────────────────────────────────────────────

export interface SchoolClass {
  id: string;
  className: string;
  montlyFee: number;
  schoolId: string;
  createdAt: string;
  updatedAt: string;
  sections: Section[];
  _count?: { enrollments: number };
}

// ── State ─────────────────────────────────────────────────────────────────

export interface ClassState {
  classes: SchoolClass[];
  selectedClass: SchoolClass | null;
}

// ── API Response shapes ───────────────────────────────────────────────────

export interface ClassesResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: SchoolClass[];
}

export interface ClassResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: SchoolClass;
}

// ── Request bodies ────────────────────────────────────────────────────────

export interface CreateClassRequest {
  className: string;
  montlyFee: number;
  sections?: { sectionName: string; teacherId?: string | null }[];
}

export interface UpdateClassRequest {
  className: string;
  montlyFee: number;
  sections?: {
    id?: string;
    sectionName: string;
    teacherId?: string | null;
  }[];
}

export interface CreateSectionRequest {
  sectionName: string;
  classId: string;
  teacherId?: string | null;
}

export interface UpdateSectionRequest {
  sectionName?: string;
  teacherId?: string | null;
}

// ── Sections response shapes ──────────────────────────────────────────────

export interface SectionResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: Section;
}

export interface SectionsResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: Section[];
}
