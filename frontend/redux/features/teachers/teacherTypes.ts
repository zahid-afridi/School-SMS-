// ── Teacher domain types ──────────────────────────────────────────────────

export interface Teacher {
  _id: string;
  name: string;
  fatherOrHusbandName?: string;
  designation: string;
  joiningDate: string;
  salary: number;
  phone: string;
  gender: string;
  experience: string;
  nationalId: string;
  religion?: string;
  education: string;
  bloodGroup?: string;
  dateOfBirth?: string;
  address?: string;
  photo?: string;
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
