import { rootApi } from "../../rootApi";
import { setStudents } from "./studentSlice";
import type {
  AddStudentResponse,
  BulkPromoteRequest,
  BulkPromoteResponse,
  GetPromotionsParams,
  GetStudentsParams,
  ParentsSearchResponse,
  ParentSearchResult,
  PromoteResponse,
  PromoteStudentRequest,
  PromotionsListData,
  PromotionsListResponse,
  SearchParentsParams,
  Student,
  StudentResponse,
  StudentsListData,
  StudentsListResponse,
} from "./studentTypes";

function toQueryString(
  params?: GetStudentsParams | SearchParentsParams | GetPromotionsParams
): string {
  if (!params) return "";
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  });
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export const studentApi = rootApi.injectEndpoints({
  endpoints: (builder) => ({
    getAllStudents: builder.query<StudentsListData, GetStudentsParams | void>({
      query: (params) => `/student/get-all${toQueryString(params ?? undefined)}`,
      transformResponse: (res: StudentsListResponse) => res.data,
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(setStudents(data.students));
        } catch {
          // keep previous slice state on error
        }
      },
      providesTags: ["Students"],
    }),

    getStudentById: builder.query<Student, string>({
      query: (id) => `/student/get/${id}`,
      transformResponse: (res: StudentResponse) => res.data,
      providesTags: (_result, _error, id) => [{ type: "Students", id }],
    }),

    searchParents: builder.query<ParentSearchResult[], SearchParentsParams>({
      query: (params) => `/student/parents/search${toQueryString(params)}`,
      transformResponse: (res: ParentsSearchResponse) => res.data,
    }),

    getPromotions: builder.query<PromotionsListData, GetPromotionsParams | void>({
      query: (params) =>
        `/student/promotions${toQueryString(params ?? undefined)}`,
      transformResponse: (res: PromotionsListResponse) => res.data,
      providesTags: ["Students"],
    }),

    addStudent: builder.mutation<AddStudentResponse, FormData>({
      query: (formData) => ({
        url: "/student/add",
        method: "POST",
        body: formData,
      }),
      invalidatesTags: ["Students"],
    }),

    updateStudent: builder.mutation<
      StudentResponse,
      { id: string; data: FormData }
    >({
      query: ({ id, data }) => ({
        url: `/student/update/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Students"],
    }),

    deleteStudent: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/student/delete/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Students"],
    }),

    promoteStudent: builder.mutation<
      PromoteResponse,
      { id: string; data: PromoteStudentRequest }
    >({
      query: ({ id, data }) => ({
        url: `/student/promote/${id}`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Students"],
    }),

    bulkPromoteStudents: builder.mutation<
      BulkPromoteResponse,
      BulkPromoteRequest
    >({
      query: (body) => ({
        url: "/student/promote-bulk",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Students"],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetAllStudentsQuery,
  useGetStudentByIdQuery,
  useSearchParentsQuery,
  useLazySearchParentsQuery,
  useGetPromotionsQuery,
  useAddStudentMutation,
  useUpdateStudentMutation,
  useDeleteStudentMutation,
  usePromoteStudentMutation,
  useBulkPromoteStudentsMutation,
} = studentApi;
