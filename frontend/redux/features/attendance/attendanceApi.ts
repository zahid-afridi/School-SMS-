import { rootApi } from "../../rootApi";
import type {
  AttendanceRecordSummary,
  AttendanceSheetData,
  SaveAttendanceRequest,
} from "./attendanceTypes";

function toQuery(params: Record<string, string | undefined | null>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) search.set(key, value);
  });
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

type ApiData<T> = { message: string; data: T };

export const attendanceApi = rootApi.injectEndpoints({
  endpoints: (builder) => ({
    getStudentAttendanceSheet: builder.query<
      AttendanceSheetData,
      { date: string; classId: string; sectionId?: string }
    >({
      query: ({ date, classId, sectionId }) =>
        `/attendance/students/sheet${toQuery({ date, classId, sectionId })}`,
      transformResponse: (res: ApiData<AttendanceSheetData>) => res.data,
      providesTags: ["Attendance"],
    }),

    saveStudentAttendanceSheet: builder.mutation<
      ApiData<AttendanceSheetData>,
      SaveAttendanceRequest
    >({
      query: (body) => ({
        url: "/attendance/students/sheet",
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Attendance"],
    }),

    getStudentAttendanceRecords: builder.query<
      AttendanceRecordSummary[],
      { classId?: string; from?: string; to?: string } | void
    >({
      query: (params) =>
        `/attendance/students/records${toQuery(params ?? {})}`,
      transformResponse: (res: ApiData<AttendanceRecordSummary[]>) => res.data,
      providesTags: ["Attendance"],
    }),

    getStudentAttendanceReport: builder.query<
      {
        from: string;
        to: string;
        studentCount: number;
        students: Array<{
          student: { id: string; name: string; registrationNo: string };
          present: number;
          leave: number;
          absent: number;
          total: number;
          percentage: number;
        }>;
      },
      { from: string; to: string; classId?: string }
    >({
      query: (params) =>
        `/attendance/students/report${toQuery(params)}`,
      transformResponse: (res: ApiData<{
        from: string;
        to: string;
        studentCount: number;
        students: Array<{
          student: { id: string; name: string; registrationNo: string };
          present: number;
          leave: number;
          absent: number;
          total: number;
          percentage: number;
        }>;
      }>) => res.data,
      providesTags: ["Attendance"],
    }),
  }),
  overrideExisting: false,
});

export const {
  useLazyGetStudentAttendanceSheetQuery,
  useGetStudentAttendanceSheetQuery,
  useSaveStudentAttendanceSheetMutation,
  useGetStudentAttendanceRecordsQuery,
  useGetStudentAttendanceReportQuery,
} = attendanceApi;
