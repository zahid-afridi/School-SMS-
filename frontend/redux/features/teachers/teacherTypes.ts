// ── Teacher domain types ──────────────────────────────────────────────────

export interface Teacher {
  id: string;
  name: string;
  designation: string;
  joiningDate: string;
  salary: number;
  phone?: string | null;
  photoUrl?: string | null;
  employeeCode?: string;
  // detail fields (present in getById response)
  fatherOrHusbandName?: string;
  gender?: string;
  experience?: string;
  nationalId?: string;
  religion?: string;
  education?: string;
  bloodGroup?: string;
  dateOfBirth?: string;
  address?: string;
}

export interface TeacherState {
  teachers: Teacher[];
  selectedTeacher: Teacher | null;
}

// ── Request / Response shapes ─────────────────────────────────────────────

export interface TeachersResponse {
  message: string;
  data: Teacher[];
}

export interface TeacherResponse {
  message: string;
  data: Teacher;
}

export interface RegisterTeacherRequest {
  name: string;
  fatherOrHusbandName?: string;
  designation: string;
  joiningDate: string;
  salary: string;
  phone: string;
  gender: string;
  experience: string;
  nationalId: string;
  religion?: string;
  education: string;
  bloodGroup?: string;
  dateOfBirth?: string;
  address?: string;
}
