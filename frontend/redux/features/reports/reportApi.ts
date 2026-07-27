import { rootApi } from "../../rootApi";

function toQuery(params: Record<string, string | number | undefined | null>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  });
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

type ApiData<T> = { message: string; data: T };

export type AttendanceStatus = "PRESENT" | "LEAVE" | "ABSENT";

export type StudentsInfoReport = {
  generatedAt: string;
  total: number;
  students: Array<{
    id: string;
    registrationNo: string;
    name: string;
    photoUrl?: string | null;
    admissionDate: string;
    contactPhone?: string | null;
    email?: string | null;
    gender?: string | null;
    dateOfBirth?: string | null;
    familyCode?: string | null;
    address?: string | null;
    city?: string | null;
    religion?: string | null;
    nationality?: string | null;
    status: string;
    academicYear?: string | null;
    rollNo?: string | null;
    className?: string | null;
    sectionName?: string | null;
    guardianName?: string | null;
    guardianType?: string | null;
    guardianPhone?: string | null;
    guardianCnic?: string | null;
  }>;
};

export type ParentsInfoReport = {
  generatedAt: string;
  total: number;
  parents: Array<{
    id: string;
    name: string;
    type: string;
    nationalId?: string | null;
    mobileNo?: string | null;
    whatsappNo?: string | null;
    email?: string | null;
    education?: string | null;
    occupation?: string | null;
    workplace?: string | null;
    income?: number | null;
    address?: string | null;
    childrenCount: number;
    children: Array<{
      id: string;
      name: string;
      registrationNo: string;
      familyCode?: string | null;
      status: string;
      className?: string | null;
      sectionName?: string | null;
      isPrimaryGuardian: boolean;
    }>;
  }>;
};

export type MonthlyAttendanceRow<T> = {
  days: Record<string, AttendanceStatus | null>;
  summary: {
    present: number;
    leave: number;
    absent: number;
    total: number;
    percentage: number;
  };
} & T;

export type StudentsMonthlyAttendanceReport = {
  year: number;
  month: number;
  monthLabel: string;
  from: string;
  to: string;
  dayKeys: string[];
  class: {
    id: string;
    className: string;
    sectionId?: string | null;
    sectionName?: string | null;
  };
  studentCount: number;
  students: MonthlyAttendanceRow<{
    student: {
      id: string;
      name: string;
      registrationNo: string;
      rollNo?: string | null;
      sectionName?: string | null;
    };
  }>[];
};

export type StaffMonthlyAttendanceReport = {
  year: number;
  month: number;
  monthLabel: string;
  from: string;
  to: string;
  dayKeys: string[];
  staffCount: number;
  staff: MonthlyAttendanceRow<{
    employee: {
      id: string;
      name: string | null;
      employeeCode: string;
      designation: string;
      phone?: string | null;
    };
  }>[];
};

export type StaffAttendanceSheet = {
  dateKey: string;
  remarks?: string | null;
  sheetId?: string | null;
  employees: Array<{
    employee: {
      id: string;
      name: string | null;
      employeeCode: string;
      designation: string;
      phone?: string | null;
      photoUrl?: string | null;
    };
    status: AttendanceStatus;
    remarks?: string | null;
    saved: boolean;
  }>;
};

export type FeeCollectionReport = {
  from: string;
  to: string;
  totalCollected: number;
  paymentCount: number;
  byMethod: Record<string, number>;
  byDay: Record<string, number>;
  payments: Array<{
    id: string;
    amount: number;
    method: string;
    paidAt: string;
    receiptNo: string;
    student: { id: string; name: string; registrationNo: string };
  }>;
};

export type AccountsReport = {
  year: number;
  months: Array<{
    month: number;
    label: string;
    invoiceCount: number;
    billed: number;
    collected: number;
    outstanding: number;
    unpaidCount: number;
  }>;
  byMethod: Record<string, number>;
  totals: {
    billed: number;
    collected: number;
    outstanding: number;
    invoiceCount: number;
    cashCollected: number;
  };
  generatedAt: string;
};

export type StudentProgressReport = {
  generatedAt: string;
  student: {
    id: string;
    name: string;
    registrationNo: string;
    photoUrl?: string | null;
    admissionDate: string;
    contactPhone?: string | null;
    gender?: string | null;
    dateOfBirth?: string | null;
    familyCode?: string | null;
    status: string;
    address?: string | null;
    enrollment: {
      academicYear: string;
      rollNo?: string | null;
      feeDiscount: number;
      class: { id: string; className: string };
      section?: { id: string; sectionName: string } | null;
    } | null;
    guardian: { name: string; type: string; mobileNo?: string | null } | null;
  };
  attendance: {
    monthLabel: string;
    from: string;
    to: string;
    present: number;
    leave: number;
    absent: number;
    total: number;
    percentage: number;
  };
  fees: {
    outstanding: number;
    recentInvoices: Array<{
      id: string;
      invoiceNo: string;
      monthLabel: string;
      totalAmount: number;
      paidAmount: number;
      balanceAmount: number;
      status: string;
    }>;
    recentPayments: Array<{
      id: string;
      amount: number;
      method: string;
      paidAt: string;
      receiptNo: string;
    }>;
  };
  exams: Array<{
    exam: { id: string; name: string; startDate: string; academicYear?: string | null };
    subjects: Array<{
      name: string;
      code?: string | null;
      obtained: number | null;
      total: number;
      passing: number;
      isAbsent: boolean;
    }>;
    obtained: number;
    total: number;
    percentage: number;
  }>;
};

export const reportApi = rootApi.injectEndpoints({
  endpoints: (builder) => ({
    getStudentsInfoReport: builder.query<
      StudentsInfoReport,
      { classId?: string; status?: string; search?: string } | void
    >({
      query: (params) => `/reports/students-info${toQuery(params ?? {})}`,
      transformResponse: (res: ApiData<StudentsInfoReport>) => res.data,
      providesTags: ["Reports"],
    }),

    getParentsInfoReport: builder.query<
      ParentsInfoReport,
      { search?: string; type?: string } | void
    >({
      query: (params) => `/reports/parents-info${toQuery(params ?? {})}`,
      transformResponse: (res: ApiData<ParentsInfoReport>) => res.data,
      providesTags: ["Reports"],
    }),

    getStudentsMonthlyAttendanceReport: builder.query<
      StudentsMonthlyAttendanceReport,
      { year: number; month: number; classId: string; sectionId?: string }
    >({
      query: (params) =>
        `/reports/students-attendance-monthly${toQuery(params)}`,
      transformResponse: (res: ApiData<StudentsMonthlyAttendanceReport>) =>
        res.data,
      providesTags: ["Reports", "Attendance"],
    }),

    getStaffMonthlyAttendanceReport: builder.query<
      StaffMonthlyAttendanceReport,
      { year: number; month: number }
    >({
      query: (params) =>
        `/reports/staff-attendance-monthly${toQuery(params)}`,
      transformResponse: (res: ApiData<StaffMonthlyAttendanceReport>) =>
        res.data,
      providesTags: ["Reports", "Attendance"],
    }),

    getStaffAttendanceSheet: builder.query<StaffAttendanceSheet, { date: string }>({
      query: ({ date }) => `/reports/staff-attendance/sheet${toQuery({ date })}`,
      transformResponse: (res: ApiData<StaffAttendanceSheet>) => res.data,
      providesTags: ["Reports", "Attendance"],
    }),

    saveStaffAttendanceSheet: builder.mutation<
      unknown,
      {
        date: string;
        remarks?: string;
        entries: Array<{
          employeeId: string;
          status: AttendanceStatus;
          remarks?: string;
        }>;
      }
    >({
      query: (body) => ({
        url: "/reports/staff-attendance/sheet",
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Reports", "Attendance"],
    }),

    getReportFeeCollection: builder.query<
      FeeCollectionReport,
      { from: string; to: string }
    >({
      query: (params) => `/reports/fee-collection${toQuery(params)}`,
      transformResponse: (res: ApiData<FeeCollectionReport>) => res.data,
      providesTags: ["Reports", "Fees"],
    }),

    getAccountsReport: builder.query<AccountsReport, { year: number }>({
      query: (params) => `/reports/accounts${toQuery(params)}`,
      transformResponse: (res: ApiData<AccountsReport>) => res.data,
      providesTags: ["Reports", "Fees"],
    }),

    getStudentProgressReport: builder.query<StudentProgressReport, string>({
      query: (studentId) => `/reports/student-progress/${studentId}`,
      transformResponse: (res: ApiData<StudentProgressReport>) => res.data,
      providesTags: ["Reports"],
    }),
  }),
});

export const {
  useGetStudentsInfoReportQuery,
  useGetParentsInfoReportQuery,
  useGetStudentsMonthlyAttendanceReportQuery,
  useGetStaffMonthlyAttendanceReportQuery,
  useGetStaffAttendanceSheetQuery,
  useSaveStaffAttendanceSheetMutation,
  useGetReportFeeCollectionQuery,
  useGetAccountsReportQuery,
  useGetStudentProgressReportQuery,
  useLazyGetStudentProgressReportQuery,
} = reportApi;
