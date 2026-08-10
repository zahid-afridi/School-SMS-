import { rootApi } from "../../rootApi";
import type {
  AwardListData,
  DateSheetData,
  Exam,
  ExamSubject,
  MarksSheetData,
  ResultCardData,
  ResultSheetData,
  Subject,
} from "./examTypes";

function toQuery(params: Record<string, string | number | boolean | undefined | null>) {
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

export const examApi = rootApi.injectEndpoints({
  endpoints: (builder) => ({
    getSubjects: builder.query<Subject[], { activeOnly?: boolean } | void>({
      query: (params) =>
        `/exams/subjects${toQuery({
          activeOnly: params?.activeOnly ?? true,
        })}`,
      transformResponse: (res: ApiData<Subject[]>) => res.data,
      providesTags: ["Exams"],
    }),

    createSubject: builder.mutation<
      ApiData<Subject>,
      { name: string; code?: string }
    >({
      query: (body) => ({ url: "/exams/subjects", method: "POST", body }),
      invalidatesTags: ["Exams"],
    }),

    deleteSubject: builder.mutation<ApiData<{ id: string }>, string>({
      query: (id) => ({ url: `/exams/subjects/${id}`, method: "DELETE" }),
      invalidatesTags: ["Exams"],
    }),

    getExams: builder.query<Exam[], { status?: string; search?: string } | void>({
      query: (params) => `/exams${toQuery(params ?? {})}`,
      transformResponse: (res: ApiData<Exam[]>) => res.data,
      providesTags: ["Exams"],
    }),

    getExamById: builder.query<Exam, string>({
      query: (id) => `/exams/${id}`,
      transformResponse: (res: ApiData<Exam>) => res.data,
      providesTags: (_r, _e, id) => [{ type: "Exams", id }],
    }),

    createExam: builder.mutation<
      ApiData<Exam>,
      {
        name: string;
        startDate: string;
        endDate?: string;
        academicYear?: string;
        remarks?: string;
      }
    >({
      query: (body) => ({ url: "/exams", method: "POST", body }),
      invalidatesTags: ["Exams"],
    }),

    updateExam: builder.mutation<
      ApiData<Exam>,
      {
        id: string;
        name?: string;
        startDate?: string;
        endDate?: string | null;
        academicYear?: string | null;
        status?: string;
        remarks?: string | null;
      }
    >({
      query: ({ id, ...body }) => ({
        url: `/exams/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Exams"],
    }),

    deleteExam: builder.mutation<ApiData<{ id: string }>, string>({
      query: (id) => ({ url: `/exams/${id}`, method: "DELETE" }),
      invalidatesTags: ["Exams"],
    }),

    getExamSchedule: builder.query<
      ExamSubject[],
      { examId: string; classId?: string }
    >({
      query: ({ examId, classId }) =>
        `/exams/${examId}/schedule${toQuery({ classId })}`,
      transformResponse: (res: ApiData<ExamSubject[]>) => res.data,
      providesTags: ["Exams"],
    }),

    addExamSchedule: builder.mutation<
      ApiData<ExamSubject>,
      {
        examId: string;
        subjectId: string;
        classId: string;
        sectionId?: string;
        maxMarks: number;
        passMarks?: number;
        examDate?: string;
        startTime?: string;
        endTime?: string;
        room?: string;
      }
    >({
      query: ({ examId, ...body }) => ({
        url: `/exams/${examId}/schedule`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Exams"],
    }),

    updateExamSchedule: builder.mutation<
      ApiData<ExamSubject>,
      {
        id: string;
        maxMarks?: number;
        passMarks?: number;
        examDate?: string | null;
        startTime?: string | null;
        endTime?: string | null;
        room?: string | null;
      }
    >({
      query: ({ id, ...body }) => ({
        url: `/exams/schedule/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Exams"],
    }),

    deleteExamSchedule: builder.mutation<ApiData<{ id: string }>, string>({
      query: (id) => ({
        url: `/exams/schedule/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Exams"],
    }),

    getMarksSheet: builder.query<
      MarksSheetData,
      { examId: string; classId: string; subjectId: string; sectionId?: string }
    >({
      query: ({ examId, ...params }) =>
        `/exams/${examId}/marks-sheet${toQuery(params)}`,
      transformResponse: (res: ApiData<MarksSheetData>) => res.data,
      providesTags: ["Exams"],
    }),

    saveMarks: builder.mutation<
      ApiData<{ saved: number }>,
      {
        examId: string;
        examSubjectId: string;
        entries: Array<{
          studentId: string;
          obtainedMarks?: number | null;
          isAbsent?: boolean;
          remarks?: string;
        }>;
      }
    >({
      query: ({ examId, ...body }) => ({
        url: `/exams/${examId}/marks`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Exams"],
    }),

    getResultCard: builder.query<
      ResultCardData,
      { examId: string; studentId: string }
    >({
      query: ({ examId, studentId }) =>
        `/exams/${examId}/result-card/${studentId}`,
      transformResponse: (res: ApiData<ResultCardData>) => res.data,
      providesTags: ["Exams"],
    }),

    getResultSheet: builder.query<
      ResultSheetData,
      { examId: string; classId: string; sectionId?: string }
    >({
      query: ({ examId, ...params }) =>
        `/exams/${examId}/result-sheet${toQuery(params)}`,
      transformResponse: (res: ApiData<ResultSheetData>) => res.data,
      providesTags: ["Exams"],
    }),

    getDateSheet: builder.query<
      DateSheetData,
      { examId: string; classId?: string }
    >({
      query: ({ examId, classId }) =>
        `/exams/${examId}/date-sheet${toQuery({ classId })}`,
      transformResponse: (res: ApiData<DateSheetData>) => res.data,
      providesTags: ["Exams"],
    }),

    getAwardList: builder.query<
      AwardListData,
      {
        examId: string;
        classId: string;
        subjectId: string;
        sectionId?: string;
        blank?: boolean;
      }
    >({
      query: ({ examId, ...params }) =>
        `/exams/${examId}/award-list${toQuery(params)}`,
      transformResponse: (res: ApiData<AwardListData>) => res.data,
      providesTags: ["Exams"],
    }),
  }),
  overrideExisting: true,
});

export const {
  useGetSubjectsQuery,
  useCreateSubjectMutation,
  useDeleteSubjectMutation,
  useGetExamsQuery,
  useGetExamByIdQuery,
  useCreateExamMutation,
  useUpdateExamMutation,
  useDeleteExamMutation,
  useGetExamScheduleQuery,
  useAddExamScheduleMutation,
  useUpdateExamScheduleMutation,
  useDeleteExamScheduleMutation,
  useGetMarksSheetQuery,
  useLazyGetMarksSheetQuery,
  useSaveMarksMutation,
  useGetResultCardQuery,
  useLazyGetResultCardQuery,
  useGetResultSheetQuery,
  useLazyGetResultSheetQuery,
  useGetDateSheetQuery,
  useLazyGetDateSheetQuery,
  useGetAwardListQuery,
  useLazyGetAwardListQuery,
} = examApi;
