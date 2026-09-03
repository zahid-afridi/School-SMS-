export type AttendanceStatus = "PRESENT" | "LEAVE" | "ABSENT";

export interface AttendanceStudentRow {
  studentId: string;
  name: string;
  registrationNo: string;
  photoUrl?: string | null;
  rollNo?: string | null;
  sectionName?: string | null;
  parentName?: string | null;
  status: AttendanceStatus;
}

export interface AttendanceSheetData {
  dateKey: string;
  date: string;
  alreadyTaken: boolean;
  sheetId: string | null;
  class: { id: string; className: string };
  section: { id: string; sectionName: string } | null;
  sections: { id: string; sectionName: string }[];
  students: AttendanceStudentRow[];
  counts: {
    present: number;
    leave: number;
    absent: number;
    total: number;
  };
  updatedAt?: string | null;
}

export interface AttendanceRecordSummary {
  id: string;
  dateKey: string;
  class: { id: string; className: string };
  section: { id: string; sectionName: string } | null;
  total: number;
  present: number;
  leave: number;
  absent: number;
  updatedAt: string;
}

export interface SaveAttendanceRequest {
  date: string;
  classId: string;
  sectionId?: string | null;
  entries: Array<{
    studentId: string;
    status: AttendanceStatus;
    remarks?: string;
  }>;
  remarks?: string;
}
