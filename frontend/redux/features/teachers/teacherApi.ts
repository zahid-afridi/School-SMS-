import { rootApi } from "../../rootApi";
import { setTeachers } from "./teacherSlice";
import type {
  Teacher,
  TeachersResponse,
  TeacherResponse,
  RegisterTeacherRequest,
} from "./teacherTypes";

export const teacherApi = rootApi.injectEndpoints({
  endpoints: (builder) => ({
    getAllTeachers: builder.query<Teacher[], void>({
      query: () => "/employee/get-all-employees",
      transformResponse: (res: TeachersResponse) => res.data,
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled;
        dispatch(setTeachers(data));
      },
      providesTags: ["Teachers"],
    }),

    getTeacherById: builder.query<Teacher, string>({
      query: (id) => `/employee/get-employee/${id}`,
      transformResponse: (res: TeacherResponse) => res.data,
      providesTags: (_result, _error, id) => [{ type: "Teachers", id }],
    }),

    registerTeacher: builder.mutation<TeacherResponse, FormData>({
      query: (formData) => ({
        url: "/employee/register-employee",
        method: "POST",
        body: formData,
      }),
      invalidatesTags: ["Teachers"],
    }),

    updateTeacher: builder.mutation<
      TeacherResponse,
      { id: string; data: Partial<RegisterTeacherRequest> }
    >({
      query: ({ id, data }) => ({
        url: `/employee/update-employee/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: "Teachers", id }],
    }),

    deleteTeacher: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/employee/delete-employee/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Teachers"],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetAllTeachersQuery,
  useGetTeacherByIdQuery,
  useRegisterTeacherMutation,
  useUpdateTeacherMutation,
  useDeleteTeacherMutation,
} = teacherApi;
