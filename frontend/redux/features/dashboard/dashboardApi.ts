import { rootApi } from "../../rootApi";

export interface DashboardAttendanceSummary {
  present: number;
  leave: number;
  absent: number;
  marked: number;
  total: number;
  percentage: number;
}

export interface DashboardStats {
  school: { id: string; name: string };
  counts: {
    students: number;
    activeStudents: number;
    teachers: number;
    staff: number;
    classes: number;
    sections: number;
    parents: number;
  };
  fees: {
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
    today: {
      collected: number;
      paymentCount: number;
    };
  };
  attendance: {
    date: string;
    students: DashboardAttendanceSummary;
    staff: DashboardAttendanceSummary;
  };
  exams: {
    active: number;
    upcoming: Array<{
      id: string;
      name: string;
      status: string;
      startDate: string;
      endDate: string | null;
    }>;
  };
  recentPayments: Array<{
    id: string;
    receiptNo: string;
    amount: number;
    method: string;
    paidAt: string;
    student: { id: string; name: string; registrationNo: string };
  }>;
}

type ApiData<T> = { message: string; data: T };

export const dashboardApi = rootApi.injectEndpoints({
  endpoints: (builder) => ({
    getDashboardStats: builder.query<DashboardStats, void>({
      query: () => "/dashboard/stats",
      transformResponse: (res: ApiData<DashboardStats>) => res.data,
      providesTags: ["Dashboard"],
    }),
  }),
  overrideExisting: false,
});

export const { useGetDashboardStatsQuery } = dashboardApi;
