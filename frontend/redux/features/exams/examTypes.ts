export type ExamStatus =
  | "DRAFT"
  | "SCHEDULED"
  | "ONGOING"
  | "COMPLETED"
  | "CANCELLED";

export interface Subject {
  id: string;
  name: string;
  code?: string | null;
  isActive: boolean;
}

export interface Exam {
  id: string;
  name: string;
  startDate: string;
  endDate?: string | null;
  academicYear?: string | null;
  status: ExamStatus;
  remarks?: string | null;
  createdAt?: string;
  _count?: { subjects: number; marks: number };
  subjects?: ExamSubject[];
}

export interface ExamSubject {
  id: string;
  scopeKey: string;
  examDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  maxMarks: number;
  passMarks: number;
  sortOrder: number;
  room?: string | null;
  examId: string;
  subjectId: string;
  classId: string;
  sectionId?: string | null;
  subject: { id: string; name: string; code?: string | null };
  class: { id: string; className: string };
  section?: { id: string; sectionName: string } | null;
}

export interface MarksSheetStudent {
  studentId: string;
  name: string;
  registrationNo: string;
  photoUrl?: string | null;
  rollNo?: string | null;
  sectionName?: string | null;
  obtainedMarks: number | null;
  isAbsent: boolean;
  remarks?: string | null;
  markId?: string | null;
}

export interface MarksSheetData {
  examSubject: ExamSubject;
  students: MarksSheetStudent[];
}

export interface ResultLine {
  examSubjectId: string;
  subjectId: string;
  subjectName: string;
  subjectCode?: string | null;
  className: string;
  maxMarks: number;
  passMarks: number;
  obtainedMarks: number | null;
  isAbsent: boolean;
  percent: number | null;
  grade: string | null;
  status: "PASS" | "FAIL" | "ABSENT" | "PENDING";
}

export interface ResultSummary {
  totalMax: number;
  totalObtained: number;
  overallPercent: number;
  grade: string;
  passedSubjects: number;
  failedSubjects: number;
  absentSubjects: number;
  subjectCount: number;
  overallStatus: string;
}

export interface ResultCardData {
  issuedAt?: string;
  school?: {
    id: string;
    name: string;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    website?: string | null;
    logoUrl?: string | null;
  } | null;
  exam: {
    id: string;
    name: string;
    startDate: string;
    endDate?: string | null;
    academicYear?: string | null;
    status?: string;
  };
  student: {
    id: string;
    name: string;
    registrationNo: string;
    photoUrl?: string | null;
    dateOfBirth?: string | null;
    gender?: string | null;
    contactPhone?: string | null;
    email?: string | null;
    address?: string | null;
    city?: string | null;
    admissionDate?: string | null;
    religion?: string | null;
    nationality?: string | null;
    rollNo?: string | null;
    className: string;
    sectionName?: string | null;
    academicYear?: string | null;
    fatherName?: string | null;
    fatherPhone?: string | null;
    fatherOccupation?: string | null;
    fatherCnic?: string | null;
    motherName?: string | null;
    motherPhone?: string | null;
    guardianName?: string | null;
    guardianPhone?: string | null;
  };
  classPosition?: number | null;
  classStrength?: number | null;
  lines: ResultLine[];
  summary: ResultSummary;
}

export interface ResultSheetData {
  exam: {
    id: string;
    name: string;
    startDate: string;
    endDate?: string | null;
  };
  class: { id: string; className: string };
  sectionId?: string | null;
  subjects: Array<{
    id: string;
    subjectId: string;
    name: string;
    code?: string | null;
    maxMarks: number;
    passMarks: number;
  }>;
  rows: Array<{
    student: {
      id: string;
      name: string;
      registrationNo: string;
      rollNo?: string | null;
      sectionName?: string | null;
    };
    lines: ResultLine[];
    summary: ResultSummary;
  }>;
}

export interface DateSheetData {
  exam: {
    id: string;
    name: string;
    startDate: string;
    endDate?: string | null;
    academicYear?: string | null;
  };
  entries: ExamSubject[];
}

export interface AwardListData {
  blank: boolean;
  exam: { id: string; name: string };
  examSubject: ExamSubject;
  students: Array<{
    sr: number;
    studentId: string;
    name: string;
    registrationNo: string;
    rollNo?: string | null;
    sectionName?: string | null;
    obtainedMarks: number | null;
    isAbsent: boolean;
  }>;
}
